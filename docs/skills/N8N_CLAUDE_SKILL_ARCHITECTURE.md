---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# n8n × Claude API × Skills — architecture (Phase 19 Part 14)

Blood Moon does not have n8n installed yet. This is a forward-looking
architecture decision informed by real research (`SKILL_ECOSYSTEM_RESEARCH.md`
§3, checked 2026-09-18) — not implementation.

## The headline finding

**n8n has no native, in-workflow Anthropic Agent Skills support, and none
is confirmed planned.** The only official n8n artifact literally called
"skills" (`github.com/n8n-io/skills`) is the opposite of what it sounds
like: it's a set of SKILL.md-format packages meant to be installed into
**Claude Code/Codex** to help *those* agents build n8n workflows correctly
via n8n's MCP server — not a feature n8n's own AI Agent node consumes at
runtime. An open community feature request (2026-01-06) asking for native
support has no official reply and no public roadmap commitment. Several
community members have built DIY progressive-disclosure workarounds
(GitHub-index fetch, Postgres-backed manifests, a custom skills-MCP
server) — none official, none standardized, each with its own
versioning/caching/security design.

## Where skill execution actually happens — three real options, assessed

```
n8n workflow
  |
  +-- (A) n8n AI Agent node, Tools = MCP Client Tool -> external MCP server
  |         skill logic lives OUTSIDE n8n, on the MCP server side
  |
  +-- (B) n8n AI Agent node, Tools = plain HTTP Request node -> Claude API
  |         skill logic lives OUTSIDE n8n, manually assembled into the
  |         API call's system prompt/context by the calling code
  |
  +-- (C) n8n workflow logic itself re-implements skill loading
            (DIY: GitHub fetch, Postgres manifest, etc.)
            skill logic lives INSIDE n8n, hand-built, non-standard
```

**Recommendation: (A), with (B) as a fallback for anything MCP doesn't
yet cover.** Reasoning, evidence-backed:

- Per the research, Claude API Skills (the `/v1/skills` endpoints) do
  **not** provide harness-level progressive disclosure the way Claude
  Code does — that mechanism is specific to the Claude Code/Agent SDK
  harness reading a real filesystem. A bare API call (option B) has to
  manage context manually; it works, but it's the least efficient of the
  three for token/context cost, and it's exactly the "everything in the
  system prompt" pattern Part 8 of this phase explicitly wants to avoid.
- MCP's own **Skills extension (SEP-2640, per the research: status Final)**
  defines exactly the shape this architecture needs: a Skill served as an
  MCP `skill://` resource, discoverable via `skills/list`/`skills/get`.
  That means a **skill-aware MCP server Blood Moon controls** — not n8n
  itself, not a bare API call — is the natural home for
  `bloodmoon-knowledge-router` and the other 9 custom skills
  (`BLOODMOON_CUSTOM_SKILLS.md`), reachable identically by Claude Code
  (already true today), by a future n8n workflow (via the MCP Client Tool
  node, per the research — OAuth/Bearer/header auth all supported), and
  by Codex or any other MCP-aware client.
- Option C (reimplementing skill-loading inside n8n) duplicates work this
  project would otherwise get for free from the Claude Code harness and
  from SEP-2640, with none of the review/versioning discipline
  `SKILL_SECURITY_POLICY.md` already establishes for skills as files.

## The recommended architecture

```
n8n (trigger / integration / human-approval layer)
  --MCP Client Tool node-->
Blood Moon's own MCP server (to be built, when n8n work starts)
  - serves bloodmoon-* skills as skill:// resources (SEP-2640-shaped)
  - exposes read-only Knowledge Hub queries, docs/knowledge lookups,
    RemoteOps-allowlisted VPS reads as MCP tools/resources
  --calls-->
Claude API (the actual reasoning step)
```

n8n's real, current strengths (per the research: triggers, first-party
integrations, Data Tables, human-in-the-loop approval gates, MCP Server
Trigger to expose n8n's own workflows as tools to Claude Code) are used
for exactly that — orchestration and approval gating — never for holding
Blood Moon's skill logic itself. This also means `AGENTS.md`'s
`21. Approval is required for any consequential action` invariant has a
natural home in n8n's own human-in-the-loop nodes once that layer exists,
rather than needing to be re-implemented as agent-side discipline alone.

## What happens inside which layer

| Concern | Layer |
|---|---|
| Skill content (SKILL.md + references) | Blood Moon's own MCP server, git-tracked, reviewed per `SKILL_SECURITY_POLICY.md` |
| Skill discovery/progressive disclosure | Claude Code harness (today) or the MCP server's `skills/list`/`skills/get` (once built) — never n8n |
| Workflow triggers, scheduling, integrations | n8n |
| Human approval gates | n8n (human-in-the-loop nodes) — the natural home for `AGENTS.md` invariant 21 once n8n exists |
| Actual LLM reasoning | Claude API, called either directly or via the MCP server |
| Structured project state (tasks/decisions/handoffs) | Knowledge Hub, queried via `bloodmoon-khub-query` regardless of which layer initiated the call |

## What this means for the 10 custom skills

Every skill in `BLOODMOON_CUSTOM_SKILLS.md` is written in plain markdown
with no Claude-Code-only syntax beyond its SKILL.md frontmatter — this was
a deliberate design choice (Part 15, portability) made *because* of this
architecture: the same SKILL.md content should be servable, unmodified,
from a future skill-aware MCP server, from `~/.claude/skills/` today, or
read directly as a doc by Codex. No skill assumes n8n exists yet; when it
does, none of them need to be rewritten — only a new transport (the MCP
server) needs to be built around them.

## What NOT to do (explicitly, given the research)

- Do not wait for n8n to ship native Agent Skills before starting this
  work — there is no roadmap commitment to wait for.
- Do not build Blood Moon's skill logic as an n8n-internal DIY pattern
  (option C) — it would duplicate what SEP-2640 and the Claude Code
  harness already solve, with weaker security review discipline than
  `SKILL_SECURITY_POLICY.md` already establishes for file-based skills.
- Do not treat n8n's MCP Client Tool node's broad instance-level
  permissions (per the research: "all enabled workflows visible to all
  connected clients a user authorizes") as safe-by-default — scope
  credentials narrowly when this is actually built, per `AGENTS.md`
  invariant 11 (least privilege), which applies here exactly as it does
  to any other credential.

## Open items (deferred, not decided here)

- The actual Blood Moon MCP server is not built this phase — this is
  architecture, not implementation, per Part 0's instruction.
- Whether n8n is even adopted at all remains Bryan's own product decision
  outside this phase's scope — this document assumes it might be, and
  designs so that decision doesn't block or get blocked by skill work.
