# DivHacks 2026: RT (Renter's Treasurer)

> ✅ **Build plan: v3 adopted (2026-09-26).** Tasks: [BOARD.md](BOARD.md). Earlier drafts: [PROPOSAL-v3.md](PROPOSAL-v3.md), [PROPOSAL-v2.md](PROPOSAL-v2.md).

## Hackathon context
- **DivHacks 2026 @ Columbia**, theme **"Concrete Jungle"** (NYC: food, housing, transportation).
- **Submit on Devpost by Sun Sep 27, 10:30 AM EST** (target 9:30). Needs a source code link and **a way for judges to test it** (the deployed web app must work without iMessage).
- **Judging 12–4 PM:** expo style, ~3 min pitch + ~2 min Q&A per judge, repeated many times. Stay for the closing ceremony (4 PM).
- **Scoring:** Concept 30 · Functionality 30 · Wow 20 · UX 10 · Community & track fit 10.
- **What Ripple wants** (from their brief): financial infrastructure, not AI. Guardrails **enforced where the agent can't reach them**. At least one XRPL transaction executed **autonomously** by an agent (a human approving each payment doesn't count). Show the agent **being stopped**. Scope small: "ship the guardrail, not the whitepaper."
- **What Photon wants:** agents that *participate* in human conversations with social context and tone, and multi-agent systems working with people. Must integrate **Spectrum**.

## Tracks we're entering
| Track | What we show |
|---|---|
| **Live Better** (general) | Every tenant gets a **personal rent agent** in their texts: clear amounts, fair roommate splits, never fronting rent, never an illegal late fee. |
| **Ripple (XRPL)** | A **main agent that spawns, funds and governs one sub-agent per tenant**. Autonomous RLUSD rent payments. Two-key wallets. On-chain agent credentials (KYA). A legal late-fee cap enforced before settlement. Attacks visibly blocked. |
| **Photon** | Tenant agents **hold real two-way conversations** in iMessage: explain charges, negotiate "can I pay on the 5th?", adapt their tone. Roommates share a unit group chat with their agents. |
| **MLH Gemini** | The brain of every agent: reads the building's ConEd bill and splits it, writes messages, answers questions, negotiates within the landlord's policy. |
| **MLH .Tech** | App at a `.tech` domain (e.g. `rentrelay.tech`). |
| **MLH MongoDB Atlas** | All app data. |

## Idea (tenant first)
**RentRelay gives every NYC tenant a personal rent agent that lives in their texts.** It tells you exactly what you owe this month (rent plus your share of the building ConEd bill) and why. It pays on time automatically from your rent wallet, splits fairly with roommates so nobody fronts rent, and it **can't be scammed, can't overcharge you, and can't break the law.**

Behind the scenes, the **landlord's main agent** runs the building: it spawns one agent per tenant, tells each one what's due, and reconciles payments. But **tenant agents work for the tenant.** They hold the tenant's money under the tenant's rules, and the landlord's agent has no key to any tenant wallet.

**Pitch line:** *"The AI decides. The ledger enforces."*

### Why an agent, and not bank autopay? (answer in the pitch)
1. **The amount changes every month** (utility splits), and autopay can't work that out.
2. **Roommates pay separately.** Autopay makes one person pay the whole rent.
3. **Scam-proof:** it only ever pays the landlord's verified on-ledger identity. "We changed our bank account" texts can't redirect it.
4. **It talks to you:** why ConEd is $38, "can I pay on the 5th?", "you're $250 short, top up by Thursday."

### Why one agent per tenant? (answer in the pitch)
Each tenant has **their own private conversation, their own wallet and their own rules** (cap, autopay, pay date). One shared bot would mix everyone's money and messages together.

### Late payments: tenant protection, not a penalty machine
Framing: *"Your agent's job is to make sure you never pay a late fee. And if you ever do, it's impossible for it to be illegal."*
- **NY rule** (Real Property Law §238-a, 2019 HSTPA; **verify before judging**, not legal advice): a fee only after rent is **more than 5 days late**, at most **min($50, 5% of monthly rent)**.
- **Our policy (the landlord's setting):**
  - due on the 1st
  - days 1–5 are grace, with no fee
  - from day 6 the fee accrues **$5/day** up to min($50, 5% of the unit's rent)
- **Only the late roommate pays.** If several roommates are late in the same month, the unit's cap is split by share.
- **The agent prevents fees:** top-up reminders before the due date, and a "pay on the 5th" arrangement inside the grace period.
- **The Guardian refuses** any fee over the cap, inside the grace period, or charged twice for the same month.
- Stretch: an "on-time streak" badge usable as a rental reference.

## Tech stack (locked 2026-09-26)
- **Next.js (TypeScript)**: web app + API routes + agent runtime, on **Vercel**, at the `.tech` domain. **Vercel Cron** calls `/api/tick`.
- **Guardian:** a **separate** small Node/Express service with its own key and deploy (second Vercel project or Render). It never shares keys with the app.
- **XRPL Testnet** via **xrpl.js**. **RLUSD** from tryrlusd.com. Uses multi-signing, Credentials (XLS-70), memos. Explorer: testnet.xrpl.org.
- **Gemini API**: vision (bills), function calling (payment intents, negotiation), text (messages).
- **MongoDB Atlas** free tier.
- **Photon Spectrum** (TypeScript) for iMessage, in `/bot`.

## Features (MVP first, cut from the bottom)
**Tier 1: the spine (must work)**
1. XRPL setup script: landlord account, landlord "agent ops" account (pays XRP reserves for spawned agents), a simulated "bank" account holding RLUSD for top-ups, and 3 tenant rent wallets.
2. Rent wallet design: master key disabled. Signer list = **agent key (1) + Guardian key (1) + tenant backup key (2)**, quorum 2. So the agent needs the Guardian, but the tenant alone can always withdraw.
3. Guardian with all 5 rules:
   - pays only the landlord address that issued the agent's credential (pinned address until credentials land)
   - amount ≤ tenant cap
   - inside the payment window
   - not already paid this month
   - legal late fee (cap, grace, once per month)
4. **Demo clock** (a simulated "today" stored in the DB) + `/api/tick`: every agent acts on the simulated date.
5. Seed building: Unit 4B (Maya 50%, Jordan 50%, $2,900 rent), Unit 2A (Priya, $1,450). Rules, caps, rent wallets funded.
6. **Autonomous rent day:** tick on the 1st → each tenant agent pays its share with the Guardian's co-signature and an audit memo → the main agent reconciles.
7. Landlord console: building grid (units → tenants → paid / due / grace / late + fee), explorer links, audit log.
8. **Demo controls + reset:** "+1 day", "jump to rent day", "reset building."

**Tier 2: what makes it win**
9. **Late fees:** days-late tracking, $5/day accrual to the cap, rent + fee paid together (fee itemized in the memo).
10. **Tenant view** (phone-style): Maya's dues card, rent wallet, and a **web chat with her agent**. This is the Photon fallback and what judges can test.
11. Gemini agent brain: reminders by stage (upcoming / due / grace / late), Q&A ("why is ConEd $38?"), and the **"pay on the 5th" negotiation** within the grace policy.
12. Gemini reads the building ConEd bill (image) → per-unit split → added to each tenant's amount due.
13. **Spawn live:** the landlord adds a tenant → the ops account funds a new wallet → trust line, signer list, master disabled → **credential issued and accepted** (KYA). The steps show live in the console.
14. **Attack panel ("What could go wrong?"):** 5 scenarios built, **3 shown live** (scam bank-change text, illegal $200 late fee, stolen agent key). Inflated ConEd and double charge are ready for Q&A.

**Tier 2.5: Photon (start after Tier 1 works end to end; kill switch at about midnight if Tier 1 isn't done)**
15. Spectrum bot: each tenant's agent texts them, both ways (same `/api/chat` as the web chat). Unit 4B roommate group chat with both agents. Payment and block announcements.

**Tier 3: polish**
16. Main agent pays the building ConEd bill from collected rent (landlord's own 2-key account).
17. On-time streak badge. Weekly landlord summary (Gemini).

**Never cut:** autonomous rent day, Guardian refusals, demo clock and reset, audit links. **Cut first:** 17, 16, then 12 (use a hard-coded ConEd split).

## Architecture
```
 Tenant (iMessage via Photon [P4] or web tenant view [P3])      Landlord console [P3]
                 │  /api/chat                                          │ /api/tenants, /api/state
                 └──────────────────────┬──────────────────────────────┘
                                        ▼
      Next.js API + agent runtime [P2]  (MongoDB Atlas, Gemini, demo clock, /api/tick ← Vercel Cron)
      • main agent: spawn, dues (rent split + ConEd split), late fees, reconcile
      • tenant agents: stage-based messages, Q&A, negotiation, pay on due date
                                        │  PaymentIntent + unsigned tx + agent signature
                                        ▼
      Guardian service [P1]  (separate deploy + key; decodes the REAL tx; 5 rules) ── co-sign or refuse
                                        │
                                        ▼
      XRPL Testnet [P1]: landlord + ops accounts · tenant 2-key rent wallets · RLUSD · credentials · memos
```
**Security rules:**
- The Guardian checks the destination and amount **inside the transaction**, not the agent's description of it.
- The app holds agent keys only. The Guardian holds only its own key.
- The landlord's agent holds no tenant keys. Gemini never sees any key. Nothing secret is committed.

### Shared data formats (`/lib/types.ts`, agreed in hour 1, changed only via P2)
```ts
type Unit = { id: string; label: string; rentUsd: number };
type Tenant = { id: string; unitId: string; name: string; sharePct: number; capUsd: number;
                walletAddress: string; agentId: string; channel: "imessage" | "web"; phone?: string };
type TenantAgent = { id: string; tenantId: string; credential: "none" | "issued" | "accepted";
                     status: "spawning" | "active" };
type Due = { id: string; tenantId: string; month: string; dueDate: string; rentUsd: number;
             utilitiesUsd: number; daysLate: number; lateFeeUsd: number; payLaterUntil?: string;
             status: "upcoming" | "due" | "grace" | "late" | "paid"; reason: string };
type Message = { id: string; tenantId: string; from: "agent" | "tenant"; text: string; time: string };
type PaymentIntent = { tenantId: string; dueId: string; destination: string; rentUsd: number;
                       utilitiesUsd: number; lateFeeUsd: number; totalUsd: number; reason: string };
type GuardianDecision = { approved: boolean; rule: string; reason: string; signature?: string };
type AuditEntry = { id: string; time: string; intent: PaymentIntent; decision: GuardianDecision;
                    txHash?: string; memoHash: string; status: "paid" | "blocked" | "failed" };
```

### API routes
| Route | Does | Owner |
|---|---|---|
| `GET /api/state` | building, tenants, dues, balances, audit, clock | P2 |
| `POST /api/tick` | run every agent for the demo date (also called by Cron) | P2 |
| `POST /api/clock` | `{advanceDays}` or `{jumpTo}`, then tick | P2 |
| `POST /api/demo/reset` | reseed the DB and re-top wallets | P2 + P4 |
| `POST /api/tenants` | landlord adds a tenant → spawn agent + wallet + credential | P2 + P1 |
| `POST /api/chat` | `{tenantId, text}` → agent reply (web chat and Photon) | P2 |
| `POST /api/bills/utility` | ConEd bill image → Gemini → per-unit dues | P2 |
| `POST /api/topup` | simulated bank → tenant rent wallet (RLUSD) | P1 |
| `POST /api/attacks/:name` | run a scenario → blocked AuditEntry | P2 + P1 |
| `POST /guardian/cosign` | `{txBlob, intent, context}` → GuardianDecision | P1 |

### Repo layout and owners
`/app` pages [P3] · `/app/api` [P2] · `/lib/agents`, `/lib/ai`, `/lib/db`, `/lib/clock` [P2] · `/lib/xrpl`, `/guardian`, `/scripts/setup-xrpl.ts` [P1] · `/bot` [P4] · `/fixtures`, `/scripts/preflight.ts`, `.env.example` [P4] · `/lib/types.ts` [all, via P2]

## Money layer (P1) implementation notes, for the Builder
_Owner: Arpey (P1), assigned 2026-09-26. Verify every detail below against xrpl.org docs, since these are starting points, not guarantees._
- **Connect:** xrpl.js v4, Testnet `wss://s.altnet.rippletest.net:51233`. `client.fundWallet()` gives faucet XRP.
- **RLUSD:** get the Testnet issuer address and test tokens from tryrlusd.com / docs.ripple.com. "RLUSD" is 5 characters, so the currency must be the 40-character hex code (`524C555344000000000000000000000000000000`; confirm). Every account holding RLUSD needs a `TrustSet` to the issuer first.
- **Rent wallet setup order** (signed by the wallet's own master key, before it's disabled):
  1. `TrustSet` (RLUSD)
  2. `SignerListSet`: quorum 2, entries agent(1) / Guardian(1) / tenant backup(2). Signer addresses don't need to be funded.
  3. `AccountSet` with `asfDisableMaster`
- **Multi-signed payment:**
  1. `client.autofill(tx, signersCount)` (higher fee)
  2. `agentWallet.sign(tx, true)`, sent to the Guardian
  3. The Guardian runs `xrpl.decode(blob)`, checks `Account`, `Destination` and `Amount` (currency, issuer, value) against its rules, then `guardianWallet.sign(tx, true)`
  4. `xrpl.multisign([agentBlob, guardianBlob])` → `client.submitAndWait`
- **Memos:** `Memos: [{Memo: {MemoType: hex("rentrelay/audit"), MemoData: hex(sha256(decisionRecord))}}]`.
- **"Stolen key" attack:** submitting with only the agent's signature should fail with a bad-quorum error (e.g. `tefBAD_QUORUM`). Show that exact ledger response.
- **Spawn (Tier 2):**
  1. The ops account sends XRP to a new address (base reserve + owner reserves for the trust line, signer list and credential, plus fees)
  2. The setup steps above
  3. `CredentialCreate` (issuer = landlord, Subject = agent wallet, `CredentialType` = hex("RentRelayTenantAgent"))
  4. `CredentialAccept` by the new wallet (before its master is disabled)
  - **Check early that the Credentials amendment is enabled on Testnet.** Fallback: store the pinned landlord address in the Guardian's config.
- **Keys:** agent seeds live in the app's env, the Guardian seed only in the Guardian's env, and tenant backup seeds only in the local setup output. Never commit any of them.
- **Where code lives:** the shared GitHub repo (`DivHacks-2026-Track-2`), so teammates can pull it. Suggested layout: `/lib/xrpl`, `/guardian`, `/scripts/setup-xrpl.ts`.

## Team roles
| | Owns | First milestone (about H+4) |
|---|---|---|
| **P1: Money layer** (Arpey) | XRPL setup, `lib/xrpl` (build, agent-sign, multisign, submit, spawn, top-up), Guardian, credentials | 2-key RLUSD payment from a tenant wallet to the landlord, co-signed by the Guardian, with an explorer link |
| **P2: Agents + backend** (merges `main`) | Agent runtime, demo clock + tick, dues and late-fee engine, Gemini, MongoDB, all API routes | Tick on "rent day" produces correct PaymentIntents (XRPL mocked) |
| **P3: Frontend** | Tenant phone view + web chat, landlord console grid, spawn animation, attack panel, demo controls | Both views render from mock `/api/state` JSON |
| **P4: Photon + ship** | Spectrum bot, `.tech` domain, Vercel/env, fixtures (ConEd bill, scam text), preflight, deck, Devpost, backup video, testing | App deployed at the domain, and a Photon bot replying in iMessage |

**Team rules:**
- One branch per person, and each person edits only their own folders.
- Mocks sit behind the real function signatures, so nobody blocks anyone.
- P1 and P2 don't sleep at the same time before H+8.
- Log bugs in `docs/BUGS.md`.

## Schedule (H = hours from build start)
| When | Goal |
|---|---|
| H+1 | Types and routes agreed, repo/env/deploy ready, `.tech` registered, booth questions asked (Ripple: Credentials + multi-sign + RLUSD on Testnet; Photon: Mac or number needs) |
| H+4 | Every piece works alone (see milestones) |
| H+8 | **Tier 1 end to end:** rent day pays real RLUSD through the Guardian; grid updates |
| H+13 | **Tier 2:** late fees, tenant chat, Gemini, spawn live, attack panel |
| ~midnight | Photon go/no-go (only if Tier 1 is done) |
| 6:30 AM | Feature freeze |
| 8:00 AM | Backup video + deck done |
| 9:30 AM | **Submit on Devpost** |

## Demo script (~3 min, tenant first)
1. **(20s) Maya's phone:** her agent texts *"Rent this month: $1,488 ($1,450 + $38 ConEd). You're covered, and I'll pay on the 1st."* She asks "why is ConEd $38?", and it explains the building bill split.
2. **(20s) Why an agent:** changing amounts, roommates pay separately, scam-proof, it talks to you.
3. **(30s) Behind the scenes:** in the landlord console, a new tenant is added → **a new agent spawns live**: wallet funded by the main agent, credential issued.
4. **(40s) Rent day:** jump the demo clock to the 1st → every agent pays **on its own** → the grid turns green, except Jordan (short). Jordan texted *"I get paid on the 5th"*, and his agent agreed (inside the grace period, no fee). He forgets. Day 8 → his agent pays rent + **$15**, capped by NY law. **Maya paid nothing extra.** Open the transaction on the explorer.
5. **(45s) What could go wrong:** scam "new bank account" text → blocked. Landlord agent tries a $200 late fee → blocked (illegal). Stolen agent key → **the ledger itself** rejects it.
6. **(20s) Close:** *"A personal rent agent for every tenant. It reminds, explains and pays on time, and it can't be scammed, can't overcharge you, and can't break the law. The AI decides. The ledger enforces."*

## Q&A prep (everyone learns these)
- **Why not autopay?** The four reasons above.
- **Why blockchain?** A neutral account that neither the landlord, the AI nor any single roommate controls. The rules are enforced by the ledger, and every payment has a public, tamper-proof receipt.
- **Who runs the Guardian?** In production, a regulated payments company: the missing piece Ripple's brief describes between an agent's intent and settlement.
- **Why not XRPL Checks?** Rent changes monthly with utilities. The ledger already enforces two keys and the wallet balance as the hard cap; the Guardian applies the variable rules.
- **Does the landlord or ConEd take RLUSD?** Not today. Testnet stand-ins; a real version settles through an off-ramp or bill-pay partner.
- **Is the late fee legal?** It's built around NY RPL §238-a, and the Guardian makes an illegal fee impossible.
- **Is it really autonomous?** The demo clock only fast-forwards time. No human approves any payment.
- **KYC?** Tenants are verified at onboarding. Agent identity is on-chain via Credentials.
- **Cost at scale?** Each agent wallet holds a small XRP reserve, paid by the landlord's ops account. It's cents per tenant.
