import { NextResponse } from "next/server";
import { getTenantById, getDueForTenant } from "@/services/rentRepository";
import type { ChatRequest, ChatResponse } from "@/types/rent";
import {
  asksWhenDue,
  formatMoneyReply,
  isMoneyIntent,
  normalizeChatText,
} from "@/lib/chatIntent";

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
    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
    }

    const due = await getDueForTenant(tenantId);
    const message = normalizeChatText(text);
    const greetingOnly = /^(hi|hello|hey|yo|sup)$/.test(message);

    let reply = `Hi ${tenant.name}! How can I help with your rent?`;

    const topUpAsk =
      /\b(top\s*up|topup|deposit|fund)\b/.test(message) ||
      message.includes("add to my wallet") ||
      message.includes("add money");

    if (!greetingOnly && topUpAsk) {
      reply = `To add money, use Top up in the app or say e.g. “Top up $100” in Polo chat. `
        + `Your wallet cap is $${tenant.capUsd}. `
        + `If a top-up would exceed the cap, you'll get an error and should retry with a smaller amount.`;
    } else if (!greetingOnly && (isMoneyIntent(text) || asksWhenDue(text))) {
      if (!due) {
        reply = `I couldn't find a current balance for ${tenant.name}.`;
      } else {
        reply = formatMoneyReply({
          name: tenant.name,
          rentUsd: due.rentUsd,
          utilitiesUsd: due.utilitiesUsd,
          lateFeeUsd: due.lateFeeUsd,
          dueDate: due.dueDate,
          includeWhen: asksWhenDue(text),
        });
      }
    }

    return NextResponse.json({ reply } satisfies ChatResponse);
  } catch (error) {
    console.error("Chat failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
