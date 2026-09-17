---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
classification: STUB
---

# Domain: Launcher

**Authoritative docs**: [`../../docs/launcher/`](../../docs/launcher/),
notably `launcher-scale-and-text-scale.md` and
`phase-2d-auth-captcha-play-gating.md` per `docs/README.md`'s narrative.

**One-paragraph orientation**: .NET/WPF desktop launcher. Real auth +
Turnstile CAPTCHA (via an embedded WebView2 control, never a bypassed
token) + Play-gating shipped locally per that narrative. Window
scale (Compact 70% to Very Large 130%) and text scale (90%-115%) are
independent, real `LayoutTransform`-based features, never a `Viewbox`
(rejected earlier for blurring text).

**Related decisions**: ADR-0014 (Launcher asset fallback) referenced by
`docs/README.md`'s narrative, not present as a file on this branch.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
