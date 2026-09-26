#!/usr/bin/env bash
# Merge gate: start each runnable service locally and hit its main endpoints.
# Offline only: no real XRPL network, no real iMessage/Photon, no real secrets.
# Run after ci/build-test.sh (it expects dependencies to be installed).
# Adding a new service? Add a smoke_<name> function below and call it at the bottom.
set -euo pipefail
cd "$(dirname "$0")/.."

pids=()
cleanup() { for p in "${pids[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT
failed=()
ran=0

wait_up() { # wait_up <url> <log>
  for _ in $(seq 1 30); do curl -fsS "$1" >/dev/null 2>&1 && return 0; sleep 1; done
  echo "::error::Service at $1 did not come up. Log:"; cat "$2"; return 1
}
expect() { # expect <label> <want-status> <curl args...>
  local got; got=$(curl -s -o /tmp/smoke-body -w "%{http_code}" "${@:3}" || true)
  if [ "$got" = "$2" ]; then echo "ok   $1 ($got)"; else
    echo "::error::FAIL $1: expected HTTP $2, got $got: $(head -c 300 /tmp/smoke-body)"; failed+=("$1"); fi
}

smoke_guardian() {
  [ -f guardian/server.ts ] || return 0
  ran=1; echo "=== guardian server ==="
  # Throwaway wallets generated offline; XRPL_WS points at a dead port so nothing reaches the network.
  read -r seed landlord agent wallet < <(node --input-type=module -e "
    import { Wallet } from 'xrpl';
    const w = () => Wallet.generate();
    console.log(w().seed, w().address, w().address, w().address);")
  local log=/tmp/guardian.log
  PORT=4301 XRPL_WS=ws://127.0.0.1:1 GUARDIAN_SEED="$seed" GUARDIAN_ADMIN_TOKEN=ci-token \
  GUARDIAN_POLICY="{\"landlord\":\"$landlord\",\"rentWallets\":{\"$wallet\":{\"agent\":\"$agent\",\"capUsd\":1600,\"unitRentUsd\":2900,\"rentShareUsd\":1450,\"maxUtilitiesUsd\":60}}}" \
    node --import tsx guardian/server.ts >"$log" 2>&1 &
  pids+=($!)
  wait_up http://127.0.0.1:4301/health "$log" || { failed+=("guardian start"); return 0; }
  expect "guardian GET /health"            200 http://127.0.0.1:4301/health
  expect "guardian /cosign empty -> refused" 403 -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4301/cosign
  expect "guardian /cosign bad blob -> refused" 403 -X POST -H 'content-type: application/json' \
    -d '{"txBlob":"zz","intent":{},"context":{"today":"2026-10-01","month":"2026-10","run":1}}' http://127.0.0.1:4301/cosign
  expect "guardian /reset no token -> 401"  401 -X POST http://127.0.0.1:4301/reset
  expect "guardian /reset with token"       200 -X POST -H 'authorization: Bearer ci-token' http://127.0.0.1:4301/reset
}

smoke_bot_mock() {
  [ -f bot/mock/server.ts ] || return 0
  ran=1; echo "=== bot mock backend ==="
  local log=/tmp/bot-mock.log
  (cd bot && MOCK_PORT=4302 bun mock/server.ts) >"$log" 2>&1 &
  pids+=($!)
  wait_up http://127.0.0.1:4302/health "$log" || { failed+=("bot mock start"); return 0; }
  expect "mock GET /health"          200 http://127.0.0.1:4302/health
  expect "mock GET /api/outbox"      200 http://127.0.0.1:4302/api/outbox
  expect "mock POST /api/chat"       200 -X POST -H 'content-type: application/json' -d '{"tenantId":"kashish","text":"how much do I owe?"}' http://127.0.0.1:4302/api/chat
  expect "mock chat unknown tenant"  404 -X POST -H 'content-type: application/json' -d '{"tenantId":"nobody","text":"hi"}' http://127.0.0.1:4302/api/chat
  expect "mock POST /api/outbox"     201 -X POST -H 'content-type: application/json' -d '{"tenantId":"kashish","text":"ci ping"}' http://127.0.0.1:4302/api/outbox
  # The bot itself (bun start) needs live Photon credentials, so CI only typechecks it.
}

smoke_guardian
smoke_bot_mock

[ "$ran" = 1 ] || echo "No runnable services found yet: nothing to smoke-test."
if [ ${#failed[@]} -gt 0 ]; then
  printf '\nFailed smoke checks:\n'; printf '  - %s\n' "${failed[@]}"
  exit 1
fi
echo "All smoke checks passed."
