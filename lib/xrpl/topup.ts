// T33 (P1 half): the tenant's "Top up" button. The simulated bank sends RLUSD to a tenant's rent wallet.
// POST /api/topup wraps topUpRentWallet and maps TopUpError.code to an HTTP status (see docs/MONEY-LAYER.md).
// A top-up only ever adds money to the tenant's own wallet, so it needs no Guardian co-signature.
import type { Client, Wallet } from "xrpl";
import { explorerTx } from "./config";
import { getBalances, topUp } from "./payments";
import { getRentWalletStatus } from "./rentWallet";
import { getRlusdBalance } from "./rlusd";

// One top-up covers a full month (rent share + utilities + max late fee = $1,600) with room to spare, while
// keeping the shared demo float (10 RLUSD ≈ $10,000) from being drained by one click.
export const MAX_TOPUP_USD = 2000;

export type TopUpErrorCode = "bad-amount" | "not-a-rent-wallet" | "bank-empty";
export class TopUpError extends Error {
  constructor(public code: TopUpErrorCode, message: string) {
    super(message);
  }
}

export type TopUpResult = { txHash: string; explorer: string; usd: number; walletBalanceUsd: number; bankBalanceUsd: number };

export async function topUpRentWallet(client: Client, bank: Wallet, walletAddress: string, usd: number): Promise<TopUpResult> {
  const wholeCents = Math.abs(Math.round(usd * 100) - usd * 100) < 1e-6; // tolerate float noise (10.1 * 100)
  if (!Number.isFinite(usd) || usd <= 0 || usd > MAX_TOPUP_USD || !wholeCents) {
    throw new TopUpError("bad-amount", `Top up between $0.01 and $${MAX_TOPUP_USD}, in whole cents.`);
  }
  // Rent wallets hold RLUSD and have their master key disabled (the landlord and bank don't).
  const isRentWallet = await Promise.all([getRlusdBalance(client, walletAddress), getRentWalletStatus(client, walletAddress)])
    .then(([rlusd, status]) => rlusd !== null && status.masterDisabled)
    .catch(() => false); // e.g. the account doesn't exist
  if (!isRentWallet) throw new TopUpError("not-a-rent-wallet", `${walletAddress} isn't a tenant rent wallet.`);
  const bankBefore = await getBalances(client, bank.address);
  if (bankBefore.usd < usd) {
    throw new TopUpError("bank-empty", `The demo bank only has $${bankBefore.usd}. Run a demo reset to recycle RLUSD.`);
  }

  const txHash = await topUp(client, bank, walletAddress, usd);
  const [wallet, bankAfter] = await Promise.all([getBalances(client, walletAddress), getBalances(client, bank.address)]);
  return { txHash, explorer: explorerTx(txHash), usd, walletBalanceUsd: wallet.usd, bankBalanceUsd: bankAfter.usd };
}
