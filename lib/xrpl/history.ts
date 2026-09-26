// Ledger history lookups shared by the Guardian and the app.
import type { AccountTxRequest, Client } from "xrpl";
import { periodTags } from "./memos";

const LEDGER_HISTORY_PAGES = 5; // account_tx pages (up to 200 txs each) searched per check

// True if the ledger has a validated, successful payment from `wallet` to `landlord` tagged `period`
// (e.g. "2026-10#run7"). This is the source of truth for "rent already paid".
export async function paidOnLedger(client: Client, wallet: string, landlord: string, period: string): Promise<boolean> {
  let marker: unknown;
  for (let page = 0; page < LEDGER_HISTORY_PAGES; page++) {
    const req = { command: "account_tx", account: wallet, limit: 200, ...(marker ? { marker } : {}) } as AccountTxRequest;
    const res = await client.request(req);
    const result = res.result as unknown as { transactions: Record<string, any>[]; marker?: unknown };
    for (const t of result.transactions) {
      const tx = t.tx_json ?? t.tx; // API v2 / v1
      if (
        t.validated &&
        t.meta?.TransactionResult === "tesSUCCESS" &&
        tx?.TransactionType === "Payment" &&
        tx.Account === wallet &&
        tx.Destination === landlord &&
        periodTags(tx).includes(period)
      ) return true;
    }
    if (!result.marker) return false;
    marker = result.marker;
  }
  return false;
}
