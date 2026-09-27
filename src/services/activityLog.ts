// The demo's activity log (MongoDB collection "activity"): rent payments, attacks, top-ups, spawns and
// resets, with explorer links and the Guardian's reasons. Read by GET /api/state.
import { getDb } from "../lib/mongodb.ts";
import type { ActivityEntry, RentDayResult } from "../../types/rent";

async function collection() {
  return (await getDb()).collection<ActivityEntry>("activity");
}

export async function recordActivity(...entries: Omit<ActivityEntry, "id" | "time">[]): Promise<void> {
  if (entries.length === 0) return;
  const time = new Date().toISOString();
  const docs = entries.map((e) => ({ ...e, id: crypto.randomUUID(), time }));
  await (await collection()).insertMany(docs);
}

// Logging must never break the action that was logged (the money already moved).
export async function recordActivitySafe(...entries: Omit<ActivityEntry, "id" | "time">[]): Promise<void> {
  try {
    await recordActivity(...entries);
  } catch (error) {
    console.error("Activity log write failed:", error instanceof Error ? error.name : "UnknownError");
  }
}

export async function listActivity(limit = 50): Promise<ActivityEntry[]> {
  return (await collection()).find({}, { projection: { _id: 0 } }).sort({ time: -1 }).limit(limit).toArray();
}

// One activity entry per rent-day result.
const GUARDIAN_RULES = new Set(["tx-shape", "intent-mismatch", "landlord-only", "window", "legal-late-fee", "cap", "once-per-month"]);

export function rentActivity(r: RentDayResult, clock: { month: string; run: number }): Omit<ActivityEntry, "id" | "time"> {
  const rule = r.guardianDecision.rule;
  const p = r.payment;
  const paid = p !== null && (p.status === "paid" || p.status === "mock-paid");
  return {
    run: clock.run,
    month: clock.month,
    kind: "rent",
    tenantId: r.tenantId,
    title: `Rent $${r.intent.amountUsd.toLocaleString("en-US")}`,
    status: paid ? "paid" : p ? "failed" : rule === "once-per-month" || rule === "insufficient-funds" ? "refused" : "blocked",
    amountUsd: r.intent.amountUsd,
    rule,
    reason: r.guardianDecision.reason,
    blockedBy: !p && rule && GUARDIAN_RULES.has(rule) ? "guardian" : undefined,
    txHash: p?.txHash,
    explorerUrl: p && "explorerUrl" in p ? p.explorerUrl : undefined,
  };
}
