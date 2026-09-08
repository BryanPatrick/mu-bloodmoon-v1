# Blood Moon — agent instructions (Claude Code)

**The full repository-wide agent rules live in [`AGENTS.md`](AGENTS.md)**
— read it first. This file exists only for Claude Code's own
tool-specific loading convention and to record genuinely
Claude-specific behavior that doesn't apply to other agents. Nothing
below duplicates `AGENTS.md`.

## Environment specifics

- This project is worked on via the **Claude Desktop app's "Code"
  tab**, running inside the Claude Agent SDK — not the standalone
  interactive `claude` terminal CLI. `claude` is not on `PATH` here.
  Terminal-dialog slash commands (`/permissions`, `/config`, `/plugin`,
  etc.) are **not available** in this session type.
- Consequence: the `/plugin marketplace add` / `/plugin install`
  mechanism is unreachable from here. `ListSkills`/`SearchSkills`/
  `ListPlugins`/`SearchPlugins` query a narrow account-level catalog
  that does not include the public `github.com/anthropics/skills`
  repo — confirmed empty results for real, popular official skills
  during this session's own audit.
- **Skill discovery does not hot-reload mid-session.** Writing a new
  `SKILL.md` to `~/.claude/skills/<name>/` or `.claude/skills/<name>/`
  does not make it callable within the same session — confirmed
  directly (`Skill(name)` returned "Unknown skill" immediately after
  writing the file). A fresh session is required to confirm discovery.
  Never claim a newly-written skill is "validated" without an actual
  fresh-session test.

## Blood Moon skills — canonical source

- `~/.claude/skills/` is the canonical git repo for `bloodmoon-*`
  skills (approved 2026-09-08) — tracks only `bloodmoon-*/`, never
  official Anthropic skills (`frontend-design`, etc.), via its own
  `.gitignore`. See `docs/architecture/engineering-governance.md`'s
  skill-canonicalization section for the move plan (not yet executed
  for `bloodmoon-deploy`).
- `frontend-design`: physically installed at
  `~/.claude/skills/frontend-design/`, byte-verified against the
  official repo. `DISCOVERY = PENDING_NEW_SESSION` — do not reinstall,
  do not claim it's confirmed working until a fresh session proves it.
- `bloodmoon-deploy` v0.1: still project-local at
  `mu-bloodmoon-ops-hardening/.claude/skills/bloodmoon-deploy/`, not
  yet moved to the canonical location.

### `bloodmoon-deploy` canonicalization plan (not yet executed)

1. Preserve origin — untouched, still at
   `mu-bloodmoon-ops-hardening/.claude/skills/bloodmoon-deploy/`.
2. Hash computed (2026-09-08, prep only): `SKILL.md`
   `sha256:41617742...`, `references/migration-and-remote-access.md`
   `sha256:2a15ecb2...`.
3. Copy to `~/.claude/skills/bloodmoon-deploy/` — **not done yet**.
4. Compare hash post-copy — pending step 3.
5. Do not remove the origin copy yet, regardless of step 4's result.
6. Remove the project-local copy only after a **new session** confirms
   the canonical copy is discovered and activates correctly — this
   session cannot perform that validation (see "skill discovery does
   not hot-reload" above).

### `bloodmoon-deploy` audit against 2026-09-08 governance

- `RULES_ALREADY_COVERED`: evidence-first process signaling, LSAPI
  reload procedure (pointer to `docs/deployment-architecture.md`),
  accessibility-label caution, Nuxt asset-integrity validation,
  Prisma/MySQL migration mechanics + Remote Database Access reference,
  credential-rotation consumer-mapping, secret-bearing-page prohibition,
  log-path verification, stop conditions.
- `RULES_MISSING`: branch-state-vs-working-tree-state, worktree-is-not-
  a-backlog/checkpoint-early, never-develop-on-main, the `DONE`/feature
  lifecycle state machine, the deploy-manifest structured output format,
  the `<environment>/<product>/<phase-id>/<date>` tagging scheme.
- `RULES_DUPLICATED`: none — the skill already summarizes-and-points
  rather than repeating full doc content.
- `RULES_THAT_SHOULD_REFERENCE_DOCS`: all of `RULES_MISSING` above,
  once added — one-line pointers to
  `docs/architecture/engineering-governance.md` and
  `branch-and-release-governance.md`, not full restatement.
- `RULES_THAT_SHOULD_REMAIN_INLINE`: the existing safety invariants
  already inline (never `SIGKILL` without fresh approval, never a wide
  secret-page read, the stop-conditions list) — these are exactly the
  "repeat one critical sentence" case, correctly handled already.
- Not rewritten this session, per instruction — this is the audit only.

## Secret-bearing surfaces — Claude-specific tool traps

- **Never** call `get_page_text`, read `document.body.innerText`, or
  take a full-page screenshot on the cPanel Node.js Selector's
  Environment Variables screen, or any equivalent page rendering
  secrets. This has caused three real incidents in this project despite
  being a standing rule each time — check the current URL against this
  rule *before* calling any page-reading tool, not from memory alone.
  Use a sanitized-output diagnostic script + a different, non-secret-
  bearing surface (e.g. File Manager's editor) instead.
- The Browser pane tools (`mcp__Claude_Browser__*`) are this session's
  native browser automation — prefer them over installing/using raw
  Playwright scripts (the official `webapp-testing` skill was evaluated
  and deliberately not installed for exactly this reason — real overlap,
  no added value in this environment).
- Automation tool accessibility labels have been wrong at least twice
  in this project for cPanel's dense action-icon rows — always confirm
  visually (screenshot or precise position) before any risk-bearing
  click, never trust the reported label alone.

## Approval behavior specific to this session

- A tool-use approval already granted for one action does not extend to
  a similarly-shaped action later in the same conversation — each
  consequential action (SIGTERM, migration, credential change,
  destructive git operation) needs its own fresh confirmation.
- When genuinely blocked on a decision only the user can make (not
  something derivable from code/docs), ask directly rather than
  guessing — this project's own history includes real cost from
  guessing instead of asking (see `docs/architecture/branch-and-release-governance.md`'s
  recovery-phase findings).

## Production safety

Same rule as `AGENTS.md`: no production database write, no production
deploy, no push to a shared branch without explicit, in-the-moment
approval — regardless of what an earlier approval in this conversation
covered.

## Documentation discipline

Same rule as `AGENTS.md`: a change that alters behavior is not done
until the relevant technical doc, decision/phase history, and (if
applicable) manual are updated. Report PARTIAL and name the gap rather
than PASS anyway.
