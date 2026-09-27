import { NextResponse } from "next/server";
import { requireDemoKey } from "@/lib/demoKey";
import { runRentDay } from "@/agent/mainAgent";
import { clockOf, getDemoState } from "@/services/demoState";
import { recordActivitySafe, rentActivity } from "@/services/activityLog";

export const runtime = "nodejs";
export const maxDuration = 60; // each ledger payment takes ~4–8s; tenants pay in parallel

// Every tenant agent pays this month's rent on the demo date (real XRPL Testnet payments through the
// Guardian when the XRPL env is configured; see docs/MONEY-LAYER.md).
export async function POST(req: Request) {
  const denied = requireDemoKey(req);
  if (denied) return denied;
  try {
    const clock = clockOf(await getDemoState());
    const results = await runRentDay(clock.month, clock);
    await recordActivitySafe(...results.map((r) => rentActivity(r, clock)));

    return NextResponse.json({
      success: true,
      clock,
      results,
    });
  } catch (error) {
    console.error("Rent day failed:", error instanceof Error ? error.name : "UnknownError");

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run rent day",
      },
      { status: 500 }
    );
  }
}
