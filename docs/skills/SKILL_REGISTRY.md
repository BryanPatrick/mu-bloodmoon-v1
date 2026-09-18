---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Skill registry

Every Agent Skill Blood Moon actually has (installed) or is actively
considering (candidate). Points at `docs/skills/SKILL_CANDIDATES.md` for
the fuller third-party evaluation — this file is the authoritative,
current-state list with the exact fields Phase 19 asked for.

## Fields

`skill_id` (unique, kebab-case) · `name` · `origin` (author/repo/internal) ·
`version` (or commit/hash pinned) · `license` · `status` (see Lifecycle
below) · `approved_for` (which agents: Claude Code / Claude API / Codex /
n8n / all) · `risk` (LOW/MEDIUM/HIGH, from the security review) ·
`capabilities` (short) · `tools` (what it needs: Bash, Write, network,
none) · `last_reviewed` · `upstream` (source URL if third-party) ·
`local_modifications` (what, if anything, was changed from upstream).

## Currently installed (real, pre-existing, both internal)

| skill_id | name | origin | version | license | status | approved_for | risk | capabilities | tools | last_reviewed | upstream | local_modifications |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `bloodmoon-deploy` | Blood Moon production deploy | Internal, Blood Moon-authored | unversioned (git-tracked at `~/.claude/skills/`) | N/A (internal, not distributed) | `INSTALLED`/`PINNED` (canonical, single source) | Claude Code (this session type only — cPanel deploy procedure assumes this environment) | LOW (procedural only, no scripts execute automatically; every step still requires the standing approval gates) | cPanel/File Manager deploy procedure, Prisma migration mechanics, LSAPI reload evidence-first procedure, Nuxt asset-integrity validation, credential-rotation consumer-mapping, secret-bearing-page handling | None bundled — references existing repo docs/scripts, no executable scripts of its own | 2026-09-08 (canonicalization + governance-pack audit) | N/A — authored in-project, canonicalized 2026-09-08 from `mu-bloodmoon-ops-hardening`'s original copy | N/A — single canonical copy, no fork/divergence to track |
| `frontend-design` | Frontend Design | Anthropic official (`github.com/anthropics/skills`) | byte-verified against official repo as of 2026-09-08 | Anthropic's stated license for the official skills repo (not independently re-verified this phase — see `SKILL_SECURITY_POLICY.md`'s note on this) | `INSTALLED`/`PINNED` | Claude Code | LOW (pure instructional content — design principles/process, no scripts, no network calls, no credential requirements, confirmed by prior byte-verification) | Design-lead process for building distinctive, non-templated frontend UI (palette/type/layout planning, anti-generic-AI-design checklist) | None bundled | 2026-09-08 | `github.com/anthropics/skills` | None — verified byte-identical to upstream at install time |

## Candidates (research-stage, NOT installed — Phase 19)

See `SKILL_CANDIDATES.md` for the full evaluation matrix and
`BLOODMOON_CUSTOM_SKILLS.md` for the 10 proposed Blood Moon-authored
skills. Summary status only, here:

| skill_id | name | origin | status | risk (preliminary) | notes |
|---|---|---|---|---|---|
| `bloodmoon-knowledge-router` | Knowledge router | Internal (to be built) | `DISCOVERED` (designed, not built) | LOW (internal, no external calls by design — see Part 20 rule) | See `BLOODMOON_CUSTOM_SKILLS.md` §1; Phase 19's designated first build |
| `bloodmoon-context-bootstrap` | Context bootstrap | Internal (to be built) | `DISCOVERED` | LOW | `BLOODMOON_CUSTOM_SKILLS.md` §2 |
| `bloodmoon-source-authority` | Source authority checker | Internal (to be built) | `DISCOVERED` | LOW | `BLOODMOON_CUSTOM_SKILLS.md` §3 |
| `bloodmoon-runbook-builder` | Runbook builder | Internal (to be built) | `DISCOVERED` | LOW | `BLOODMOON_CUSTOM_SKILLS.md` §4 |
| `bloodmoon-khub-query` | Knowledge Hub query | Internal (to be built) | `DISCOVERED` | LOW (read-only by design this phase) | `BLOODMOON_CUSTOM_SKILLS.md` §5 |
| `bloodmoon-knowledge-ingestion` | Knowledge ingestion pipeline | Internal (to be built) | `DISCOVERED` | MEDIUM (handles untrusted external content by design) | `BLOODMOON_CUSTOM_SKILLS.md` §6 |
| `bloodmoon-vendor-source-review` | Vendor source review | Internal (to be built) | `DISCOVERED` | LOW-MEDIUM | `BLOODMOON_CUSTOM_SKILLS.md` §7 |
| `bloodmoon-gameserver-knowledge` | GameServer knowledge | Internal (to be built) | `DISCOVERED` | LOW | `BLOODMOON_CUSTOM_SKILLS.md` §8 |
| `bloodmoon-security-guardrails` | Security guardrails | Internal (to be built) | `DISCOVERED` | LOW (a checklist skill, not an executor) | `BLOODMOON_CUSTOM_SKILLS.md` §9 |
| `bloodmoon-task-handoff` | Task handoff | Internal (to be built) | `DISCOVERED` | LOW | `BLOODMOON_CUSTOM_SKILLS.md` §10 |

Any third-party candidate found during Phase 19's ecosystem research
(`SKILL_ECOSYSTEM_RESEARCH.md`, `SKILL_CANDIDATES.md`) starts at
`DISCOVERED` at best — **none are promoted past `REVIEWED` this phase**,
per the explicit "do not install" instruction. `SKILL_CANDIDATES.md`
holds the full evaluation table (9 high-value candidates, 4
rejected/high-risk categories, 23-row sourced evidence table) — not
duplicated here.

## Lifecycle states (Phase 19 Part 17)

```
DISCOVERED -> QUARANTINED -> REVIEWED -> APPROVED -> INSTALLED -> PINNED
                                  |
                                  +-> REJECTED (dead end, documented why)
INSTALLED/PINNED -> DEPRECATED (superseded or no longer needed)
```

- `DISCOVERED`: found during research, not yet inspected in detail.
- `QUARANTINED`: the skill's files have been fetched/read for review but
  are not referenced by any live agent config — pure inspection state.
- `REVIEWED`: the full security review (`SKILL_SECURITY_POLICY.md`'s
  checklist) has been completed and recorded.
- `APPROVED`: Bryan has explicitly signed off for install — a decision,
  not an automatic outcome of a clean review.
- `INSTALLED`: physically present in `~/.claude/skills/` (or the
  project-local equivalent) and loadable.
- `PINNED`: installed at a specific version/commit, with an explicit
  update-review procedure rather than tracking upstream `HEAD`.
- `DEPRECATED`: was installed, no longer recommended — kept documented,
  not silently deleted.
- `REJECTED`: reviewed and explicitly declined — the reason is recorded
  here or in `SKILL_CANDIDATES.md`, never silently dropped.

**No skill moves from `DISCOVERED` to `INSTALLED` automatically at any
point in this pipeline** — every transition past `REVIEWED` requires an
explicit human decision.

## Version pinning (Phase 19 Part 18)

For any third-party skill that reaches `APPROVED`: pin to the exact commit
hash (or release tag if the upstream project tags releases) it was
reviewed at, never `HEAD`/`latest`/`main`. Store the pinned commit here in
the `version` column. Re-review before ever moving the pin forward — an
update is a new review, not a silent `git pull`. This mirrors the same
discipline already used for `bloodmoon-deploy`'s own canonicalization (hash
comparison before and after every edit — see `CLAUDE.md`'s "canonicalization
— COMPLETE" section) and for the vendor-sweep's own RAW-preservation
discipline (`docs/knowledge/raw-capture.md`) — this project already has two
independent precedents for "never trust silently-changing upstream
content," and skills get the same treatment.
