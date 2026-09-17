---
status: ACTIVE
category: context-pack
audience: internal
lastVerified: 2026-09-17
---

# Open questions

`docs/open-questions.md` is referenced repeatedly by `docs/README.md`
but does not exist on this branch (`git ls-tree` confirmed, see
[`SOURCE_INDEX.md`](SOURCE_INDEX.md)). This file is a genuine, honestly
new addition to fill that real gap for this branch — it does not
duplicate a file that exists elsewhere on `main`, because no such file
exists here. If a future merge brings a real `docs/open-questions.md`
onto `main`, reconcile the two rather than keeping both.

| ID | Question | Why it's open |
|---|---|---|
| OQ-CTX-001 | **RESOLVED, Phase 10.** All of `docs/README.md`'s referenced-but-absent files are Category C — real content, sitting untracked in `mu-bloodmoon-v1-openbeta`, never committed to any branch (`git log --all --diff-filter=A` returns zero hits for every one of them). See `REPOSITORY_KNOWLEDGE_MAP.md` §3. What remains open: *should this content be rescued (committed somewhere) before it's lost*, not *where is it*. | Answered with evidence this phase; the follow-up action is a real decision for Bryan (see OQ-CTX-005). |
| OQ-CTX-002 | **SUPERSEDED, Phase 10 DECISÕES #1**: Knowledge Hub decision IDs are permanently canonical — no `DEC-<DOMAIN>-NNN` replacement will ever be minted for them. Non-canonical aliases only, see `KNOWLEDGE_HUB_MAPPING.md`. | No longer open — closed by explicit instruction, not by this pack's own judgment. |
| OQ-CTX-003 | **RESOLVED, Phase 10.** ADR-0016 (RMT policy) is Category C too — real content (`docs/decisions/0016-rmt-policy-gap.md`), untracked in `mu-bloodmoon-v1-openbeta`, never committed anywhere. Its title suggests it documents a gap rather than a policy (consistent with `docs/README.md`'s own prose), but this pack has not read its body this phase — that's still open. | The file's *existence and location* is resolved; its *content* is not yet read. |
| OQ-CTX-004 | Should `context/` eventually be merged/reconciled with whatever governance content exists on `governance/engineering-pack` or `mu-bloodmoon-v1-openbeta`? | Still open — a real decision for Bryan, not decided this phase either (Phase 10 explicitly keeps the branch unmerged). |
| OQ-CTX-005 | `mu-bloodmoon-v1-openbeta` has 220 dirty entries (143 untracked, 77 modified) — unchanged since the 2026-09-08 recovery finding that first flagged this. It holds real, otherwise-unrecoverable content (the full ADR set, `open-questions.md`/`open-risks.md`, `docs/knowledge/module-map.md` + 5 siblings, `docs/gameserver/`, `docs/store/`, the *original* `AGENTS.md`/`CLAUDE.md`/`docs/README.md`). Should someone commit this (on its own branch, never `main` directly) before it's lost to a disk failure, an accidental `git clean`, or simply time? | A live, real data-loss risk this phase surfaced with fresh evidence — not resolved, since Phase 10 is read-only and explicitly forbids altering worktrees. |
| OQ-CTX-006 | Are Knowledge Hub decisions `cf5f14c2`/`53034c0c` (SITE_BETA_BLOCKED / NO-GO, 2026-08-08) still accurate, given `fa8e9ad0` already resolved one cited blocker within 13 hours, and Phases O-X (2026-08-31 onward) did substantial further payment/test work? Should Bryan record a fresh, explicit Hub decision superseding them, or does the current blocker list still hold for a *different* reason (e.g. the 404-crash or HTTPS/TLS blockers, not independently checked this phase)? | Real conflict found and recorded (`REPOSITORY_KNOWLEDGE_MAP.md` §6), deliberately not resolved unilaterally — resolving it requires either a fresh audit of each individual blocker or a Bryan decision, neither done this phase. |
| OQ-CTX-007 | Three real decision domains surfaced by the Hub's own 9 `bloodmoon`-project decisions — `community`, `security`/`privacy`, `testing` — have no matching `context/domains/*.md` stub among the current 12. Should new domain stubs be added for them, or do they belong folded into an existing one? | A real gap found via the Hub decision-mapping exercise (Part 10), not decided this phase — adding a 13th/14th/15th domain stub wasn't authorized by this phase's brief, which named the 12 explicitly for hardening, not expansion. |

Real, pre-existing open questions from the wider project (payments,
progression, etc.) are **not** re-listed here — they live in the domain
docs `docs/README.md` names for each phase (e.g. OQ-002, OQ-018 through
OQ-032 mentioned inline in `docs/README.md`'s phase log). This file adds
only what's genuinely new to Phase 9's own work, per `GOVERNANCE.md`'s
"never duplicate" rule.
