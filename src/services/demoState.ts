// Demo clock + run number, stored in MongoDB (collection "demoState", one document).
// The real Guardian checks every payment's date window and "already paid for this month + run"
// on the ledger, so rent day must use these values, and demo reset must bump `run`.
import { getDb } from "../lib/mongodb.ts";
import type { DemoState } from "../../types/rent";

export const DEFAULT_DEMO_STATE: DemoState = { id: "demo", today: "2026-10-01", run: 1 };

export type DemoClock = { today: string; month: string; run: number };

export const clockOf = (s: Pick<DemoState, "today" | "run">): DemoClock => ({
  today: s.today,
  month: s.today.slice(0, 7),
  run: s.run,
});

async function collection() {
  return (await getDb()).collection<DemoState>("demoState");
}

export async function getDemoState(): Promise<DemoState> {
  const found = await (await collection()).findOne({ id: "demo" }, { projection: { _id: 0 } });
  return found ?? DEFAULT_DEMO_STATE;
}

export async function setDemoToday(today: string): Promise<DemoState> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(`${today}T00:00:00Z`))) {
    throw new Error(`Invalid demo date: ${today}`);
  }
  const current = await getDemoState();
  const next: DemoState = { ...current, today };
  await (await collection()).updateOne({ id: "demo" }, { $set: next }, { upsert: true });
  return next;
}

export async function advanceDemoDays(days: number): Promise<DemoState> {
  const current = await getDemoState();
  const d = new Date(`${current.today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return setDemoToday(d.toISOString().slice(0, 10));
}

// Demo reset: back to rent day with a fresh run, so the same month can be paid again on-ledger.
export async function resetDemoState(): Promise<DemoState> {
  const current = await getDemoState();
  const next: DemoState = { id: "demo", today: DEFAULT_DEMO_STATE.today, run: current.run + 1 };
  await (await collection()).updateOne({ id: "demo" }, { $set: next }, { upsert: true });
  return next;
}
