// Real rent payments on XRPL Testnet (P1 money layer), replacing mockGuardian + mockXrpl in rent day.
// Flow (docs/MONEY-LAYER.md §5): build the RLUSD payment with the month/run tag → the tenant's agent
// signs → the live Guardian checks the real tx and co-signs or refuses → submit with both signatures.
// Loaded only via dynamic import from mainAgent in real mode, so the offline tests never load xrpl.
import { Wallet } from "xrpl";
import type { PaymentIntent as LedgerIntent } from "../../lib/types";
import { withClient } from "../../lib/xrpl/client";
import { explorerTx } from "../../lib/xrpl/config";
import { requestCosign } from "../../lib/xrpl/guardianClient";
import { paidOnLedger } from "../../lib/xrpl/history";
import { periodKey } from "../../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit } from "../../lib/xrpl/payments";
import type { GuardianDecision, LedgerPaymentResult, PaymentIntent, Tenant, Due } from "../../types/rent";
import type { DemoClock } from "./demoState.ts";

// Re-export: pure late-fee math lives in lateFee.ts so GET /api/state does not load xrpl.
export { withLateFee } from "./lateFee.ts";

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
