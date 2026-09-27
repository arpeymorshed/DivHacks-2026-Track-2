import { join } from "node:path";
import { Spectrum, type Message, type Space } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";
import { createBackend, type OutboxMessage } from "./backend.ts";
import { loadConfig, maskAddress, normalizeAddress } from "./config.ts";
import { createSentStore } from "./sentStore.ts";

// RT messaging layer. This bot only delivers messages between tenants'
// iMessage and the RT backend. It holds no wallet keys and runs no
// agent logic; that all lives behind API_BASE_URL.

const UNREGISTERED_REPLY = "This number isn't registered with RT.";
const TROUBLE_REPLY = "RT is having trouble right now. Try again in a moment.";
const OUTBOX_POLL_MS = 5_000;
const SENT_IDS_FILE = join(import.meta.dir, "..", ".outbox-sent.json");

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[config] ${errMsg(err)}`);
  process.exit(1);
}
const { tenantToPhone, phoneToTenant } = config;
const backend = createBackend(config.apiBaseUrl);
const sent = createSentStore(SENT_IDS_FILE);

const app = await Spectrum({
  projectId: config.projectId,
  projectSecret: config.projectSecret,
  providers: [imessage.config()],
});
const im = imessage(app);

console.log(
  `[bot] RT bot running. Backend: ${config.apiBaseUrl}. ` +
    `Tenants: ${[...tenantToPhone.keys()].join(", ")}. Already-sent outbox ids: ${sent.size()}.`,
);

// ---------------------------------------------------------------------------
// 1. Inbound: tenant texts the bot -> /api/chat -> reply
// ---------------------------------------------------------------------------

async function handleInbound(space: Space, message: Message) {
  if (message.direction === "outbound") return;
  // Only text is forwarded. Reactions, typing, read receipts etc. also arrive
  // on this stream and must not trigger a reply.
  if (message.content.type !== "text") return;

  const address = message.sender?.id ? normalizeAddress(message.sender.id) : undefined;
  const tenantId = address ? phoneToTenant.get(address) : undefined;

  if (!tenantId) {
    console.log(`[inbound] message from unregistered ${address ? maskAddress(address) : "unknown sender"}`);
    await space.send(UNREGISTERED_REPLY);
    return;
  }

  const text = message.content.text;
  console.log(`[inbound] message ${message.id} from ${tenantId}`);
  await space.responding(async () => {
    let reply: string;
    try {
      reply = await backend.chat(tenantId, text);
    } catch (err) {
      console.error(`[inbound] backend chat failed for ${tenantId}: ${errMsg(err)}`);
      reply = TROUBLE_REPLY;
    }
    await space.send(reply);
  });
}

// ---------------------------------------------------------------------------
// 2. Outbound: poll /api/outbox, deliver each id exactly once
// ---------------------------------------------------------------------------

type IMessageSpace = Awaited<ReturnType<typeof im.space.create>>;
const spaceCache = new Map<string, IMessageSpace>();
const warnedUnknownTenant = new Set<string>();
let outboxReachable = true;

async function spaceFor(phone: string): Promise<IMessageSpace> {
  let space = spaceCache.get(phone);
  if (!space) {
    space = await im.space.create(await im.user(phone));
    spaceCache.set(phone, space);
  }
  return space;
}

async function deliver(msg: OutboxMessage) {
  const phone = tenantToPhone.get(msg.tenantId);
  if (!phone) {
    // Not marked as sent: if TENANT_PHONES is fixed and the bot restarted, it will go out.
    if (!warnedUnknownTenant.has(msg.id)) {
      warnedUnknownTenant.add(msg.id);
      console.warn(`[outbox] ${msg.id} is for "${msg.tenantId}", who has no phone in TENANT_PHONES; skipping`);
    }
    return;
  }
  try {
    const space = await spaceFor(phone);
    await space.send(msg.text);
    sent.add(msg.id);
    console.log(`[outbox] delivered ${msg.id} to ${msg.tenantId}`);
  } catch (err) {
    spaceCache.delete(phone);
    console.error(`[outbox] failed to deliver ${msg.id} to ${msg.tenantId}, will retry: ${errMsg(err)}`);
  }
}

async function pollOutbox() {
  let messages: OutboxMessage[];
  try {
    messages = await backend.outbox();
  } catch (err) {
    // Log once per outage rather than every 5 seconds.
    if (outboxReachable) console.error(`[outbox] backend unreachable: ${errMsg(err)}`);
    outboxReachable = false;
    return;
  }
  if (!outboxReachable) console.log("[outbox] backend reachable again");
  outboxReachable = true;

  for (const msg of messages) {
    if (!sent.has(msg.id)) await deliver(msg);
    // Anything already sent that the backend still returns hasn't been acked
    // yet (fresh send, earlier ack failure, or a restart), so ack it now. It
    // is never re-sent: the local file already marks it as delivered.
    if (sent.has(msg.id)) await acknowledge(msg.id);
  }
}

// Ids whose last ack attempt failed, so the retry is logged once rather than every poll.
const ackFailing = new Set<string>();

async function acknowledge(id: string) {
  try {
    await backend.ack(id);
    if (ackFailing.delete(id)) console.log(`[outbox] acked ${id} on retry`);
  } catch (err) {
    if (!ackFailing.has(id)) console.error(`[outbox] ack failed for ${id}, will retry next poll: ${errMsg(err)}`);
    ackFailing.add(id);
  }
}

// setTimeout chaining (not setInterval) so a slow poll never overlaps the next one.
async function outboxLoop() {
  try {
    await pollOutbox();
  } catch (err) {
    console.error(`[outbox] unexpected error: ${errMsg(err)}`);
  }
  setTimeout(outboxLoop, OUTBOX_POLL_MS);
}
outboxLoop();

// ---------------------------------------------------------------------------
// Main loop. Each message is handled without blocking the next, and a failure
// in one handler is logged instead of crashing the bot.
// ---------------------------------------------------------------------------

for await (const [space, message] of app.messages) {
  handleInbound(space, message).catch((err) => {
    console.error(`[inbound] failed to handle message ${message.id}: ${errMsg(err)}`);
  });
}
