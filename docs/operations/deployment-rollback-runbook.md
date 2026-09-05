# Deployment Rollback Runbook

Phase AA / Part 10. Covers API, Web, Launcher, the Cloudflare Worker, and
the GameBridge Agent. Written from an audit of the actual scripts and docs,
not from assumed best practice — where a gap exists, it's stated plainly
rather than papered over.

## API

- **Can the previous artifact be restored?** Not automatically. The
  packaging script (`scripts/package-cpanel-deploy.mjs`) deletes its own
  previous local output before rebuilding, uses a fixed (non-versioned)
  archive filename, and `work/` is gitignored — nothing retains a prior
  build anywhere by default.
- **What to do instead**: `git checkout <last-known-good-commit>`, then
  re-run `npm run deploy:cpanel:package`, then re-upload via the same
  manual cPanel browser flow described in `deploy/CPANEL_NODE_DEPLOY.md`.
  This is why keeping a manual cPanel full-account backup before any large
  change (as that doc already recommends) matters — it's currently the
  only safety net beyond git itself.
- **Restart**: cPanel Node.js Selector restart for `bmapi`. Known gotcha
  (real incident, documented in `deploy/CPANEL_NODE_DEPLOY.md`): CloudLinux's
  Passenger can keep a stale process alive after a normal restart click,
  serving old code/env — if behavior doesn't change after restarting,
  don't assume the rollback failed before checking for this.
- **Post-rollback steps required, in order** (per
  `deploy/CPANEL_NODE_DEPLOY.md`): `npm install`, `npm run prisma:generate`,
  `npm run prisma:migrate`.
- **Rollback smoke test**: previously nothing automated existed, and `GET /`
  carried no version field to check. **This phase adds** a `version`/
  `commit` field to `GET /` (`process.env.APP_VERSION`/`APP_COMMIT`,
  falling back to `'unknown'`) — set these at package time so a rollback
  can be confirmed by checking the field actually changed, not just that
  the endpoint responds. Beyond that, the 4 manual browser checks in
  `deploy/CPANEL_NODE_DEPLOY.md` (`/api/content/entries?pageSize=1`, admin
  login, Wiki, admin panel) remain the smoke test.

## Web

- Same packaging script, same lack of retention, same rollback procedure
  (`git checkout` + rebuild + re-upload) as API.
- **Restart**: cPanel Node.js Selector restart for `bmweb`.
- **Rollback smoke test**: `web:test:smoke` exists but runs against a
  locally-generated build with the API pointed at an intentionally
  unreachable port — it does **not** exercise the deployed production site
  and cannot serve as a post-rollback check. The same 4 manual browser
  checks above are the real smoke test today.

## Launcher

Three genuinely different layers, each with its own rollback story:

1. **Exe binary** — `build-launcher.ps1 -Publish` produces a
   version-named zip locally (`work/launcher/BloodMoonLauncher-v<version>-win-x64.zip`)
   but also overwrites the *public-facing* download
   (`apps/web/public/downloads/BloodMoonLauncher.zip`) with no version in
   that URL — a fresh download can never get an older installer through
   the web app once a newer one is published. The self-update mechanism
   (`LauncherUpdateService`) only ever compares `remoteVersion >
   currentVersion` — **there is no client-side downgrade path at all**.
   `BloodMoonLauncherUpdater.exe` does keep a same-transaction `.previous`
   copy per end-user machine and auto-restores it if the swap itself fails,
   but that's crash-safety for one update, not a supported "roll this
   fleet back to the prior version" operation.
   - **Rollback in practice**: there isn't a clean one today. If a bad exe
     is published, the practical mitigation is publishing a NEWER version
     that fixes the problem (since clients can't go backward) — treat a
     bad exe release the same as "bad deployment," not as something you
     revert.
2. **Patch/content manifest** — `publish-bloodmoon-patch.mjs` keeps
   `history/manifest-<version>.json` for every version ever published,
   forever (no pruning). **This IS a real rollback mechanism**: re-activate
   an older manifest by copying its history file back over the live
   `manifest.json` (the same manual two-phase stage→rename-to-activate
   process the tooling already uses for forward publishes).
3. **CMS content shown inside the Launcher** (news/campaign/event slots) —
   the one component in this entire audit with genuine, tested, DB-backed
   rollback: `LauncherStudioService.rollback({ version })`
   (`docs/launcher/content-publishing.md`) restores an older revision as a
   new forward-moving publish, fully audited. Use this directly; no manual
   file manipulation needed for this layer.

## Cloudflare Worker (`apps/game-data-worker`)

- Cloudflare tracks every `wrangler deploy` as a distinct, retained
  deployment internally — rollback capability exists natively
  (`wrangler rollback`, or the dashboard's deployment history). **This
  project has never used or documented it** — confirmed by grep, zero
  references anywhere.
- **Gotcha**: secrets (`wrangler secret put`) only take effect for the
  currently-serving deployment version at the time they're set — rolling
  back code without also considering secret state could serve a version
  expecting a secret that was rotated after it was deployed.
- **Rollback procedure**: `wrangler rollback` to the previous deployment,
  or `wrangler deploy` a checked-out prior commit. No restart needed
  (serverless).
- **Smoke test**: none scripted against the live Worker URL today. Manual
  check: hit `GET /internal/state/status` (the same endpoint `apps/api`'s
  `GameDataClient` calls) with a valid signature and confirm a sane
  response.

## GameBridge Agent

- **Has never been deployed to production** — confirmed this phase and
  the prior Phase Y audit: no Windows Service was installed, no autostart,
  no restart-on-failure configured (`docs/game-data/deployment-topology.md`
  explicitly frames this as an honest, un-executed gap list for a future
  phase). There is currently nothing live to roll back.
- **When it eventually IS deployed**: because there is no remote-exec
  channel to the Game VPS (only RDP), any rollback will require a human
  physically (or via RDP) replacing the binary and restarting the service
  by hand — build this into whatever install runbook eventually covers
  that phase, don't assume it can be scripted from this repo.

## Summary table

| Component | Previous artifact retained? | Rollback mechanism | Smoke test exists? |
|---|---|---|---|
| API | No | git checkout + rebuild + re-upload | Manual only (4 steps); `version` field added this phase |
| Web | No | Same as API | Manual only; local-build smoke test doesn't cover this |
| Launcher (exe) | Only a same-machine crash-safety copy | **None** — forward-only updater | None |
| Launcher (patch manifest) | Yes, full history, unbounded | Re-activate an older `history/manifest-<version>.json` | None automated |
| Launcher (CMS content) | Yes, real DB revisions | `LauncherStudioService.rollback()` | Covered by its own existing tests |
| Cloudflare Worker | Yes, Cloudflare-native | `wrangler rollback` (never used in practice) | None |
| GameBridge Agent | N/A — never deployed | N/A | N/A |
