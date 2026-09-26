# Proposal v3: RentRelay (working name)

> **⚠️ PROPOSAL ONLY: nothing is confirmed.** Latest candidate. Previous: [Proposal v2, SplitSafe](PROPOSAL-v2.md). Background in [README.md](README.md).
_2026-09-26 · **PROPOSAL ONLY, not confirmed.** New direction from the user: one main agent for the landlord, plus one agent per tenant. Reuses v2's guardrail ideas._

**Tracks:** Live Better (general) · Ripple (XRPL) · Photon (iMessage) · MLH Gemini · MLH .Tech. Bonus: MLH MongoDB Atlas.

## The idea in one paragraph
A **main agent** runs the building's rent account for the landlord. For every tenant in the building, it **spawns a personal tenant agent**. Each tenant agent texts its tenant (iMessage via Photon) to remind them about rent and utilities, explains exactly what they owe and why, answers questions, and **pays automatically on the due date** from the tenant's rent wallet. It pays only within rules the tenant set, and those rules are enforced on the XRP Ledger. Roommates in the same unit each get their own agent, pay only their share, and nobody fronts the whole rent.

## The problem
- **Tenants:** rent and utility amounts are confusing (especially split building ConEd bills), reminders come too late, one roommate fronts the whole rent, and late fees add up. Fake "landlord changed bank account" messages are a real NYC rent scam.
- **Landlords:** chasing many tenants and roommates every month, reconciling partial payments, splitting building utility bills by hand.
- **Nobody trusts an AI with rent money,** and neither would a bank.

## Key design choice: whose side are the tenant agents on?
**Recommendation: the tenant agents work for the tenant.** The landlord's main agent creates them and sends them what's due, but each one is bound by **the tenant's own rules** and holds the **tenant's money**. The landlord can never pull money; tenants' agents push payments only when the rules allow.
- This keeps the **Live Better** fit (a personal rent assistant, not a landlord collections bot).
- It avoids bad optics ("an AI that hounds tenants for rent") at a diversity-focused hackathon.
- It's a stronger Ripple story: even a hacked landlord agent can't take a cent.

## How it works
```
                    ┌───────────────────────────────┐
                    │  MAIN AGENT (landlord)         │  building account on XRPL (RLUSD)
                    │  • onboards tenants            │  = stand-in for the landlord's bank
                    │  • computes what each owes     │    (bank off-ramp simulated)
                    │  • splits the building ConEd   │
                    │    bill (Gemini reads it)      │
                    │  • tracks who's paid           │
                    └──────────────┬────────────────┘
               spawns one agent per tenant: creates + funds its wallet,
               issues it an on-chain credential ("authorized agent, Unit 4B")
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   Tenant agent: Maya       Tenant agent: Jordan      Tenant agent: Priya
   (Unit 4B, roommate)      (Unit 4B, roommate)       (Unit 2A)
   • texts reminders (Photon/iMessage) · answers "what do I owe?"
   • pays its tenant's share on the due date, within the tenant's rules
   • 2-key rent wallet: agent key + Guardian key (tenant keeps a backup key)
          │                        │                        │
          └────────── RLUSD payments to the landlord's VERIFIED address ──┘
```

**The monthly loop:**
1. **Onboard (once):** the landlord adds a tenant → the main agent **spawns a tenant agent**. It creates and funds a rent wallet on XRPL, issues the agent a credential, and opens an iMessage thread with the tenant. The tenant sets their rules (max monthly amount, autopay on) and tops up their rent wallet. **This is the only human setup, like turning on autopay.**
2. **Bill (monthly):** the main agent works out each tenant's share: the rent split by the roommates' agreed weights, plus the building ConEd bill, which **Gemini reads and splits by unit**. It sends each tenant agent its amount and the reason.
3. **Remind:** each tenant agent texts its tenant: *"Rent $1,450 + ConEd $38 due Friday. Your rent wallet has $1,200, so top up $288."* It answers follow-ups in plain English.
4. **Pay (autonomous):** on the due date, the tenant agent pays exactly what's owed to the landlord's verified address, with the Guardian co-signing if the rules pass. **No human clicks approve.**
5. **Reconcile:** the main agent sees the payments on the ledger, marks units paid, and posts a building summary for the landlord. Roommates see that their unit is fully paid.

## How each track fits
| Track | Its job | Why it's real |
|---|---|---|
| **Live Better** | Each tenant gets a **personal rent agent**: reminders, clear amounts, fair roommate splits, no late fees, never fronting rent. | Pitch it from the tenant's point of view; the landlord side is infrastructure. |
| **Ripple (XRPL)** | **Parent agent spawns, funds and governs sub-agents**, one of Ripple's named starting points. Autonomous RLUSD rent payments, ledger-enforced 2-key wallets, on-chain credentials for agents ("Know Your Agent"), on-chain audit memos. | Clears the hard bar: agents pay on their own, within guardrails, and the demo shows them being stopped. |
| **Photon** | Tenant agents **live in iMessage**: reminders, "what do I owe?", "pay now", receipts. Roommates in one unit can share a group chat with their agents. | Photon wants agents that take part in real conversations. Rent reminders are exactly that. |
| **Gemini** | The brain of every agent: reads the building ConEd bill and splits it, writes personal reminders, answers tenants' questions, and handles "I get paid on the 5th, can I pay then?" within the landlord's grace policy. | Without it, the agents are just cron jobs. |
| **.Tech** | App home, e.g. `rentrelay.tech`. | 10 minutes with the MLH code. |
| **MongoDB Atlas** | Building, units, tenants, agents, bills, audit log. | It's the database anyway. |

## Guardrails ("the AI decides, the ledger enforces")
1. **2-key rent wallets.** Each tenant's rent wallet has its master key disabled and needs the **tenant agent's key + the Guardian's key** to move money. The tenant holds a **backup key strong enough to withdraw on their own**, so it's always their money.
2. **The Guardian** (a separate service with its own key) co-signs only if:
   - the destination is the landlord's address **verified by the landlord's on-chain credential** (blocks "we changed our bank account" scams)
   - the amount is at or under the tenant's own cap
   - it's within the payment window and not already paid for that month
3. **Only the tenant can move their money.** The landlord's main agent has no key to any tenant wallet. It can only *ask*.
4. **Credentials for agents (KYA).** Each tenant agent carries an on-chain credential issued by the main agent. Tenant agents ignore instructions from any "landlord agent" that doesn't hold the landlord's credential.
5. **On-chain audit.** Every payment has a memo with the hash of its decision record (what was owed, why, which rules passed).
6. **Legal late-fee cap.** The Guardian refuses any late fee that's above min($50, 5% of rent), charged within the 5-day grace period, or charged twice for the same month.

**Attack panel: "What could go wrong?"**
| Scenario | Stopped by |
|---|---|
| 📱 Scam text: *"Landlord here, new bank account, send rent to rXYZ"* | Guardian: not the landlord's verified address |
| 🧾 Inflated or misread ConEd bill: Maya's share reads $380 instead of $38 | Over Maya's cap → not paid, and the agent asks Maya instead |
| 🔁 Main agent (buggy or hacked) asks for September rent twice | Guardian: already paid for this month |
| 💸 Main agent adds a $200 late fee, or charges one on day 2 | Guardian: over the NY legal cap / still in the grace period |
| 🔑 Someone steals a tenant agent's key | **The ledger itself** rejects it: 2 keys required |

## Late payments: a daily late fee, capped by NY law
**Goal:** give tenants a real reason not to delay rent, while staying legal and fair.

**NY rule we build around** (NY Real Property Law §238-a, from the 2019 Housing Stability and Tenant Protection Act; *verify before the pitch*): a late fee is allowed only when rent is **more than 5 days late**, and it can be at most **$50 or 5% of the monthly rent, whichever is less**. Open-ended interest isn't allowed on NYC apartments, so our "interest" grows daily but stops at the legal cap.

**How it works:**
| Days after the due date | What happens |
|---|---|
| −3 to 0 | Friendly reminders: *"Rent $1,450 due Friday; your rent wallet is $250 short."* |
| 1–5 (grace period) | **No fee.** Reminders get more urgent: *"2 days left before a late fee starts."* The agent can offer the landlord's pay-later option. |
| 6 onward | The late fee **accrues $5/day**, up to the cap: min($50, 5% of rent). On $1,450 rent that's $50, reached on day 15. |
| When paid | The tenant agent pays **rent + the accrued fee** in one payment. The memo records both amounts and the days late, and the fee stops. |

**Fair to roommates:** the fee lands **only on the roommate who's late**, never on the whole unit. If Jordan is late, Maya pays nothing extra. That solves the "my roommate's lateness costs me" problem. If several roommates are late in the same month, the unit's single legal cap is split between them by share.

**Enforced where the agent can't cheat (the Ripple angle):** the main agent calculates the fee, but the **Guardian re-checks it before co-signing**. The fee must be under the legal cap, the rent must really be more than 5 days late, and a fee can't be charged twice for the same month. A greedy or buggy landlord agent can't overcharge a tenant.

**Carrot as well as stick (Tier 3):** an "on-time streak" on the tenant page (e.g. *"11 months on time"*) that tenants can show as a rental reference.

## MVP scope, in build order (cut from the bottom if behind)
Deadline **Sun 10:30 AM**.

**Tier 1: the spine (about 8h)**
1. XRPL setup: landlord account, 3 tenant rent wallets (2-key + tenant backup key, master disabled), RLUSD trust lines, faucet funding.
2. Guardian service: verified landlord address, tenant cap, payment window, not already paid → co-sign or refuse.
3. Seed building in MongoDB: 1 landlord, 2 units (Unit 4B with roommates Maya + Jordan, Unit 2A with Priya), leases, rent splits, tenant rules.
4. **Autonomous rent day:** a timer fires → each tenant agent pays its share → the main agent reconciles.
5. **Landlord console:** building grid (units → tenants → agent status: paid / due / late), explorer links, audit log.

**Tier 2: agents that feel alive (about 5h)**
6. **Spawn a tenant agent live:** the landlord adds a tenant → a new wallet is created and funded by the main agent, and it appears in the grid.
7. Gemini reads the building ConEd bill → per-unit shares → added to each tenant's amount due.
8. Reminders + "what do I owe?" in a **web chat panel** on the tenant page. This is the fallback if Photon fails.
9. Attack panel: the 5 scenarios above.
10. **Late fees (about 1.5h):** days-late tracking, the capped daily fee, escalating reminders, and the Guardian's legal-cap check. See "Late payments" above.

**Tier 2.5: Photon (about 3–4h, only after Tier 1 works end to end)**
11. Tenant agents text tenants in iMessage through Spectrum: reminders, answers, payment receipts, and the unit's roommate group chat.

**Tier 3: extras**
12. On-chain credentials for tenant agents (KYA) and the "fake landlord agent" check.
13. "Can I pay on the 5th?" → Gemini negotiates within the landlord's grace policy.
14. The main agent pays the building's ConEd bill from collected rent (the landlord's own 2-key account).
15. `.tech` domain (**do this early, 10 minutes**), deck, backup video.

**Cut line:** drop 12–14 first, then Photon (kill switch: Tier 1 not working by about midnight; the web chat panel covers the demo). Never drop the autonomous rent day or the attack panel.

## Architecture and team split (4 people)
```
 Landlord console + Tenant page [P3]        iMessage via Photon bot [P4]
            │                                        │
            └──────────────┬─────────────────────────┘
                           ▼
        Agent runtime + API (Next.js) [P2]
        • main agent: onboarding, dues, ConEd split, reconcile
        • tenant agents: reminders, Q&A, pay-on-due-date
        • Gemini · MongoDB Atlas · Vercel Cron (rent day)
                           │  payment intent + agent signature
                           ▼
        Guardian service [P1] (separate deploy, own key)
        checks verified landlord address, cap, window, not double-paid
                           │  co-sign or refuse
                           ▼
        XRPL Testnet [P1]: landlord account · tenant 2-key rent wallets · RLUSD · memos · credentials
```
| Person | Owns | First milestone |
|---|---|---|
| **P1: Money layer** | XRPL setup script, `lib/xrpl`, spawning a wallet on demand, Guardian service, credentials (Tier 3) | Script sends a 2-key RLUSD rent payment and prints the explorer link |
| **P2: Agent brain + backend** (merges to `main`) | Main agent + tenant-agent runtime, Gemini, MongoDB, API, rent-day timer, ConEd split | `/api/rent-day` makes every tenant agent produce the right payment intent (mocked XRPL at first) |
| **P3: Frontend** | Landlord console (building grid, live agent status), tenant page (rules, wallet, chat panel), attack panel | Console renders from mock building JSON |
| **P4: Photon + ship** | Spectrum iMessage bot, `.tech` domain, deploy/env, fixtures (ConEd building bill, scam text), preflight/reset scripts, deck, backup video | Hello-world bot replying in iMessage, and the app deployed at the domain |

**Shared data formats (agreed in hour 1):** `Building`, `Unit`, `Tenant {unitId, share, capUsd, walletAddress, agentId}`, `TenantAgent {id, tenantId, credentialId?, status}`, `Due {tenantId, month, rentUsd, utilitiesUsd, dueDate, daysLate, lateFeeUsd, reason}`, `PaymentIntent`, `GuardianDecision`, `AuditEntry`.

## Demo script (~3 min)
1. **(20s) Hook:** "Rent's due Friday. Your roommate still owes you last month's ConEd, and you just got a text saying your landlord changed bank accounts. Sound familiar?"
2. **(25s) Spawn:** the landlord adds a new tenant → a new agent appears in the building grid, with its own wallet on-ledger.
3. **(30s) Remind:** hold up the phone: the tenant agent's iMessage: *"Rent $1,450 + ConEd $38 due Friday."* Ask "why is ConEd $38?" → it explains the split.
4. **(40s) Rent day:** the timer fires → every tenant agent pays its share on its own → the grid turns green, **except Jordan**, whose rent wallet is short. Skip ahead 8 days: his reminders escalated, and his agent pays rent + a **$15 late fee** (3 days past grace at $5/day, capped by NY law). Maya paid nothing extra. Open the transaction on the explorer.
5. **(45s) What could go wrong:** scam bank-change text, inflated ConEd bill, double charge, illegal $200 late fee, stolen key. All five are blocked, with the reason shown.
6. **(20s) Close:** "Every tenant gets a personal rent agent. It reminds you, explains, and pays on time, but it can only ever do what you allowed. The AI decides. The ledger enforces."

## Risks and honest flags
- **Live Better fit:** a landlord tool can read as business software. **Pitch from the tenant's side** ("your personal rent agent").
- **Photon is more central than in v2** (reminders are the main job), so the web chat panel must work as a fallback.
- **More moving parts than v2** (spawning, many wallets). Keep the building tiny: 2 units, 3 tenants.
- **Simulated pieces:** the landlord's bank off-ramp, RLUSD top-ups (faucet) and ConEd as a Testnet payee. Say so upfront.

## Open questions for the user
1. **Whose side are the tenant agents on?** (Recommended: the tenant's, as above.) Or should they be the landlord's collectors?
2. Should the main agent be connected to a **real-feeling bank** for the landlord? Capital One's Nessie API could play that role, but you dropped Capital One. Keep it dropped?
3. Name and domain (RentRelay / KeyRing / RentPilot `.tech`).
4. Adopt v3 over v2?
5. **Late-fee numbers:** $5/day after a 5-day grace, capped at min($50, 5% of rent)? Should a tenant on an agreed payment plan have fees paused? (Verify the NY rule with a quick check before the pitch; we're not giving legal advice.)
