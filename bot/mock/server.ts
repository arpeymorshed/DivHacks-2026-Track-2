// Mock Aartee backend for local development. Implements the same contract
// the real backend will expose, so the bot can be built and tested without it.
//
//   POST /api/chat    { tenantId, text } -> { reply }
//   GET  /api/outbox  -> [{ id, tenantId, text }]   (only messages not yet acked)
//   POST /api/outbox/:id/ack -> { ok, id }          (bot confirms delivery)
//
// Run with `bun run mock`. Extra helpers for testing:
//   POST /api/outbox  { tenantId, text }  -> queue a new outbound message
//   GET  /health

type Tenant = {
  name: string;
  rent: number;
  utilities: number;
  walletBalance: number;
  dueDate: string;
  utilityNote: string; // how the share comes from the building bill (fixtures/demo-script.md)
};

type OutboxMessage = { id: string; tenantId: string; text: string };

const PORT = Number(process.env.MOCK_PORT ?? 4000);

const tenants: Record<string, Tenant> = {
  abhimanyu: { name: "Abhimanyu", rent: 1450, utilities: 38, walletBalance: 1488, dueDate: "Thu Oct 1",
    utilityNote: "The building bill was $114. Unit 4B used 380 kWh ($76), split 50/50 with Kashish" },
  kashish: { name: "Kashish", rent: 1450, utilities: 38, walletBalance: 1238, dueDate: "Thu Oct 1",
    utilityNote: "The building bill was $114. Unit 4B used 380 kWh ($76), split 50/50 with Abhimanyu" },
  musammat: { name: "Musammat", rent: 1450, utilities: 38, walletBalance: 1488, dueDate: "Thu Oct 1",
    utilityNote: "The building bill was $114. Unit 2A used 190 kWh ($38)" },
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const outbox: OutboxMessage[] = [
  {
    id: "msg-001",
    tenantId: "kashish",
    text: "Hi Kashish, rent $1,450 + utilities $38 = $1,488 is due Thu Oct 1. Your rent wallet has $1,238, so please top up $250 before then.",
  },
  {
    id: "msg-002",
    tenantId: "abhimanyu",
    text: "Hi Abhimanyu, rent $1,450 + utilities $38 = $1,488 is due Thu Oct 1. Your rent wallet has $1,488, so you're all set. I'll pay it automatically on the 1st.",
  },
  {
    id: "msg-003",
    tenantId: "musammat",
    text: "Hi Musammat, rent $1,450 + utilities $38 = $1,488 is due Thu Oct 1. Your rent wallet has $1,488, so you're all set.",
  },
];
let nextId = outbox.length + 1;
const acked = new Set<string>();

function replyFor(tenantId: string, text: string): string {
  const t = tenants[tenantId];
  if (!t) return "I don't have a record for you yet.";
  const total = t.rent + t.utilities;
  const diff = t.walletBalance - total;
  const q = text.toLowerCase();

  if (/\b(hi|hello|hey)\b/.test(q)) {
    return `Hi ${t.name}! I'm your Aartee agent. Ask me about rent, utilities, your wallet, or when rent is due.`;
  }
  if (q.includes("due") || q.includes("when")) {
    return `Your next payment of ${usd(total)} is due ${t.dueDate}.`;
  }
  if (q.includes("util")) {
    return `${t.utilityNote}, so your share is ${usd(t.utilities)}.`;
  }
  if (q.includes("wallet") || q.includes("balance") || q.includes("short")) {
    if (diff < 0) return `Your rent wallet has ${usd(t.walletBalance)}. You're ${usd(-diff)} short of the ${usd(total)} due ${t.dueDate}.`;
    return `Your rent wallet has ${usd(t.walletBalance)}, enough to cover the ${usd(total)} due ${t.dueDate}.`;
  }
  if (q.includes("rent") || q.includes("owe") || q.includes("pay")) {
    return `You owe rent ${usd(t.rent)} + utilities ${usd(t.utilities)} = ${usd(total)}, due ${t.dueDate}.`;
  }
  return `Got it, ${t.name}. I can help with rent, utilities, your wallet balance, or due dates.`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") return json({ ok: true });

    if (req.method === "GET" && url.pathname === "/api/outbox") return json(outbox.filter((m) => !acked.has(m.id)));

    const ackMatch = url.pathname.match(/^\/api\/outbox\/([^/]+)\/ack$/);
    if (req.method === "POST" && ackMatch) {
      const id = decodeURIComponent(ackMatch[1]!);
      if (!outbox.some((m) => m.id === id)) return json({ error: `unknown outbox id ${id}` }, 404);
      // Idempotent: acking an already-acked id is fine.
      if (!acked.has(id)) console.log(`[mock] acked ${id}`);
      acked.add(id);
      return json({ ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/outbox") {
      const body = (await req.json().catch(() => null)) as { tenantId?: string; text?: string } | null;
      if (!body?.tenantId || !body.text) return json({ error: "tenantId and text are required" }, 400);
      const msg = { id: `msg-${String(nextId++).padStart(3, "0")}`, tenantId: body.tenantId, text: body.text };
      outbox.push(msg);
      console.log(`[mock] queued ${msg.id} for ${msg.tenantId}`);
      return json(msg, 201);
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = (await req.json().catch(() => null)) as { tenantId?: string; text?: string } | null;
      if (!body?.tenantId || typeof body.text !== "string") return json({ error: "tenantId and text are required" }, 400);
      if (!tenants[body.tenantId]) return json({ error: `unknown tenant ${body.tenantId}` }, 404);
      console.log(`[mock] chat from ${body.tenantId}`);
      await Bun.sleep(600); // simulate agent thinking time so the typing indicator is visible
      return json({ reply: replyFor(body.tenantId, body.text) });
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`[mock] Aartee mock backend on http://localhost:${PORT}`);
