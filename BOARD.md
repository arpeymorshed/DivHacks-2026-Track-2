# Task board

_Plan: [PLAN.md](PLAN.md) (RentRelay, adopted 2026-09-26). Tasks are in build order. Owner tags: P1 money (Arpey), P2 agents/backend, P3 frontend, P4 Photon/ship. Move a task to "In progress" when you start it. Tier 1 must be done before Tier 2._

## Todo

### Hour 1: everyone
- [ ] T00 [ALL] Agree on `/lib/types.ts` and the API route table exactly as in PLAN.md. Done when the file is on `main`.
- [ ] T01 [P4] Next.js (TypeScript) repo scaffold, folder layout, `.env.example`, `.gitignore` (includes `.env`), Vercel project deployed. Done when "hello" is live on Vercel.
- [ ] T02 [P4] MongoDB Atlas cluster + Gemini API key. Put both URIs/keys in the team's `.env` (never committed). Done when both connect from a test script.
- [ ] T03 [P4] Register the `.tech` domain via MLH and point it at Vercel. Ask the booths: Ripple (Credentials + multi-sign + RLUSD on Testnet?) and Photon (Mac or iMessage number needed?). Done when the domain loads and the answers are posted in team chat.

### Tier 1: the spine
- [ ] T10 [P1] `scripts/setup-xrpl.ts`: faucet-fund landlord, ops, simulated bank and 3 tenant wallets. Add RLUSD trust lines and fund the bank with RLUSD. Done when it prints all addresses + explorer links.
- [ ] T11 [P1] Rent wallets: signer list agent(1) + Guardian(1) + tenant backup(2), quorum 2, master key disabled. Done when the explorer shows the signer list and the master is disabled.
- [ ] T12 [P1] `lib/xrpl`: `buildPayment`, `agentSign`, `multisignSubmit` (fee autofilled with `signersCount`), `getBalances`, `topUp`, with a memo. Done when a script pays RLUSD tenant → landlord with 2 signatures.
- [ ] T13 [P1] Guardian service `POST /cosign`: decode the real tx, apply the 5 rules (landlord address, cap, window, not already paid, legal late fee), return a `GuardianDecision`, deploy separately. Done when an approve case and a refuse case both pass.
- [ ] T14 [P2] `lib/db` + `scripts/seed-db.ts`: landlord Arpey; Unit 4B (Abhimanyu 50%, Kashish 50%, $2,900), Unit 2A (Musammat, $1,450), caps, wallets from T10. Done when the seed runs cleanly and can re-run.
- [ ] T15 [P2] Demo clock (`lib/clock`, stored in the DB) + `POST /api/clock` + `POST /api/demo/reset`. Done when advancing the clock changes "today" everywhere.
- [ ] T16 [P2] Dues engine: monthly dues per tenant (rent × share + utilities), stages upcoming/due/grace/late. Done when unit tests pass for day −3, 0, 3 and 8.
- [ ] T17 [P2] `POST /api/tick`: each tenant agent pays on the due date if its wallet has enough (PaymentIntent → `lib/xrpl` → Guardian → submit → AuditEntry with memo hash), and the main agent marks it paid. XRPL mocked until T12/T13 land. Done when rent day produces correct intents.
- [ ] T18 [P2] `GET /api/state` returns the building, tenants, dues, balances, audit and clock. Done when it matches P3's mock shape.
- [ ] T19 [P3] Landlord console from mock JSON: building grid (units → tenants → status chip, fee, explorer link), audit log. Done when it renders `mocks/state.json`.
- [ ] T20 [P3] Demo controls: "+1 day", "jump to rent day", "reset". Done when they're wired to `/api/clock` and `/api/demo/reset`.
- [ ] T21 [P2+P1] **Integration: Tier 1 end to end.** Real RLUSD rent day through the Guardian; the console turns green; explorer links work. Done when P4 has tested it on the deployed URL.

### Tier 2: what makes it win
- [ ] T30 [P2] Late fees: $5/day from day 6, capped at min($50, 5% of the unit's rent), only for the late roommate (cap split by share if several), rent + fee in one payment, fee itemized in the memo. Done when unit tests pass and day 8 = $15.
- [ ] T31 [P2] `POST /api/chat` + Gemini agent brain: stage-based reminders, Q&A with real due data, "pay on the 5th" negotiation (sets `payLaterUntil` only inside the grace period). Done when the scripted demo questions answer correctly.
- [ ] T32 [P3] Tenant phone-style view: dues card, rent wallet balance, top-up button, web chat with the agent. Done when Abhimanyu's full demo conversation works in the browser.
- [ ] T33 [P1] `POST /api/topup` (simulated bank → rent wallet). Done when Kashish can top up and the next tick pays rent + fee.
- [ ] T34 [P2] `POST /api/bills/utility`: Gemini reads the ConEd bill image → per-unit split → dues. Fallback: a hard-coded split. Done when the fixture bill gives the $38 share.
- [ ] T35 [P1+P2] Spawn live, `POST /api/tenants`: ops account funds a new wallet → trust line → signer list → master disabled → CredentialCreate/Accept. Stream the steps. Done when a new tenant goes live in under ~30s.
- [ ] T36 [P3] Spawn animation in the console (steps light up as they complete).
- [ ] T37 [P1+P2] Attack scenarios `POST /api/attacks/:name`: scam new-address, illegal $200 fee / fee on day 2, stolen key (agent-only signature rejected by the ledger), inflated ConEd, double charge. Done when all 5 return a blocked AuditEntry with the reason.
- [ ] T38 [P3] "What could go wrong?" panel: 5 cards, 3 highlighted for the live demo, plain-English "Blocked by:" line.
- [ ] T39 [P4] Fixtures: ConEd building bill image, scam "new bank account" text, demo conversation scripts. `scripts/preflight.ts` (checks Testnet, Guardian, Gemini, Mongo). Done when preflight prints all ✅.

### Tier 2.5: Photon (go/no-go at ~midnight, only if T21 is done)
- [ ] T50 [P4] Spectrum bot hello world in a test iMessage chat.
- [ ] T51 [P4] Bot ↔ `/api/chat` both ways, per tenant. Tick events posted as messages (reminders, payment receipts, blocks).
- [ ] T52 [P4] Unit 4B roommate group chat with both agents.

### Tier 3: polish (cut first)
- [ ] T60 [P1+P2] Main agent pays the building ConEd bill from the landlord's 2-key account.
- [ ] T61 [P3] On-time streak badge; [P2] weekly landlord summary (Gemini).

### Ship (fixed times)
- [ ] T70 [ALL] 6:30 AM feature freeze. Only bug fixes after this.
- [ ] T71 [P4] 5-slide deck + backup demo video recorded by 8:00 AM.
- [ ] T72 [P4] Devpost write-up (one sentence per sponsor on exactly how it's used, the NY late-fee note, Testnet disclaimer), submitted by 9:30 AM.
- [ ] T73 [ALL] Rehearse the 3-min demo and Q&A (PLAN.md), with a reset between runs.

## In progress

## In review

## Done
