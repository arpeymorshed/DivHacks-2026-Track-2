// Guardian co-signing service (T13). Deployed separately from the app with its own key.
// It decodes the REAL transaction the agent signed, applies the 5 rules, and co-signs or refuses.
//
//   npm run guardian            (local: reads .secrets/guardian.env + .secrets/guardian-policy.json)
//
// Env: GUARDIAN_SEED, GUARDIAN_ADMIN_TOKEN, GUARDIAN_POLICY (JSON) or GUARDIAN_POLICY_FILE, PORT.
import fs from "node:fs";
import dotenv from "dotenv";
import express from "express";
import { type AccountTxRequest, Client, decode, hashes, multisign, type Transaction, Wallet } from "xrpl";
import { XRPL_WS } from "../lib/xrpl/config";
import { getAgentCredential } from "../lib/xrpl/credentials";
import { periodKey, periodTags } from "../lib/xrpl/memos";
import { getRentWalletStatus, SIGNER_QUORUM } from "../lib/xrpl/rentWallet";
import type { GuardianDecision, PaymentIntent } from "../lib/types";
import { checkRules, type CosignContext, type GuardianPolicy, type PriorPayment, validatePolicy, type WalletPolicy } from "./rules";

dotenv.config({ path: ".secrets/guardian.env", quiet: true });

const guardian = Wallet.fromSeed(required("GUARDIAN_SEED"));
const adminToken = required("GUARDIAN_ADMIN_TOKEN");
const policy: GuardianPolicy = validatePolicy(
  JSON.parse(process.env.GUARDIAN_POLICY ?? fs.readFileSync(process.env.GUARDIAN_POLICY_FILE ?? ".secrets/guardian-policy.json", "utf8")),
);
const client = new Client(XRPL_WS);

// Cache of payments this Guardian co-signed that may still be settling, per rent wallet + period.
// Only used for "pending": "already paid" comes from the ledger, so a restart or sleep can't cause a double charge.
const cosigned = new Map<string, { hash: string; lastLedger: number }>();
const LEDGER_HISTORY_PAGES = 5; // account_tx pages (up to 200 txs each) searched per check

// Spawned rent wallets (T35) recognised from the ledger, cached after the first successful check.
const spawned = new Map<string, WalletPolicy>();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Guardian: missing env ${name}`);
  return v;
}

async function ledger(): Promise<Client> {
  if (!client.isConnected()) await client.connect();
  return client;
}

// True if the ledger has a validated, successful payment from `wallet` to the landlord tagged `period`.
async function paidOnLedger(c: Client, wallet: string, period: string): Promise<boolean> {
  let marker: unknown;
  for (let page = 0; page < LEDGER_HISTORY_PAGES; page++) {
    const req = { command: "account_tx", account: wallet, limit: 200, ...(marker ? { marker } : {}) } as AccountTxRequest;
    const res = await c.request(req);
    const result = res.result as unknown as { transactions: Record<string, any>[]; marker?: unknown };
    for (const t of result.transactions) {
      const tx = t.tx_json ?? t.tx; // API v2 / v1
      if (
        t.validated &&
        t.meta?.TransactionResult === "tesSUCCESS" &&
        tx?.TransactionType === "Payment" &&
        tx.Account === wallet &&
        tx.Destination === policy.landlord &&
        periodTags(tx).includes(period)
      ) return true;
    }
    if (!result.marker) return false;
    marker = result.marker;
  }
  return false;
}

// A wallet not in the static policy counts as a rent wallet only if the ledger shows all of:
// an accepted RentRelayTenantAgent credential from the landlord carrying valid limits, master key disabled,
// and exactly the two-key signer list: one agent (1), this Guardian (1), one tenant backup (2), quorum 2.
async function resolveWallet(c: Client, address: string): Promise<WalletPolicy | null> {
  const known = policy.rentWallets[address] ?? spawned.get(address);
  if (known) return known;
  const cred = await getAgentCredential(c, address, policy.landlord);
  if (!cred?.accepted || !cred.limits) return null;
  const status = await getRentWalletStatus(c, address);
  const agents = status.signers.filter((e) => e.weight === 1 && e.account !== guardian.address);
  const hasGuardian = status.signers.some((e) => e.weight === 1 && e.account === guardian.address);
  const backups = status.signers.filter((e) => e.weight === 2);
  if (!status.masterDisabled || status.quorum !== SIGNER_QUORUM || status.signers.length !== 3) return null;
  if (!hasGuardian || agents.length !== 1 || backups.length !== 1) return null;
  const entry: WalletPolicy = { ...cred.limits, agent: agents[0].account };
  try {
    validatePolicy({ landlord: policy.landlord, rentWallets: { [address]: entry } });
  } catch {
    return null;
  }
  spawned.set(address, entry);
  console.log(`[guardian] recognised spawned rent wallet ${address} (${entry.tenantId}) from its on-ledger credential`);
  return entry;
}

async function priorPayment(wallet: string, period: string): Promise<PriorPayment> {
  const c = await ledger();
  if (await paidOnLedger(c, wallet, period)) return "settled";

  const rec = cosigned.get(`${wallet}|${period}`);
  if (!rec) return "none";
  try {
    const res = await c.request({ command: "tx", transaction: rec.hash });
    if (!res.result.validated) return "pending";
    const code = (res.result.meta as { TransactionResult: string }).TransactionResult;
    return code === "tesSUCCESS" ? "settled" : "none"; // failed: a retry is fine
  } catch {
    // Not found: expired if the ledger has passed its LastLedgerSequence, otherwise not submitted yet.
    return (await c.getLedgerIndex()) > rec.lastLedger ? "none" : "pending";
  }
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    guardian: guardian.address,
    landlord: policy.landlord,
    rentWallets: Object.keys(policy.rentWallets).length,
    spawnedRecognised: spawned.size,
  });
});

app.post("/cosign", async (req, res) => {
  const { txBlob, intent, context } = req.body as { txBlob?: string; intent?: PaymentIntent; context?: CosignContext };
  let decision: GuardianDecision;
  try {
    if (!txBlob || !intent || !context) throw new Error("Body must be {txBlob, intent, context}.");
    const tx = decode(txBlob) as Record<string, unknown>;
    const period = periodKey(context.month, context.run);
    const account = tx.Account as string;
    const c = await ledger();
    const wallet = await resolveWallet(c, account);
    const effective: GuardianPolicy = wallet ? { ...policy, rentWallets: { ...policy.rentWallets, [account]: wallet } } : policy;
    const prior = await priorPayment(account, period);
    const result = checkRules({ tx, intent, context, policy: effective, prior });

    if (!result.approved) {
      decision = result;
    } else {
      // Sign exactly the transaction that was checked (minus the agent's signature, which xrpl.js re-adds on combine).
      const { Signers: _agentSig, ...unsigned } = tx;
      const signature = guardian.sign(unsigned as unknown as Transaction, true).tx_blob;
      const finalHash = hashes.hashSignedTx(multisign([txBlob, signature]));
      cosigned.set(`${tx.Account}|${period}`, { hash: finalHash, lastLedger: Number(tx.LastLedgerSequence) });
      decision = { ...result, signature };
    }
  } catch (e) {
    decision = { approved: false, rule: "tx-shape", reason: `Could not read the request: ${(e as Error).message}` };
  }
  console.log(`[guardian] ${decision.approved ? "CO-SIGNED" : "REFUSED"} ${intent?.tenantId ?? "?"}: ${decision.rule}: ${decision.reason}`);
  res.status(decision.approved ? 200 : 403).json(decision);
});

// Clears the "still settling" cache. Paid months live on the ledger; to replay a month, bump the run. Needs the admin token.
app.post("/reset", (req, res) => {
  if (req.headers.authorization !== `Bearer ${adminToken}`) return void res.status(401).json({ error: "unauthorized" });
  cosigned.clear();
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4001);
app.listen(port, () => console.log(`Guardian ${guardian.address} listening on :${port}, landlord ${policy.landlord}`));
