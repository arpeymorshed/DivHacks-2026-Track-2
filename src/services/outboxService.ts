import { randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { getDb } from "../lib/mongodb.ts";
import type { OutboxMessage } from "../../types/rent";

export async function queueOutboxMessage(
  tenantId: string,
  text: string,
  dedupeKey: string
): Promise<void> {
  const db = await getDb();
  const outbox = db.collection<OutboxMessage>("outbox");
  // Enforce deduplication across concurrent requests and separate server instances.
  await outbox.createIndexes([
    { key: { dedupeKey: 1 }, unique: true },
    { key: { id: 1 }, unique: true },
    { key: { status: 1, createdAt: 1, id: 1 } },
  ]);

  try {
    await outbox.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          id: randomUUID(), tenantId, text, status: "pending",
          dedupeKey, createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    // Another request may have inserted this reminder during the upsert.
    if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.dedupeKey) {
      return;
    }
    throw error;
  }
}

export async function getPendingOutboxMessages(): Promise<Pick<OutboxMessage, "id" | "tenantId" | "text">[]> {
  const db = await getDb();
  return db.collection<OutboxMessage>("outbox")
    .find({ status: "pending" })
    .sort({ createdAt: 1, id: 1 })
    .project<Pick<OutboxMessage, "id" | "tenantId" | "text">>({ _id: 0, id: 1, tenantId: 1, text: 1 })
    .toArray();
}

export async function acknowledgeOutboxMessage(id: string): Promise<boolean> {
  const db = await getDb();
  const outbox = db.collection<OutboxMessage>("outbox");
  // Only the first acknowledgement sets sentAt, including concurrent calls.
  const result = await outbox.updateOne(
    { id, status: "pending" },
    { $set: { status: "sent", sentAt: new Date() } }
  );
  if (result.matchedCount > 0) return true;
  return (await outbox.findOne({ id, status: "sent" }, { projection: { _id: 1 } })) !== null;
}

export async function resetDemoOutbox() {
  const db = await getDb();
  const outbox = db.collection<OutboxMessage>("outbox");

  const messages = await outbox
    .find({
      tenantId: {
        $in: ["abhimanyu", "kashish", "musammat"],
      },
      dedupeKey: {
        $regex: "^rent-due:",
      },
    })
    .toArray();

  let modified = 0;

  for (const message of messages) {
    const result = await outbox.updateOne(
      { _id: message._id },
      {
        $set: {
          id: randomUUID(),
          status: "pending",
        },
        $unset: {
          sentAt: "",
        },
      }
    );

    modified += result.modifiedCount;
  }

  return {
    matched: messages.length,
    modified,
  };
}
