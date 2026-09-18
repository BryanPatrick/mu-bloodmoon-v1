---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: PARTIAL
---

# Domain: Security

**State**: current, committed security documentation exists under
[`../../docs/security/`](../../docs/security/), including the
GameServer write boundary, data classification, secret incident
history and key-rotation procedures. `AGENTS.md` supplies the
cross-domain approval and secret-handling rules.

This is an index, not a certification that production security is
complete. **The fresh audit now exists**:
[`../../docs/handoff/open-beta-readiness-audit-2026-09-17.md`](../../docs/handoff/open-beta-readiness-audit-2026-09-17.md)
re-tests every 2026-08-08 blocker against current code and live
production checks. Headline: **a real production database credential,
confirmed exposed in a publicly-reachable GitHub history, has still
never been rotated** — `CRITICAL`, unresolved. The web frontend also
sends zero security headers (no CSP/HSTS/X-Frame-Options), while the
API has real `helmet()` defaults. Neither of these was in the original
2026-08-08 decision. See `../OPEN_QUESTIONS.md` OQ-CTX-010/011.
