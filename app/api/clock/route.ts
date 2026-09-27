import { NextResponse } from "next/server";
import { requireDemoKey } from "@/lib/demoKey";
import { queueRentReminders } from "@/agent/reminders";
import { advanceDemoDays, clockOf, getDemoState, setDemoToday } from "@/services/demoState";

export const runtime = "nodejs";

// The demo clock. GET: current {today, month, run}. POST {advanceDays: 1} or {jumpTo: "2026-10-08"}.
// Minimal version so rent day can run on any demo date; P2 owns the full T15 clock/tick.
// GET stays public; POST requires x-demo-key (T18a).
export async function GET() {
  try {
    return NextResponse.json({ success: true, clock: clockOf(await getDemoState()) });
  } catch (error) {
    console.error("Clock read failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: "Clock unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = requireDemoKey(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { advanceDays?: unknown; jumpTo?: unknown } | null;
  try {
    let state;
    if (typeof body?.advanceDays === "number" && Number.isInteger(body.advanceDays) && Math.abs(body.advanceDays) <= 60) {
      state = await advanceDemoDays(body.advanceDays);
    } else if (typeof body?.jumpTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.jumpTo)) {
      state = await setDemoToday(body.jumpTo);
    } else {
      return NextResponse.json({ success: false, error: 'Send {"advanceDays": n} or {"jumpTo": "YYYY-MM-DD"}' }, { status: 400 });
    }
    const reminders = await queueRentReminders();

    return NextResponse.json({
      success: true,
      clock: clockOf(state),
      reminders,
    });
  } catch (error) {
    console.error("Clock update failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: "Clock update failed" }, { status: 500 });
  }
}
