import { NextResponse } from "next/server";

import {
  getTenantById,
  getDueForTenant,
  setPayLaterUntil,
} from "@/services/rentRepository";

import {
  generateTenantReply,
  parseTenantRequest,
} from "@/agent/gemini";

import { evaluatePayLaterRequest } from "@/agent/paymentNegotiation";
import { asksAboutWallet, mightBePayLater, walletSentence } from "@/agent/walletReply";
import { clockOf, getDemoState } from "@/services/demoState";

const MAX_TEXT_CHARS = 1000;

import type {
  ChatRequest,
  ChatResponse,
} from "@/types/rent";

// The tenant's rent-wallet balance in USD, live from the ledger, or null if the lookup fails.
// xrpl is loaded lazily inside the request: importing it at the top of a route breaks Vercel (HTML 500s).
async function walletBalanceUsd(address: string): Promise<number | null> {
  try {
    const { withClient } = await import("@/lib/xrpl/client");
    const { getBalances } = await import("@/lib/xrpl/payments");
    // Don't let a slow Testnet stall the chat on stage: answer without the balance after 4s.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    return await Promise.race([withClient(async (client) => (await getBalances(client, address)).usd), timeout]);
  } catch (error) {
    console.error("Wallet balance lookup failed:", error instanceof Error ? error.name : "UnknownError");
    return null;
  }
}

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

    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: `text must be ${MAX_TEXT_CHARS} characters or fewer` },
        { status: 400 }
      );
    }

    // Use the demo clock (not the real date) so answers match rent day and GET /api/state.
    const clock = clockOf(await getDemoState());

    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { error: "Unknown tenant" },
        { status: 404 }
      );
    }

    const due = await getDueForTenant(tenantId, clock.month);

    if (!due) {
      return NextResponse.json({
        reply: `I couldn't find a current balance for ${tenant.name}.`,
      } satisfies ChatResponse);
    }

    /*
     * Step 1:
     * Let Gemini understand what the tenant is asking.
     *
     * If Gemini is temporarily unavailable, we fail safely:
     * no payment-date change is made.
     */
    let intent:
      | Awaited<ReturnType<typeof parseTenantRequest>>
      | null = null;

    try {
      // Only messages that could be a "pay on the Nth" request need Gemini's intent parser.
      if (mightBePayLater(text)) intent = await parseTenantRequest(text);
    } catch (error) {
      console.error(
        "Gemini intent parsing failed:",
        error instanceof Error ? error.name : "UnknownError"
      );
    }

    /*
     * Step 2:
     * RT—not Gemini—decides whether a delayed payment
     * request is allowed.
     */
    if (intent?.intent === "pay_later") {
      const decision = evaluatePayLaterRequest(
        due,
        intent.requestedDay,
        new Date(`${clock.today}T00:00:00Z`)
      );

      if (!decision.approved || !decision.payLaterUntil) {
        return NextResponse.json({
          reply: decision.reason,
        } satisfies ChatResponse);
      }

      const updatedDue = await setPayLaterUntil(
        tenantId,
        decision.payLaterUntil,
        due.month
      );

      if (!updatedDue) {
        return NextResponse.json(
          { error: "Unable to update payment arrangement" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        reply:
          `Yes — I can schedule your payment for `
          + `${decision.payLaterUntil}. `
          + `That date is within the grace period, so no late fee applies.`,
      } satisfies ChatResponse);
    }

    /*
     * Step 3:
     * Normal rent questions go through Gemini using trusted
     * MongoDB values.
     */
    const totalUsd =
      due.rentUsd
      + due.utilitiesUsd
      + due.lateFeeUsd;

    // Wallet questions get the live balance (and how far short / covered the tenant is).
    const balance = asksAboutWallet(text) ? await walletBalanceUsd(tenant.walletAddress) : null;
    const wallet = balance === null ? null : walletSentence(balance, totalUsd);

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
          ...(balance === null ? {} : { walletBalanceUsd: balance, walletSummary: wallet ?? undefined }),
        },
      });
    } catch (error) {
      console.error(
        "Gemini reply failed:",
        error instanceof Error ? error.name : "UnknownError"
      );

      reply =
        `Hi ${tenant.name}. You currently owe $${totalUsd}: `
        + `$${due.rentUsd} rent + $${due.utilitiesUsd} utilities`
        + (
          due.lateFeeUsd > 0
            ? ` + $${due.lateFeeUsd} late fee.`
            : "."
        )
        + (wallet ? ` ${wallet}` : "");
    }

    return NextResponse.json(
      { reply } satisfies ChatResponse
    );
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
