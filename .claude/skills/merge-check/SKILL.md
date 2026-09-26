---
name: merge-check
description: Check a side branch before merging it into main — spawns review, build/test, and run-locally agents on a trial merge, and only merges if all pass. Use for every merge into main.
argument-hint: <branch-to-merge>
---

# /merge-check <branch>

Gate for merging a side branch into `main`. Never merge into `main` any other way.

## 1. Prepare a trial merge (don't touch the user's working tree)
1. If `$ARGUMENTS` is empty, ask which branch to merge. Stop if the folder isn't a git repo or `main` / the branch doesn't exist.
2. Stop and tell the user if `git status` shows uncommitted changes on either branch.
3. Create a throwaway worktree with the merge applied, no commit:
   ```bash
   git worktree add ../divhacks-mergecheck main
   cd ../divhacks-mergecheck && git merge --no-ff --no-commit <branch>
   ```
   If there are merge conflicts: list the conflicting files, clean up (step 4 below), and stop. Resolving them is the Builder's job.
4. Record `git diff main...<branch> --stat` and the branch's head commit SHA.

## 2. Spawn three agents in parallel (one message, background)
Give each one the worktree path, the branch name, the diff stat, and `docs/PLAN.md` (tech stack + demo script). Tell each one it is read-only apart from running commands, and must end its report with `VERDICT: PASS` or `VERDICT: FAIL`, plus reasons.

- **Reviewer agent** — reviews `git diff main...<branch>` for correctness bugs, broken imports, leaked secrets/API keys, and anything that contradicts `docs/PLAN.md`. Only blocking issues count toward FAIL.
- **Build & test agent** — installs deps and runs the project's build, lint/typecheck, and tests. Detect the commands from the stack in PLAN.md and the project files (`package.json` scripts, `requirements.txt`/`pyproject.toml`, etc.). FAIL on any build error or failing test. If no tests exist, say so, but that alone isn't a FAIL.
- **Run-locally agent** — starts the app in the worktree the way a teammate would (dev server / main script), waits for it to come up, and smoke-tests the main flow from the PLAN.md demo script (HTTP requests, or the browser pane for UIs). Checks the console and server logs for errors, then stops every process it started. FAIL if the app won't start or the demo flow breaks.

## 3. Decide
- **All PASS** → show the user a short summary and ask "Merge `<branch>` into main?" On yes, from the main checkout: `git checkout main && git merge --no-ff <branch>`. Don't push unless the user asks.
- **Any FAIL** → don't merge. Add each problem to `docs/BUGS.md` under Open (dated, with steps to reproduce, and noting it came from merge-check on `<branch>`). Tell the user which chat should fix it (Builder for missing or wrong features, Debugger for bugs).

## 4. Always clean up
```bash
cd <main checkout> && git worktree remove --force ../divhacks-mergecheck
```
Make sure no dev servers or background processes from the check are still running.
