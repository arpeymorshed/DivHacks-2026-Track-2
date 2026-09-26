import assert from "node:assert/strict";
import { test } from "node:test";
import { RLUSD, usdToRlusd } from "../lib/xrpl/config";
import { buildMemos, periodKey } from "../lib/xrpl/memos";
import type { PaymentIntent } from "../lib/types";
import { checkRules, type GuardianPolicy, type RuleInput, validatePolicy } from "./rules";

const LANDLORD = "rLandlord";
const WALLET = "rMayaWallet";
const AGENT = "rMayaAgent";
const policy: GuardianPolicy = { landlord: LANDLORD, rentWallets: { [WALLET]: { tenantId: "maya", agent: AGENT, capUsd: 1600, unitRentUsd: 2900, rentShareUsd: 1450, maxUtilitiesUsd: 100 } } };

function input(o: { usd?: number; dest?: string; fee?: number; today?: string; prior?: RuleInput["prior"]; tx?: object; intent?: Partial<PaymentIntent> } = {}): RuleInput {
  const fee = o.fee ?? 0;
  const total = o.usd ?? 1450 + 38 + fee;
  const dest = o.dest ?? LANDLORD;
  return {
    tx: {
      TransactionType: "Payment", Account: WALLET, Destination: dest, Fee: "36",
      Amount: { currency: RLUSD.currency, issuer: RLUSD.issuer, value: usdToRlusd(total) },
      Signers: [{ Signer: { Account: AGENT } }],
      Memos: buildMemos("00".repeat(32), periodKey("2026-10", 1)),
      ...o.tx,
    },
    intent: { tenantId: "maya", dueId: "d1", destination: dest, rentUsd: 1450, utilitiesUsd: total - 1450 - fee, lateFeeUsd: fee, totalUsd: total, reason: "rent", ...o.intent },
    context: { today: o.today ?? "2026-10-01", month: "2026-10", run: 1 },
    policy,
    prior: o.prior ?? "none",
  };
}

test("approves on-time rent + utilities on the 1st", () => {
  const r = checkRules(input());
  assert.equal(r.approved, true, r.reason);
});

test("approves day 8 rent + $15 late fee (demo script)", () => {
  const r = checkRules(input({ fee: 15, today: "2026-10-08" }));
  assert.equal(r.approved, true, r.reason);
});

test("refuses scam 'new bank account' destination", () => {
  assert.equal(checkRules(input({ dest: "rScammer" })).rule, "landlord-only");
});

test("refuses when the tx pays someone other than the intent says", () => {
  assert.equal(checkRules(input({ intent: { destination: LANDLORD }, tx: { Destination: "rScammer" } })).rule, "intent-mismatch");
});

test("refuses inflated ConEd over the utilities limit", () => {
  const r = checkRules(input({ usd: 1450 + 500 }));
  assert.equal(r.rule, "cap");
  assert.match(r.reason, /Utilities/);
});

test("refuses illegal $200 late fee as legal-late-fee (demo line)", () => {
  assert.equal(checkRules(input({ fee: 200, today: "2026-10-20" })).rule, "legal-late-fee");
});

test("refuses a late fee disguised as rent (REVIEW T13 #1)", () => {
  const r = checkRules(input({ usd: 1600, today: "2026-10-02", intent: { rentUsd: 1562, utilitiesUsd: 38, lateFeeUsd: 0 } }));
  assert.equal(r.approved, false);
  assert.match(r.reason, /exactly the tenant's share/);
});

test("refuses a total over the tenant's cap", () => {
  const tight: GuardianPolicy = { ...policy, rentWallets: { [WALLET]: { ...policy.rentWallets[WALLET], capUsd: 1480 } } };
  assert.equal(checkRules({ ...input(), policy: tight }).rule, "cap");
});

test("refuses a late fee inside the grace period (day 2)", () => {
  assert.equal(checkRules(input({ fee: 5, today: "2026-10-03" })).rule, "legal-late-fee");
});

test("refuses a fee above what has accrued (day 7 = $10 max)", () => {
  assert.equal(checkRules(input({ fee: 15, today: "2026-10-07" })).rule, "legal-late-fee");
});

test("caps the fee at min($50, 5% rent) even when very late", () => {
  assert.equal(checkRules(input({ fee: 50, today: "2026-10-30" })).approved, true);
  assert.equal(checkRules(input({ fee: 55, today: "2026-10-30" })).rule, "legal-late-fee");
});

test("refuses a double charge in the same month", () => {
  assert.equal(checkRules(input({ prior: "settled" })).rule, "once-per-month");
});

test("refuses outside the payment window", () => {
  assert.equal(checkRules(input({ today: "2026-09-15" })).rule, "window");
});

test("refuses partial payments and unknown signers", () => {
  assert.equal(checkRules(input({ tx: { Flags: 131072 } })).rule, "tx-shape");
  assert.equal(checkRules(input({ tx: { Signers: [{ Signer: { Account: "rThief" } }] } })).rule, "tx-shape");
});

test("refuses to start with an old-shape policy (fails closed)", () => {
  assert.doesNotThrow(() => validatePolicy(policy));
  const { rentShareUsd: _r, ...old } = policy.rentWallets[WALLET];
  assert.throws(() => validatePolicy({ ...policy, rentWallets: { [WALLET]: old as never } }), /rentShareUsd/);
});

test("refuses a payment without the month/run tag, or tagged for another run", () => {
  assert.equal(checkRules(input({ tx: { Memos: buildMemos("00".repeat(32), periodKey("2026-10", 1)).slice(0, 1) } })).rule, "tx-shape");
  const r = checkRules(input({ tx: { Memos: buildMemos("00".repeat(32), periodKey("2026-10", 2)) } }));
  assert.equal(r.rule, "tx-shape");
  assert.match(r.reason, /2026-10#run1/);
});
