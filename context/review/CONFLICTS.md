---
status: ACTIVE
category: context-pack
audience: internal (the assigned independent reviewer)
lastVerified: 2026-09-17
---

# Conflicts found (condensed)

Full detail: [`../REPOSITORY_KNOWLEDGE_MAP.md`](../REPOSITORY_KNOWLEDGE_MAP.md) §6.

## 1. Knowledge Hub decision conflict — UNRESOLVED

`cf5f14c2` + `53034c0c` (2026-08-08, `SITE_BETA_BLOCKED` / `NO-GO`, 6-7
blockers including "password recovery doesn't exist") are **partly**
contradicted 13 hours later by `fa8e9ad0` (2026-08-09, implemented
tokens/endpoints, while its own context says mail delivery was blocked).
The later SMTP handoff still requires deployed end-to-end proof. None
of the three marks another as
superseded. Phase 11 checked the preserved `open-questions.md`/
`open-risks.md` for corroboration on the *other* cited blockers
(CAPTCHA, payment gateway, marketplace/escrow homologation, 404 crash,
test coverage, HTTPS/TLS) — **neither document mentions them at all**.
Status: genuinely unresolved, not silently picked either way.

## 2. A now-corrected technical guess (not a live conflict, but worth knowing)

`docs/knowledge/knowledge-hub-boundary.md` (preserved, 2026-08-31)
guessed the Knowledge Hub is reachable via `mcp__ccd_session_mgmt__*`.
This session's own real work (Phases 5-10) proved the actual mechanism
is a direct HTTP API + CLI. The preserved document was left unedited
(archival copies aren't rewritten); this Context Pack's own
`GOVERNANCE.md` cites the document's *correct* part (the repo-vs-Hub
responsibility split) while explicitly not carrying forward the wrong
part.

## 3. What was NOT found

No doc-vs-doc textual contradiction beyond the two items above. No ADR
contradicts another ADR (0025/0026/0028's relationship to 0029 is
supersession, not conflict, and is explicit in 0029's own text). If
you find one this review pass missed, that is exactly the kind of
finding this package exists to surface.
