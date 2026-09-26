import type { OutboxMessage } from "../../types/rent";

// Share the temporary queue across route bundles and development reloads.
// This is still per-process memory, not durable storage across server instances.
const outboxGlobal = globalThis as typeof globalThis & {
  rentrelayOutbox?: OutboxMessage[];
};

export const outbox: OutboxMessage[] = outboxGlobal.rentrelayOutbox ??= [];

export function queueMessage(tenantId: string, text: string): OutboxMessage {
  const message: OutboxMessage = {
    id: crypto.randomUUID(),
    tenantId,
    text,
  };

  outbox.push(message);
  return message;
}
