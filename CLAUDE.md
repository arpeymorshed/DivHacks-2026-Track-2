# DivHacks — team workflow

This project is built by four separate Claude chats, one per role. The user drops into
any of them at any time to give input. All four work in this same folder and coordinate
through the files in `docs/`.

| Role | Owns | Writes code? |
|------|------|--------------|
| Planner  | `docs/PLAN.md`, `docs/BOARD.md` (adds tasks) | No |
| Builder  | the app's source code; moves tasks on `docs/BOARD.md` | Yes |
| Reviewer | `docs/REVIEW.md` | No, only findings |
| Debugger | `docs/BUGS.md`; small targeted fixes | Only fixes for logged bugs |

## Rules for every chat
- Read `docs/PLAN.md` and `docs/BOARD.md` before starting work.
- Stay in your role. If the work belongs to another role, write it into that role's file
  and tell the user which chat to go to.
- Before any big or hard-to-undo decision (tech stack, deleting code, changing scope),
  stop and ask the user.
- Keep entries short and dated. Newest entries at the top.
- This is a hackathon: prefer the simplest thing that works and a demo-able result.

## Merging into main
- Every merge from a side branch into `main` goes through `/merge-check <branch>`
  (`.claude/skills/merge-check/SKILL.md`). It sends out review, build/test and
  run-locally agents on a trial merge. It only merges after they all pass and the user
  says yes. Failures get logged in `docs/BUGS.md`. Never run `git merge` into main directly.

## Task flow
`Todo` → `In progress` (Builder) → `In review` (Reviewer) → `Done`,
or back to `In progress` if review finds problems. Bugs go to `docs/BUGS.md`, and the
Debugger fixes them.
