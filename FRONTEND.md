# aartee. Frontend

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3000** (or whatever port Next prints).

### Seeing the UI without Mongo / Atlas

You do **not** need MongoDB just to browse the tenant shell and landlord console.

- If `MONGODB_URI` is missing (or Mongo is unreachable), `GET /api/state` returns **offline demo mode**: seed building, three tenants, mock wallet balances, and a warning banner.
- Top-up, rent day, seed, and other write routes still need a real `MONGODB_URI` (copy `.env.example` → `.env.local` and fill Atlas values, then `POST /api/seed`).
- RT chat works for local intent helpers; Gemini-backed replies need `GEMINI_API_KEY`.

## What's Inside

### Pages

| URL | What it shows |
|-----|--------------|
| `/` | Tenant app (main product) — live wallet/dues from `GET /api/state` |
| `/demo` | Landlord console + Guardian attack demo |

### Brand & agent

- Product name in the UI: **aartee.**
- Personal rent agent chat: **RT** (FAB: **Ask RT**)
- Unit group chat agents: **RT** / **RT-K** (scripted story)

### Tenant App (`/`)

Switch users with the top-right role menu:

| User | Role | Notes |
|------|------|--------|
| Abhimanyu / Kashish / Musammat | Tenants | Live balances when XRPL/mock state is available |
| Arpey | Landlord | Links into `/demo` console |

### Features

- **Dashboard** — Welcome headline, dues breakdown, wallet, shortfall callout when underfunded, rules, activity
- **Ask RT** — full-screen agent chat with suggestion chips; asks hit `POST /api/chat`
- **Unit chat** — scripted roommate + agent story with suggestion chips
- **Top up** — funds the rent wallet via `POST /api/topup` (demo key required in prod)
- **Dark mode** — moon/sun toggle
- **Notifications** — bell menu

### Landlord (`/demo`)

Building grid, rent day, spawn animation, Guardian attack scenarios.

## Design

- Tailwind tokens in `app/globals.css` + `tailwind.config.ts`
- IBM Plex Sans / Mono (`app/layout.tsx`)
- Quiet Cursor-like chrome; mobile-first tenant shell

## Tests

```bash
npm run test:polo   # wallet / owe / top-up intent helpers
npm run build
```

Chat intent helpers live in `src/lib/poloChat.ts` (shared with unit tests). The live RT chat panel talks to `/api/chat` (Gemini + rent repository when configured).
