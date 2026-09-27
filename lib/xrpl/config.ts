// Network + RLUSD constants shared by the app, scripts and the Guardian.
export const XRPL_WS = process.env.XRPL_WS ?? "wss://s.altnet.rippletest.net:51233";

// "RLUSD" is 5 chars, so the ledger uses the 40-char hex currency code.
export const RLUSD = {
  currency: "524C555344000000000000000000000000000000",
  issuer: process.env.RLUSD_ISSUER ?? "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
};

// Trust line limit for every RentRelay account holding RLUSD.
export const RLUSD_TRUST_LIMIT = "1000000";

export const explorerAccount = (address: string) => `https://testnet.xrpl.org/accounts/${address}`;
export const explorerTx = (hash: string) => `https://testnet.xrpl.org/transactions/${hash}`;

// Decision 2026-09-26 (PLAN.md): the faucet gives only 10 RLUSD/day, so the ledger moves
// USD × RLUSD_PER_USD. Everything outside lib/xrpl works in USD. Set to 1 for 1:1 settlement.
export const RLUSD_PER_USD = Number(process.env.RLUSD_PER_USD ?? 0.001);

// USD → ledger RLUSD value string, rounded to 6 decimals (e.g. 1450 → "1.45").
export function usdToRlusd(usd: number): string {
  return String(Number((usd * RLUSD_PER_USD).toFixed(6)));
}

// Ledger RLUSD value → USD, rounded to cents (e.g. "1.45" → 1450).
export function rlusdToUsd(value: string | number): number {
  return Math.round((Number(value) / RLUSD_PER_USD) * 100) / 100;
}
