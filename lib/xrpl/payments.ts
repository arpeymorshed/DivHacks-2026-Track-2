// T12: build, agent-sign and multisign-submit RLUSD payments from two-key rent wallets.
// Flow: buildPayment → agentSign → (Guardian decodes + co-signs, T13) → multisignSubmit.
import { createHash } from "node:crypto";
import { type Client, multisign, type Payment, type Wallet } from "xrpl";
import { submitOrThrow } from "./client";
import { RLUSD, rlusdToUsd, usdToRlusd } from "./config";
import { buildMemos } from "./memos";
import { SIGNER_QUORUM } from "./rentWallet";
import { getRlusdBalance } from "./rlusd";

// sha256 of the audit record the payment is based on (USD amounts + scale). Goes in the memo and the AuditEntry.
export function hashAuditRecord(record: object): string {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex").toUpperCase();
}

// period: periodKey(month, run), e.g. "2026-10#run7". The Guardian requires it to match the request.
export type BuildPaymentArgs = { from: string; to: string; usd: number; memoHash: string; period: string };

// Unsigned RLUSD payment, autofilled for SIGNER_QUORUM signatures (multisig fee).
export async function buildPayment(client: Client, { from, to, usd, memoHash, period }: BuildPaymentArgs): Promise<Payment> {
  const tx: Payment = {
    TransactionType: "Payment",
    Account: from,
    Destination: to,
    Amount: { currency: RLUSD.currency, issuer: RLUSD.issuer, value: usdToRlusd(usd) },
    Memos: buildMemos(memoHash, period),
  };
  return client.autofill(tx, SIGNER_QUORUM);
}

// Agent's partial signature. The blob goes to the Guardian, which decodes it and adds its own.
export function agentSign(tx: Payment, agent: Wallet): string {
  return agent.sign(tx, true).tx_blob;
}

export type SubmitResult = { hash: string; code: string; validated: boolean };

// Combines partial signatures and submits. Returns the ledger's result code rather than throwing,
// so a rejection (e.g. tefBAD_QUORUM for an agent-only signature) can be shown in the audit log.
export async function multisignSubmit(client: Client, blobs: string[]): Promise<SubmitResult> {
  const combined = multisign(blobs);
  const prelim = await client.request({ command: "submit", tx_blob: combined });
  const hash = prelim.result.tx_json.hash!;
  const engine = prelim.result.engine_result;
  // tef/tem/tel results never reach a ledger; tes/tec/ter get validated.
  if (/^(tef|tem|tel)/.test(engine)) return { hash, code: engine, validated: false };
  const tx = await waitForValidation(client, hash);
  return { hash, code: tx ?? engine, validated: tx !== null };
}

async function waitForValidation(client: Client, hash: string, timeoutMs = 30_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await client.request({ command: "tx", transaction: hash });
      if (res.result.validated) return (res.result.meta as { TransactionResult: string }).TransactionResult;
    } catch {
      // txnNotFound until the ledger picks it up
    }
  }
  return null;
}

export type Balances = { xrp: number; rlusd: number; usd: number };

export async function getBalances(client: Client, address: string): Promise<Balances> {
  const { result } = await client.request({ command: "account_info", account: address });
  const rlusd = (await getRlusdBalance(client, address)) ?? 0;
  return { xrp: Number(result.account_data.Balance) / 1_000_000, rlusd, usd: rlusdToUsd(rlusd) };
}

// Plain single-signed RLUSD transfer from an account whose master key is enabled (bank, landlord).
export async function sendRlusd(client: Client, from: Wallet, to: string, usd: number): Promise<string> {
  const tx: Payment = {
    TransactionType: "Payment",
    Account: from.address,
    Destination: to,
    Amount: { currency: RLUSD.currency, issuer: RLUSD.issuer, value: usdToRlusd(usd) },
  };
  return submitOrThrow(client, tx, from);
}

// Simulated bank → tenant rent wallet.
export const topUp = sendRlusd;
