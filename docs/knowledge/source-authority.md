# Source authority and confidence

How a captured source gets classified, and why two contradictory sources are never silently resolved by "authority alone."

## Source authority levels

From highest to lowest trust in *what actually happens on Blood Moon*:

1. `REAL_BLOODMOON_RUNTIME` — observed directly from the live Blood Moon server/database (read-only).
2. `REAL_BLOODMOON_SQL` — a real query result against Blood Moon's own database.
3. `REAL_BLOODMOON_CONFIG` — an actual Blood Moon config file, read directly.
4. `PROVIDER_DOCUMENTATION` — the vendor's own written docs for the game-server engine Blood Moon runs (ProjectGamers/eMuGS).
5. `PROVIDER_TUTORIAL` — the vendor's own video tutorials (project-gamers-oficial channel).
6. `UPSTREAM_MU_DOCUMENTATION` — generic MU Online documentation not specific to this vendor or server.
7. `COMMUNITY_TUTORIAL` — a player/streamer/content-creator's own material (e.g. EuSanTiago), which may describe a *different* server entirely.
8. `INTERNAL_DECISION` — a decision this project made, documented in a handoff/decision doc.
9. `INTERNAL_INFERENCE` — this project's own inference from indirect evidence.
10. `UNKNOWN` — provenance not established.

**Higher authority never erases lower authority.** If a `PROVIDER_TUTORIAL` says X and a later `REAL_BLOODMOON_CONFIG` read shows Y, both stay recorded — the tutorial isn't deleted, it's marked superseded/contradicted for *this specific claim*, with both sources still traceable. See [conflict-resolution.md](conflict-resolution.md).

## Blood-Moon-relevance classification (separate axis from authority)

Authority says "how trustworthy is this source in general." Relevance says "does this describe Blood Moon specifically."

- `BLOODMOON_CONFIRMED` — verified against Blood Moon's own runtime/config/database.
- `BLOODMOON_LIKELY` — a `PROVIDER_TUTORIAL`/`PROVIDER_DOCUMENTATION` describing the same engine Blood Moon runs, not yet cross-checked against Blood Moon's own files.
- `UPSTREAM_MU` — generic MU Online knowledge, not vendor- or server-specific.
- `PROVIDER_SPECIFIC_OTHER_SERVER` — confirmed to describe a *different* private server running the same or a different engine (e.g. RealMU content from the EuSanTiago channel). Never promoted to BLOODMOON_LIKELY or higher without independent verification, no matter how plausible it sounds.
- `LEGACY` — described an older version/season no longer applicable.
- `UNKNOWN` — not yet classified.

## Worked example from the 2026-08-25 sweep

The `@EuSanTiago` channel is sponsored by and affiliated with **RealMU**, a different MU Online private server (stated in the channel's own video description). Its videos use terms like "Legendary Craft," "Elite" upgrade, "Shiny Imperial" stones, "Tol," and "Blaz" — none of which are known Blood Moon systems. These are recorded as `COMMUNITY_TUTORIAL` authority, `PROVIDER_SPECIFIC_OTHER_SERVER` relevance. They are captured (per the task's explicit instruction to sweep this named channel) but flagged clearly so a future reader doesn't mistake RealMU's economy for Blood Moon's.

Contrast with `project-gamers-oficial`: its `ProjectGamers.dat` branding matches files found throughout the actual Blood Moon `MuServer` snapshot, so its tutorials are `PROVIDER_TUTORIAL` / `BLOODMOON_LIKELY` — describing the engine Blood Moon actually runs, just not yet individually cross-checked file-by-file.

## Confidence (borrowed from `Knowledge/README.md`, applies to confirmed-runtime work)

`CONFIRMED_RUNTIME > CONFIRMED_VENDOR_DOC (same build) > CONFIRMED_VENDOR_VIDEO (same build) > CONFIRMED_OPERATOR > OLDER_VENDOR_CONTENT > INFERENCE (PROBABLE) > UNKNOWN`

Every entry in `knowledge/vendor-sweep/knowledge-index.json` carries both a `sourceAuthority` and a `confidence` field using this scale.
