# Money layer: integration guide for P2

_Owner: P1 (Arpey). Last updated 2026-09-26, branch `money-layer`. Questions: ask P1._

Everything on the XRP Ledger (wallets, RLUSD, the Guardian, credentials) is built, reviewed and live on Testnet.
This guide covers what **P2 (agents + backend)** needs to build on top of it: which functions to call, the
numbers the Guardian enforces, and the security rules. Working examples: `scripts/test-payment.ts` (rent,
attacks, double charge) and `scripts/spawn-tenant.ts` (spawn a tenant live).

> **Update 2026-09-26 (branch `p1-real-payments`):** the money layer is now wired into P2's backend.
> `POST /api/rent-day` pays for real through the Guardian (`src/services/xrplPayments.ts`), and these routes exist:
> `GET/POST /api/clock`, `POST /api/demo/reset` (bumps `run` + recycles RLUSD), `POST /api/topup`,
> `POST /api/attacks/:name`, `POST /api/tenants` (spawn, NDJSON stream). Extra env for the app (values sent privately):
> `GUARDIAN_ADDRESS`, `AGENT_KEY_SECRET` (any long random string; encrypts spawned agents' keys), and optionally
> `RENT_PAYMENTS=mock|real` (default: real when `GUARDIAN_URL` + the 3 agent seeds are set). Team names are display-only:
> Abhimanyu → `XRPL_*_MAYA_*` wallet, Kashish → `JORDAN`, Musammat → `PRIYA`, Arpey → landlord.
> Live check without MongoDB: `npm run guardian` + `npx tsx scripts/check-real-rent-day.ts`.

---

## 1. How a rent payment flows

```
 tick (T17) ─▶ PaymentIntent (USD) ─▶ buildPayment ─▶ agentSign ─▶ requestCosign ─▶ Guardian (Render)
                                                                        │  approved: its signature
                                                                        ▼  refused: rule + reason
                                                                  multisignSubmit ─▶ XRPL Testnet
```

- A tenant's **rent wallet** needs 2 of 3 signatures: agent (1) + Guardian (1), or the tenant's backup key (2).
  The app holds agent keys only, so **it can never pay without the Guardian**.
- The Guardian decodes the **real transaction** and checks it against its rules. It doesn't trust the intent.
- **Everything outside `lib/xrpl` works in USD.** The ledger moves USD × 0.001 RLUSD (the faucet only gives
  10 RLUSD a day). `$1,450` appears as `1.45 RLUSD` on the explorer. Conversion happens only inside `lib/xrpl`.

---

## 2. Setup

1. `git pull` and merge `money-layer` into `main`, then `npm install`.
2. Add these env vars (P1 sends the values privately, **never through git or the team channel**):

| Env var | Used for |
|---|---|
| `GUARDIAN_URL` | `https://rentrelay-guardian.onrender.com` |
| `GUARDIAN_ADDRESS` | Guardian's public address (for spawn). **Not** its seed. |
| `GUARDIAN_ADMIN_TOKEN` | optional: `resetGuardian()` only |
| `XRPL_LANDLORD_ADDRESS` | destination of every rent payment |
| `XRPL_LANDLORD_SEED` | issuing agent credentials (spawn) + recycling RLUSD on reset |
| `XRPL_OPS_SEED`, `XRPL_OPS_ADDRESS` | pays XRP reserves for spawned wallets |
| `XRPL_BANK_SEED`, `XRPL_BANK_ADDRESS` | simulated bank: top-ups |
| `XRPL_TENANT_{MAYA,JORDAN,PRIYA}_ADDRESS` | seed tenants' rent wallets |
| `XRPL_AGENT_{MAYA,JORDAN,PRIYA}_SEED` | seed tenants' agent keys |
| `GUARDIAN_TIMEOUT_MS` | optional, default `10000` |

Never add: the Guardian's seed, tenant backup seeds, or tenant master seeds (disabled, useless).

3. Sanity check: `npm run guardian` in one terminal, `npm run test:payment` in another. All 5 steps should be ✅.
   To use the deployed Guardian instead: `GUARDIAN_URL=https://rentrelay-guardian.onrender.com npm run test:payment`.

**Connecting:** wrap ledger work in `withClient(async (client) => { ... })` from `lib/xrpl/client`. It opens and
closes a Testnet connection. One per request is fine.

---

## 3. What the Guardian enforces (must match the T14 seed)

| | Maya (4B) | Jordan (4B) | Priya (2A) |
|---|---|---|---|
| Unit rent | $2,900 | $2,900 | $1,450 |
| **Rent share** (`intent.rentUsd` must equal this **exactly**) | $1,450 | $1,450 | $1,450 |
| Utilities max per payment | $100 | $100 | $100 |
| Cap (total) | $1,600 | $1,600 | $1,600 |

- `rentUsd + utilitiesUsd + lateFeeUsd` must equal `totalUsd`, and `totalUsd` must equal the tx amount.
- Destination must be the landlord.
- Payment window: from 5 days before the 1st to 30 days after.
- **Late fee:** none on days 1–5 (the 1st is day 1). From day 6, $5/day, up to min($50, 5% of **unit** rent).
  Day 8 = $15.
- **One payment per tenant per month per demo run.** Checked on the ledger, so it survives Guardian restarts.

**T30:** if both 4B roommates are late, split the unit's fee cap between them by share. The Guardian only
enforces the per-tenant maximum, so this part is P2's job.

---

## 4. The demo `run` number (important)

Every payment is tagged `month#run` (e.g. `2026-10#run3`), and "already paid" is looked up on the ledger by
that tag. So:

- **Store `run` in the DB** next to the demo clock, starting at 1.
- **`POST /api/demo/reset` must increment `run`.** ⚠️ If it doesn't, every tenant is refused as "already paid"
  on the next rent day and the demo stalls.
- Pass the same `month` and `run` to both `buildPayment` (as `period`) and `requestCosign` (as `context`).
- `resetGuardian()` does **not** replay a month. Only bumping `run` does.

---

## 5. Recipes

### T17: pay one tenant on rent day

```ts
import { Wallet } from "xrpl";
import { withClient } from "@/lib/xrpl/client";
import { requestCosign } from "@/lib/xrpl/guardianClient";
import { periodKey } from "@/lib/xrpl/memos";
import { agentSign, buildPayment, hashAuditRecord, multisignSubmit } from "@/lib/xrpl/payments";
import type { AuditEntry, PaymentIntent } from "@/lib/types";

async function payRent(intent: PaymentIntent, walletAddress: string, agentSeed: string,
                       clock: { today: string; month: string; run: number }): Promise<AuditEntry> {
  return withClient(async (client) => {
    const context = { today: clock.today, month: clock.month, run: clock.run };
    const memoHash = hashAuditRecord({ intent, context });
    const tx = await buildPayment(client, {
      from: walletAddress, to: intent.destination, usd: intent.totalUsd,
      memoHash, period: periodKey(context.month, context.run),
    });
    const agentBlob = agentSign(tx, Wallet.fromSeed(agentSeed));
    const decision = await requestCosign(agentBlob, intent, context);
    const base = { id: crypto.randomUUID(), time: new Date().toISOString(), intent, decision, memoHash };

    if (!decision.approved) return { ...base, status: "blocked" };
    const res = await multisignSubmit(client, [agentBlob, decision.signature!]);
    return { ...base, txHash: res.hash, status: res.code === "tesSUCCESS" ? "paid" : "failed" };
  });
}
```

- Only mark a due **paid** when `status === "paid"`. A `validated: false` result (timed out) is **failed/unknown**,
  not paid.
- Check the wallet has enough first (`getBalances(client, address).usd >= intent.totalUsd`). Otherwise the ledger
  returns `tecPATH_DRY`.
- Each tx takes about 4–8s. Pay tenants in **parallel** (`Promise.all`) and raise `maxDuration` on `/api/tick`
  in Vercel.
- Explorer link for the UI: `explorerTx(txHash)` from `lib/xrpl/config`.

### T15: demo reset

1. `run = run + 1` in the DB.
2. Recycle RLUSD: landlord → bank, then bank → each tenant back to their seed balance.

```ts
const landlord = Wallet.fromSeed(process.env.XRPL_LANDLORD_SEED!);
const bank = Wallet.fromSeed(process.env.XRPL_BANK_SEED!);
const lb = await getBalances(client, landlord.address);
if (lb.rlusd > 0) await sendRlusd(client, landlord, bank.address, lb.usd);
for (const t of tenants) {
  const b = await getBalances(client, t.walletAddress);
  const need = SEED_BALANCE_USD[t.id] - b.usd;
  if (need > 0) await topUp(client, bank, t.walletAddress, need);
}
```

The bank float is 10 RLUSD ≈ $10,000 of demo money, so keep seed balances to a few thousand dollars in total.
Suggested seed: Maya $1,500 (covered), Jordan $1,000 (short, for the "pay on the 5th" story), Priya $1,500.

### T18: balances for `/api/state`

`getBalances(client, address)` → `{ xrp, rlusd, usd }`. Show `usd` in the UI.

### T35: `POST /api/tenants` (spawn live)

```ts
import { spawnRentWallet } from "@/lib/xrpl/spawn";

const result = await spawnRentWallet(client, {
  ops: Wallet.fromSeed(process.env.XRPL_OPS_SEED!),
  landlord: Wallet.fromSeed(process.env.XRPL_LANDLORD_SEED!),
  guardianAddress: process.env.GUARDIAN_ADDRESS!,
  limits: { tenantId, capUsd: 1600, unitRentUsd, rentShareUsd, maxUtilitiesUsd: 100 },
  onStep: (s) => send(s), // stream to the console for the T36 animation
});
// store: result.address (walletAddress), result.agentAddress, result.agentSeed (ENCRYPTED)
```

- Takes about 28s (6 txs). Stream steps as NDJSON or SSE. Each `SpawnStep` is
  `{ step, label, txHash?, explorer?, elapsedMs }`, and `step` is one of `keys → fund → trustline /
  credential-issued → credential-accepted → signer-list → master-disabled`.
- **Security (from review):**
  - Send **only `steps`** to the landlord console. **Never** send, log or store `backupSeed`: it's a weight-2 key
    that can empty the tenant's wallet alone. Drop it, or show it only in the tenant's own view.
  - Store `agentSeed` encrypted (e.g. AES-GCM with a key from env), not in plain text in Mongo.
- No Guardian registration is needed: it recognises the new wallet from its on-ledger credential.
- If a spawn fails midway, retry. About 2.6 test XRP is lost per failed attempt. The ops account has ~97 XRP.

### T37: `POST /api/attacks/:name` ("What could go wrong?")

```ts
import { ATTACKS, type AttackName, runAttack } from "@/lib/xrpl/attacks";

const name = params.name as AttackName;               // 404 if !(name in ATTACKS)
const result = await withClient((client) => runAttack(client, name, {
  tenantId: "maya", walletAddress: maya.walletAddress, agentSeed: MAYA_AGENT_SEED,
  landlordAddress: process.env.XRPL_LANDLORD_ADDRESS!, rentShareUsd: 1450, utilitiesUsd: 38,
  clock: { today, month, run },                        // current demo clock + run
}));
await db.audit.insertOne(result.audit);                // status "blocked"
return Response.json(result);                          // { title, blocked, blockedBy, rule, reason, ledgerCode? }
```

| `name` | Demo | Blocked by | `rule` |
|---|---|---|---|
| `scam-address` | **live** | Guardian | `landlord-only` |
| `illegal-late-fee` | **live** | Guardian | `legal-late-fee` |
| `stolen-key` | **live** | **the ledger itself** (`tefBAD_QUORUM`) | `ledger-quorum` |
| `fee-in-grace` | Q&A | Guardian | `legal-late-fee` |
| `inflated-coned` | Q&A | Guardian | `cap` |
| `double-charge` | Q&A: **run after rent day** (before that: `not-ready`, nothing sent) | Guardian | `once-per-month` |
| `lying-agent` | Q&A | Guardian | `intent-mismatch` |

- Safe to click any time: attacks **never submit** a Guardian-approved tx and cost no RLUSD. `double-charge`
  before rent is paid returns `rule: "not-ready"` without contacting the Guardian, so it can't delay the real rent.
  Don't log `not-ready` results as attacks (or show them as "run after rent day").
- **Build `target` on the server** (tenant wallet + agent seed from the DB). Never accept a seed, address or target
  from the request body: the route signs with the real agent key. Validate `:name` against `ATTACKS` (404 otherwise).
- Any demo date works: if the clock is outside the payment window, attacks use the 1st of the month so each one
  still reports its own rule.
- `ATTACKS[name].title` and `.live` feed P3's panel (T38). `reason` is the "Blocked by:" line.
- Check it all: `npm run test:attacks` (pays one rent for a fresh run, then fires all 7).

### T33: `POST /api/topup` (tenant's "Top up" button)

```ts
import { MAX_TOPUP_USD, TopUpError, topUpRentWallet } from "@/lib/xrpl/topup";

const { tenantId, usd } = await req.json();            // amount from the tenant; everything else server-side
const tenant = await db.tenants.findOne({ id: tenantId }); // 404 if missing
try {
  const r = await withClient((client) =>
    topUpRentWallet(client, Wallet.fromSeed(process.env.XRPL_BANK_SEED!), tenant.walletAddress, Number(usd), tenant.capUsd));
  return Response.json(r);                             // { txHash, explorer, usd, walletBalanceUsd, bankBalanceUsd }
} catch (e) {
  if (e instanceof TopUpError)   // bad-amount / not-a-rent-wallet → 400; wallet-full / bank-empty → 409
    return Response.json({ code: e.code, message: e.message },
      { status: e.code === "wallet-full" || e.code === "bank-empty" ? 409 : 400 });
  throw e;
}
```

- Limits: $0.01 to **$2,000** (`MAX_TOPUP_USD`) per top-up, in whole cents, and the wallet may hold at most
  **one month's max payment** afterwards (`MAX_WALLET_USD` = $1,600, or the tenant's `capUsd` passed as the 5th
  argument). `wallet-full`'s message says how much more fits ("You can top up $97 more"). This stops a public
  visitor parking the shared float in rent wallets, where reset can't recycle it. Only real rent wallets (RLUSD trust
  line + master key disabled), so the landlord or bank can't be "topped up".
- **Take the wallet address from the DB, never from the request body.**
- No Guardian involved: a top-up only adds money to the tenant's own wallet.
- Demo story (checked by `npm run test:topup`): Jordan is short → tops up → on day 8 his agent pays
  $1,450 + $38 + $15 late fee and the Guardian co-signs it.
- `bank-empty` means the float ran out. A demo reset recycles it (landlord → bank).

---

## 6. Showing Guardian decisions in the UI

`GuardianDecision.rule` tells you **why**:

| `rule` | Meaning | Demo line |
|---|---|---|
| `all` | approved, all 5 rules passed | "Paid" |
| `landlord-only` | destination isn't the verified landlord | "Blocked: scam address" |
| `legal-late-fee` | fee in grace period, over the legal max, or more than accrued | "Blocked: illegal late fee" |
| `cap` | rent ≠ share, utilities over max, or total over cap | "Blocked: overcharge" |
| `once-per-month` | already paid this month and run | on **rent day**: "Already paid ✓" (not an error); from an **attack**: "Blocked: double charge" |
| `window` | outside the payment window | "Blocked: wrong date" |
| `intent-mismatch` | the agent's description doesn't match the real tx | "Blocked: agent lied" |
| `tx-shape` | not a plain RLUSD payment from a known rent wallet with the right tag/signer | "Blocked: invalid payment" |
| `ledger-quorum` | (attacks only) agent-only signature rejected by the XRP Ledger | "Blocked by the ledger: stolen key" |
| `guardian-unreachable` | Guardian asleep or down; nothing was paid | "Guardian waking up, retry" |
| `insufficient-funds` | (rent day only) wallet short; nothing was sent, the Guardian wasn't asked | "Short $X, top up" |
| `error` | (rent day only) unexpected failure for that tenant; nothing was paid | "Couldn't pay, retry" |

`decision.reason` is a plain-English sentence, safe to show as-is.

---

## 7. Rules to keep

- The app never gets the Guardian's seed or any tenant backup seed. Read `GUARDIAN_ADDRESS` from env; never
  load `.secrets/guardian.env`.
- Never send seeds to Gemini, the frontend, or logs.
- Don't change `lib/xrpl` or `guardian/`. Ask P1, since the Guardian and app must agree on the format.
- **Before any demo, open `https://rentrelay-guardian.onrender.com/health`.** It's on Render's free plan and
  sleeps after ~15 min (about 50s to wake).

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `guardian-unreachable` | Guardian asleep. Open `/health`, wait, retry. |
| `once-per-month` on the first rent day after a reset | Reset didn't bump `run`. |
| `tx-shape: Payment must be tagged …` | `period` passed to `buildPayment` ≠ `month`/`run` sent in context. |
| `cap: Rent must be exactly the tenant's share` | DB rent share ≠ table in section 3. |
| `tecPATH_DRY` from the ledger | Wallet has no RLUSD. Top up first. |
| `tefBAD_QUORUM` | Submitted without the Guardian's signature (expected only in the "stolen key" attack). |
