import { NextResponse } from "next/server";
import { resetDemoOutbox } from "@/services/outboxService";
import { resetDemoState } from "@/services/demoState";
import { getTenants } from "@/services/rentRepository";
import { realPaymentsEnabled } from "@/services/xrplConfig";

export const runtime = "nodejs";
export const maxDuration = 60; // recycling RLUSD is a few ledger transactions

// Demo reset: clear rent-day messages, move the clock back to rent day with a NEW run number (so the
// Guardian treats the month as unpaid again), and recycle RLUSD: landlord → bank → each tenant.
export async function POST() {
  try {
    const result = await resetDemoOutbox();
    const state = await resetDemoState();
    let funds = null;
    if (realPaymentsEnabled()) {
      const { recycleDemoFunds } = await import("@/services/demoFunds");
      funds = await recycleDemoFunds(await getTenants());
    }

    return NextResponse.json({
      success: true,
      reset: result,
      state,
      funds,
    });
  } catch (error) {
    console.error("Demo reset failed:", error instanceof Error ? error.name : "UnknownError");

    return NextResponse.json(
      {
        success: false,
        error: "Demo reset failed",
      },
      { status: 500 }
    );
  }
}
