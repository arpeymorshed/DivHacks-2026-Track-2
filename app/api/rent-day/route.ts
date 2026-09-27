import { NextResponse } from "next/server";
import { runRentDay } from "@/agent/mainAgent";
import { clockOf, getDemoState } from "@/services/demoState";

export const runtime = "nodejs";
export const maxDuration = 60; // each ledger payment takes ~4–8s; tenants pay in parallel

// Every tenant agent pays this month's rent on the demo date (real XRPL Testnet payments through the
// Guardian when the XRPL env is configured; see docs/MONEY-LAYER.md).
export async function POST() {
  try {
    const clock = clockOf(await getDemoState());
    const results = await runRentDay(clock.month, clock);

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
