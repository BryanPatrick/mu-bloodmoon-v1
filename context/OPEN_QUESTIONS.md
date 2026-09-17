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
| OQ-CTX-001 | Which of `docs/README.md`'s referenced-but-absent files (`docs/open-questions.md`, `docs/open-risks.md`, `docs/decisions/README.md`, most of `docs/knowledge/*`, ADRs 0001-0018/0020/0022/0027) are real work sitting on another worktree, vs. work that was described but never actually written anywhere? Needs a real cross-worktree audit (`git ls-tree` against each candidate worktree's HEAD), not a guess. | Discovered this session via `git ls-tree`; not investigated further — out of Phase 9's scope, which is additive Context Pack work, not a worktree reconciliation project. |
| OQ-CTX-002 | Should the `DEC-<DOMAIN>-NNN` human-readable ID scheme actually be minted for the Knowledge Hub's 26 production decisions, and if so, who reviews the mapping before it's treated as canonical? | Deliberately deferred this session — doing it well requires reading each decision's real content, which was out of scope (staging-only pilot). See `DECISIONS.md`. |
| OQ-CTX-003 | Is there a real, current RMT/account-sale policy on `main` (referenced as ADR-0016 in `docs/README.md`'s narrative, but that ADR file doesn't exist on this branch)? | Same worktree-sprawl gap as OQ-CTX-001, specific instance. |
| OQ-CTX-004 | Should `context/` eventually be merged/reconciled with whatever governance content exists on `governance/engineering-pack` or `mu-bloodmoon-v1-openbeta` (which, per `AGENTS.md`'s own provenance note, is where `AGENTS.md` and `docs/protocols/agent-bootstrap.md` were originally authored)? | This pack was built directly on `main`, per this phase's own task; a cross-branch reconciliation is a separate, larger decision for Bryan. |

Real, pre-existing open questions from the wider project (payments,
progression, etc.) are **not** re-listed here — they live in the domain
docs `docs/README.md` names for each phase (e.g. OQ-002, OQ-018 through
OQ-032 mentioned inline in `docs/README.md`'s phase log). This file adds
only what's genuinely new to Phase 9's own work, per `GOVERNANCE.md`'s
"never duplicate" rule.
