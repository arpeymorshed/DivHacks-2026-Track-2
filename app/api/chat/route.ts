import { NextResponse } from "next/server";
import { getTenantById, getDueForTenant } from "@/services/rentRepository";
import type { ChatRequest, ChatResponse, Due, Tenant } from "@/types/rent";
import {
  asksWhenDue,
  formatMoneyReply,
  formatWalletBalanceReply,
  isCapIntent,
  isMoneyIntent,
  isOweIntent,
  isWalletBalanceIntent,
  normalizeChatText,
} from "@/lib/chatIntent";
import { dues as demoDues, tenants as demoTenants } from "@/data/demoBuilding";

/** Demo UI balances used when the ledger isn't reachable (mock mode). */
const DEMO_BALANCES: Record<string, number> = {
  abhimanyu: 1520,
  kashish: 980,
  musammat: 1550,
};

function isChatRequest(value: unknown): value is ChatRequest {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && "tenantId" in value && typeof value.tenantId === "string" && value.tenantId.trim().length > 0
    && "text" in value && typeof value.text === "string" && value.text.trim().length > 0;
}

async function resolveTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const t = await getTenantById(tenantId);
    if (t) return t;
  } catch {
    // Mongo unavailable — fall through to demo seed
  }
  return demoTenants.find((t) => t.id === tenantId) ?? null;
}

async function resolveDue(tenantId: string): Promise<Due | null> {
  try {
    const d = await getDueForTenant(tenantId);
    if (d) return d;
  } catch {
    // Mongo unavailable
  }
  return demoDues.find((d) => d.tenantId === tenantId) ?? null;
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
    const tenant = await resolveTenant(tenantId);

    if (!tenant) {
      return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
    }

    const due = await resolveDue(tenantId);
    const message = normalizeChatText(text);
    const greetingOnly = /^(hi|hello|hey|yo|sup)$/.test(message);

    let reply = `Hi ${tenant.name}! How can I help with your rent?`;

    const topUpAsk =
      /\b(top\s*up|topup|deposit|fund)\b/.test(message) ||
      message.includes("add to my wallet") ||
      message.includes("add money");

    const balanceUsd = DEMO_BALANCES[tenantId] ?? null;

    if (!greetingOnly && isWalletBalanceIntent(text)) {
      const dueTotal = due
        ? due.rentUsd + due.utilitiesUsd + due.lateFeeUsd
        : undefined;
      reply = formatWalletBalanceReply({
        name: tenant.name,
        balanceUsd,
        capUsd: tenant.capUsd,
        dueTotalUsd: dueTotal,
      });
    } else if (!greetingOnly && isCapIntent(text)) {
      const bal = balanceUsd ?? 0;
      const room = Math.max(0, Math.round((tenant.capUsd - bal) * 100) / 100);
      reply = balanceUsd == null
        ? `Your wallet cap is $${tenant.capUsd}.`
        : `Your wallet cap is $${tenant.capUsd}. Balance $${balanceUsd}, so you can still add up to $${room}.`;
    } else if (!greetingOnly && topUpAsk && !isOweIntent(text) && !asksWhenDue(text)) {
      reply = `To add money, use Top up in the app or say e.g. “Top up $100” in Polo chat. `
        + `Your wallet cap is $${tenant.capUsd}. `
        + `If a top-up would exceed the cap, you'll get an error and should retry with a smaller amount.`;
    } else if (!greetingOnly && (isMoneyIntent(text) || asksWhenDue(text))) {
      if (!due) {
        reply = `I couldn't find current dues for ${tenant.name}.`;
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
    console.error("Chat failed:", error instanceof Error ? error.message : "UnknownError");
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
