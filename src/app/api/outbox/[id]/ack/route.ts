import { NextResponse } from "next/server";
import { acknowledgeOutboxMessage } from "@/services/outboxService";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const acknowledged = await acknowledgeOutboxMessage(id);
    if (!acknowledged) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Outbox acknowledgement error:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Failed to acknowledge message" }, { status: 500 });
  }
}
