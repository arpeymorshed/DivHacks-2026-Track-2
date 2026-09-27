// The Guardian's rules. Pure: everything is checked against the DECODED transaction the agent
// signed, never just the agent's description of it (the intent).
import { RLUSD, rlusdToUsd } from "../lib/xrpl/config";
import { periodKey, periodTags } from "../lib/xrpl/memos";
import type { PaymentIntent } from "../lib/types";

// NY Real Property Law §238-a (verify before judging; not legal advice) + the landlord's policy.
export const DUE_DAY = 1;
export const GRACE_DAYS = 5; // days 1–5 of the rent cycle (the due date is day 1): no fee
// Fee starts on day 6, so day 8 = $15 (PLAN.md; kept as-is by Arpey 2026-09-26). To start on day 7, set GRACE_DAYS = 6.
export const FEE_PER_DAY_USD = 5;
export const EARLY_PAY_DAYS = 5; // payment window opens this many days before the due date
export const LATE_PAY_DAYS = 30; // ...and closes this many days after
export const MAX_FEE_DROPS = 5000;

// rentShareUsd: the tenant's exact rent share; maxUtilitiesUsd: most the utilities line may be in one payment.
// The Guardian checks each line of the intent against these, so a fee can't be relabelled as rent.
export type WalletPolicy = {
  tenantId: string;
  agent: string;
  capUsd: number;
  unitRentUsd: number;
  rentShareUsd: number;
  maxUtilitiesUsd: number;
};
export type GuardianPolicy = { landlord: string; rentWallets: Record<string, WalletPolicy> };

// Fails closed: throws unless every rent wallet has all its limits as numbers. An old-shape policy
// (e.g. missing rentShareUsd) would otherwise make the amount checks compare against undefined and pass.
export function validatePolicy(policy: GuardianPolicy): GuardianPolicy {
  if (typeof policy?.landlord !== "string" || !policy.landlord.startsWith("r")) throw new Error("policy.landlord must be an XRPL address");
  const wallets = Object.entries(policy.rentWallets ?? {});
  if (wallets.length === 0) throw new Error("policy.rentWallets is empty");
  for (const [address, w] of wallets) {
    for (const k of ["capUsd", "unitRentUsd", "rentShareUsd", "maxUtilitiesUsd"] as const) {
      if (typeof w[k] !== "number" || !Number.isFinite(w[k])) throw new Error(`policy for ${address}: ${k} must be a number`);
    }
    if (typeof w.agent !== "string" || !w.agent.startsWith("r")) throw new Error(`policy for ${address}: agent must be an XRPL address`);
  }
  return policy;
}
// Demo clock: today "2026-10-08", month "2026-10", run = demo run number (demo reset increments it).
export type CosignContext = { today: string; month: string; run: number };
export type PriorPayment = "none" | "pending" | "settled"; // this wallet's payment for the month + run

export type RuleInput = {
  tx: Record<string, unknown>;
  intent: PaymentIntent;
  context: CosignContext;
  policy: GuardianPolicy;
  prior: PriorPayment;
};
export type RuleResult = { approved: boolean; rule: string; reason: string };

const refuse = (rule: string, reason: string): RuleResult => ({ approved: false, rule, reason });
const usd = (n: number) => `$${n.toFixed(2)}`;
const DAY_MS = 86_400_000;

export function legalFeeCapUsd(unitRentUsd: number): number {
  return Math.min(50, Math.round(unitRentUsd * 0.05 * 100) / 100);
}

// Day of the rent cycle: the due date is day 1, the next day is day 2, and so on (0 or less = before due).
export function cycleDay(today: string, month: string): number {
  const due = Date.parse(`${month}-${String(DUE_DAY).padStart(2, "0")}T00:00:00Z`);
  return Math.round((Date.parse(`${today}T00:00:00Z`) - due) / DAY_MS) + 1;
}

export function checkRules({ tx, intent, context, policy, prior }: RuleInput): RuleResult {
  // --- the transaction must be exactly a plain RLUSD payment from a registered rent wallet ---
  if (tx.TransactionType !== "Payment") return refuse("tx-shape", `Only payments can be co-signed, got ${tx.TransactionType}.`);
  const wallet = policy.rentWallets[tx.Account as string];
  if (!wallet) return refuse("tx-shape", `${tx.Account} is not a registered rent wallet.`);
  const amount = tx.Amount as { currency?: string; issuer?: string; value?: string } | string;
  if (typeof amount !== "object" || amount.currency !== RLUSD.currency || amount.issuer !== RLUSD.issuer) {
    return refuse("tx-shape", "Payment must be in RLUSD from the official issuer.");
  }
  if (tx.SendMax !== undefined || tx.Paths !== undefined || tx.DeliverMin !== undefined || Number(tx.Flags ?? 0) !== 0) {
    return refuse("tx-shape", "Partial payments, paths and SendMax are not allowed.");
  }
  const feeDrops = Number(tx.Fee);
  if (!Number.isFinite(feeDrops) || feeDrops < 0) return refuse("tx-shape", "Transaction has no valid network fee.");
  if (feeDrops > MAX_FEE_DROPS) return refuse("tx-shape", `Network fee ${tx.Fee} drops is too high.`);
  const signers = (tx.Signers as { Signer: { Account: string } }[] | undefined) ?? [];
  if (signers.length !== 1 || signers[0].Signer.Account !== wallet.agent) {
    return refuse("tx-shape", "Must carry exactly one signature, from this wallet's own agent.");
  }
  if (!Number.isInteger(context.run) || context.run < 0) return refuse("tx-shape", "The request needs a demo run number.");
  const expectedPeriod = periodKey(context.month, context.run);
  const tags = periodTags(tx);
  if (tags.length !== 1 || tags[0] !== expectedPeriod) {
    return refuse("tx-shape", `Payment must be tagged ${expectedPeriod} (found ${tags.join(", ") || "no tag"}).`);
  }

  // --- the agent's description must match what it actually signed ---
  const txUsd = rlusdToUsd(amount.value!);
  if (tx.Destination !== intent.destination || Math.abs(txUsd - intent.totalUsd) > 0.01) {
    return refuse(
      "intent-mismatch",
      `The transaction pays ${usd(txUsd)} to ${tx.Destination}, but the agent described ${usd(intent.totalUsd)} to ${intent.destination}.`,
    );
  }
  if (Math.abs(intent.rentUsd + intent.utilitiesUsd + intent.lateFeeUsd - intent.totalUsd) > 0.01) {
    return refuse("intent-mismatch", "Rent + utilities + late fee don't add up to the total.");
  }

  if ([intent.rentUsd, intent.utilitiesUsd, intent.lateFeeUsd].some((n) => !(n >= 0))) {
    return refuse("intent-mismatch", "Rent, utilities and late fee must each be zero or more.");
  }

  // Rules run in this order so each attack is refused by the rule that names it
  // (e.g. an illegal $200 fee says "legal-late-fee", not "cap").

  // --- rule 1: only the verified landlord ---
  if (tx.Destination !== policy.landlord) {
    return refuse("landlord-only", `${tx.Destination} is not the landlord's verified address. Rent only goes to ${policy.landlord}.`);
  }

  // --- rule 2: payment window ---
  const day = cycleDay(context.today, context.month);
  const due = Date.parse(`${context.month}-01T00:00:00Z`);
  const today = Date.parse(`${context.today}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(today)) return refuse("window", "Invalid date in the request.");
  if (today < due - EARLY_PAY_DAYS * DAY_MS || today > due + LATE_PAY_DAYS * DAY_MS) {
    return refuse("window", `${context.today} is outside the payment window for ${context.month}.`);
  }

  // --- rule 3: legal late fee ---
  const fee = intent.lateFeeUsd;
  if (fee > 0 && day <= GRACE_DAYS) {
    return refuse("legal-late-fee", `No late fee is allowed during the grace period (days 1–${GRACE_DAYS}; today is day ${day}).`);
  }
  const legalCap = legalFeeCapUsd(wallet.unitRentUsd);
  if (fee > legalCap) return refuse("legal-late-fee", `${usd(fee)} is over the legal maximum of ${usd(legalCap)} (min of $50 or 5% of rent).`);
  const accrued = Math.min(legalCap, FEE_PER_DAY_USD * Math.max(0, day - GRACE_DAYS));
  if (fee > accrued + 0.001) return refuse("legal-late-fee", `${usd(fee)} is more than the ${usd(accrued)} accrued by day ${day}.`);

  // --- rule 4: amounts: exact rent share, utilities limit, tenant's cap ---
  if (Math.abs(intent.rentUsd - wallet.rentShareUsd) > 0.01) {
    return refuse("cap", `Rent must be exactly the tenant's share of ${usd(wallet.rentShareUsd)}, not ${usd(intent.rentUsd)}.`);
  }
  if (intent.utilitiesUsd > wallet.maxUtilitiesUsd) {
    return refuse("cap", `Utilities of ${usd(intent.utilitiesUsd)} are over the ${usd(wallet.maxUtilitiesUsd)} limit for this tenant.`);
  }
  if (txUsd > wallet.capUsd) return refuse("cap", `${usd(txUsd)} is over the tenant's cap of ${usd(wallet.capUsd)}.`);

  // --- rule 5: once per month ---
  if (prior === "settled") return refuse("once-per-month", `Rent for ${context.month} is already paid (see the ledger, tag ${expectedPeriod}).`);
  if (prior === "pending") return refuse("once-per-month", `A payment for ${context.month} is still settling.`);

  return {
    approved: true,
    rule: "all",
    reason: `${usd(txUsd)} to the landlord for ${context.month} passes all 5 rules${fee > 0 ? ` (includes a legal ${usd(fee)} late fee)` : ""}.`,
  };
}
