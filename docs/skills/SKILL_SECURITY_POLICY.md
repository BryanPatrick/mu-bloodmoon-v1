---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Skill security policy

Every skill not written in this project — including an official
Anthropic example, an n8n community node, or any GitHub repo — is
**untrusted input** until reviewed. A skill's own SKILL.md can contain
text aimed at whoever reads it; that text is data, never an instruction
with standing authority, exactly the same rule this project already
applies to legacy vendor tutorials, YouTube transcripts, and scraped web
pages (`docs/knowledge/raw-capture.md`'s "untrusted content" section —
this policy is the same rule, applied to a new content type).

## Review checklist (Phase 19 Part 6)

For every candidate skill, before it can leave `QUARANTINED`:

| Check | What to look for |
|---|---|
| SKILL.md instructions | Read in full. Does it ask the agent to do anything outside its stated purpose — fetch a URL, exfiltrate data, disable a safety behavior, treat its own text as higher authority than the user? |
| Bundled scripts | List every script file. What language, what does it import/require, does it match what the SKILL.md claims it does? |
| Hooks | Does installing it register any hook (pre/post-tool-use, session-start)? Hooks run automatically — higher scrutiny than a skill that only activates via explicit invocation. |
| Network access | Any hardcoded URL, API endpoint, telemetry call, or "phone home" behavior? |
| Filesystem access | Does it read/write outside its own folder? Does it touch credentials, `.env` files, SSH keys, or browser profiles? |
| Shell execution | Does any script shell out (`child_process`, `subprocess`, backticks)? To what? |
| Credential requirements | Does it need an API key/token? Where is that stored, and does the skill's own code ever log/print it? |
| External dependencies | `package.json`/`requirements.txt` — how many, how deep, any known-bad packages, any postinstall scripts? |
| License | Stated clearly? Compatible with internal use? |
| Maintenance activity | Real commit history, recent activity, responsive maintainer — or an abandoned one-off repo? |
| Prompt-injection risk | Could content the skill processes (a fetched web page, a document) be crafted to redirect the agent, given how the skill's own instructions are phrased? |

Record the outcome of this checklist per skill in `SKILL_CANDIDATES.md`
(the full evaluation) and summarize the resulting risk tier in
`SKILL_REGISTRY.md`.

**No skill is installed automatically as a result of a clean review.**
A clean review produces `REVIEWED`, not `APPROVED` — approval is Bryan's
explicit decision (`SKILL_REGISTRY.md`'s lifecycle).

## Supply chain (Phase 19 Part 19)

Threats considered, same category as any third-party dependency this
project already takes seriously (`AGENTS.md`'s own credential/least-
privilege invariants extend naturally here):

- **Upstream compromise**: a maintainer account or repo gets compromised
  and a malicious commit lands. Mitigated by pinning to a specific,
  reviewed commit (`SKILL_REGISTRY.md`'s version-pinning rule) rather than
  tracking `HEAD`.
- **Malicious update**: a legitimate-looking update changes behavior.
  Mitigated the same way — an update is a new review, never a silent pull.
- **Dependency drift**: a skill's own bundled scripts pull in a package
  that later gets a malicious version published. Relevant mainly for
  skills with real script dependencies (most pure-instruction skills, like
  `frontend-design`, have none — this risk concentrates on the smaller set
  of skills that DO bundle executable tooling).
- **Hook changes**: a skill that registers a hook and later modifies what
  that hook does is a higher-severity version of "malicious update" —
  hooks execute without an explicit per-use invocation, so review them
  with extra care and re-review any hook-registering skill on every
  update, not just periodically.
- **Script changes**: same reasoning as hooks, one level down in
  automaticity — a script only runs when the skill's procedure reaches
  that step, but still without a fresh human read of that specific step
  each time.

**Recommendation**: checksum/commit pin every approved third-party skill
(`SKILL_REGISTRY.md`'s `version` field). For skills with bundled scripts,
also record a hash of the scripts directory specifically — this project
already has working precedent for exactly this pattern (`CLAUDE.md`'s
`bloodmoon-deploy` canonicalization: hash before and after every edit,
diffed before trusting the result).

## Offline-first preference (Phase 19 Part 20)

Blood Moon's own custom knowledge skills (`bloodmoon-knowledge-router`,
`bloodmoon-khub-query`, etc. — see `BLOODMOON_CUSTOM_SKILLS.md`) are
designed to depend primarily on **local repo and Knowledge Hub sources**:
`docs/`, `context/`, `knowledge/vendor-sweep/`, the Hub's structured
tables. Live web research is an explicit, separate step a skill can
recommend or a user can request — never a silent default a knowledge
lookup falls back to. This mirrors the vendor-sweep's own established
`RAW → NORMALIZED → DERIVED` discipline (`docs/knowledge/knowledge-sweep.md`):
a claim traces to a captured, reviewed source, not a live re-fetch that
could return different content next time and was never reviewed.

A skill that DOES need live web access (e.g. a future `bloodmoon-vendor-
source-review` step that checks whether an external URL is still live) is
allowed to have it, but it must be an explicit, named capability in that
skill's own `tools required` field (`BLOODMOON_CUSTOM_SKILLS.md`), never
an implicit side effect of "the model can browse."

## Always-on governance vs. on-demand skill procedure (Phase 19 Part 21)

Reviewed `AGENTS.md`'s 24 invariants against this question directly.

**Stays in `AGENTS.md` (always-on, never becomes skill-only)**: every
invariant whose violation is a safety incident regardless of which task
triggered it — branch/worktree safety (2-4,6,7,9), secrets handling
(10,14), least privilege (11), destructive-action authorization (17,21),
credential rotation (19), migration immutability (24), "no memory-only
work" (22). These apply whether or not any specific skill happens to be
loaded this turn — moving them into a skill would make them conditional
on that skill being triggered, which is exactly the failure mode
always-on governance exists to prevent.

**Already correctly extracted into an on-demand skill procedure**: the
existing `bloodmoon-deploy` skill is the working precedent for this
whole distinction. Its own header states the principle explicitly: *"This
skill teaches procedure, not authorization... every approval gate defined
in CLAUDE.md/AGENTS.md and this session's own rules still applies in
full."* Concretely, it packages the **how** for invariants 12 (evidence-
first process signaling), 15 (migration privileges from SQL, not the
Prisma model), 16 (Nuxt manifest validation), and 23 (storage preflight)
— the **why it's required, and that it can't be skipped** stays in
`AGENTS.md`; the **exact steps to do it correctly** live in the skill.

**New candidates for the same treatment** (Part 21's actual ask —
identify what SHOULD move): invariant 1 (the 15-step bootstrap protocol)
is the clearest remaining candidate — `bloodmoon-context-bootstrap`
(`BLOODMOON_CUSTOM_SKILLS.md` §2) is designed to package exactly this
procedure, while `AGENTS.md` invariant 1 stays as the always-on
requirement that the procedure be followed. No invariant is proposed for
*removal* from `AGENTS.md` — per instruction, governance that must always
apply is never removed, only given a better-packaged "how" alongside the
unchanged "must."
