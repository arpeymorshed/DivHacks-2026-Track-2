// T12/T13 check, end to end against the running Guardian (`npm run guardian` in another terminal):
//   1. stolen agent key: agent-only signature → the ledger rejects it (tefBAD_QUORUM)
//   2. old master key → the ledger rejects it (tefMASTER_DISABLED)
//   3. scam "new bank account" → the Guardian refuses to co-sign
//   4. Maya's rent: agent signs → Guardian co-signs → ledger settles
//
//   npm run test:payment
import dotenv from "dotenv";
import { Wallet } from "xrpl";
import type { PaymentIntent } from "../lib/types";
import { withClient } from "../lib/xrpl/client";
import { explorerTx, RLUSD_PER_USD, usdToRlusd } from "../lib/xrpl/config";
import { requestCosign } from "../lib/xrpl/guardianClient";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit, topUp } from "../lib/xrpl/payments";

dotenv.config({ path: ".secrets/xrpl.env", quiet: true });
const env = (k: string) => process.env[k] ?? (() => { throw new Error(`missing ${k}; run npm run setup:xrpl`); })();

const maya = env("XRPL_TENANT_MAYA_ADDRESS");
const landlord = env("XRPL_LANDLORD_ADDRESS");
const agent = Wallet.fromSeed(env("XRPL_AGENT_MAYA_SEED"));
const bank = Wallet.fromSeed(env("XRPL_BANK_SEED"));
const mayaMaster = Wallet.fromSeed(env("XRPL_TENANT_MAYA_SEED"));
const context = { today: "2026-10-01", month: "2026-10" }; // demo clock: rent day
const intent: PaymentIntent = {
  tenantId: "maya", dueId: "maya-2026-10", destination: landlord,
  rentUsd: 1450, utilitiesUsd: 38, lateFeeUsd: 0, totalUsd: 1488, reason: "October rent + ConEd share",
};
const ok = (cond: boolean) => (cond ? "✅" : "❌ UNEXPECTED");

await withClient(async (client) => {
  const before = await getBalances(client, maya);
  console.log(`Maya before: ${before.rlusd} RLUSD ($${before.usd}); 1 USD = ${RLUSD_PER_USD} RLUSD on-ledger`);
  if (before.usd < intent.totalUsd) {
    const bankBal = await getBalances(client, bank.address);
    if (bankBal.usd >= intent.totalUsd) {
      console.log(`Top-up bank → Maya $${intent.totalUsd}: ${explorerTx(await topUp(client, bank, maya, intent.totalUsd))}`);
    } else {
      console.log(`⚠️  Bank has ${bankBal.rlusd} RLUSD, can't top Maya up: step 4 will end in tecPATH_DRY (signatures accepted, no funds).`);
    }
  }
  const memoHash = hashAuditRecord({ intent, context, rlusd: usdToRlusd(intent.totalUsd), rlusdPerUsd: RLUSD_PER_USD });

  // 1. stolen agent key
  const tx1 = await buildPayment(client, { from: maya, to: landlord, usd: intent.totalUsd, memoHash });
  const stolen = await multisignSubmit(client, [agentSign(tx1, agent)]);
  console.log(`\n1. [stolen agent key] agent-only signature → ledger: ${stolen.code} ${ok(stolen.code === "tefBAD_QUORUM")}`);

  // 2. old master key
  const { Sequence, LastLedgerSequence, Fee, SigningPubKey, ...base } = tx1;
  const master = await client.request({ command: "submit", tx_blob: mayaMaster.sign(await client.autofill(base)).tx_blob });
  console.log(`2. [old master key] → ledger: ${master.result.engine_result} ${ok(master.result.engine_result === "tefMASTER_DISABLED")}`);

  // 3. scam destination
  const scam = Wallet.generate().address;
  const tx3 = await buildPayment(client, { from: maya, to: scam, usd: intent.totalUsd, memoHash });
  const d3 = await requestCosign(agentSign(tx3, agent), { ...intent, destination: scam }, context);
  console.log(`3. [scam new bank account] → Guardian: ${d3.approved ? "CO-SIGNED" : "REFUSED"} (${d3.rule}) ${d3.reason} ${ok(!d3.approved && d3.rule === "landlord-only")}`);

  // 4. real rent payment
  const tx4 = await buildPayment(client, { from: maya, to: landlord, usd: intent.totalUsd, memoHash });
  const agentBlob = agentSign(tx4, agent);
  const d4 = await requestCosign(agentBlob, intent, context);
  console.log(`4. [rent day] → Guardian: ${d4.approved ? "CO-SIGNED" : "REFUSED"} (${d4.rule}) ${d4.reason}`);
  if (d4.approved && d4.signature) {
    const res = await multisignSubmit(client, [agentBlob, d4.signature]);
    console.log(`   → ledger: ${res.code} ${res.code === "tesSUCCESS" ? "✅ paid" : "⚠️"}  $${intent.totalUsd} as ${usdToRlusd(intent.totalUsd)} RLUSD`);
    console.log(`   ${explorerTx(res.hash)}\n   memo ${memoHash}`);
  }
  const after = await getBalances(client, maya);
  console.log(`\nMaya after: ${after.rlusd} RLUSD ($${after.usd})`);
});
