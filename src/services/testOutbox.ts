import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDb } from "../lib/mongodb.ts";
import { acknowledgeOutboxMessage, queueOutboxMessage } from "./outboxService.ts";
import type { OutboxMessage } from "../../types/rent";

async function testOutbox() {
  const db = await getDb();
  const outbox = db.collection<OutboxMessage>("outbox");
  const prefix = `outbox-test:${randomUUID()}`;
  const keys = [`${prefix}:first`, `${prefix}:second`];
  const baseUrl = "http://localhost:3000/api/outbox";
  async function pending() {
    const response = await fetch(baseUrl);
    equal(response.status, 200);
    return await response.json() as Pick<OutboxMessage, "id" | "tenantId" | "text">[];
  }

  try {
    await Promise.all(Array.from({ length: 8 }, () =>
      queueOutboxMessage("musammat", "Outbox integration test", keys[0])
    ));
    equal(await outbox.countDocuments({ dedupeKey: keys[0] }), 1);
    await queueOutboxMessage("kashish", "Second outbox integration test", keys[1]);
    const first = await outbox.findOne({ dedupeKey: keys[0] });
    const second = await outbox.findOne({ dedupeKey: keys[1] });
    ok(first);
    ok(second);
    equal(first.status, "pending");
    ok(first.createdAt instanceof Date);

    // The API runs in a different process and must read the persisted records.
    const before = await pending();
    deepStrictEqual(before.find((message) => message.id === first.id), {
      id: first.id, tenantId: "musammat", text: "Outbox integration test",
    });
    ok(before.findIndex((message) => message.id === first.id) < before.findIndex((message) => message.id === second.id));
    deepStrictEqual(await pending(), before);

    const ackUrl = `${baseUrl}/${first.id}/ack`;
    const ack = await fetch(ackUrl, { method: "POST" });
    equal(ack.status, 200);
    deepStrictEqual(await ack.json(), { success: true, id: first.id });
    const sent = await outbox.findOne({ id: first.id });
    ok(sent);
    equal(sent.status, "sent");
    ok(sent.sentAt instanceof Date);
    deepStrictEqual(await pending(), before.filter((message) => message.id !== first.id));

    const acknowledgements = await Promise.all(Array.from({ length: 4 }, () =>
      fetch(ackUrl, { method: "POST" })
    ));
    for (const response of acknowledgements) {
      equal(response.status, 200);
      deepStrictEqual(await response.json(), { success: true, id: first.id });
    }
    await queueOutboxMessage("musammat", "Should not replace the sent reminder", keys[0]);
    deepStrictEqual(await outbox.findOne({ id: first.id }), sent);
    equal(await outbox.countDocuments({ dedupeKey: keys[0] }), 1);
    ok(!(await pending()).some((message) => message.id === first.id));

    const concurrentAcks = await Promise.all(Array.from({ length: 8 }, () =>
      acknowledgeOutboxMessage(second.id)
    ));
    ok(concurrentAcks.every(Boolean));
    const secondSent = await outbox.findOne({ id: second.id });
    ok(secondSent?.sentAt instanceof Date);
    equal(await acknowledgeOutboxMessage(second.id), true);
    deepStrictEqual(await outbox.findOne({ id: second.id }), secondSent);
    equal(await acknowledgeOutboxMessage(randomUUID()), false);
    console.log("Atlas outbox checks passed: concurrent deduplication, persistence across processes, pending-only responses, acknowledgement, stable sentAt, and no requeue after send.");
  } finally {
    await outbox.deleteMany({ dedupeKey: { $in: keys } });
  }
}

// End this standalone script after its cleanup; the shared Mongo client stays open in the app.
testOutbox().then(() => process.exit(0)).catch((error) => {
  console.error("Outbox test failed:", error instanceof Error ? error.name : "Unknown error");
  process.exit(1);
});
