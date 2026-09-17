---
status: ACTIVE
category: operations
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Context Pack independent review — reviewer instructions

## Who this is for

A real, independent agent (Codex, or another human/agent explicitly
assigned by Bryan) reviewing `context/` on branch
`phase-9/context-pack-v1-foundation` before it merges into `main`. **Not
`codex-staging`** — that synthetic Knowledge Hub fixture already
lifecycle-validated the orchestration mechanics (see
`context/domains/orchestration.md`) and does not count as this review,
by explicit instruction (Phase 10, Part 37). If no real Codex/independent
session is assigned yet, this review's status is
`REAL_INDEPENDENT_REVIEW_PENDING` — do not fake one to close the gap.

## Your objective

Find real problems, not style preferences. Specifically:

- **Incorrect facts** — a claim that doesn't match what the cited source
  actually says.
- **Unsupported claims** — a statement with no traceable source at all
  (see `context/GOVERNANCE.md`'s authority-level model; anything that
  isn't `EXECUTABLE_FACT`/`CANONICAL_DECISION`/`CURRENT_DOC`/
  `ACCEPTED_HANDOFF`/`HISTORICAL_SOURCE`/explicitly-attributed-to-Bryan
  should not be stated as fact).
- **Stale decisions presented as current** — check
  `context/KNOWLEDGE_HUB_MAPPING.md`'s per-decision table and
  `context/REPOSITORY_KNOWLEDGE_MAP.md` §6 for the one conflict already
  found (`cf5f14c2`/`53034c0c` vs. `fa8e9ad0`); look for others this
  pass may have missed.
- **Idea/decision confusion** — especially in `context/domains/n8n.md`,
  `bloodmoon-ai.md`, `notifications.md`, `referral.md`, `marketing.md`.
  These domains contain a lot of future/proposal content; confirm every
  such file says PLANNED/PROPOSED and never implies something is built
  when it isn't.
- **Missing supersessions** — a decision that repo evidence contradicts
  but that isn't flagged anywhere (`context/SUPERSEDED_DECISIONS.md`,
  `context/OPEN_QUESTIONS.md`).
- **Wrong authority** — a source cited as more authoritative than it
  actually is (e.g. an unmerged design-branch doc treated as a decided
  architecture — see `GOVERNANCE.md`'s `CURRENT_DOC` vs.
  `CANONICAL_DECISION` distinction).
- **Draft treated as decision** — a preserved or proposal document says
  "Feature X will work this way" while the real code/decision record
  says X isn't built — the Context Pack must say `PLANNED`/`DRAFT`, not
  state it as current (Phase 11, Part 19's explicit example).
- **Implementation/doc mismatch** — a document describes a schema or
  system as if Blood Moon's code uses it, when the doc is only evidence
  the *GameServer* has that shape (see `context/preservation/OPENBETA_UNTRACKED_MANIFEST.md`
  Group 5's own caveat about `docs/gameserver/`).
- **Broken sources** — run `node context/validate.mjs` yourself; don't
  just trust the last recorded PASS.
- **Important omissions** — something the pack should cover for its
  stated purpose (bootstrap-time orientation) but doesn't.
- **Security leakage** — any secret value (not just a pattern-shaped
  false positive) anywhere in `context/`, including the preservation
  archive.

**You must not simply rewrite style, tone, or wording.** A finding is
only real if it's one of the categories above.

## What you need — the review package (nothing else required first)

Start at [`../../context/review/README.md`](../../context/review/README.md)
— a compact package built exactly for this review (diff summary,
decision index, source summary, conflicts, open questions, preserved-sources
summary, last validation result). You should **not** need to read the
entire repository, every worktree, or the raw Knowledge Hub database
before forming a first opinion — go deeper only where a specific claim
looks wrong.

## Reporting your findings

Use whatever format the assigning session asks for. At minimum, for
each finding: which file, what's wrong, what category (from the list
above), and what evidence you checked. If you find zero real issues,
say so explicitly — a review that "found nothing" is only credible if
it also names what you checked and concluded was fine.

## Review test scenarios (Phase 11, Part 31)

Before or after your own review, try answering these using **only**
the Context Pack (not the wider repo, not this session's memory). If
you can't answer one, or the Context Pack's answer conflicts with what
you find elsewhere, that's a real finding in itself.

1. What is the current VIP tier-change-while-active policy? (Expect:
   same tier extends, different tier blocked until expiry — cite ADR-0022/OQ-025.)
2. Is Asaas production-enabled? (Expect: no — cite `domains/payments.md`, `REPOSITORY_KNOWLEDGE_MAP.md` §5.)
3. Where is Knowledge Hub staging, and is it currently enabled for writes? (Expect: `ai-knowledge-hub-staging`, `ORCHESTRATION_ENABLED=false` as of Phase 10/11 — cite `INFRASTRUCTURE.md`, `domains/knowledge-hub.md`.)
4. Is n8n installed anywhere? (Expect: no, design-only — cite `domains/n8n.md`.)
5. What is the recommended role split between the Knowledge Hub and n8n? (Expect: Hub = durable operational truth; n8n = integration/scheduling layer, not the orchestrator core — cite `domains/n8n.md`.)
6. Which orchestration environment is currently real and proven end-to-end? (Expect: staging, via the real Phase 9 pilot — cite `domains/orchestration.md`.)
7. Is Blood Moon AI implemented? (Expect: no, two complementary design proposals only — cite `domains/bloodmoon-ai.md`.)
8. What source is authoritative for real-time operational task state (claims, approvals)? (Expect: the Knowledge Hub, never a repo doc — cite `GOVERNANCE.md`'s file-vs-Hub rule.)
9. What is the RMT (real-money trading) policy? (Expect: no official marketplace, player RMT allowed unmediated — cite ADR-0016 via `ADR_INDEX.md`.)
10. Are ADR-0025/0026/0028 still fully in force? (Expect: no, partially superseded by ADR-0029 — cite `SUPERSEDED_DECISIONS.md`.)
11. Do the real player/admin/super-admin/technical manuals exist on `main`? (Expect: no, only preserved untracked — cite `OPEN_QUESTIONS.md` OQ-CTX-008.)
12. Is the `SITE_BETA_BLOCKED`/`NO-GO` Hub decision from 2026-08-08 still accurate today? (Expect: genuinely unresolved — one blocker disproven, others unverified either way — cite `REPOSITORY_KNOWLEDGE_MAP.md` §6.)
13. Has a real Codex staging pilot run? (Expect: no — cite `DEFERRED.md`.)
14. What is the file-vs-Hub authority rule when they disagree on a current technical fact? (Expect: the repo doc wins for *current fact*, the Hub wins for *what happened/was decided* — cite `GOVERNANCE.md`, corroborated independently by the preserved `knowledge-hub-boundary.md`.)
15. Has any ChatGPT conversation history been imported? (Expect: no, explicitly deferred — cite `RAW_HISTORY_AND_INGESTION.md`.)
16. What is Bryan's real, current WCoin-to-BRL pricing policy? (Expect: integer BRL, 1 WC = R$1 — cite ADR-0008/0020.)
17. Has the openbeta worktree's untracked content been committed to `main`? (Expect: no — preserved as a copy only, originals untouched, integration still an open question — cite OQ-CTX-005.)
18. What capability does the real Phase 9 pilot's staging actor `claude-code-real-staging` explicitly NOT have? (Expect: `APPROVAL_GRANT`/`RESOURCE_RECOVERY`/`SYSTEM_ADMIN`/`APPROVAL_REQUEST` — cite `domains/orchestration.md`.)
19. Is the real production drop-rate drift (OR-023) remediated? (Expect: forensics complete, remediation decision status unknown as of the last date checked — cite `domains/game-economy.md`.)
20. Where would a future real ChatGPT export be classified on entry — as a source, or as authority? (Expect: strictly as a `SOURCE`/`CHAT_TRANSCRIPT`, never authority — cite `RAW_HISTORY_AND_INGESTION.md`.)

## Context sufficiency test (Part 32 — for later use, not this review)

A separate, future exercise: hand a fresh agent only `AGENTS.md` +
`context/` + a real task, and see if it can orient correctly without
this conversation's memory. **Not executed this phase** — it requires
a genuinely fresh session, which this review-package preparation isn't.
Whoever runs the real independent review may also be a reasonable
candidate for this test, but the two are not the same exercise.

## What happens after your review

Per the Phase 11 merge gate: preservation PASS (done) + validator PASS
(done) + secret scan PASS (done) + **your real independent review
PASS** + any critical findings resolved. Only then does merging
`phase-9/context-pack-v1-foundation` into `main` become appropriate —
and even then, that merge itself needs its own explicit go-ahead, not
an automatic follow-on from your review passing.
