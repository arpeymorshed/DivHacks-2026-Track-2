import { NextResponse } from "next/server";
import { buildOfflineState } from "@/services/offlineState";
import { buildState } from "@/services/stateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// T18: the whole demo in one read-only call: clock, building, tenants (dues, stage, balances, agent),
// and the activity log with explorer links and Guardian reasons. Public so judges can test it.
// Without Mongo (local preview), return seed offline state so the UI still loads.
export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(buildOfflineState(), { headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json(await buildState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("State failed, using offline demo:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(buildOfflineState(), { headers: { "Cache-Control": "no-store" } });
  }
}
