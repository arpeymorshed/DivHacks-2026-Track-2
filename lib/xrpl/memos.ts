// Memos on every rent payment. Shared by the app (writes them) and the Guardian (reads them).
// Plain Buffer hex helpers (same output as xrpl's convertStringToHex/convertHexToString) so this file
// doesn't load xrpl: guardian/rules imports it, and /api/state and /api/clock must work even when
// xrpl can't load (it crashed those routes on Vercel, docs/BUGS.md 2026-09-27).
const convertStringToHex = (s: string) => Buffer.from(s, "utf8").toString("hex").toUpperCase();
const convertHexToString = (hex: string) => Buffer.from(hex, "hex").toString("utf8");

// sha256 of the audit record (hex), stored in the app's AuditEntry too.
export const AUDIT_MEMO_TYPE = "rentrelay/audit";
// Readable "which month, which demo run" tag, e.g. "2026-10#run7". The Guardian finds "already paid"
// on the ledger by this tag, so its check survives restarts; demo reset bumps the run to start fresh.
export const PERIOD_MEMO_TYPE = "rentrelay/period";

export const periodKey = (month: string, run: number) => `${month}#run${run}`;

export type MemoField = { Memo: { MemoType?: string; MemoData?: string } };

export function buildMemos(memoHash: string, period: string): MemoField[] {
  return [
    { Memo: { MemoType: convertStringToHex(AUDIT_MEMO_TYPE), MemoData: memoHash } },
    { Memo: { MemoType: convertStringToHex(PERIOD_MEMO_TYPE), MemoData: convertStringToHex(period) } },
  ];
}

// All period tags on a transaction (decoded from hex). A valid rent payment has exactly one.
export function periodTags(tx: { Memos?: unknown }): string[] {
  const memos = (Array.isArray(tx.Memos) ? tx.Memos : []) as MemoField[];
  return memos
    .filter((m) => m.Memo?.MemoType && convertHexToString(m.Memo.MemoType) === PERIOD_MEMO_TYPE)
    .map((m) => (m.Memo.MemoData ? convertHexToString(m.Memo.MemoData) : ""));
}
