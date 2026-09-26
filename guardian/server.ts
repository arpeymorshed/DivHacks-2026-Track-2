// Guardian co-signing service (T13). Deployed separately from the app with its own key.
// It decodes the REAL transaction the agent signed, applies the 5 rules, and co-signs or refuses.
//
//   npm run guardian            (local: reads .secrets/guardian.env + .secrets/guardian-policy.json)
//
// Env: GUARDIAN_SEED, GUARDIAN_ADMIN_TOKEN, GUARDIAN_POLICY (JSON) or GUARDIAN_POLICY_FILE, PORT.
import fs from "node:fs";
import dotenv from "dotenv";
import express from "express";
import { Client, decode, hashes, multisign, type Transaction, Wallet } from "xrpl";
import { XRPL_WS } from "../lib/xrpl/config";
import type { GuardianDecision, PaymentIntent } from "../lib/types";
import { checkRules, type CosignContext, type GuardianPolicy, type PriorPayment } from "./rules";

dotenv.config({ path: ".secrets/guardian.env", quiet: true });

const guardian = Wallet.fromSeed(required("GUARDIAN_SEED"));
const adminToken = required("GUARDIAN_ADMIN_TOKEN");
const policy: GuardianPolicy = JSON.parse(
  process.env.GUARDIAN_POLICY ?? fs.readFileSync(process.env.GUARDIAN_POLICY_FILE ?? ".secrets/guardian-policy.json", "utf8"),
);
const client = new Client(XRPL_WS);

// Payments this Guardian co-signed, per rent wallet per month. Checked against the ledger, so a
// co-signed payment that failed or expired doesn't block a retry.
const cosigned = new Map<string, { hash: string; lastLedger: number }>();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Guardian: missing env ${name}`);
  return v;
}

async function ledger(): Promise<Client> {
  if (!client.isConnected()) await client.connect();
  return client;
}

async function priorPayment(wallet: string, month: string): Promise<PriorPayment> {
  const rec = cosigned.get(`${wallet}|${month}`);
  if (!rec) return "none";
  const c = await ledger();
  try {
    const res = await c.request({ command: "tx", transaction: rec.hash });
    if (res.result.validated) {
      const code = (res.result.meta as { TransactionResult: string }).TransactionResult;
      return code === "tesSUCCESS" ? "settled" : "none";
    }
    return "pending";
  } catch {
    // Not found: expired if the ledger has passed its LastLedgerSequence, otherwise not submitted yet.
    return (await c.getLedgerIndex()) > rec.lastLedger ? "none" : "pending";
  }
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, guardian: guardian.address, landlord: policy.landlord, rentWallets: Object.keys(policy.rentWallets).length });
});

app.post("/cosign", async (req, res) => {
  const { txBlob, intent, context } = req.body as { txBlob?: string; intent?: PaymentIntent; context?: CosignContext };
  let decision: GuardianDecision;
  try {
    if (!txBlob || !intent || !context) throw new Error("Body must be {txBlob, intent, context}.");
    const tx = decode(txBlob) as Record<string, unknown>;
    const prior = await priorPayment(tx.Account as string, context.month);
    const result = checkRules({ tx, intent, context, policy, prior });

    if (!result.approved) {
      decision = result;
    } else {
      // Sign exactly the transaction that was checked (minus the agent's signature, which xrpl.js re-adds on combine).
      const { Signers: _agentSig, ...unsigned } = tx;
      const signature = guardian.sign(unsigned as unknown as Transaction, true).tx_blob;
      const finalHash = hashes.hashSignedTx(multisign([txBlob, signature]));
      cosigned.set(`${tx.Account}|${context.month}`, { hash: finalHash, lastLedger: Number(tx.LastLedgerSequence) });
      decision = { ...result, signature };
    }
  } catch (e) {
    decision = { approved: false, rule: "tx-shape", reason: `Could not read the request: ${(e as Error).message}` };
  }
  console.log(`[guardian] ${decision.approved ? "CO-SIGNED" : "REFUSED"} ${intent?.tenantId ?? "?"}: ${decision.rule}: ${decision.reason}`);
  res.status(decision.approved ? 200 : 403).json(decision);
});

// Demo reset only: forget which months were paid. Needs the admin token.
app.post("/reset", (req, res) => {
  if (req.headers.authorization !== `Bearer ${adminToken}`) return void res.status(401).json({ error: "unauthorized" });
  cosigned.clear();
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4001);
app.listen(port, () => console.log(`Guardian ${guardian.address} listening on :${port}, landlord ${policy.landlord}`));
