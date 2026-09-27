// Which XRPL keys the app holds, all from env (never from the repo, never the Guardian's seed).
// Seed tenants keep their original on-ledger env names; the team names are display-only:
// abhimanyu → MAYA wallet, kashish → JORDAN wallet, musammat → PRIYA wallet.
const SEED_TENANT_ENV: Record<string, string> = {
  abhimanyu: "XRPL_AGENT_MAYA_SEED",
  kashish: "XRPL_AGENT_JORDAN_SEED",
  musammat: "XRPL_AGENT_PRIYA_SEED",
};

// Seed balances (USD) that demo reset tops each rent wallet back up to. Kashish is short on purpose
// (the "pay on the 5th, then day 8 with a $15 late fee" story); the others cover rent + utilities.
export const SEED_BALANCE_USD: Record<string, number> = { abhimanyu: 1500, kashish: 1000, musammat: 1600 };

export function envSeed(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see docs/MONEY-LAYER.md §2)`);
  return v;
}

export function agentSeedEnvFor(tenantId: string): string | undefined {
  return SEED_TENANT_ENV[tenantId];
}

// Real payments are on when the Guardian and the seed tenants' agent keys are configured,
// unless RENT_PAYMENTS=mock forces the offline mocks (tests, or a demo without XRPL).
export function realPaymentsEnabled(): boolean {
  if (process.env.RENT_PAYMENTS === "mock") return false;
  if (process.env.RENT_PAYMENTS === "real") return true;
  return Boolean(process.env.GUARDIAN_URL && Object.values(SEED_TENANT_ENV).every((k) => process.env[k]));
}
