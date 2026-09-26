// T33 check: the top-up rules, then the task's "done when": Jordan tops up and his day-8 rent + $15 late fee
// goes through the Guardian. The landlord's RLUSD is recycled to the bank afterwards.
//
//   npm run test:topup                  (Guardian at GUARDIAN_URL, default http://localhost:4001)
import dotenv from "dotenv";
import { Wallet } from "xrpl";
import type { PaymentIntent } from "../lib/types";
import { withClient } from "../lib/xrpl/client";
import { explorerTx } from "../lib/xrpl/config";
import { requestCosign } from "../lib/xrpl/guardianClient";
import { periodKey } from "../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit, sendRlusd } from "../lib/xrpl/payments";
import { TopUpError, topUpRentWallet } from "../lib/xrpl/topup";

dotenv.config({ path: ".secrets/xrpl.env", quiet: true });
const env = (k: string) => process.env[k] ?? (() => { throw new Error(`missing ${k}; run npm run setup:xrpl`); })();

const bank = Wallet.fromSeed(env("XRPL_BANK_SEED"));
const landlord = Wallet.fromSeed(env("XRPL_LANDLORD_SEED"));
const jordan = env("XRPL_TENANT_JORDAN_ADDRESS");
const ok = (c: boolean) => (c ? "✅" : "❌");
let failures = 0;

await withClient(async (client) => {
  // Rules (nothing is sent for these).
  const refused = async (label: string, addr: string, usd: number, code: string) => {
    const err = await topUpRentWallet(client, bank, addr, usd).then(() => null, (e) => e as TopUpError);
    const good = err instanceof TopUpError && err.code === code;
    if (!good) failures++;
    console.log(`${ok(good)} ${label} → ${err instanceof TopUpError ? `${err.code}: ${err.message}` : "NOT refused"}`);
  };
  await refused("$0", jordan, 0, "bad-amount");
  await refused("$2,500 (over the $2,000 limit)", jordan, 2500, "bad-amount");
  await refused("$10.001 (fraction of a cent)", jordan, 10.001, "bad-amount");
  await refused("to the landlord (not a rent wallet)", landlord.address, 100, "not-a-rent-wallet");
  await refused("to an address that doesn't exist", Wallet.generate().address, 100, "not-a-rent-wallet");
  await refused("$1,700 into an empty wallet (over the $1,600 wallet limit)", jordan, 1700, "wallet-full");

  // Done-when: Jordan is short, tops up, and his day-8 rent + $15 late fee goes through.
  const lb = await getBalances(client, landlord.address);
  if (lb.rlusd > 0) await sendRlusd(client, landlord, bank.address, lb.usd);
  const intent: PaymentIntent = { tenantId: "jordan", dueId: "jordan-2026-10", destination: landlord.address,
    rentUsd: 1450, utilitiesUsd: 38, lateFeeUsd: 15, totalUsd: 1503, reason: "October rent + ConEd + $15 late fee (day 8)" };
  const have = (await getBalances(client, jordan)).usd;
  const need = Math.round((intent.totalUsd - have) * 100) / 100;
  if (need > 0) {
    const t = await topUpRentWallet(client, bank, jordan, need);
    console.log(`\n✅ Jordan topped up $${t.usd}: wallet now $${t.walletBalanceUsd}, bank $${t.bankBalanceUsd}\n   ${t.explorer}`);
  }
  await refused("another $200 on top of $1,503 (wallet would hold $1,703)", jordan, 200, "wallet-full");
  const context = { today: "2026-10-08", month: "2026-10", run: Math.floor(Date.now() / 1000) };
  const blob = agentSign(await buildPayment(client, { from: jordan, to: landlord.address, usd: intent.totalUsd,
    memoHash: hashAuditRecord({ intent, context }), period: periodKey(context.month, context.run) }), Wallet.fromSeed(env("XRPL_AGENT_JORDAN_SEED")));
  const d = await requestCosign(blob, intent, context);
  const res = d.approved && d.signature ? await multisignSubmit(client, [blob, d.signature]) : null;
  const paid = res?.code === "tesSUCCESS";
  if (!paid) failures++;
  console.log(`${ok(paid)} Day 8: Jordan's agent pays $1,450 + $38 + $15 late fee → ${d.approved ? `Guardian co-signed, ledger ${res?.code}` : `REFUSED (${d.rule}) ${d.reason}`}`);
  if (res) console.log(`   ${explorerTx(res.hash)}`);

  const lb2 = await getBalances(client, landlord.address);
  if (lb2.rlusd > 0) await sendRlusd(client, landlord, bank.address, lb2.usd);
  console.log(`\n${failures ? `${failures} check(s) failed ❌` : "All top-up checks passed ✅"}`);
  process.exitCode = failures ? 1 : 0;
});
