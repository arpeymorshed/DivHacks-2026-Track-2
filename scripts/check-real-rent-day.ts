// Live check of the real rent-day payment path (no MongoDB needed): P2's demo tenants pay through the
// live Guardian on XRPL Testnet, exactly as runRentDay does in real mode.
//   1. recycle funds · 2. rent day (Abhimanyu + Musammat pay, Kashish is short) · 3. rent day again →
//   refused as already paid · 4. day 8: Kashish tops up and pays + $15 late fee · 5. reset (run+1) →
//   pays again · 6. recycle.
//
//   npm run guardian     (other terminal)
//   npx tsx scripts/check-real-rent-day.ts
import dotenv from "dotenv";
import { building, dues, tenants } from "../src/data/demoBuilding.ts";
import { createPaymentIntent } from "../src/agent/tenantAgent.ts";
import { getAgentSeed } from "../src/services/agentKeys.ts";
import { recycleDemoFunds } from "../src/services/demoFunds.ts";
import type { DemoClock } from "../src/services/demoState.ts";
import { payRentOnLedger, withLateFee } from "../src/services/xrplPayments.ts";
import { Wallet } from "xrpl";
import { withClient } from "../lib/xrpl/client";
import { topUpRentWallet } from "../lib/xrpl/topup";

dotenv.config({ path: ".secrets/xrpl.env", quiet: true });
let failures = 0;
const expect = (ok: boolean, label: string) => { if (!ok) failures++; console.log(`${ok ? "✅" : "❌"} ${label}`); };

async function rentDay(clock: DemoClock, label: string) {
  console.log(`\n— ${label} (${clock.today}, run ${clock.run})`);
  const out: Record<string, { approved: boolean; rule?: string; code?: string }> = {};
  await Promise.all(tenants.map(async (tenant) => {
    const due = withLateFee(dues.find((d) => d.tenantId === tenant.id)!, tenant, clock);
    const intent = createPaymentIntent(tenant, due, building.landlordWallet);
    const r = await payRentOnLedger({ tenant, due, intent, clock, agentSeed: await getAgentSeed(tenant.id) });
    out[tenant.id] = { approved: r.guardianDecision.approved, rule: r.guardianDecision.rule, code: r.payment?.ledgerCode };
    console.log(`   ${tenant.name.padEnd(9)} $${intent.amountUsd}${due.lateFeeUsd ? ` (incl. $${due.lateFeeUsd} late fee)` : ""} → ${r.payment ? `${r.payment.ledgerCode} ${r.payment.explorerUrl}` : `REFUSED (${r.guardianDecision.rule}) ${r.guardianDecision.reason}`}`);
  }));
  return out;
}

const run = Math.floor(Date.now() / 1000);
console.log("Recycle:", (await recycleDemoFunds(tenants)).steps.map((s) => `${s.from}→${s.to} $${s.usd}`).join(", ") || "nothing to move");

const r1 = await rentDay({ today: "2026-10-01", month: "2026-10", run }, "Rent day");
expect(r1.abhimanyu.code === "tesSUCCESS" && r1.musammat.code === "tesSUCCESS", "Abhimanyu and Musammat paid on the ledger");
expect(r1.kashish.rule === "insufficient-funds", "Kashish is short, so nothing was sent for him");

const r2 = await rentDay({ today: "2026-10-01", month: "2026-10", run }, "Rent day again, same run");
expect(r2.abhimanyu.rule === "once-per-month" && r2.musammat.rule === "once-per-month", "second rent day refused by the Guardian as already paid");

const bank = Wallet.fromSeed(process.env.XRPL_BANK_SEED!);
const kashish = tenants.find((t) => t.id === "kashish")!;
await withClient((c) => topUpRentWallet(c, bank, kashish.walletAddress, 503, kashish.capUsd));
const r3 = await rentDay({ today: "2026-10-08", month: "2026-10", run }, "Day 8, after Kashish topped up $503");
expect(r3.kashish.code === "tesSUCCESS", "Kashish paid $1,450 + $38 + $15 late fee on day 8");

console.log("\nDemo reset: recycle + run+1", (await recycleDemoFunds(tenants)).steps.length, "transfers");
const r4 = await rentDay({ today: "2026-10-01", month: "2026-10", run: run + 1 }, "Rent day after reset");
expect(r4.abhimanyu.code === "tesSUCCESS", "after reset, rent pays again");

await recycleDemoFunds(tenants);
console.log(`\n${failures ? `${failures} check(s) failed ❌` : "Real rent day checks passed ✅"}`);
process.exitCode = failures ? 1 : 0;
