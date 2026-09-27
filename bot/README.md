# bot

A [Spectrum](https://photon.codes/docs/spectrum-ts) project. Wired with: imessage.

## Environment

Before running, open `.env` and fill in the values:

From your project Settings on the [Photon dashboard](https://app.photon.codes):

- `PROJECT_ID`
- `PROJECT_SECRET`

## Run

```sh
bun install
bun start
```

## Aartee messaging layer

This bot is Aartee's iMessage delivery channel. It holds no wallet keys and runs no
XRPL or AI logic; it only relays messages between tenants and the Aartee backend.

- **Inbound:** a registered tenant texts the bot → `POST {API_BASE_URL}/api/chat` with
  `{ tenantId, text }` → the `{ reply }` is sent back (with a typing indicator).
  Unregistered numbers get "This number isn't registered with Aartee."
- **Outbound:** every 5 seconds the bot calls `GET {API_BASE_URL}/api/outbox` and texts each
  new `{ id, tenantId, text }` to that tenant. After a successful send it calls
  `POST {API_BASE_URL}/api/outbox/:id/ack`, and the backend stops returning that message.
  Delivered ids are also saved locally in `.outbox-sent.json` (gitignored) as a backup, so
  nothing is sent twice, even after a restart or when an ack fails. A failed ack is retried
  on the next poll without resending. A failed send is not acked and is retried. Delete that
  file to resend everything.
- **Errors:** if the backend is down or errors, tenants get "Aartee is having trouble right
  now" and the bot keeps running. Failed outbox sends are retried on the next poll.

### Backend contract

| Route | Body | Response |
|---|---|---|
| `POST /api/chat` | `{ tenantId, text }` | `{ reply }` |
| `GET /api/outbox` | | `[{ id, tenantId, text }]`: messages not yet acked |
| `POST /api/outbox/:id/ack` | | any 2xx. After this, `GET /api/outbox` no longer returns `id` |

### Environment variables (`.env`)

| Variable | Meaning |
|---|---|
| `PROJECT_ID`, `PROJECT_SECRET` | Spectrum credentials from the Photon dashboard |
| `TENANT_PHONES` | Tenants as `tenantId:+1phone` pairs, comma-separated, e.g. `abhimanyu:+15551234567,kashish:+15557654321` |
| `API_BASE_URL` | Aartee backend. `http://localhost:4000` for the mock |

### Run with the mock backend

Two terminal tabs, both in `bot/`:

```sh
bun run mock    # tab 1: fake backend on http://localhost:4000
```

```sh
bun start       # tab 2: the iMessage bot
```

The mock has fake data for `abhimanyu`, `kashish` and `musammat`, and starts with one outbox
message per tenant. Queue another one to test outbound delivery:

```sh
curl -X POST localhost:4000/api/outbox -H 'content-type: application/json' \
  -d '{"tenantId":"kashish","text":"Test reminder from Aartee"}'
```

The mock's outbox lives in memory, so restarting it brings back the same starting ids
(`msg-001`…) un-acked. The bot already has them marked as sent, so it just re-acks them
without texting anyone again.

### Switch to the real backend

Set `API_BASE_URL` in `.env` to the real backend's URL (e.g. `https://rentrelay-api.example.com`),
then restart the bot. No code changes are needed as long as it implements the two routes above.
If the real backend reuses ids the mock used (`msg-001`…), delete `.outbox-sent.json` first.

## Where to go next

- [Spectrum docs](https://photon.codes/docs/spectrum-ts)
- Add more providers from `spectrum-ts/providers/*`.
