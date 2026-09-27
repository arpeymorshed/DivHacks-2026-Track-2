// Real rent payments on XRPL Testnet (P1 money layer), replacing mockGuardian + mockXrpl in rent day.
// Flow (docs/MONEY-LAYER.md §5): build the RLUSD payment with the month/run tag → the tenant's agent
// signs → the live Guardian checks the real tx and co-signs or refuses → submit with both signatures.
// Loaded only via dynamic import from mainAgent in real mode, so the offline tests never load xrpl.
import { Wallet } from "xrpl";
import { cycleDay, FEE_PER_DAY_USD, GRACE_DAYS, legalFeeCapUsd } from "../../guardian/rules";
import type { PaymentIntent as LedgerIntent } from "../../lib/types";
import { withClient } from "../../lib/xrpl/client";
import { explorerTx } from "../../lib/xrpl/config";
import { requestCosign } from "../../lib/xrpl/guardianClient";
import { paidOnLedger } from "../../lib/xrpl/history";
import { periodKey } from "../../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit } from "../../lib/xrpl/payments";
import type { Due, GuardianDecision, LedgerPaymentResult, PaymentIntent, Tenant } from "../../types/rent";
import type { DemoClock } from "./demoState.ts";

// The late fee the Guardian will accept on the demo date (T30): none on days 1–5, then $5/day from day 6,
// capped at min($50, 5% of the unit's rent). Day 8 → $15.
// - A tenant who has already paid this month owes no fee (and none is shown).
// - Only late roommates pay. If several roommates in the unit are late (unpaid), the unit's cap is split
//   by share, so together they never pay more than the legal maximum for the unit.
export function withLateFee(
  due: Due,
  tenant: Tenant,
  clock: DemoClock,
  opts: { paid?: boolean; lateRoommates?: number } = {},
): Due {
  if (due.month !== clock.month) return due;
  if (opts.paid) return { ...due, daysLate: 0, lateFeeUsd: 0 };
  const day = cycleDay(clock.today, clock.month);
  const unitRentUsd = tenant.share > 0 ? due.rentUsd / tenant.share : due.rentUsd;
  const unitCap = legalFeeCapUsd(unitRentUsd);
  const cap = (opts.lateRoommates ?? 1) > 1 ? Math.floor(unitCap * tenant.share * 100) / 100 : unitCap;
  const fee = Math.min(cap, FEE_PER_DAY_USD * Math.max(0, day - GRACE_DAYS));
  return { ...due, daysLate: Math.max(0, day - 1), lateFeeUsd: fee };
}

// Which of these tenants have already paid this month + run, from the ledger (the source of truth).
export async function paidTenantIds(tenants: Tenant[], landlord: string, clock: DemoClock): Promise<Set<string>> {
  const period = periodKey(clock.month, clock.run);
  return withClient(async (client) => {
    const paid = await Promise.all(tenants.map((t) => paidOnLedger(client, t.walletAddress, landlord, period)));
    return new Set(tenants.filter((_, i) => paid[i]).map((t) => t.id));
  });
}

export type RealPaymentOutcome = { guardianDecision: GuardianDecision; payment: LedgerPaymentResult | null };

export async function payRentOnLedger(args: {
  tenant: Tenant;
  due: Due;
  intent: PaymentIntent;
  clock: DemoClock;
  agentSeed: string;
}): Promise<RealPaymentOutcome> {
  const { tenant, due, intent, clock, agentSeed } = args;
  const period = periodKey(clock.month, clock.run);
  const ledgerIntent: LedgerIntent = {
    tenantId: tenant.id,
    dueId: `${tenant.id}-${due.month}`,
    destination: intent.destination,
    rentUsd: due.rentUsd,
    utilitiesUsd: due.utilitiesUsd,
    lateFeeUsd: due.lateFeeUsd,
    totalUsd: intent.amountUsd,
    reason: intent.reason,
  };
  const context = { today: clock.today, month: clock.month, run: clock.run };

  return withClient(async (client) => {
    const alreadyPaid = await paidOnLedger(client, tenant.walletAddress, intent.destination, period);
    if (!alreadyPaid) {
      // Don't ask the Guardian for a payment the wallet can't cover: it would be co-signed, then fail on
      // the ledger, and the Guardian would treat it as "still settling" for about a minute.
      const { usd } = await getBalances(client, tenant.walletAddress);
      if (usd + 0.001 < intent.amountUsd) {
        return {
          guardianDecision: {
            approved: false,
            rule: "insufficient-funds",
            reason: `${tenant.name}'s rent wallet has $${usd}, but ${due.month} rent is $${intent.amountUsd}. Top up first.`,
          },
          payment: null,
        };
      }
    }
    // If it's already paid we still ask, so the refusal shown is the Guardian's own ("already paid").

    const memoHash = hashAuditRecord({ intent: ledgerIntent, context });
    const tx = await buildPayment(client, { from: tenant.walletAddress, to: intent.destination, usd: intent.amountUsd, memoHash, period });
    const agentBlob = agentSign(tx, Wallet.fromSeed(agentSeed));
    const decision = await requestCosign(agentBlob, ledgerIntent, context);
    const guardianDecision: GuardianDecision = { approved: decision.approved, reason: decision.reason, rule: decision.rule };
    if (!decision.approved || !decision.signature) return { guardianDecision, payment: null };

    const res = await multisignSubmit(client, [agentBlob, decision.signature]);
    const success = res.code === "tesSUCCESS";
    return {
      guardianDecision,
      payment: {
        success,
        status: success ? "paid" : "failed",
        tenantId: tenant.id,
        amountUsd: intent.amountUsd,
        destination: intent.destination,
        txHash: res.hash,
        ledgerCode: res.code,
        explorerUrl: explorerTx(res.hash),
        period,
      },
    };
  });
}
