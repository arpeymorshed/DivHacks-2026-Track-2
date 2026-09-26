import type { Client, TrustSet, Wallet } from "xrpl";
import { submitOrThrow } from "./client";
import { RLUSD, RLUSD_TRUST_LIMIT } from "./config";

// RLUSD balance of an account, or null if it has no RLUSD trust line.
export async function getRlusdBalance(client: Client, address: string): Promise<number | null> {
  const res = await client.request({ command: "account_lines", account: address, peer: RLUSD.issuer });
  const line = res.result.lines.find((l) => l.currency === RLUSD.currency);
  return line ? Number(line.balance) : null;
}

// Creates the RLUSD trust line if missing. Returns the tx hash, or null if it already existed.
// Must be signed by the account's own master key (i.e. before the master is disabled).
export async function ensureRlusdTrustLine(client: Client, wallet: Wallet): Promise<string | null> {
  if ((await getRlusdBalance(client, wallet.address)) !== null) return null;
  const tx: TrustSet = {
    TransactionType: "TrustSet",
    Account: wallet.address,
    LimitAmount: { currency: RLUSD.currency, issuer: RLUSD.issuer, value: RLUSD_TRUST_LIMIT },
  };
  return submitOrThrow(client, tx, wallet);
}
