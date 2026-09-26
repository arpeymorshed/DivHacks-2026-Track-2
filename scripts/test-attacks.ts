// T37 check: pay Maya's rent for a fresh demo run, then fire every attack at her wallet and check each is
// blocked by the expected rule. Attacks never submit an approved tx; the rent payment's RLUSD is recycled.
//
//   npm run test:attacks                (Guardian at GUARDIAN_URL, default http://localhost:4001)
import dotenv from "dotenv";
import { Wallet } from "xrpl";
import type { PaymentIntent } from "../lib/types";
import { type AttackName, ATTACKS, runAttack } from "../lib/xrpl/attacks";
import { withClient } from "../lib/xrpl/client";
import { explorerTx } from "../lib/xrpl/config";
import { requestCosign } from "../lib/xrpl/guardianClient";
import { periodKey } from "../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit, sendRlusd, topUp } from "../lib/xrpl/payments";

dotenv.config({ path: ".secrets/xrpl.env", quiet: true });
const env = (k: string) => process.env[k] ?? (() => { throw new Error(`missing ${k}; run npm run setup:xrpl`); })();

const landlord = Wallet.fromSeed(env("XRPL_LANDLORD_SEED"));
const bank = Wallet.fromSeed(env("XRPL_BANK_SEED"));
const maya = env("XRPL_TENANT_MAYA_ADDRESS");
const agentSeed = env("XRPL_AGENT_MAYA_SEED");
const clock = { today: "2026-10-01", month: "2026-10", run: Math.floor(Date.now() / 1000) };

const EXPECTED: Record<AttackName, string> = {
  "scam-address": "landlord-only",
  "illegal-late-fee": "legal-late-fee",
  "stolen-key": "ledger-quorum",
  "fee-in-grace": "legal-late-fee",
  "inflated-coned": "cap",
  "double-charge": "once-per-month",
  "lying-agent": "intent-mismatch",
};

await withClient(async (client) => {
  // Rent day for this run, so "double-charge" has a real payment to collide with.
  const intent: PaymentIntent = { tenantId: "maya", dueId: "maya-2026-10", destination: landlord.address,
    rentUsd: 1450, utilitiesUsd: 38, lateFeeUsd: 0, totalUsd: 1488, reason: "October rent + ConEd share" };
  const have = (await getBalances(client, maya)).usd;
  if (have < intent.totalUsd) await topUp(client, bank, maya, Math.round((intent.totalUsd - have) * 100) / 100);
  const period = periodKey(clock.month, clock.run);
  const blob = agentSign(await buildPayment(client, { from: maya, to: landlord.address, usd: intent.totalUsd,
    memoHash: hashAuditRecord({ intent, clock }), period }), Wallet.fromSeed(agentSeed));
  const d = await requestCosign(blob, intent, clock);
  const paid = d.approved && d.signature ? await multisignSubmit(client, [blob, d.signature]) : null;
  console.log(`Rent day (${period}): ${paid?.code ?? d.reason}${paid ? `  ${explorerTx(paid.hash)}` : ""}\n`);

  let failures = 0;
  for (const name of Object.keys(ATTACKS) as AttackName[]) {
    const r = await runAttack(client, name, { tenantId: "maya", walletAddress: maya, agentSeed,
      landlordAddress: landlord.address, rentShareUsd: 1450, utilitiesUsd: 38, clock });
    const ok = r.blocked && r.rule === EXPECTED[name];
    if (!ok) failures++;
    console.log(`${ok ? "✅" : "❌"} ${ATTACKS[name].live ? "[LIVE]" : "[Q&A] "} ${r.title}`);
    console.log(`     blocked by ${r.blockedBy ?? "NOBODY"} (${r.rule}${r.ledgerCode ? `: ${r.ledgerCode}` : ""}): ${r.reason}`);
  }

  const lb = await getBalances(client, landlord.address);
  if (lb.rlusd > 0) await sendRlusd(client, landlord, bank.address, lb.usd);
  console.log(`\n${failures === 0 ? "All attacks blocked ✅" : `${failures} attack(s) NOT blocked as expected ❌`}`);
  process.exitCode = failures ? 1 : 0;
});
