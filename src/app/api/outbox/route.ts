import { NextResponse } from "next/server";
import { outbox } from "@/data/outbox";

export const dynamic = "force-dynamic";

export async function GET() {
  // Reading does not acknowledge messages; P4's acknowledgement contract is pending.
  return NextResponse.json(outbox, { headers: { "Cache-Control": "no-store" } });
}
