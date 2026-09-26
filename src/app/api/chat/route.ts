import { NextResponse } from "next/server";
import { tenants, dues } from "@/data/demoBuilding";
import type { ChatRequest, ChatResponse } from "@/types/rent";

function isChatRequest(value: unknown): value is ChatRequest {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && "tenantId" in value && typeof value.tenantId === "string" && value.tenantId.trim().length > 0
    && "text" in value && typeof value.text === "string" && value.text.trim().length > 0;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isChatRequest(body)) {
    return NextResponse.json(
      { error: "tenantId and text are required" },
      { status: 400 }
    );
  }

  try {
    const { tenantId, text } = body;
    const tenant = tenants.find((tenant) => tenant.id === tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
    }

    const due = dues.find((due) => due.tenantId === tenantId);
    let reply = `Hi ${tenant.name}.`;

    if (text.toLowerCase().includes("owe") && due) {
      const total = due.rentUsd + due.utilitiesUsd + due.lateFeeUsd;
      reply = `You owe $${total} for ${due.month}: `
        + `$${due.rentUsd} rent + $${due.utilitiesUsd} utilities`
        + (due.lateFeeUsd > 0 ? ` + $${due.lateFeeUsd} late fee.` : ".");
    }

    return NextResponse.json({ reply } satisfies ChatResponse);
  } catch (error) {
    console.error("Chat failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
