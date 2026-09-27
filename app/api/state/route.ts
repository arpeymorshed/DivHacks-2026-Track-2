import { NextResponse } from "next/server";
import { buildState } from "@/services/stateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// T18: the whole demo in one read-only call: clock, building, tenants (dues, stage, balances, agent),
// and the activity log with explorer links and Guardian reasons. Public so judges can test it.
export async function GET() {
  try {
    return NextResponse.json(await buildState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("State failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "State unavailable" }, { status: 500 });
  }
}
