---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
confidence: MIXED — official-source claims high confidence; some specific technical details (exact API endpoint shapes, precise MCP spec dates) came from a single research pass and are flagged for a human spot-check before any implementation depends on them
---

# Agent Skills ecosystem research (Phase 19)

Research-only, external web sources, checked 2026-09-18 via three
independent research passes (Claude API/Claude Code/MCP; n8n; third-party
skill discovery). Every claim below traces to a real fetched page — see
the Sources list at the end of each section (Phase 19 Part 26's required
shape: URL / publisher / date checked / official-or-community / claim /
local-preservation-needed).

**A note on confidence**: this document reports what the research passes
found, with their own citations — it is not independently re-verified
against primary sources by a second pass. The high-level architectural
conclusions (Skills = harness-level progressive disclosure distinct from
the raw Messages API; MCP and Skills are complementary, not competing;
n8n has no native Skills runtime feature) are corroborated across
multiple sources and are trustworthy. A few very specific technical
details (exact API endpoint paths, the precise "SEP-2640" designation and
its stated dates) came from a single pass citing official-looking domains
(`platform.claude.com`, `code.claude.com`, `modelcontextprotocol.io`) but
were not cross-checked by a second independent pass — **spot-check these
specific claims against the live docs before any implementation decision
depends on their exact wording**, per this project's own standing rule
against trusting a single unverified pass for anything load-bearing.

## Part 1-2 — Claude API and Claude Code Skills

**Claude API**: has a Skills abstraction (reported: `/v1/skills` create/
list/retrieve/delete endpoints, pre-built Skills for pptx/xlsx/docx/pdf
available by ID), but **progressive disclosure (metadata-first, then full
SKILL.md, then on-demand references/scripts) is a Claude Code/Agent SDK
harness-level behavior, not an API-level one.** A bare Messages API call
does not get automatic progressive disclosure — the caller manages
context manually. This distinction matters directly for
`N8N_CLAUDE_SKILL_ARCHITECTURE.md`'s design (a plain API call from n8n
would not get the token-efficiency this project wants without an
MCP-based skill server in front of it).

**Claude Code**: Skills (`~/.claude/skills/`, project-local
`.claude/skills/`, SKILL.md frontmatter with `name`/`description`/
`allowed-tools`) vs. Plugins (a packaging/distribution mechanism bundling
skills + subagents + hooks + MCP servers + LSP servers, installed from a
marketplace via `/plugin install <name>@marketplace`). Two official
marketplaces reported: `claude-plugins-official` (curated, auto-registered,
auto-update on) and `claude-plugins-community` (third-party, commit-SHA
pinned in the catalog, auto-update off by default) — this pinning
behavior for the community marketplace directly matches
`SKILL_REGISTRY.md`'s own version-pinning recommendation, independently
arrived at.

## Part 3-4 — MCP and Skills

MCP's core primitives are **Tools** (callable functions), **Resources**
(readable data/files), and **Prompts** (templates) — Skills are not a
fourth core primitive. An extension (reported as "SEP-2640," status
Final) defines a convention for serving Skills *over* MCP as Resources
under a `skill://` URI scheme, with `skills/list`/`skills/get` methods (a
`resources/directory/read` method is optional). Reference implementations
reported in Python/C#/Go SDKs; host-side support reported as prototype-
stage in Claude Code, Gemini CLI, fast-agent, and the GitHub MCP Server —
**not yet broadly production-adopted**, per the same report's own
assessment.

**MCP and Skills are composable, not competing**: a Skill's own
instructions can tell an agent to call an MCP tool; an MCP server can
publish its own accompanying Skill over MCP; a Claude Code Plugin can
bundle both an MCP server config and Skills that orchestrate it. This
directly supports `N8N_CLAUDE_SKILL_ARCHITECTURE.md`'s recommended design
(a Blood-Moon-controlled MCP server serving `bloodmoon-*` skills,
reachable identically by Claude Code, a future n8n workflow via its MCP
Client Tool node, and Codex).

### Sources (Part 1-4)

| URL | Publisher | Date checked | Official/community | Claim it supports | Local preservation needed? |
|---|---|---|---|---|---|
| platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md | Anthropic | 2026-09-18 | Official | Claude API native Skills support, pre-built skills, progressive disclosure is harness-level | NO — official docs, stable URL |
| code.claude.com/docs/en/skills.md | Anthropic | 2026-09-18 | Official | Claude Code Skills mechanism, discovery, SKILL.md structure | NO |
| code.claude.com/docs/en/plugins.md | Anthropic | 2026-09-18 | Official | Plugin structure, marketplace commands | NO |
| code.claude.com/docs/en/discover-plugins.md | Anthropic | 2026-09-18 | Official | Two official marketplaces, commit-SHA pinning for community marketplace | NO |
| code.claude.com/docs/en/agent-sdk.md | Anthropic | 2026-09-18 | Official | Skills/MCP/progressive disclosure in SDK context | NO |
| modelcontextprotocol.io/seps/2640-skills-extension.md | MCP Working Group | 2026-09-18 | Official (MCP project) | Skills-over-MCP extension, `skill://` URIs, `skills/list`/`skills/get` | **YES — recommend a one-time archive of this spec page** given it's an extension (not core spec) that could move/change; not yet done this phase |
| modelcontextprotocol.io | MCP Foundation | 2026-09-18 | Official | MCP core primitives (tools/resources/prompts), spec versioning | NO |

## Part 5 — Third-party skill discovery (documentation/knowledge/RAG)

Full candidate list with security/maintenance notes: `SKILL_CANDIDATES.md`
(this section summarizes only). Categories searched: technical docs,
RAG/knowledge-base, citation/provenance, knowledge graphs, runbook/SOP
generation, PDF/HTML extraction, web crawling, video/transcript ingestion,
documentation validation, repo navigation, MCP retrieval servers, agent
memory, context routing.

**Strongest, most credible finds** (official publisher or large,
actively-maintained, low-risk):
- `anthropics/skills` (Anthropic, official — the reference implementation
  and spec)
- `qdrant/mcp-server-qdrant` / `chroma-core/chroma-mcp` (official vendor
  MCP servers for vector-backed memory/RAG)
- `nvidia/skills` (official NVIDIA — RAG blueprint/eval, heavier
  infra-deployment footprint than pure-markdown skills)
- `hanfang/claude-memory-skill` (individual, 56★, deliberately minimal —
  markdown + bash only, no database/embeddings, easy to audit)
- `borghei/Claude-Skills` runbook-generator (787★, real scripts that
  scaffold docs, don't execute infra actions)
- `letsloose501/skill-lint` (only 1★, but notable: it specifically scans
  *other* skills for secrets/destructive-commands/prompt-injection risk —
  directly relevant to this project's own review pipeline
  (`SKILL_SECURITY_POLICY.md`), worth a closer look despite low adoption)

**Categories where the research found genuinely nothing credible** (not
padded): repository/codebase navigation (only an unverifiable aggregator
listing), and context-routing/task-classification skills (only an open,
unshipped GitHub issue) — for the latter, this project is effectively
building its own (`bloodmoon-knowledge-router`) rather than adapting
something that doesn't yet exist publicly in mature form.

**Pattern observed across all categories**: skills cluster into (a) pure-
markdown/prompt content with no execution risk (most memory/SOP skills),
and (b) skills with a real `scripts/` folder calling external
libraries/APIs (most web-crawling, PDF/OCR, cloud-RAG skills) — category
(b) is where `SKILL_SECURITY_POLICY.md`'s review checklist actually earns
its keep.

### Sources (Part 5)

Full 23-row source table (URL / publisher / official-community / date
checked / claim) lives in `SKILL_CANDIDATES.md`'s own evidence section —
not duplicated here to avoid two copies drifting apart. Two curated
directories worth noting as jumping-off points, not primary sources in
their own right: `ComposioHQ/awesome-claude-skills` (75.3k★) and
`VoltAgent/awesome-agent-skills` (34.6k★, 1000+ entries) — both
community-company-maintained, both checked 2026-09-18.

## Part 3 (n8n) — see `N8N_CLAUDE_SKILL_ARCHITECTURE.md`

The full n8n research (official `n8n-io/skills` repo, the open community
feature request for native Agent Skills support, DIY community
workarounds, n8n's real MCP node timeline) is reported in
`N8N_CLAUDE_SKILL_ARCHITECTURE.md` directly, since it's entirely
architecture-relevant rather than a separate candidate-evaluation
concern. Headline: **n8n has no native Agent Skills runtime feature and
none is confirmed planned** (an open 2026-01-06 community feature request
has no official reply). n8n's own official "skills" artifact
(`n8n-io/skills`, real, 468★) is the reverse of what the name suggests —
it teaches *external* coding agents (Claude Code/Codex) to drive n8n via
MCP, not a feature n8n's own AI Agent node consumes.

### Sources (n8n) — summary, full table in the architecture doc

| URL | Publisher | Date checked | Official/community |
|---|---|---|---|
| github.com/n8n-io/skills | n8n | 2026-09-18 | Official |
| community.n8n.io/t/enable-n8n-agents-to-use-agent-skills-skill-md-references/246140 | n8n Community Forum | 2026-09-18 | Community (unanswered feature request) |
| docs.n8n.io/connect/connect-to-n8n-mcp-server | n8n | 2026-09-18 | Official |
| docs.n8n.io/changelog/release-notes-1.x | n8n | 2026-09-18 | Official (MCP feature timeline) |

## What this means for Blood Moon (synthesis)

1. Skills work best, and cost least in tokens, inside a harness that does
   real progressive disclosure — today that's Claude Code; a bare API
   call or an n8n workflow does not get this for free.
2. MCP (specifically the Skills-over-MCP extension) is the credible path
   to make Blood Moon's own skills reachable from more than one agent/
   surface without rebuilding them per-surface — this directly informs
   `N8N_CLAUDE_SKILL_ARCHITECTURE.md`'s recommendation.
3. n8n is not a blocker and not a place to build skill logic — treat it
   purely as the orchestration/approval layer once adopted.
4. The third-party ecosystem has real, credible, low-risk building blocks
   (official vendor MCP servers for RAG/memory, a few well-maintained
   individual skills) worth reviewing further, but nothing found replaces
   the need for Blood-Moon-specific skills — no third-party skill knows
   this project's own Knowledge Hub, Context Pack, or vendor-sweep system
   (naturally — those are this project's own architecture).

## Starter skill set (Phase 19 Part 22)

Ranked by immediate value, risk, maintenance cost, portability, token
savings, and knowledge-quality improvement — 5 skills, all internal
(the research found no third-party skill that could substitute for any of
these, per the needs matrix in `SKILL_CANDIDATES.md`):

1. **`bloodmoon-knowledge-router`** — highest immediate value (this IS
   the default lookup behavior every other skill and every engineering
   agent benefits from); LOW risk (read-only); LOW maintenance (mostly
   routes to already-existing docs); fully portable (plain markdown);
   directly targets the token-cost problem Part 8 raises.
2. **`bloodmoon-context-bootstrap`** — high value (every session needs
   this); LOW risk; LOW maintenance; portable.
3. **`bloodmoon-khub-query`** — high value (the Hub is a real,
   growing system with its own real gaps, per `KHUB_SOURCE_NORMALIZATION.md`);
   LOW risk (read-only by design); portable in principle, though it
   depends on the `akh` CLI being present.
4. **`bloodmoon-source-authority`** — medium-high value (already a mature
   scale, just needs packaging); LOW risk; LOW maintenance; portable.
5. **`bloodmoon-runbook-builder`** — medium value (closes a real,
   repeatedly-hit gap — see `KNOWLEDGE_GAPS.md`'s recurring
   `KNOWLEDGE_MISSING` runbook entries); LOW risk (produces docs only);
   portable.

Deliberately **excluded from the starter set** despite being designed
this phase: `bloodmoon-knowledge-ingestion` (MEDIUM risk — handles
untrusted content, deserves its own focused build+review cycle, not a
day-one bundle), `bloodmoon-vendor-source-review` and
`bloodmoon-gameserver-knowledge` (narrower, lower-frequency use than the
5 above), `bloodmoon-security-guardrails` and `bloodmoon-task-handoff`
(genuinely useful, but depend on the other 5 being in daily use first to
prove the pattern before adding a write-capable skill (`task-handoff`) or
a cross-cutting checklist skill (`security-guardrails`) to the mix).

This is 5 skills, within the requested 3-8 range, all custom/internal —
no third-party skill is proposed for the starter set, consistent with the
needs-matrix finding that Blood Moon's actual bottleneck is
project-specific knowledge no external skill can contain.

## Implementation roadmap (Phase 19 Part 23)

| Phase | Scope |
|---|---|
| **A — research/review** | This phase (19). Complete. |
| **B — build custom knowledge skills** | Build the 5 starter-set skills as real `SKILL.md` + reference files under `~/.claude/skills/` (or project-local `.claude/skills/`), following `bloodmoon-deploy`'s existing house style. Each skill's SKILL.md points at existing `docs/knowledge/*` rather than restating it — matching this whole project's established "index, don't duplicate" convention. |
| **C — test in Claude Code locally** | Real invocations against real Blood Moon tasks (a knowledge lookup, a bootstrap, a Hub query, a runbook write) — verify the routing actually saves hops/tokens vs. today's manual process, not just that it runs without error. |
| **D — test Claude API integration** | Per `SKILL_ECOSYSTEM_RESEARCH.md`'s own finding (progressive disclosure is harness-level, not API-level) — this phase specifically needs to prove out how skill content reaches a bare API call efficiently (likely via the MCP-server design in `N8N_CLAUDE_SKILL_ARCHITECTURE.md`, built at this stage, not before). |
| **E — connect via n8n** | Only once n8n is actually adopted as a product decision (outside this phase's scope) — wire n8n's MCP Client Tool node to the same MCP server built in Phase D, per the architecture doc. Not scheduled against a date; gated on the n8n adoption decision. |
| **F — measure effectiveness** | Apply the metrics below against real usage, for at least the 5 starter-set skills, before deciding whether to build the remaining 5 designed-but-deferred skills. |

## Effectiveness metrics (Phase 19 Part 24)

| Metric | How measured |
|---|---|
| Knowledge lookup success rate | % of `bloodmoon-knowledge-router` invocations that reach `EVIDENCE_SUFFICIENT: YES` without falling through to a manual grep |
| Manual-search rate | % of tasks where an agent bypasses the router and greps `D:\MU\`/`docs/` directly — a proxy for the router's own coverage gaps |
| Wrong-source rate | Instances where a cited source turns out `PROVIDER_SPECIFIC_OTHER_SERVER`/superseded/contradicted after the fact — mirrors this project's own real Phase 18 finding (EuSanTiago/RealMU miscategorization risk) |
| Tokens used per task | Before/after comparison for a matched task type, run once pre-skill and once post-skill |
| Sources loaded per task | Count of distinct files/docs opened — should trend down as the router gets better at landing on the right one first |
| Time to first correct source | Wall-clock or hop-count from task start to the first citation that survives review |
| Runbook usage | How often a `PROCEDURE_INDEX.md` `RUNBOOK_READY` row is actually followed vs. an agent re-deriving steps from scratch |
| Knowledge-gap escalation rate | How often `bloodmoon-knowledge-router` step 9 (report unresolved gaps) fires vs. an agent guessing past a real gap — this is the project's central anti-fabrication metric, and should be reported as a healthy signal (gaps surfaced) rather than a failure metric (gaps existing) |
| Hallucination/source-conflict incidents | Any case where two agents (or the same agent across sessions) state contradictory facts without `bloodmoon-knowledge-router`'s conflict-check catching it |

None of these have a baseline yet — Phase F (above) is where real numbers
first get collected, against the 5 starter-set skills specifically.

## Final recommendation (Phase 19 Part 27)

- **SHOULD_BLOODMOON_USE_SKILLS = YES** — the needs matrix, the token/
  context research, and the project's own already-successful
  `bloodmoon-deploy` precedent all point the same direction.
- **SHOULD_CUSTOM_SKILLS_BE_PORTABLE = YES** — designed that way from the
  start (plain markdown, MCP-compatible shape) specifically so the
  n8n/Codex/multi-agent future doesn't require a rewrite.
- **SHOULD_N8N_OFFICIAL_SKILLS_BE_ADOPTED = LATER** — `n8n-io/skills` is a
  credible, official, adopt-as-is candidate, but only once n8n itself is
  actually adopted; nothing to do today.
- **SHOULD_THIRD_PARTY_SKILLS_BE_ALLOWED = YES_WITH_REVIEW** — real,
  credible candidates exist (`SKILL_CANDIDATES.md`), but every one goes
  through `SKILL_SECURITY_POLICY.md`'s checklist and Bryan's explicit
  `APPROVED` decision (`SKILL_REGISTRY.md`'s lifecycle) — no exceptions,
  no bulk-collection installs.
- **FIRST_CUSTOM_SKILL_TO_BUILD = `bloodmoon-knowledge-router`** — per
  Phase 19's own Part 10 designation and confirmed by the starter-set
  ranking above: it is the single skill every other skill and every
  future engineering task benefits from, has the lowest risk, and
  directly targets the token-efficiency problem this whole research phase
  was motivated by.
