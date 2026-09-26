#!/usr/bin/env bash
# Merge gate: install, typecheck and test every JS/TS project in the repo.
# Finds each package.json (repo root, bot/, ...), picks bun or npm from the lockfile,
# then runs tsc plus any typecheck / lint / build / test / test:* scripts.
# Never runs start/dev/servers or scripts that touch XRPL (setup:xrpl, test:payment, ...).
set -euo pipefail
cd "$(dirname "$0")/.."

failed=()
projects=$(git ls-files '*package.json' | grep -v node_modules || true)
if [ -z "$projects" ]; then
  echo "No package.json in the repo yet: nothing to build."
  exit 0
fi

run() { # run <label> <cmd...>
  echo "::group::$1"
  if "${@:2}"; then echo "::endgroup::"; else echo "::endgroup::"; echo "::error::FAILED: $1"; failed+=("$1"); fi
}

for pkg in $projects; do
  dir=$(dirname "$pkg")
  echo "=== $dir ==="
  pushd "$dir" >/dev/null

  if [ -f bun.lock ] || [ -f bun.lockb ]; then
    pm=bun
    run "$dir: bun install" bun install --frozen-lockfile
  elif [ -f package-lock.json ]; then
    pm=npm
    run "$dir: npm ci" npm ci --no-audit --no-fund
  else
    pm=npm
    run "$dir: npm install" npm install --no-audit --no-fund
  fi

  scripts=$(jq -r '.scripts // {} | keys[]' package.json | grep -E '^(typecheck|lint|build|test|test:.+)$' || true)

  if [ -f tsconfig.json ] && ! grep -qx typecheck <<<"$scripts" && [ -x node_modules/.bin/tsc ]; then
    run "$dir: tsc --noEmit" node_modules/.bin/tsc --noEmit -p .
  fi
  for s in $scripts; do
    run "$dir: $pm run $s" "$pm" run "$s"
  done
  [ -z "$scripts" ] && echo "(no typecheck/lint/build/test scripts in $dir)"

  popd >/dev/null
done

if [ ${#failed[@]} -gt 0 ]; then
  printf '\nFailed steps:\n'; printf '  - %s\n' "${failed[@]}"
  exit 1
fi
echo "All build/test steps passed."
