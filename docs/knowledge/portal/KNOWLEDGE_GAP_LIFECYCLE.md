---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
---

# Knowledge-gap lifecycle — from `UNKNOWN` to a future answer

Canonical model created in `BLOODMOON-AI-07` (2026-09-26). It turns the
design in `docs/architecture/bloodmoon-ai-product-vision.md` §6 (feedback
loop), §7 (FAQ lifecycle) and §16 (knowledge-gap record) into the
documentation procedure used **today**, by hand, during `STAGE 2`. Nothing
here is automated, no workflow runs on its own, and no new database or
Knowledge Hub schema change is made.

## Lifecycle

```
QUESTION (from Claude, an engineer, or a real player report relayed by staff)
  |
  v
Blood Moon Knowledge Specialist answers UNKNOWN (or LIKELY with a named gap)
  |
  v
1. GAP RECORDED        row in docs/knowledge/KNOWLEDGE_GAPS.md (ID GAP-<phase>-NN)
                       with a gap type (below) and the question that exposed it
  |
  v
2. RESEARCH REQUIRED   a Claude session (never the specialist, which is
                       read-only) reads code at the deployed commit, docs,
                       ADRs, or asks Bryan; production reads only if already
                       authorized read-only
  |
  v
3. VALIDATION          evidence meets docs/knowledge/source-authority.md;
                       conflicts exposed per conflict-resolution.md; a
                       decision only Bryan can make stays a decision, not a fact
  |
  v
4. CANONICAL PROMOTION the fact lands in its canonical home (table below),
                       with source and lastVerified; the gap row is marked
                       RESOLVED with a pointer, never deleted
  |
  v
5. FUTURE ANSWER       the specialist finds it through the router and the
                       Knowledge Master Index; if it is player-shaped, an FAQ
                       entry (FAQ.md) or a use case (USE_CASES.md) cites it
```

Rules carried from the vision doc and `AGENTS.md`: Claude never teaches
a speculative answer; generated text never silently becomes canonical;
history is corrected visibly (strikethrough plus note), never deleted.

## Gap types (use exactly one per row)

| Type | Meaning | Typical canonical home once resolved |
|---|---|---|
| `MISSING_USE_CASE` | A real flow exists in code but no use case describes it | `USE_CASES.md` |
| `MISSING_ROUTE_DOC` | A route exists but what it does / who can open it is not written | `PORTAL_FEATURE_INVENTORY.md`, `SITE_NAVIGATION.md` |
| `MISSING_BUSINESS_RULE` | Code enforces a rule nobody has written down, or no decision exists | `context/BUSINESS_RULES.md`, `context/DECISIONS.md` (if Bryan decides) |
| `MISSING_PLAYER_HELP` | Behaviour is known internally but has no player-safe explanation | `FAQ.md` player projection, Wiki candidate |
| `MISSING_ERROR_HELP` | An error message or failure state has no explanation or next step | `USE_CASES.md` errors section, `FAQ.md` |
| `MISSING_PERMISSION_DOC` | Who may see/do something is not documented | `PORTAL_FEATURE_INVENTORY.md` |
| `MISSING_API_CONTRACT` | An endpoint's behaviour/contract is undocumented | the module's doc under `docs/` |
| `MISSING_GAME_KNOWLEDGE` | In-game rule/mechanic not documented | `docs/knowledge/` vendor/config knowledge |
| `UNKNOWN_IMPLEMENTATION` | Cannot tell from code/docs what actually happens (e.g. production config) | stays `UNKNOWN` until a read-only check or Bryan answers |
| `SOURCE_NOT_AVAILABLE_ON_MAIN` | Knowledge exists but only on a preserved branch or outside git | selective integration to `main` (`ADR-0034`) |

## Repeated questions are signals, not only FAQ entries

A question that keeps coming back is classified before anything is
written, because the fix is not always an FAQ:

| Signal | What it points at | Action |
|---|---|---|
| `FAQ_NEED` | The answer exists and is stable; players just ask it | FAQ entry |
| `WIKI_NEED` | The answer needs a longer explanation, steps, or images | Wiki article candidate (`WIKI_ARTICLE_CANDIDATE` in `FAQ.md`) |
| `NAVIGATION_PROBLEM` | Players cannot find a page that exists | `SITE_NAVIGATION.md` note + UX suggestion for Bryan |
| `UX_WORDING_PROBLEM` | The page exists but its wording misleads (e.g. two currencies with similar names) | UX suggestion; FAQ only as a stopgap |
| `BUSINESS_RULE_CONFUSION` | The rule itself is unclear or undecided | decision request to Bryan; never answered as fact |

FAQ popularity is never evidence that an answer is correct. Frequency
decides priority, not truth.

## Where the pieces live (no new store)

| Piece | Home now (`STAGE 2`) | Future home (design, `STAGE 3+`, not authorized) |
|---|---|---|
| Gap record | `docs/knowledge/KNOWLEDGE_GAPS.md` row | Hub `knowledge_items` with a `gap` status + frequency (vision §16) |
| Validated FAQ entry | `docs/knowledge/portal/FAQ.md` | Hub `knowledge_items` (vision §7) |
| Use case | `docs/knowledge/portal/USE_CASES.md` | same, Git |
| Route / feature fact | `PORTAL_FEATURE_INVENTORY.md`, `SITE_NAVIGATION.md` | same, Git |
| Decision | `context/DECISIONS.md` / ADR | same |

## Reusing the existing Knowledge Hub concepts

The Hub already has `knowledge_items` with `verification_status`,
`confidence` and `source_id`, and a quarantine → validated lifecycle for
artifacts. The FAQ and gap contracts in this folder use the same field
meanings so a later migration into the Hub is a copy, not a redesign.
Querying the Hub stays read-only (`bloodmoon-khub-query`); nothing in this
phase writes to it.
