import { NextResponse } from "next/server";
import { getTenantById, getDueForTenant } from "@/services/rentRepository";
import { generateTenantReply } from "@/agent/gemini";
import type { ChatRequest, ChatResponse } from "@/types/rent";

function isChatRequest(value: unknown): value is ChatRequest {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && "tenantId" in value
    && typeof value.tenantId === "string"
    && value.tenantId.trim().length > 0
    && "text" in value
    && typeof value.text === "string"
    && value.text.trim().length > 0;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isChatRequest(body)) {
    return NextResponse.json(
      { error: "tenantId and text are required" },
      { status: 400 }
    );
  }

  try {
    const { tenantId, text } = body;

    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { error: "Unknown tenant" },
        { status: 404 }
      );
    }

    const due = await getDueForTenant(tenantId);

    if (!due) {
      return NextResponse.json({
        reply: `I couldn't find a current balance for ${tenant.name}.`,
      } satisfies ChatResponse);
    }

    // Financial values are calculated by RentRelay, not Gemini.
    const totalUsd =
      due.rentUsd +
      due.utilitiesUsd +
      due.lateFeeUsd;

    let reply: string;

    try {
      reply = await generateTenantReply({
        userText: text,
        facts: {
          tenantName: tenant.name,
          rentUsd: due.rentUsd,
          utilitiesUsd: due.utilitiesUsd,
          lateFeeUsd: due.lateFeeUsd,
          totalUsd,
          dueDate: due.dueDate,
          daysLate: due.daysLate,
          reason: due.reason,
        },
      });
    } catch (geminiError) {
      console.error(
        "Gemini reply failed:",
        geminiError instanceof Error
          ? geminiError.name
          : "UnknownError"
      );

      // Safe fallback so chat still works if Gemini is unavailable.
      reply =
        `Hi ${tenant.name}. You currently owe $${totalUsd}: `
        + `$${due.rentUsd} rent + $${due.utilitiesUsd} utilities`
        + (
          due.lateFeeUsd > 0
            ? ` + $${due.lateFeeUsd} late fee.`
            : "."
        );
    }

    return NextResponse.json({ reply } satisfies ChatResponse);
  } catch (error) {
    console.error(
      "Chat failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
