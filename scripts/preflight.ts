// Pre-demo check (T39 preflight): run before every judging slot.
//
//   npm run preflight                                  (reads .env.local)
//   APP_URL=https://<your-app> npm run preflight       (also checks the running app)
//
// Read-only: moves no money, writes nothing to MongoDB, queues no texts. It wakes the Guardian
// (Render free plan sleeps) and asks it to refuse a scam payment as a live rules check.
// Exit code 1 if anything is ❌, so it can gate a demo.
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { Wallet } from "xrpl";
import { withClient } from "../lib/xrpl/client";
import { requestCosign } from "../lib/xrpl/guardianClient";
import { periodKey } from "../lib/xrpl/memos";
import { agentSign, buildPayment, getBalances } from "../lib/xrpl/payments";
import { getRentWalletStatus } from "../lib/xrpl/rentWallet";

dotenv.config({ path: ".env.local", quiet: true });

type Level = "ok" | "warn" | "fail";
const ICON: Record<Level, string> = { ok: "✅", warn: "⚠️ ", fail: "❌" };
const results: Level[] = [];
function report(level: Level, label: string, detail = "") {
  results.push(level);
  console.log(`${ICON[level]} ${label}${detail ? ` · ${detail}` : ""}`);
}
async function check(label: string, fn: () => Promise<[Level, string]>) {
  const t0 = Date.now();
  try {
    const [level, detail] = await fn();
    report(level, label, `${detail} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    report("fail", label, (e as Error).message.slice(0, 160));
  }
}

const REQUIRED = [
  "MONGODB_URI", "GEMINI_API_KEY", "GUARDIAN_URL", "GUARDIAN_ADDRESS", "AGENT_KEY_SECRET",
  "XRPL_LANDLORD_SEED", "XRPL_LANDLORD_ADDRESS", "XRPL_OPS_SEED", "XRPL_OPS_ADDRESS", "XRPL_BANK_SEED", "XRPL_BANK_ADDRESS",
  "XRPL_AGENT_MAYA_SEED", "XRPL_AGENT_JORDAN_SEED", "XRPL_AGENT_PRIYA_SEED",
];
// Seed balances demo reset restores (src/services/xrplConfig.ts); needed to size the float.
const SEED_BALANCE_USD: Record<string, number> = { abhimanyu: 1500, kashish: 1000, musammat: 1600 };
const SPAWN_XRP = 2.6;

type TenantRow = { id: string; name: string; walletAddress: string };
let tenants: TenantRow[] = [];
let run = 1;
let today = "2026-10-01";

console.log("RentRelay pre-demo check\n");

// 1. Env
const missing = REQUIRED.filter((k) => !process.env[k]);
report(missing.length ? "fail" : "ok", "Env (.env.local)", missing.length ? `missing: ${missing.join(", ")}` : `${REQUIRED.length} variables set`);
const env = (k: string) => process.env[k] ?? "";

// 2. Guardian: wake it first (can take ~50s on Render's free plan)
await check("Guardian awake + identity", async () => {
  const res = await fetch(`${env("GUARDIAN_URL")}/health`, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) return ["fail", `HTTP ${res.status}`];
  const h = (await res.json()) as { guardian: string; landlord: string; rentWallets: number };
  if (h.guardian !== env("GUARDIAN_ADDRESS")) return ["fail", "Guardian address doesn't match GUARDIAN_ADDRESS"];
  if (h.landlord !== env("XRPL_LANDLORD_ADDRESS")) return ["fail", "Guardian's landlord doesn't match XRPL_LANDLORD_ADDRESS"];
  return ["ok", `${env("GUARDIAN_URL")} · ${h.rentWallets} rent wallets`];
});

// 3. MongoDB: real wallets seeded, demo clock
await check("MongoDB", async () => {
  const client = new MongoClient(env("MONGODB_URI"), { serverSelectionTimeoutMS: 10_000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "rentrelay");
    tenants = await db.collection<TenantRow>("tenants").find({}, { projection: { _id: 0, id: 1, name: 1, walletAddress: 1 } }).sort({ id: 1 }).toArray();
    const state = await db.collection<{ today: string; run: number }>("demoState").findOne({ id: "demo" });
    if (state) ({ today, run } = state);
    const pending = await db.collection("outbox").countDocuments({ status: "pending" });
    const placeholders = tenants.filter((t) => !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(t.walletAddress));
    if (tenants.length === 0) return ["fail", "no tenants: run POST /api/seed (dev) first"];
    if (placeholders.length) return ["fail", `placeholder wallets for ${placeholders.map((t) => t.name).join(", ")}: re-seed`];
    return [pending ? "warn" : "ok", `db ${db.databaseName} · ${tenants.length} tenants with real wallets · clock ${today} run ${run}${pending ? ` · ${pending} texts pending in outbox` : ""}`];
  } finally {
    await client.close();
  }
});

// 4–7. Ledger checks (one Testnet connection)
await withClient(async (client) => {
  await check("XRPL Testnet", async () => {
    const { result } = await client.request({ command: "server_info" });
    return ["ok", `validated ledger ${result.info.validated_ledger?.seq}`];
  });

  await check("Rent wallets (2-of-3, master key off)", async () => {
    const bad: string[] = [];
    for (const t of tenants) {
      const s = await getRentWalletStatus(client, t.walletAddress);
      const hasGuardian = s.signers.some((e) => e.account === env("GUARDIAN_ADDRESS") && e.weight === 1);
      if (!s.masterDisabled || s.quorum !== 2 || !hasGuardian) bad.push(t.name);
    }
    return bad.length ? ["fail", `not locked to agent + Guardian: ${bad.join(", ")}`] : ["ok", `${tenants.length} wallets locked to agent + Guardian`];
  });

  await check("Guardian rules (live scam refusal, nothing submitted)", async () => {
    const tenant = tenants.find((t) => t.id === "abhimanyu") ?? tenants[0];
    const month = today.slice(0, 7);
    const scam = Wallet.generate().address;
    const tx = await buildPayment(client, { from: tenant.walletAddress, to: scam, usd: 1488, memoHash: "00".repeat(32), period: periodKey(month, run) });
    const d = await requestCosign(agentSign(tx, Wallet.fromSeed(env("XRPL_AGENT_MAYA_SEED"))),
      { tenantId: tenant.id, dueId: "preflight", destination: scam, rentUsd: 1450, utilitiesUsd: 38, lateFeeUsd: 0, totalUsd: 1488, reason: "preflight" },
      { today, month, run });
    if (d.approved) return ["fail", "the Guardian APPROVED a scam payment (it was not submitted)"];
    if (d.rule === "guardian-unreachable") return ["fail", d.reason];
    return d.rule === "landlord-only" ? ["ok", "refused: landlord-only"] : ["warn", `refused, but by rule "${d.rule}": ${d.reason.slice(0, 80)}`];
  });

  await check("Demo money (RLUSD float)", async () => {
    const bank = await getBalances(client, env("XRPL_BANK_ADDRESS"));
    const landlord = await getBalances(client, env("XRPL_LANDLORD_ADDRESS"));
    let refill = 0;
    for (const t of tenants) {
      const target = SEED_BALANCE_USD[t.id];
      if (target !== undefined) refill += Math.max(0, target - (await getBalances(client, t.walletAddress)).usd);
    }
    const spare = bank.usd + landlord.usd - refill; // what's left after a demo reset
    const detail = `bank $${bank.usd.toLocaleString()} + landlord $${landlord.usd.toLocaleString()}; a reset needs $${refill.toLocaleString()} → $${spare.toLocaleString()} spare`;
    if (spare < 0) return ["fail", `${detail}: not enough for a reset; claim RLUSD at tryrlusd.com`];
    return [spare < 2000 ? "warn" : "ok", detail];
  });

  await check("Ops XRP (pays for live spawns)", async () => {
    const { xrp } = await getBalances(client, env("XRPL_OPS_ADDRESS"));
    const spawns = Math.floor(Math.max(0, xrp - 1) / SPAWN_XRP);
    return [spawns < 3 ? "warn" : "ok", `${xrp} XRP ≈ ${spawns} spawns${spawns < 3 ? ": top up from the Testnet faucet" : ""}`];
  });
});

// 8. Gemini
await check("Gemini API", async () => {
  const names: string[] = [];
  let pageToken = "";
  do {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`,
      { headers: { "x-goog-api-key": env("GEMINI_API_KEY") }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return ["fail", `HTTP ${res.status}: key rejected or quota`];
    const body = (await res.json()) as { models?: { name: string }[]; nextPageToken?: string };
    names.push(...(body.models ?? []).map((m) => m.name.replace("models/", "")));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  const wanted = process.env.GEMINI_MODEL;
  if (wanted && !names.includes(wanted)) return ["fail", `GEMINI_MODEL "${wanted}" isn't available to this key`];
  const flash = names.filter((n) => /^gemini-[\d.]+-flash$/.test(n));
  return ["ok", `key valid · ${names.length} models${wanted ? ` · ${wanted} available` : ""} · flash: ${flash.join(", ") || "none"}`];
});

// 9. The running app (optional)
const app = process.env.APP_URL;
if (app) {
  await check(`App ${app}`, async () => {
    const res = await fetch(`${app}/api/state`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return ["fail", `/api/state HTTP ${res.status}`];
    const s = (await res.json()) as { paymentsMode: string; tenants: unknown[]; warnings: string[]; clock: { today: string; run: number } };
    if (s.paymentsMode !== "real") return ["fail", `payments are in "${s.paymentsMode}" mode: the app is missing XRPL env vars`];
    if (s.warnings.length) return ["warn", s.warnings.join("; ")];
    return ["ok", `/api/state: ${s.tenants.length} tenants, real payments, clock ${s.clock.today} run ${s.clock.run}`];
  });
} else {
  console.log("   (set APP_URL=http://localhost:3000 or the Vercel URL to also check the running app)");
}

const fails = results.filter((r) => r === "fail").length;
const warns = results.filter((r) => r === "warn").length;
console.log(`\n${fails ? `❌ ${fails} problem(s): fix before demoing` : warns ? `⚠️  Ready, with ${warns} warning(s)` : "✅ Ready to demo"}`);
process.exitCode = fails ? 1 : 0;
