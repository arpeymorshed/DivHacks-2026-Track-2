# Code review log

_Owned by the Reviewer chat. Newest first. Each entry: date, task, verdict (approved / changes needed), findings._

## 2026-09-26: FI / T01a frontend integration, PR #11 `frontend-integration` @ 7aa3979: ✅ approved
**Ran from a clean scratch copy of 7aa3979:** `npm ci` · `next build` ✅ (`/` and `/demo` prerender) · `npm run typecheck` (strict `tsconfig.server.json`, TypeScript 5.9.3) ✅ · `npm run test:guardian` 18/18 ✅. The Builder's `/merge-check` (review, build/test, run-locally) also passed.
- **Follows the plan.** It's cut from `main`, Kashish's `app/`, `public/` and configs are transplanted, and the commit credits Kashish (`Co-authored-by`). The app code is identical to `origin/frontend` apart from the 5 typed `useRef`s (`app/page.tsx`).
- **Configs are right.** There's one `package.json` (Next 14.2 / React 18.3 / Tailwind 3.4 added; xrpl/express/tsx kept; `typescript ^5.4`). The root `tsconfig.json` is Next's plus `target: ES2022`, needed for the scripts' top-level await, with `bot/` and `.secrets` excluded. The previous strict config is kept as-is in `tsconfig.server.json`, and `.gitignore` adds `*.tsbuildinfo`.
- The money layer is untouched, so the Guardian/Render deploy still works. Note: Render's `npm install` now also pulls Next/React (~200 packages). That's a slower deploy, but not a slower wake-up.

Non-blocking:
- `FRONTEND.md` still says `cd rentrelay-project` and has the Xcode WebView steps. Update when convenient.
- The dark-mode toast bug is already in `docs/BUGS.md`, for the Debugger.
- The UI is still all mocks. Wiring to `/api/*` is the next step (T19/T20/T32/T38 notes).

**Merge:** PR #11 needs Arpey's yes. CI (build-test, smoke, claude-review) was still pending when checked. After merge, Kashish continues on `main`/`frontend-integration`, not `frontend`.

## 2026-09-26: `origin/frontend` @ 819665e (Kashish; tenant app, group chat, landlord view, dark mode): ⚠️ not mergeable yet (no PR open)
Looked at because the user asked. It isn't on the board as In review.
**Ran (in a scratch copy, not this checkout):** `npm ci` OK · `next build` **fails** · `tsc` 5 errors · `next dev` renders the tenant dashboard with no console errors.
- **What it is:** a standalone Next.js 14 + Tailwind app (18 files): tenant dashboard, unit group chat, 1-on-1 agent chat, notifications, top-up, dark mode, landlord console (`/demo`: building grid, rent day, spawn animation, 5-attack panel). It covers the UI side of T19, T20, T32, T36 and T38.

Blocking for merge/deploy:
1. **Unrelated history.** The branch is one commit with **no common ancestor** with `main` (`git merge-base` is empty), so a normal PR/merge won't work, and it collides with `main` on `package.json`, `package-lock.json`, `tsconfig.json`, `README.md` and `.gitignore`. Fix: move its `app/`, `public/`, `tailwind`/`postcss`/`next` configs onto a branch cut from `main`, and combine the two `package.json`s (Next/React/Tailwind + xrpl/express/dotenv/tsx). That also delivers T01's scaffold. ⚠ `main` pins `typescript ^7`; Next 14's build type-check may need TypeScript 5.x. Test `next build` after combining.
2. **`next build` fails** (so Vercel would too): 5 type errors, all from untyped `useRef()` (`app/page.tsx:75` ×2, `:86`, `:87`, `:118`). Fix: `useRef<number>()` / `useRef<HTMLInputElement>(null)` and `?.`. About 5 minutes.

Must fix before the demo (PLAN fit):
3. **Everything is simulated in the browser.** There are no `fetch`/`/api` calls. Rent day, spawn and attacks are `setTimeout` animations, **every attack shows "Blocked" after 1.2s regardless**, and chat replies are canned (`app/page.tsx:88, 187-189`). Fine as a mock, but PLAN says it should render from the `/api/state` shape (T19: `mocks/state.json`) and never-cut items (autonomous rent day, Guardian refusals, audit links) must be real on stage. Ripple judges will open the explorer links. Wire to `/api/state`, `/api/clock`, `/api/attacks/:name` (P1 already returns `title`/`reason`/`rule` for the panel) and `/api/topup`.
4. **Names don't match the plan.** The code uses team members (Abhimanyu, Kashish, Musammat, Arpey), while PLAN, the Guardian policy (`maya`/`jordan`/`priya`), the demo script and the branch's own README use Maya/Jordan/Priya. Pick one set before P2 seeds the DB (T14). The tenant IDs must match the Guardian policy.

**Update 2026-09-26, decisions by Arpey:**
- **#4 names: use the team's names.** It's display-only. The Guardian keys rent wallets by **address** and never checks `tenantId` (it's used only in logs, `guardian/server.ts:67,128`), so the existing wallets, keys, Render env and on-chain credentials all stay. Mapping by role: **Abhimanyu → Maya's wallet** (4B, 50%, pays on time) · **Kashish → Jordan's wallet** (4B, 50%, late, $15 fee) · **Musammat → Priya's wallet** (2A, 100%) · **Arpey → landlord**. P2's DB seed (T14) uses these names with the existing wallet addresses. The Planner should update PLAN's demo script. Optional: rename the `tenantId`s in `guardian-policy.json` / Render `GUARDIAN_POLICY` for nicer logs.
- **#1 integration: Reviewer recommends a transplant onto a branch from `main`** (for the Builder). Cut `frontend-integration` from `main`, check out Kashish's `app/`, `public/`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `next-env.d.ts` from `origin/frontend`, and merge the two `package.json`s into one. Pin `typescript` to 5.x (Next 14 builds with the TS 5 API; the money layer's `tsx` and `tsc --noEmit` work on 5.x). Use Next's tsconfig at the root, and keep the current strict one as `tsconfig.server.json` for `lib`/`guardian`/`scripts`. Fix the 5 `useRef`s. Done when `next build`, `tsc -p tsconfig.server.json` and `npm run test:guardian` all pass. Open a PR through `/merge-check` and credit Kashish with `Co-authored-by`. **Kashish then works on `frontend-integration`, not the orphan branch.**

Notes: the code is minified-style (one-line components, 2-letter state names like `sT`, `sM`), which will slow down wiring it to the API. No secrets or unsafe HTML found. `.gitignore` covers `.env`.

## 2026-09-26: T33 review fix, `money-topup` @ 408d1cd (wallet balance cap): ✅ approved
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 18/18 pass.
- **Must-fix #1: fixed.** `topUpRentWallet` refuses with `wallet-full` (HTTP 409 in the recipe) if the wallet would hold more than `MAX_WALLET_USD` ($1,600), or the tenant's `capUsd` passed from the DB (`lib/xrpl/topup.ts:43-50`). The message says how much still fits. `test:topup` gained two `wallet-full` cases (empty wallet + $1,700; $1,503 + $200).
- Now at most ~$1,600 per tenant can be parked, so the $10,000 float survives any number of single clicks.

Note (non-blocking, for P2/P3):
- **Simultaneous clicks can each pass the balance check.** Two top-ups sent at the same moment both read the old balance before either lands (~4s), and both are sent (`lib/xrpl/topup.ts:43` reads, `:57` sends). A double-click could put ~$3,200 in one wallet. It's bounded, but a script firing many requests at once could still park more. Cheap guards: P3 disables the Top up button while a request is in flight, and P2's route handles one top-up per tenant at a time (a per-tenant in-memory lock is enough on one server). Not needed for the demo itself.

T33 stays **In progress**: the P1 library is done, and the `POST /api/topup` route waits for the Next.js app (T01).

## 2026-09-26: T33 (P1 half), `money-topup` @ 650b51c (validated top-up): ❌ changes needed (small)
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 18/18 pass. Testnet balances right now: bank 10 RLUSD ($10,000); landlord, Maya, Jordan and Priya 0.
**Not run:** `test:topup`, because it moves real RLUSD.
- Amount checks (finite, > 0, ≤ $2,000, whole cents, with float-noise tolerance) are correct. The rent-wallet check (RLUSD line + master disabled) keeps the landlord, the bank and unknown addresses out, and fails closed on lookup errors (`lib/xrpl/topup.ts:24-32`). Typed `TopUpError` codes map cleanly to HTTP statuses.
- The recipe takes the wallet from the DB, not the request body. Good.

Must fix:
1. **Anyone can lock up the whole demo float in five clicks.** The limit is per click ($2,000) with no limit on the wallet's balance, and the route is public (judges must be able to test the deployed app). Money in a rent wallet can only leave as a Guardian-approved rent payment (~$1,500 a month) or with the tenant's offline backup key. Demo reset only recycles landlord → bank (`docs/MONEY-LAYER.md:134`), so it can't pull it back. 5 × $2,000 = the whole $10,000 float, and then every top-up and reset refill fails with `bank-empty` until the float is refilled by hand. Fix (about 3 lines in `topUpRentWallet`): refuse with `bad-amount` (or a new `wallet-full` code) if `walletBalanceUsd + usd` is over one month's maximum payment, e.g. `MAX_WALLET_USD = 1600` (share + utilities max + max late fee). Then at most ~$1,600 per tenant is ever parked, and the top-up button still covers any real shortfall. Add one refused case to `test:topup`.

Note: the `POST /api/topup` route itself waits for the Next.js app (T01), as the board says.

## 2026-09-26: T37 review fixes, `money-layer` @ c2994f8: ✅ approved
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 18/18 pass.
- **#1 double-charge stall: fixed** (option a). `runAttack` checks `paidOnLedger` first and returns `rule: "not-ready"` without calling the Guardian, so no pending record can block the real rent (`lib/xrpl/attacks.ts:79-84`). A rent payment that's still settling also returns `not-ready`, which is correct.
- **`paidOnLedger` was moved to `lib/xrpl/history.ts`.** It's the same logic, with `landlord` now a parameter, and the Guardian passes `policy.landlord` (`guardian/server.ts:73`). No behaviour change.
- **Window note: handled in P1.** If the demo clock is outside the payment window, attacks use the 1st, so each reports its own rule (`lib/xrpl/attacks.ts:55-61, 66`). The day-20 and day-2 fee scenarios still override the date.
- `docs/MONEY-LAYER.md` now tells P2 to build the target on the server, return 404 for unknown names, and not log `not-ready` as an attack.
- Minor: `attacks.ts` now imports `guardian/rules` at runtime (for the window constants). That module is pure (no server start, no keys), so it's fine to bundle in the Next.js app.

T37 stays **In progress** until P2's `POST /api/attacks/:name` lands.

## 2026-09-26: T37 (P1 half), `money-layer` @ 65b630c (attack scenarios): ✅ P1 half approved; T37 waits for P2
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 18/18 pass.
**Not run:** `test:attacks`, because it pays a real rent to set up the double charge.
- `runAttack` (`lib/xrpl/attacks.ts`) builds a real agent-signed tx for each of the 7 scenarios. I traced each one against the current rule order in `guardian/rules.ts`, and each hits its expected rule: scam → `landlord-only`, lying agent → `intent-mismatch` (checked before landlord), $200 fee on day 20 → `legal-late-fee` (before amounts), day-2 fee → `legal-late-fee`, $500 ConEd → `cap`, double charge → `once-per-month`.
- **Safety is right.** Stolen-key submits a single-signature blob, so the ledger rejects it with a `tef` (no fee, no sequence used). No other scenario ever submits, and if the Guardian unexpectedly approves one, its signature is dropped before the audit entry is built (`lib/xrpl/attacks.ts:113-119`). Attacks cost no RLUSD because the Guardian doesn't check balances.
- `ledger-quorum` was added to the rule → UI table in `docs/MONEY-LAYER.md`. Good for P3.

Should fix (demo stall):
1. **Clicking "double charge" before rent day can block the real rent for about 1 minute.** When no payment exists yet, the Guardian approves the attack and records it as pending (`guardian/server.ts`, `cosigned.set` in `/cosign`). The attack never submits, but `priorPayment` returns `"pending"` until the tx's `LastLedgerSequence` passes (~20 ledgers, ~60–80s). Jump to rent day inside that window, and Maya's real payment is refused with "A payment for 2026-10 is still settling." Fix (either one):
   - (a) In `runAttack`, for `double-charge`, first check the ledger for a paid tx with this period tag. If there's none, return "not ready: run after rent day" without calling the Guardian. Moving `paidOnLedger` into `lib/xrpl` lets both sides share it.
   - (b) P2/P3 disable the double-charge button until that tenant's due is `paid`.

Notes for P2 (`POST /api/attacks/:name`):
- **Pass a clock inside the payment window** (from 5 days before the 1st). The `window` rule runs before the amount and once-per-month rules. With an earlier clock, `inflated-coned` and `double-charge` would report `window` instead of their own rule. The other five are unaffected: they're either caught earlier or force their own date.
- Validate `:name` against `ATTACKS` (the guide already says 404). The route signs with the real agent key, so build the `target` on the server. Never accept a seed or target from the request body.

## 2026-09-26: T35 (P1 half), `money-layer` @ f059b54 (spawn a rent wallet live + on-chain credential): ✅ P1 half approved; T35 waits for P2

## 2026-09-26: T35 (P1 half), `money-layer` @ f059b54 (spawn a rent wallet live + on-chain credential): ✅ P1 half approved; T35 waits for P2
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 17/17 pass.
**Checked on Testnet:** Sam `rvnPYN…` shows CredentialCreate → TrustSet → CredentialAccept → SignerListSet → AccountSet → rent Payment, all `tesSUCCESS`. The credential's issuer is the landlord, it's accepted, it has type `RentRelayTenantAgent`, and its URI carries his limits. Master disabled, quorum 2, weights 1/1/2.
**Not run:** `spawn:tenant`, because it spends ops XRP and RLUSD.
- `spawnRentWallet` (`lib/xrpl/spawn.ts`) funds the reserves from `server_info` and runs the trust line and credential in parallel (different accounts, so that's safe). It accepts the credential before the master is disabled, and emits a step with an explorer link per tx for T36.
- **The Guardian recognises spawned wallets from the ledger** (`guardian/server.ts:73-93`). It requires all of: an accepted credential from the pinned landlord, limits that pass `validatePolicy`, exactly 3 signers (1 agent, this Guardian, 1 backup of weight 2), quorum 2, and the master disabled. The agent is taken from the signer list, not the URI, since it's spread last. That's better than the `POST /policy` I suggested: it needs no extra secret and survives sleeps.
- **The landlord can't change a spawned wallet's limits later.** Re-issuing needs a new CredentialAccept signed by the wallet, and the Guardian only co-signs Payments. So only the tenant's backup key could accept new limits. Good for the tenant-first pitch.

Must do in P2's half (`POST /api/tenants`):
1. **The backup seed must never reach the landlord console.** The spawn is triggered from the landlord console. Streaming `SpawnResult` or `backupSeed` back to it, logging it, or storing it would give the landlord a weight-2 key that can empty the tenant's wallet alone. That breaks "the landlord's agent has no key to any tenant wallet." For the demo: drop `backupSeed` (or show it only in the tenant view), and send only `steps` to the console.
2. **The app gets the Guardian's address from a plain `GUARDIAN_ADDRESS` env var**, never by loading `.secrets/guardian.env`, which holds the Guardian's seed. `scripts/spawn-tenant.ts:15` loads that file, which is fine for a local script, but don't copy the pattern into the app.

Notes (non-blocking):
- A spawn that fails midway leaves a funded, half-built wallet whose master seed is discarded, so ~2.6 testnet XRP is lost. For the demo, just retry.
- The `spawned` cache (`guardian/server.ts:33`) isn't cleared if the landlord later deletes the credential. That's harmless, because such a wallet can still only pay the landlord.
- Q&A: "who accepted the credential?" In the demo, the spawner signs the acceptance with the new wallet's master key before disabling it. In production the tenant would sign it.

## 2026-09-26: `money-layer` @ 15b2692 (ledger-based "already paid", demo run number, cosign timeout): ✅ approved
Closes the 8d0fe90 free-plan risk.
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 16/16 pass.
**Checked on Testnet:** Maya's two latest rent payments carry tags `2026-10#run1790455658` and `…558`, one `tesSUCCESS` each.
**Not run:** `test:payment`, because it moves real RLUSD.
- Every rent payment now carries a readable `rentrelay/period` memo (`lib/xrpl/memos.ts`). The Guardian requires exactly one tag, equal to `month#run` (`guardian/rules.ts:86-91`).
- "Already paid" comes from `account_tx` (validated, `tesSUCCESS`, this wallet → landlord, tag matches) (`guardian/server.ts:42-62`). A restart or free-plan sleep can no longer allow a double charge. A ledger error throws, and the request is refused, so it fails closed.
- `requestCosign`/`resetGuardian` time out after 10s, with a clear "waking up, open /health" reason (`lib/xrpl/guardianClient.ts:17-29`).

Integration notes (P2 must know):
- **`run` is now part of the contract.** T15 must store a demo run number with the clock, and `/api/demo/reset` must **bump it**. T17 must pass `{today, month, run}` to `requestCosign` and `period: periodKey(month, run)` to `buildPayment`. **If reset doesn't bump `run`, every tenant is refused as "already paid" on the next rent day and the demo stalls.**
- The Guardian's `/reset` is no longer needed to replay a month; bumping `run` does that.

Known limit (Q&A, extends #4 of the re-review):
- **`run` comes from the app**, like `today` and `month`. A fully compromised app could send `run+1` and get a second payment co-signed. The rule stops an agent or a buggy retry from paying twice. It doesn't stop an attacker who controls the app's clock. The T37 double-charge attack must reuse the same run, and it does in `scripts/test-payment.ts` step 5.
- Optional hardening (not needed for the demo): the Guardian owns the run. `/reset` (admin token) bumps it, it's recovered after a restart from the highest run tag on the landlord's `account_tx`, and `context.run` is ignored.

## 2026-09-26: `money-layer` @ 8d0fe90 (render.yaml → free plan): ⚠️ accepted with risk
cfbef01 was re-checked: unchanged, still approved. 8d0fe90 moves the Guardian to Render's free plan, which **reopens T13 re-review #2**. Free services sleep after about 15 min idle, and waking up clears the in-memory once-per-month record.
- **Double charge after a sleep:** once the record is cleared, a second payment for the same month is co-signed and real RLUSD moves. Inside one 3-minute demo this is fine. It breaks if a judge asks "try charging again" more than 15 min after rent day (the T37 double-charge attack).
- **Cold start:** the first request after a sleep takes about 50s. `requestCosign` (`lib/xrpl/guardianClient.ts:10`) has no timeout, so a live tick may hang or hit the app's function timeout. The failure is safe (no payment is co-signed) but looks bad on stage.
- **Mitigation for now:** open `/health` before every judging slot, as the commit comment says.
- **Durable fix (about 15 lines, recommended before judging):** build `priorPayment` from the ledger. The audit memo is only a sha256 hash, so it can't reveal the month. First, have `buildPayment` add a second plaintext memo `rentrelay/month` = `"2026-10"`, and have the Guardian require it to equal `context.month`. Then `priorPayment` = `account_tx` for the rent wallet → any validated `tesSUCCESS` payment to the landlord carrying that month memo. Keep the in-memory map only as the "pending" cache. That makes the plan choice irrelevant. Also add a ~10s `AbortSignal.timeout` to `requestCosign`.

## 2026-09-26: T13 follow-up, `money-layer` @ cfbef01 (fail closed on incomplete policy): ✅ approved
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 15/15 pass.
- `validatePolicy` (`guardian/rules.ts:29-40`) requires a landlord address, at least one wallet, and a finite number for `capUsd`/`unitRentUsd`/`rentShareUsd`/`maxUtilitiesUsd` plus an agent address on every wallet. `guardian/server.ts:19` calls it before `listen`.
- **Verified live:** started the real server with an old-shape `GUARDIAN_POLICY` → it exits with code 1 and "policy for rW: rentShareUsd must be a number", and never listens. The local `.secrets/guardian-policy.json` validates.
- The Render-deploy blocker from the re-review is closed. The T35 note (register spawned wallets with the Guardian) still stands.

## 2026-09-26: T13 Guardian re-review, `money-layer` @ 5fd929d (+ 9cfc8a7 Render blueprint): ✅ approved
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 14/14 pass.
- #1 disguised fee: **fixed.** `rentUsd` must equal `rentShareUsd`, utilities must be ≤ `maxUtilitiesUsd`, and negative or NaN lines are refused (`guardian/rules.ts:82-120`). New tests cover it.
- #2 deploy: **fixed.** `render.yaml` uses a `starter` plan, which is always on (no sleep), so the in-memory once-per-month record survives between ticks. Residual: a redeploy or restart still clears it. Don't redeploy mid-demo; the demo reset clears it anyway.
- #3 rule order: **fixed.** The $200 fee is now refused as `legal-late-fee`.

Should fix before the Render deploy:
- **The Guardian fails open on an old-shape policy.** If the `GUARDIAN_POLICY` pasted into Render lacks `rentShareUsd`/`maxUtilitiesUsd`, `Math.abs(x - undefined)` is NaN, so both checks silently pass. A reviewer script confirmed a $112 disguised fee gets APPROVED with such a policy. The local `.secrets/guardian-policy.json` is already regenerated and correct. Fix: in `guardian/server.ts`, check at startup that every wallet has numeric `rentShareUsd`, `maxUtilitiesUsd`, `capUsd` and `unitRentUsd`, and throw if not (about 3 lines).

Notes for later tasks:
- **T35 spawn:** the Guardian's policy is fixed at startup, so a newly spawned wallet is refused as "not a registered rent wallet". The spawn flow needs a way to register it with the Guardian, for example an admin-token `POST /policy` or a restart with the updated env.
- **T37 "inflated ConEd" attack:** anything ≤ $100 in utilities passes, because the Guardian doesn't know the real bill. Use a clearly inflated amount (e.g. $500) in the demo. Q&A answer: "utilities are capped per tenant; the exact bill split is checked by the landlord agent."

## 2026-09-26: Money layer, `money-layer` @ dc9e123 (T10, T11, T12, T12a, T13)
No GitHub PR is open; reviewed the pushed commit in `~/DivHacks-2026-Track-2`.
**Ran:** `tsc --noEmit` clean · `npm run test:guardian` 12/12 pass · git history scanned for seeds/tokens: none (`.secrets/` ignored, files are 0600).
**Checked on the public Testnet RPC:** tx C2E79EB4… is `tesSUCCESS`, 1.488 RLUSD, 2 signers, with a memo. Maya's wallet `rpLaek…` has the master key disabled, quorum 2, weights 1/1/2.
**Not run:** `test:payment` and `setup:xrpl`, because they spend the scarce Testnet RLUSD float.

### T10 setup script: ✅ approved
Idempotent, saves each seed right after funding, and splits keys into app/Guardian/tenant files as PLAN requires.
- Note: every tenant cap is $1,600 (`scripts/setup-xrpl.ts:37-39`). P2's seed (T14) needs the same caps, or the Guardian and the app will disagree.

### T11 rent wallets: ✅ approved
Signer list is set before the master is disabled, and a re-run with a wrong list fails loudly instead of locking the wallet (`lib/xrpl/rentWallet.ts:50`). Verified on-ledger.

### T12 payments: ✅ approved
- `multisignSubmit` returns tef codes without throwing, which is what the "stolen key" demo needs (`lib/xrpl/payments.ts:46`).
- Minor: `waitForValidation` gives up after 30s and returns `validated:false` with the prelim code. The caller (T17) should log that as "failed/unknown", not "paid".

### T12a 1:1000 scale: ✅ approved
Conversion lives only in `lib/xrpl/config.ts:18-28`; the Guardian converts back before its checks (`guardian/rules.ts:62`). 6-decimal RLUSD is 0.1¢ precision, which is fine.

### T13 Guardian: ❌ changes needed (small)
Must fix:
1. **A late fee can be passed off as rent.** The Guardian's fee rules only look at `intent.lateFeeUsd`, which is the agent's own label. `intent.rentUsd` is never checked against the real rent share. On day 2, an agent (or an attacker) can send `rentUsd: 1562, lateFeeUsd: 0` = $1,600 and it passes every rule (`guardian/rules.ts:69-79`, `95-102`). That breaks the "can't overcharge / can't break the law" pitch if a judge asks. Fix: add `rentShareUsd` (and a max utilities amount) to `WalletPolicy` and refuse if `intent.rentUsd !== rentShareUsd` or utilities are over the max. Add one unit test.
2. **The deploy target must be a long-running server, not Vercel serverless.** Two reasons: `guardian/server.ts:97` uses `app.listen`, and the once-per-month record is an in-memory `Map` (`guardian/server.ts:26`). On serverless, or after any restart, that record is lost, so the same month could be co-signed twice. Deploy to Render (as a persistent service), or rebuild `priorPayment` from the ledger (`account_tx` → validated payments to the landlord whose memo is for that month).

Should fix (demo quality):
3. **The "illegal $200 late fee" attack shows `cap`, not `legal-late-fee`.** $1,450 + $38 + $200 is over the $1,600 cap, so rule 2 fires first (the test at `guardian/rules.test.ts:54` confirms this). The demo line is "blocked, illegal", so check rule 5 before rule 2, or have T37 build the attack so it stays under the cap.

Known limits (write a Q&A answer, no fix needed now):
4. **The Guardian trusts the app's `context.today` and `month`** (`guardian/server.ts:64`). A compromised app could claim "day 30" to justify a $50 fee. This comes with the demo clock living in the app DB. Answer for Q&A: "in production the Guardian uses its own clock."
5. **The fee cap is per wallet, not per unit.** The Guardian doesn't split the cap when both 4B roommates are late, so it would allow $50 + $50 (PLAN says the cap is split by share). T30 should compute the split fee; it's fine for the Guardian to enforce only the unit maximum.

Good: it decodes the real blob, rejects partial payments, paths and extra signers, checks that the intent matches the tx, the `/reset` endpoint requires a token, and a 403 comes back as a `GuardianDecision`.
