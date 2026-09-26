// T35 check: spawn a new tenant agent's rent wallet live, then prove the Guardian accepts it from the
// ledger alone (credential + signer list) by paying rent through it, and refuses a wallet without a credential.
//
//   npm run spawn:tenant                (Guardian at GUARDIAN_URL, default http://localhost:4001)
import dotenv from "dotenv";
import { Wallet } from "xrpl";
import type { PaymentIntent } from "../lib/types";
import { withClient } from "../lib/xrpl/client";
import { explorerTx } from "../lib/xrpl/config";
import { requestCosign } from "../lib/xrpl/guardianClient";
import { periodKey } from "../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances, hashAuditRecord, multisignSubmit, sendRlusd, topUp } from "../lib/xrpl/payments";
import { spawnRentWallet } from "../lib/xrpl/spawn";

dotenv.config({ path: [".secrets/xrpl.env", ".secrets/guardian.env"], quiet: true });
const env = (k: string) => process.env[k] ?? (() => { throw new Error(`missing ${k}; run npm run setup:xrpl`); })();

const ops = Wallet.fromSeed(env("XRPL_OPS_SEED"));
const landlord = Wallet.fromSeed(env("XRPL_LANDLORD_SEED"));
const bank = Wallet.fromSeed(env("XRPL_BANK_SEED"));
const guardianAddress = env("GUARDIAN_ADDRESS");

await withClient(async (client) => {
  console.log("Spawning Sam's tenant agent (Unit 3C, $1,450)...");
  const sam = await spawnRentWallet(client, {
    ops, landlord, guardianAddress,
    limits: { tenantId: "sam", capUsd: 1600, unitRentUsd: 1450, rentShareUsd: 1450, maxUtilitiesUsd: 100 },
    onStep: (s) => console.log(`  ${(s.elapsedMs / 1000).toFixed(1).padStart(5)}s  ${s.label}${s.explorer ? `\n          ${s.explorer}` : ""}`),
  });
  console.log(`✅ Sam's rent wallet ${sam.address} is live after ${(sam.steps.at(-1)!.elapsedMs / 1000).toFixed(1)}s`);

  const intent: PaymentIntent = {
    tenantId: "sam", dueId: "sam-2026-10", destination: landlord.address,
    rentUsd: 1450, utilitiesUsd: 0, lateFeeUsd: 0, totalUsd: 1450, reason: "Sam's first rent",
  };
  const context = { today: "2026-10-01", month: "2026-10", run: Math.floor(Date.now() / 1000) };
  const period = periodKey(context.month, context.run);
  const memoHash = hashAuditRecord({ intent, context });

  // Rent through the Guardian, which has never been told about Sam.
  await topUp(client, bank, sam.address, intent.totalUsd);
  const agentBlob = agentSign(await buildPayment(client, { from: sam.address, to: landlord.address, usd: intent.totalUsd, memoHash, period }), Wallet.fromSeed(sam.agentSeed));
  const d = await requestCosign(agentBlob, intent, context);
  console.log(`\n[Sam's rent] → Guardian: ${d.approved ? "CO-SIGNED" : "REFUSED"} (${d.rule}) ${d.reason}`);
  if (d.approved && d.signature) {
    const res = await multisignSubmit(client, [agentBlob, d.signature]);
    console.log(`  → ledger: ${res.code} ${res.code === "tesSUCCESS" ? "✅ paid" : "❌"}\n  ${explorerTx(res.hash)}`);
  }

  // A wallet the landlord never credentialed (here: the bank) is refused, even with a well-formed request.
  const rogueBlob = agentSign(await buildPayment(client, { from: bank.address, to: landlord.address, usd: 1450, memoHash, period }), Wallet.generate());
  const r = await requestCosign(rogueBlob, { ...intent, tenantId: "rogue" }, context);
  console.log(`[no credential] → Guardian: ${r.approved ? "CO-SIGNED ❌" : `REFUSED (${r.rule}) ${r.reason} ✅`}`);

  // Recycle: landlord → bank, so the demo float is unchanged.
  const lb = await getBalances(client, landlord.address);
  if (lb.rlusd > 0) await sendRlusd(client, landlord, bank.address, lb.usd);
  const opsXrp = (await getBalances(client, ops.address)).xrp;
  console.log(`\nOps XRP left: ${opsXrp} (about ${Math.floor(opsXrp / 3.6)} more spawns)`);
});
