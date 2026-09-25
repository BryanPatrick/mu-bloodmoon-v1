---
status: ESTABLISHED
category: protocol
audience: internal (any agent or engineer working in this repo)
lastVerified: 2026-08-31
---

# Agent bootstrap protocol — mandatory before any meaningful engineering action

Established 2026-08-31, as a **permanent project rule**, not a
one-time-phase instruction. This applies to any agent (or engineer)
picking up work in this repository from this point forward.

## Why this exists

This project's history includes at least one real, concrete cost of
skipping this: Phase K's `legacy-unknown-structures.md` originally
claimed "no legacy CMS source exists locally anywhere on this machine" —
a search that matched directory/file *names* containing `dmn`/`cms`
literally, but missed the real source (folder named `hostbr-web-20260716`
instead). That wrong claim stood until a broader, more careful search in
Phase L found the real source and had to correct it in place (with a
visible `~~strikethrough~~` annotation, not a silent overwrite — see this
project's separate "never silently overwrite history" documentation
convention). **A five-minute check of what already exists would have
prevented an incorrect claim from persisting across two phases.** This
protocol exists to make that check the default, not an afterthought.

## The rule

**Before any engineering action beyond a trivial one-file lookup, work
from current persisted project knowledge — never from chat context,
model memory, a previous session's summary, or an assumption — without
first checking whether the documentation already answers the question.**

If required knowledge is missing: search, inspect, and document what was
actually found. Never guess. Mark the result `UNKNOWN`/`NEEDS_VALIDATION`
if it remains unresolved after a real search — that is a valid, honest
outcome; a confident wrong guess is not.

If documentation conflicts with what the current code actually does:
investigate the discrepancy and document it explicitly (which one is
stale, and why) — never silently pick one without saying so.

## The 15-step sequence

**On `main` (2026-09-25, `BLOODMOON-AI-06`, `ADR-0034`)**: `main` is the
canonical source. `docs/README.md` has not reached `main` yet, so for
step 1 read [`context/README.md`](../../context/README.md) (Context
Pack bootstrap order) and
[`docs/knowledge/KNOWLEDGE_MASTER_INDEX.md`](../knowledge/KNOWLEDGE_MASTER_INDEX.md)
instead. Domain folders named in steps 2-3 that are not on `main`
(for example `docs/gamebridge/`, `docs/payments/`, `docs/economy/`,
`docs/vip/`) are read from historical branches with `git show
<branch>:<path>` and labeled as historical sources; the knowledge
router's domain map
(`.claude/skills/bloodmoon-knowledge-router/SKILL.md`) says where each
one lives today.

1. **READ PROJECT INDEX** — `docs/README.md`. It is the central map; start
   here even if you think you already know where to look.
2. **IDENTIFY DOMAIN** — which of the named sections in `docs/README.md`
   (Accounts, Security, GameServer, GameBridge, Launcher, Economy, VIP,
   Payments, Guilds, Privacy, etc.) does this task actually touch? A task
   often touches more than one. **Automation/orchestration/agent-ecosystem
   tasks** → start at
   [`docs/architecture/agent-automation-architecture.md`](../architecture/agent-automation-architecture.md)
   instead of guessing which of the other sections applies.
3. **READ CURRENT SYSTEM DOCS** — the relevant subset of
   `docs/architecture/`, `docs/gameserver/`, `docs/gamebridge/`,
   `docs/vip/`, `docs/payments/`, `docs/security/`, `docs/accounts/`,
   `docs/economy/`, `docs/launcher/` for the identified domain(s).
4. **READ RELEVANT DECISIONS** — `docs/decisions/` (see `README.md` in
   that folder where one exists; on `main` use
   [`context/DECISIONS.md`](../../context/DECISIONS.md) and
   [`context/ADR_INDEX.md`](../../context/ADR_INDEX.md) as the index). A decision
   already made and documented is not up for silent re-litigation.
5. **READ THE LAST RELEVANT PHASE/HANDOFF** — `docs/handoff/` for the
   topic, and any phase-report-shaped document already covering this
   area (search for the domain name across `docs/`).
6. **CHECK REPO/BRANCH/WORKTREE STATE** — `git status`, confirm which
   worktree/branch you are actually in, and whether uncommitted work
   already exists that a fresh action might conflict with or duplicate.
7. **CHECK OPEN BLOCKERS/QUESTIONS** — search the relevant docs for
   `UNKNOWN`, `NEEDS_VALIDATION`, `DECISIONS_REQUIRED`, or an explicit
   "open question" section before assuming a clean slate.
8. **DECLARE START STATE** — before making changes, note (even just to
   yourself, in the work you're about to describe) what you found in
   steps 1-7 and what gap remains that this task is meant to close. If
   nothing relevant exists, that itself is worth stating explicitly
   rather than silently proceeding as if it were checked.
9. **WORK** — do the actual engineering task, informed by 1-8.
10. **TEST** — real tests, run for real, results reported honestly (not
    assumed from reading the code).
11. **UPDATE DOCS** — the specific doc(s) this work actually changes the
    truth of. A task that changes behavior without updating the doc that
    described the old behavior leaves the docs actively wrong, which is
    worse than leaving them silent.
12. **UPDATE HISTORY** — if this is phase/decision-shaped work, the
    relevant history/decision record, not just the technical doc.
13. **UPDATE MANUAL IMPACT** — if this changes what an admin/GM/player can
    do or see, the relevant `docs/manuals/` entry.
14. **WRITE A HANDOFF** — if the work is not fully finished, or someone
    else (human or agent) will need to pick it up, leave a real handoff
    note (see the Work Session Record shape below), not just a git diff.
15. **STOP** — do not silently continue into unrelated work once the
    declared task is done.

## Fail-closed rule

A task or phase that changes behavior without updating the technical
docs, phase history, and manual impact where applicable **cannot be
reported as PASS** — it must be reported PARTIAL, with the specific gap
named. This is a standing rule, not specific to any one phase's report
template.

## Work Session Record — minimal shape

For any non-trivial session, a short record (in the phase/session's own
final message or handoff doc — this project does not currently mandate a
separate file per session) should be able to answer:

- **TASK** — what was actually asked.
- **START STATE** — what step 8 above found.
- **DOCS CONSULTED** — which files, not "I checked the docs."
- **FILES INSPECTED/CHANGED** — real paths.
- **DECISIONS USED** — which existing `docs/decisions/` entries (if any)
  governed choices made.
- **WORK DONE** — concretely, not a restatement of the task.
- **TESTS** — what ran, real pass/fail counts, not "should work."
- **DISCOVERIES** — anything found that wasn't the task itself but is
  worth recording (a bug, a stale doc, an open question).
- **DOCS UPDATED** — which files, matching step 11.
- **OPEN RISKS** — named, not implied.
- **NEXT STEP** — if incomplete, what specifically comes next.

## Scoped reading — mandatory does not mean exhaustive

Consulting existing knowledge before acting (steps 1-7) is mandatory,
but it does not mean reading the entire documentation tree for every
task — that would trade one failure mode (working from memory/
assumption) for another (unusable response latency and unnecessary
context flooding). Scope the reading to what the task's domain actually
touches:

**Example — a payments task**: read `docs/README.md` (always), the
`docs/payments/` folder, the `docs/economy/`/WCoin-adjacent docs (since
payments and currency are entangled — see ADR-0008/0009), any ADR
touching payments/WCoin/VIP purchase (`docs/decisions/000{1,3,8,9,11}*`),
the most recent payments-related session/handoff record, and
`docs/security/` for anything payment-adjacent (credential handling,
webhook validation). **Do not** also read the Launcher visual/asset docs
for this task — they don't intersect payments, and reading them adds
nothing but noise.

**How to scope**: use `docs/knowledge/module-map.md` to identify which
named module(s) the task touches, then read that module's own
`RELATED ADRs`/`RELATED SYSTEMS` links plus its home folder in `docs/` —
this is usually enough to answer "what does this task's domain actually
touch" without guessing. Cross-cutting tasks (touching 3+ modules)
warrant a broader read; a single-module bugfix does not.

The goal is **consistency without unnecessary context flooding** — a
task that never checked anything is a real risk (see "Why this exists"
above); a task that re-reads the entire `docs/` tree for a one-line
config change is its own kind of failure, just a quieter one.

## Scope note

This protocol governs *how* to start work, not what tools or agent
framework to use — it applies equally to a human engineer reading this
repo cold and to an AI agent picking up a task. "Meaningful engineering
action" excludes trivial single-file lookups, answering a question
directly answerable from a file already open, or work explicitly scoped
by the requester to skip discovery (e.g., "just fix this one typo").
