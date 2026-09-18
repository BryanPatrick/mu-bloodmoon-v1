---
status: ACTIVE
category: skills
audience: internal (product + engineering)
lastVerified: 2026-09-18
---

# Skill candidates — needs matrix + third-party evaluation

**Cross-branch note**: several `docs/knowledge/*.md` files referenced
below (`KNOWLEDGE_MASTER_INDEX.md`, `CASH_VIP_INTEGRATION_MAP.md`,
`CONFLICTS.md`, `validate.mjs`) exist only on `knowledge/legacy-vps-
inventory` (unmerged), not on this branch — see
`BLOODMOON_CUSTOM_SKILLS.md`'s fuller note on this.

## Blood Moon needs matrix (Phase 19 Part 7)

| # | Need | EXISTING_SKILL_AVAILABLE | ADAPT_EXISTING | BUILD_CUSTOM | NO_SKILL_NEEDED |
|---|---|---|---|---|---|
| A | Context bootstrap | — | — | **YES** — `bloodmoon-context-bootstrap` (packages this project's own 15-step protocol; no third-party skill knows it) | |
| B | Knowledge routing | — | — | **YES** — `bloodmoon-knowledge-router` (this project's own topic/index model; the research found no credible published "context routing" skill at all — see `SKILL_ECOSYSTEM_RESEARCH.md`) | |
| C | Source authority | — | — | **YES** — `bloodmoon-source-authority` (already has a mature, project-specific 10-level scale; adapting a generic citation skill would lose the `PROVIDER_SPECIFIC_OTHER_SERVER` distinction that already caught a real miscategorization risk in this project's history) | |
| D | Source/version validation | — | `letsloose501/skill-lint`'s structural-check approach is a reasonable pattern to borrow (not install) for `docs/knowledge/validate.mjs`'s own future evolution | **YES** — `docs/knowledge/validate.mjs` already exists, built this project's own way | |
| E | Knowledge Hub query | — | — | **YES** — `bloodmoon-khub-query` (Hub is this project's own schema/CLI; no third-party skill can know it) | |
| F | Knowledge ingestion | — | `hanfang/claude-memory-skill`'s minimal markdown-only pattern and `borghei/Claude-Skills` runbook-generator's scaffold-scripts pattern are both worth reading as reference before building | **YES** — `bloodmoon-knowledge-ingestion` (the pipeline must plug into this project's own RAW/NORMALIZED/DERIVED convention) | |
| G | PDF/manual ingestion | `claude-office-skills/skills` (pdfplumber/docling/PaddleOCR wrapper, 473★) is a credible option **if/when** a real PDF ever appears | — | — | **Currently YES — no PDF exists anywhere in this project's corpus** (confirmed, Phase 18 audit: 0 PDFs under `D:\MU\`) — building or adopting a PDF skill now would be solving a problem that doesn't exist yet |
| H | Website ingestion | `BexTuychiev/firecrawl-claude-code-skill` (needs a paid Firecrawl key) or `brettdavies/crawl4ai-skill` (self-hosted, real scripts hitting live sites) are candidates **if** high-volume web ingestion becomes necessary | — | For the low-volume case this project actually has (a handful of vendor/community URLs, `EXTERNAL_SOURCES.md`), the existing `WebFetch`/browser-pane tools already suffice | **YES for current volume** — this project has ~11 external domains total, not a crawling-scale problem |
| I | Video/transcript ingestion | `michalparkola/tapestry-skills-for-claude-code`'s `youtube-transcript` skill (yt-dlp-based, 544★ parent repo) closely matches what this project already does manually | Could adopt its yt-dlp/VTT-to-text pattern rather than reinvent it | The project-specific parts (topic classification against `TOPIC_COVERAGE.md`, authority classification) still need `bloodmoon-knowledge-ingestion` on top | |
| J | Runbook construction | `borghei/Claude-Skills` runbook-generator (787★) is the most credible third-party match found | Its "never guess, scaffold from a real codebase scan" philosophy matches this project's own rule already | **YES** — `bloodmoon-runbook-builder` still needs to be custom because the source-sufficiency bar (`docs/knowledge/CASH_VIP_INTEGRATION_MAP.md`'s "2 independent videos before writing a runbook" precedent) is project-specific | |
| K | Conflict/supersession detection | — | — | **Already exists**: `docs/knowledge/conflict-resolution.md` + `docs/knowledge/CONFLICTS.md` + `context/SUPERSEDED_DECISIONS.md` — `bloodmoon-knowledge-router` step 7 invokes this, doesn't rebuild it | |
| L | Documentation validation | — | — | **Already exists**: `docs/knowledge/validate.mjs`, `context/validate.mjs` | |
| M | n8n workflow building | `n8n-io/skills` (official, 468★) — but note: this is for the coding agent driving n8n's MCP, not for n8n itself | Adopt directly, unmodified, once n8n work begins (`N8N_CLAUDE_SKILL_ARCHITECTURE.md`) — no reason to rebuild it | | **NO_SKILL_NEEDED right now** — n8n isn't installed yet, per Phase 19's own context |
| N | Agent task/report lifecycle | — | — | **Already exists**: Knowledge Hub's own task/decision/handoff model (`hub/docs/`) — `bloodmoon-task-handoff` packages it, doesn't replace it | |
| O | Secret/untrusted-content safety | `letsloose501/skill-lint`'s secret/prompt-injection scanning is a genuinely relevant pattern to study (low adoption, 1★, but directly on-topic) | Worth a closer read before `bloodmoon-security-guardrails`/`SKILL_SECURITY_POLICY.md` are ever automated further | **Already exists**: `AGENTS.md` invariants 10/14, `docs/knowledge/raw-capture.md`'s secrets rule, `SKILL_SECURITY_POLICY.md` (this phase) | |

**Reading this matrix**: almost every real Blood Moon need resolves to
`BUILD_CUSTOM`, not because the third-party ecosystem is weak (it isn't —
several credible, well-maintained options exist, see below) but because
Blood Moon's actual bottleneck is *project-specific knowledge* (its own
Knowledge Hub schema, its own topic taxonomy, its own source-authority
scale, its own evidence-sufficiency bar) that no external skill can
contain by definition. The third-party ecosystem's real value here is as
**pattern reference and, for a few items (n8n's own skills, PDF/web-
ingestion if volume ever grows), direct future adoption** — not as a
substitute for the 10 custom skills.

## High-value third-party candidates (evaluated, not installed)

| Candidate | Category | Publisher | Stars | License | Maturity | Security read | Recommendation |
|---|---|---|---|---|---|---|---|
| `anthropics/skills` | Reference/spec | Anthropic (official) | large, active | Apache-2.0 (mixed; doc-creation skills source-available) | High — the reference implementation | LOW — mostly instructions + local-file-only Python helpers | `DISCOVERED` → worth a full `QUARANTINED` read as the house-style template, no adoption decision needed (it's the spec, not a tool to install into this project) |
| `qdrant/mcp-server-qdrant` | RAG/memory MCP server | Qdrant (official) | 1.5k★ | Apache-2.0 | High, official vendor | MEDIUM — needs network access to a Qdrant instance + API key | `DISCOVERED` — relevant only if/when this project adopts vector search (Part 39-equivalent decision from Phase 18B: not yet justified by corpus size) |
| `chroma-core/chroma-mcp` | RAG/memory MCP server | Chroma (official) | 595★ | Apache-2.0 | High, official vendor | MEDIUM — same profile as Qdrant | Same as above |
| `hanfang/claude-memory-skill` | Agent memory | Individual | 56★ | MIT | Low-medium (small, active) | LOW — markdown + bash only, no DB/embeddings, easy to audit | `DISCOVERED` — good reference pattern for a future lightweight memory need, if one arises beyond what the Knowledge Hub already covers |
| `borghei/Claude-Skills` (runbook-generator) | Runbook/SOP | Individual | 787★ | MIT + Commons Clause | Medium-high | LOW-MEDIUM — real scripts that scaffold docs, don't execute infra | `DISCOVERED` — read as a pattern reference for `bloodmoon-runbook-builder`'s own design, not adopted directly (Blood Moon's evidence-sufficiency bar is stricter) |
| `letsloose501/skill-lint` | Skill security scanning | Individual | 1★ | MIT | Low adoption, but on-topic | LOW for the structural checks (stdlib Python); the optional paid eval layer needs credentials — don't use that part | `DISCOVERED` — worth a closer, dedicated review given how directly it overlaps `SKILL_SECURITY_POLICY.md`'s own checklist; low star count means verify independently, don't trust popularity as a proxy for safety here |
| `n8n-io/skills` | n8n/MCP workflow-building | n8n (official) | 468★ | (not independently re-verified this pass — check before adoption) | High, official, active (updated 2026-09-10) | LOW — markdown instructions for driving n8n via its own MCP server | `DISCOVERED` — clear future adopt-as-is candidate once n8n work actually starts; not relevant today |
| `michalparkola/tapestry-skills-for-claude-code` (youtube-transcript) | Video ingestion | Individual | 544★ (parent repo) | not independently re-verified this pass | Medium | LOW-MEDIUM — wraps `yt-dlp`, a real, well-known tool; shells out | `DISCOVERED` — relevant pattern for streamlining what this project's `youtube-ingestion.md` procedure already does manually |
| `claude-office-skills/skills` (PDF/data-extractor) | PDF/HTML extraction | Community org | 473★ | MIT | Medium-high, active | MEDIUM — real Python execution against pdfplumber/docling/PaddleOCR, some sub-skills touch n8n/Puppeteer | `DISCOVERED` only — **not currently needed** (Part G in the matrix: zero PDFs exist in this project's corpus today) |

## Rejected or high-risk (not recommended, with reasoning)

| Candidate | Why rejected/high-risk |
|---|---|
| `nvidia/skills` (rag-blueprint/perf) | Deploys real infrastructure (Docker Compose/Helm/Kubernetes) — appropriate for a team already running that infra, disproportionate footprint for Blood Moon's current corpus size (64 Hub items, 41 vendor-sweep sources — see `docs/knowledge/KNOWLEDGE_MASTER_INDEX.md`'s own "not yet justified" RAG assessment) |
| `BexTuychiev/firecrawl-claude-code-skill` | Requires a paid third-party API key and sends project content to an external commercial service by design — a real external-data-exposure question this project hasn't needed to answer yet given its current low web-ingestion volume |
| `brettdavies/crawl4ai-skill` | Real scripts that make live browser/HTTP requests to arbitrary target sites — appropriate power for a dedicated crawling need, disproportionate/unreviewed risk for occasional single-page fetches this project actually does |
| Any repo/skill found only via a third-party aggregator listing with no independently-verifiable primary source (e.g. the "Codebase Indexer" and several video-ingestion leads flagged in `SKILL_ECOSYSTEM_RESEARCH.md`'s source research) | Cannot be security-reviewed per `SKILL_SECURITY_POLICY.md`'s checklist without first finding and confirming the real repo — rejected for insufficient traceability, not necessarily for being bad |
| Any "mega-collection" (67/380/1000+ skills in one repo, e.g. `Jeffallan/claude-skills`) as a bulk install | Reviewing one skill at a time (`SKILL_REGISTRY.md`'s lifecycle) doesn't scale to a bulk import — if a specific skill inside one of these collections is wanted later, extract and review that one skill individually, never adopt the whole collection at once |

## Full source evidence table (Phase 19 Part 26 shape)

| URL | Publisher | Date checked | Official/community | Claim | Local preservation needed? |
|---|---|---|---|---|---|
| github.com/anthropics/skills | Anthropic | 2026-09-18 | Official | Reference Skills repo, spec, skill-creator | Recommended for future archival if used as a template — not done this phase |
| github.com/ComposioHQ/awesome-claude-skills | ComposioHQ | 2026-09-18 | Community (company) | Curated skills directory, 75.3k★ | NO — index only, not primary content |
| github.com/VoltAgent/awesome-agent-skills | VoltAgent | 2026-09-18 | Community (company) | Curated skills directory, 34.6k★, 1000+ entries | NO |
| agentskills.io | Community stewardship of Anthropic-originated spec | 2026-09-18 | Official-standard | Agent Skills open spec + client showcase (Cursor, Gemini CLI, Copilot, VS Code, Codex) | NO |
| github.com/floflo777/claude-rag-skills | Individual | 2026-09-18 | Community | rag-audit/eval/chunking/scaffold skills, 34★ | NO — low-priority candidate |
| github.com/Jeffallan/claude-skills | Individual | 2026-09-18 | Community | rag-architect + 66 other dev skills, 11.5k★ | NO — reference only |
| github.com/nvidia/skills | NVIDIA | 2026-09-18 | Official | RAG Blueprint/eval/perf, NeMo Retriever, 3.3k★ | NO — rejected for now, see above |
| github.com/qdrant/mcp-server-qdrant | Qdrant | 2026-09-18 | Official | Official semantic-memory MCP server, 1.5k★ | NO — future candidate only |
| github.com/chroma-core/chroma-mcp | Chroma | 2026-09-18 | Official | Official Chroma vector-DB MCP server, 595★ | NO |
| github.com/k-dense-ai/claude-scientific-writer | K-Dense Inc. | 2026-09-18 | Official (company) | citation-management skill, 2.4k★ | NO |
| github.com/quaylabshq/skill-graph | Quaylabs HQ | 2026-09-18 | Community (company) | Turns SKILL.md content into validated reference graphs, 10★ | NO — niche, low priority |
| github.com/borghei/Claude-Skills | Individual | 2026-09-18 | Community | runbook-generator skill, 787★ | Recommended if ever adopted directly |
| github.com/charlesdove977/procedure-ops | Individual | 2026-09-18 | Community | sop-build SOP generator, 58★ | NO |
| github.com/claude-office-skills/skills | Community org | 2026-09-18 | Community | PDF/data-extractor skills, 473★ | NO — not needed yet (no PDFs in corpus) |
| github.com/BexTuychiev/firecrawl-claude-code-skill | Individual | 2026-09-18 | Community | Firecrawl-backed web scraping, 21★ | NO — rejected, see above |
| github.com/brettdavies/crawl4ai-skill | Individual | 2026-09-18 | Community | Crawl4AI-wrapping scraping, 49★ | NO — rejected, see above |
| github.com/michalparkola/tapestry-skills-for-claude-code | Individual | 2026-09-18 | Community | yt-dlp-based YouTube transcript skill, parent repo 544★ | NO — pattern reference only |
| github.com/letsloose501/skill-lint | Individual | 2026-09-18 | Community | Skill-doc integrity/security linter, 1★ | Recommended for a closer dedicated review given topical relevance |
| github.com/TerminalSkills/skills | Org | 2026-09-18 | Community | agent-memory skill (file/SQLite/Chroma tiers), parent repo 155★ | NO |
| github.com/hanfang/claude-memory-skill | Individual | 2026-09-18 | Community | Minimal markdown-only memory skill, 56★ | NO — reference pattern only |
| github.com/SpillwaveSolutions/project-memory | SpillWave Solutions | 2026-09-18 | Community (company) | Markdown project-memory skill, 89★ | NO |
| github.com/n8n-io/skills | n8n | 2026-09-18 | Official | Skills for coding agents driving n8n via MCP, 468★ | Recommended to adopt as-is once n8n work starts |
| github.com/oaustegard/claude-skills/issues/319 | Individual | 2026-09-18 | Community | Open, unshipped context-routing skill proposal | NO — not a shippable artifact |
