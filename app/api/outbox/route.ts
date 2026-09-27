import { NextResponse } from "next/server";
import { getPendingOutboxMessages } from "@/services/outboxService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await getPendingOutboxMessages();
    return NextResponse.json(messages, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Outbox error:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Failed to load outbox" }, { status: 500 });
  }
}
