// T10 + T11: create, fund and lock down the RentRelay Testnet accounts.
//
//   npm run setup:xrpl
//
// Idempotent: keys are saved to git-ignored files under .secrets/ and reused on
// re-runs. Accounts wiped by a Testnet reset are re-funded from the faucet.
// Test RLUSD has no faucet API, so the bank is funded by hand at https://tryrlusd.com.
//
// Keys are split by who may hold them (PLAN.md security rules):
//   .secrets/xrpl.env            app: landlord/ops/bank seeds, tenant agent seeds
//   .secrets/guardian.env        Guardian service only
//   .secrets/tenant-backups.env  tenants only (never deployed anywhere)
//   .secrets/guardian-policy.json  Guardian: landlord + each rent wallet's agent, cap and unit rent (public data)
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Wallet, type Client } from "xrpl";
import type { GuardianPolicy } from "../guardian/rules";
import { withClient } from "../lib/xrpl/client";
import { RLUSD, explorerAccount } from "../lib/xrpl/config";
import { getRentWalletStatus, makeRentWallet } from "../lib/xrpl/rentWallet";
import { ensureRlusdTrustLine, getRlusdBalance } from "../lib/xrpl/rlusd";

const APP_FILE = ".secrets/xrpl.env";
const GUARDIAN_FILE = ".secrets/guardian.env";
const BACKUP_FILE = ".secrets/tenant-backups.env";
const POLICY_FILE = ".secrets/guardian-policy.json";

// Seed tenants (PLAN.md): Unit 4B $2,900 split 50/50, Unit 2A $1,450. Every rent share is $1,450; utilities up to $100;
// cap = share + utilities max + $50 max late fee = $1,600. P2's DB seed (T14) must use the same numbers.
type TenantSeed = { id: string; capUsd: number; unitRentUsd: number; rentShareUsd: number; maxUtilitiesUsd: number };
type Role = { key: string; label: string; holdsRlusd: boolean; tenant?: TenantSeed };
const ROLES: Role[] = [
  { key: "LANDLORD", label: "Landlord", holdsRlusd: true },
  { key: "OPS", label: "Landlord agent ops (pays spawn reserves)", holdsRlusd: false },
  { key: "BANK", label: "Simulated bank (RLUSD top-ups)", holdsRlusd: true },
  { key: "TENANT_MAYA", label: "Maya rent wallet (4B)", holdsRlusd: true, tenant: { id: "maya", capUsd: 1600, unitRentUsd: 2900, rentShareUsd: 1450, maxUtilitiesUsd: 100 } },
  { key: "TENANT_JORDAN", label: "Jordan rent wallet (4B)", holdsRlusd: true, tenant: { id: "jordan", capUsd: 1600, unitRentUsd: 2900, rentShareUsd: 1450, maxUtilitiesUsd: 100 } },
  { key: "TENANT_PRIYA", label: "Priya rent wallet (2A)", holdsRlusd: true, tenant: { id: "priya", capUsd: 1600, unitRentUsd: 1450, rentShareUsd: 1450, maxUtilitiesUsd: 100 } },
];

function loadEnvFile(file: string): Record<string, string> {
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
}

function saveEnvFile(file: string, header: string, vars: Record<string, string>) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n");
  fs.writeFileSync(file, `# ${header} NEVER COMMIT.\n${body}\n`, { mode: 0o600 });
}

// Returns the wallet stored under `prefix` in `vars`, generating (and saving) a new key if missing.
// Signer keys never need funding: they only sign for the rent wallets.
function ensureKey(vars: Record<string, string>, prefix: string, save: () => void): Wallet {
  if (!vars[`${prefix}_SEED`]) {
    const w = Wallet.generate();
    vars[`${prefix}_SEED`] = w.seed!;
    vars[`${prefix}_ADDRESS`] = w.address;
    save();
  }
  return Wallet.fromSeed(vars[`${prefix}_SEED`]);
}

async function accountExists(client: Client, address: string): Promise<boolean> {
  try {
    await client.request({ command: "account_info", account: address });
    return true;
  } catch (e) {
    if ((e as { data?: { error?: string } }).data?.error === "actNotFound") return false;
    throw e;
  }
}

async function main() {
  const app = loadEnvFile(APP_FILE);
  const guardian = loadEnvFile(GUARDIAN_FILE);
  const backups = loadEnvFile(BACKUP_FILE);
  const saveApp = () => saveEnvFile(APP_FILE, "RentRelay app XRPL keys.", app);
  const saveGuardian = () => saveEnvFile(GUARDIAN_FILE, "Guardian co-signing key. Guardian service only.", guardian);
  const saveBackups = () => saveEnvFile(BACKUP_FILE, "Tenant backup keys (weight 2). Tenants only; never deploy.", backups);

  const guardianWallet = ensureKey(guardian, "GUARDIAN", saveGuardian);
  // Shared by the Guardian (to accept) and the app (to send) for the demo-reset endpoint only.
  if (!guardian.GUARDIAN_ADMIN_TOKEN) {
    guardian.GUARDIAN_ADMIN_TOKEN = randomBytes(24).toString("hex");
    saveGuardian();
  }
  app.GUARDIAN_ADMIN_TOKEN = guardian.GUARDIAN_ADMIN_TOKEN;
  app.GUARDIAN_URL ??= "http://localhost:4001";
  app.GUARDIAN_ADDRESS = guardianWallet.address; // public address only; the app never gets the Guardian's seed
  saveApp();
  const policy: GuardianPolicy = { landlord: "", rentWallets: {} };

  await withClient(async (client) => {
    // T10: fund accounts and set RLUSD trust lines (needs each account's master key).
    for (const role of ROLES) {
      const seedKey = `XRPL_${role.key}_SEED`;
      const existing = app[seedKey] ? Wallet.fromSeed(app[seedKey]) : undefined;

      if (!existing || !(await accountExists(client, existing.address))) {
        process.stdout.write(`Funding ${role.label} from faucet... `);
        const { wallet } = await client.fundWallet(existing);
        app[seedKey] = wallet.seed!;
        app[`XRPL_${role.key}_ADDRESS`] = wallet.address;
        saveApp(); // save after each account so a crash never loses a seed
        console.log(wallet.address);
      }

      const wallet = Wallet.fromSeed(app[seedKey]);
      if (role.holdsRlusd && !(await getRentWalletStatus(client, wallet.address)).masterDisabled) {
        const hash = await ensureRlusdTrustLine(client, wallet);
        if (hash) console.log(`  RLUSD trust line set for ${role.label}: ${hash}`);
      }

      // T11: tenant accounts become two-key rent wallets (last, since it disables the master key).
      if (role.tenant) {
        const name = role.key.replace("TENANT_", "");
        const agent = ensureKey(app, `XRPL_AGENT_${name}`, saveApp);
        const backup = ensureKey(backups, `BACKUP_${name}`, saveBackups);
        const hashes = await makeRentWallet(client, wallet, {
          agent: agent.address,
          guardian: guardianWallet.address,
          backup: backup.address,
        });
        for (const h of hashes) console.log(`  rent wallet setup tx for ${role.label}: ${h}`);
        const { id: tenantId, ...limits } = role.tenant;
        policy.rentWallets[wallet.address] = { tenantId, agent: agent.address, ...limits };
      }
    }

    policy.landlord = app.XRPL_LANDLORD_ADDRESS;
    fs.writeFileSync(POLICY_FILE, JSON.stringify(policy, null, 2) + "\n");

    console.log("\nRentRelay Testnet accounts");
    console.log(`RLUSD issuer: ${RLUSD.issuer}`);
    console.log(`Guardian key: ${guardianWallet.address}\n`);
    for (const role of ROLES) {
      const address = app[`XRPL_${role.key}_ADDRESS`];
      const { result } = await client.request({ command: "account_info", account: address });
      const xrp = Number(result.account_data.Balance) / 1_000_000;
      const rlusd = role.holdsRlusd ? await getRlusdBalance(client, address) : null;
      console.log(`${role.label}`);
      console.log(`  ${address}  XRP ${xrp}${rlusd !== null ? `  RLUSD ${rlusd}` : ""}`);
      if (role.tenant) {
        const s = await getRentWalletStatus(client, address);
        const list = s.signers.map((e) => `${e.account}(${e.weight})`).join(" ");
        console.log(`  master disabled: ${s.masterDisabled}  quorum ${s.quorum}  signers: ${list}`);
      }
      console.log(`  ${explorerAccount(address)}`);
    }

    const bankRlusd = await getRlusdBalance(client, app.XRPL_BANK_ADDRESS);
    if (!bankRlusd) {
      console.log(
        `\n⚠️  The bank has no RLUSD yet. Claim test RLUSD at https://tryrlusd.com (GitHub sign-in), sent to:\n` +
          `    ${app.XRPL_BANK_ADDRESS}\n   Then re-run \`npm run setup:xrpl\` to confirm.`,
      );
    } else {
      console.log(`\n✅ Bank holds ${bankRlusd} RLUSD.`);
    }
    console.log(`\nKeys saved to ${APP_FILE}, ${GUARDIAN_FILE}, ${BACKUP_FILE}; Guardian policy to ${POLICY_FILE} (all git-ignored).`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
