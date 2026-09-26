// T37 (P1 half): the "What could go wrong?" scenarios. Each one tries something bad with a real,
// agent-signed transaction and shows who stops it: the Guardian (refuses to co-sign) or the ledger itself.
// P2's POST /api/attacks/:name calls runAttack and stores `result.audit` in the audit log.
//
// Safety: an attack NEVER submits a transaction the Guardian approved. If a scenario is unexpectedly
// approved, the result says so (blocked: false) and nothing is sent. Only the stolen-key scenario submits,
// and it carries a single signature, so the ledger rejects it before it can move money (tef: no fee).
// "double-charge" first checks the ledger for this month's rent and does nothing until it's paid, so clicking
// it early can't leave a "still settling" record in the Guardian that would block the real rent.
import { type Client, Wallet } from "xrpl";
import { EARLY_PAY_DAYS, LATE_PAY_DAYS } from "../../guardian/rules";
import type { AuditEntry, GuardianDecision, PaymentIntent } from "../types";
import { requestCosign } from "./guardianClient";
import { paidOnLedger } from "./history";
import { periodKey } from "./memos";
import { agentSign, buildPayment, hashAuditRecord, multisignSubmit } from "./payments";

// `live`: the 3 shown in the 3-minute demo (PLAN.md); the rest are ready for Q&A.
export const ATTACKS = {
  "scam-address": { title: 'Scam text: "we changed our bank account"', live: true },
  "illegal-late-fee": { title: "Landlord agent charges a $200 late fee", live: true },
  "stolen-key": { title: "Attacker steals the agent's key", live: true },
  "fee-in-grace": { title: "Late fee charged on day 2 (inside the grace period)", live: false },
  "inflated-coned": { title: "Inflated ConEd bill: $500 utilities", live: false },
  "double-charge": { title: "Rent charged twice in the same month", live: false },
  "lying-agent": { title: 'Agent says "landlord" but signs a payment to someone else', live: false },
} as const;
export type AttackName = keyof typeof ATTACKS;

export type AttackTarget = {
  tenantId: string;
  walletAddress: string; // the tenant's rent wallet
  agentSeed: string; // that wallet's agent key (what an attacker or a rogue agent would have)
  landlordAddress: string;
  rentShareUsd: number;
  utilitiesUsd: number; // this month's normal utilities share, e.g. 38
  clock: { today: string; month: string; run: number }; // demo clock
};

export type AttackResult = {
  name: AttackName;
  title: string;
  blocked: boolean; // false with rule "not-ready": the scenario can't run yet (nothing was sent anywhere)
  blockedBy: "guardian" | "ledger" | null;
  rule: string;
  reason: string;
  ledgerCode?: string;
  audit: AuditEntry; // status "blocked", or "failed" if (unexpectedly) not blocked
};

const scamAddress = () => Wallet.generate().address; // a fresh address nobody controls
const dayOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;
const DAY_MS = 86_400_000;

// The Guardian's payment window runs before the amount and once-per-month rules, so a scenario that keeps the
// demo date needs a date inside it; otherwise it would report "window" instead of its own rule.
function inWindow(today: string, month: string): boolean {
  const due = Date.parse(`${month}-01T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  return t >= due - EARLY_PAY_DAYS * DAY_MS && t <= due + LATE_PAY_DAYS * DAY_MS;
}

export async function runAttack(client: Client, name: AttackName, t: AttackTarget): Promise<AttackResult> {
  const title = ATTACKS[name].title;
  const period = periodKey(t.clock.month, t.clock.run);
  let context = inWindow(t.clock.today, t.clock.month) ? { ...t.clock } : { ...t.clock, today: dayOf(t.clock.month, 1) };
  let intent: PaymentIntent = {
    tenantId: t.tenantId,
    dueId: `${t.tenantId}-${t.clock.month}`,
    destination: t.landlordAddress,
    rentUsd: t.rentShareUsd,
    utilitiesUsd: t.utilitiesUsd,
    lateFeeUsd: 0,
    totalUsd: t.rentShareUsd + t.utilitiesUsd,
    reason: title,
  };
  let txDestination = t.landlordAddress;

  if (name === "double-charge" && !(await paidOnLedger(client, t.walletAddress, t.landlordAddress, period))) {
    const reason = `Not ready: ${t.tenantId}'s rent for ${t.clock.month} isn't paid yet. Run this after rent day.`;
    const decision: GuardianDecision = { approved: false, rule: "not-ready", reason };
    const audit: AuditEntry = { id: crypto.randomUUID(), time: new Date().toISOString(), intent, decision, memoHash: "", status: "failed" };
    return { name, title, blocked: false, blockedBy: null, rule: "not-ready", reason, audit };
  }

  switch (name) {
    case "scam-address":
      txDestination = intent.destination = scamAddress();
      break;
    case "illegal-late-fee":
      context = { ...context, today: dayOf(t.clock.month, 20) }; // very late, so only the amount is illegal
      intent = { ...intent, lateFeeUsd: 200, totalUsd: intent.totalUsd + 200 };
      break;
    case "fee-in-grace":
      context = { ...context, today: dayOf(t.clock.month, 2) };
      intent = { ...intent, lateFeeUsd: 5, totalUsd: intent.totalUsd + 5 };
      break;
    case "inflated-coned":
      intent = { ...intent, utilitiesUsd: 500, totalUsd: t.rentShareUsd + 500 };
      break;
    case "lying-agent":
      txDestination = scamAddress(); // the intent still says "landlord"
      break;
    case "double-charge":
    case "stolen-key":
      break; // a normal rent payment; what's wrong is when (again) or who signs (agent alone)
  }

  const memoHash = hashAuditRecord({ attack: name, intent, context });
  const tx = await buildPayment(client, { from: t.walletAddress, to: txDestination, usd: intent.totalUsd, memoHash, period });
  const agentBlob = agentSign(tx, Wallet.fromSeed(t.agentSeed));
  const base = { id: crypto.randomUUID(), time: new Date().toISOString(), intent, memoHash };

  if (name === "stolen-key") {
    // The attacker has the agent key but not the Guardian's, so it submits with one signature.
    const res = await multisignSubmit(client, [agentBlob]);
    const blocked = res.code !== "tesSUCCESS";
    const decision: GuardianDecision = {
      approved: false,
      rule: "ledger-quorum",
      reason: blocked
        ? `The ledger itself rejected it (${res.code}): the agent key alone is 1 of the 2 signatures this wallet needs.`
        : "NOT BLOCKED: the ledger accepted an agent-only signature.",
    };
    return {
      name, title, blocked, blockedBy: blocked ? "ledger" : null, rule: decision.rule, reason: decision.reason,
      ledgerCode: res.code, audit: { ...base, decision, status: blocked ? "blocked" : "failed" },
    };
  }

  const decision = await requestCosign(agentBlob, intent, context);
  if (decision.approved) {
    // Never submit, and drop the Guardian's signature so it can't be reused from the audit log.
    const reason =
      name === "double-charge"
        ? "NOT BLOCKED: no rent payment exists yet for this month and run. Run this after rent day."
        : `NOT BLOCKED: the Guardian approved it (${decision.reason}). Nothing was submitted.`;
    const safe: GuardianDecision = { approved: true, rule: decision.rule, reason };
    return { name, title, blocked: false, blockedBy: null, rule: decision.rule, reason, audit: { ...base, decision: safe, status: "failed" } };
  }
  return { name, title, blocked: true, blockedBy: "guardian", rule: decision.rule, reason: decision.reason, audit: { ...base, decision, status: "blocked" } };
}
