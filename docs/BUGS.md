# Bugs

_Owned by the Debugger chat. Anyone may add a bug. Format: `- [ ] YYYY-MM-DD: symptom, steps to reproduce, (fixed: cause + fix)`._

## Open

## Fixed

- [x] 2026-09-26: Bot mock backend numbers didn't match `fixtures/demo-script.md` (Abhimanyu $42 utilities / $1,492, Musammat $40 / $1,490, "split three ways" utility reply), so a demo on the mock showed the wrong numbers. Repro: `POST /api/chat {"tenantId":"abhimanyu","text":"why is the utility bill $38?"}`. Found by /merge-check on `photon-bot`. (fixed: mock tenant data was out of date. Set $38 utilities and $1,488 totals for all three, reminders and utility replies now use the script's wording and the $114 building bill split, in `bot/mock/server.ts`.)
- [x] 2026-09-26: Guardian `POST /cosign` with no body (or no JSON content-type) returned a 500 HTML page with a stack trace and local file paths. Repro: `curl -X POST localhost:4001/cosign`. Found by /merge-check on `money-layer`. (fixed: Express 5 leaves `req.body` undefined, so destructuring threw. Default it to `{}` in `guardian/server.ts`, so it's refused with the usual 403 `tx-shape` JSON.)
