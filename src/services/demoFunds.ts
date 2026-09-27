// Demo reset's money side: send the landlord's RLUSD back to the simulated bank, then top every rent
// wallet back up to its seed balance, so the 10 RLUSD Testnet float can replay the demo forever.
// (Ledger amounts are scaled 1:1000: $10,000 of demo money = 10 RLUSD.)
import { Wallet } from "xrpl";
import { withClient } from "../../lib/xrpl/client";
import { explorerTx } from "../../lib/xrpl/config";
import { getBalances, sendRlusd, topUp } from "../../lib/xrpl/payments";
import type { Tenant } from "../../types/rent";
import { envSeed, SEED_BALANCE_USD } from "./xrplConfig.ts";

export type RecycleStep = { from: string; to: string; usd: number; explorerUrl: string };

export async function recycleDemoFunds(tenants: Tenant[]): Promise<{ steps: RecycleStep[]; bankUsd: number }> {
  const landlord = Wallet.fromSeed(envSeed("XRPL_LANDLORD_SEED"));
  const bank = Wallet.fromSeed(envSeed("XRPL_BANK_SEED"));
  return withClient(async (client) => {
    const steps: RecycleStep[] = [];
    const lb = await getBalances(client, landlord.address);
    if (lb.usd > 0) {
      steps.push({ from: "landlord", to: "bank", usd: lb.usd, explorerUrl: explorerTx(await sendRlusd(client, landlord, bank.address, lb.usd)) });
    }
    for (const t of tenants) {
      const target = SEED_BALANCE_USD[t.id];
      if (target === undefined) continue; // spawned tenants start empty and top up themselves
      const { usd } = await getBalances(client, t.walletAddress);
      const need = Math.round((target - usd) * 100) / 100;
      if (need > 0) steps.push({ from: "bank", to: t.id, usd: need, explorerUrl: explorerTx(await topUp(client, bank, t.walletAddress, need)) });
    }
    return { steps, bankUsd: (await getBalances(client, bank.address)).usd };
  });
}
