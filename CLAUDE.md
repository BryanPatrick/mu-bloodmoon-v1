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
- **Global skill discovery (`~/.claude/skills/`) refreshes within a
  session, but not instantaneously.** Corrected 2026-09-08: an earlier
  note in this file claimed discovery never hot-reloads mid-session —
  that was wrong, or at least incomplete. Confirmed directly this same
  session: `Skill(bloodmoon-deploy)` returned "Unknown skill"
  immediately after the file was first written, but a later invocation
  (after a few more tool calls, no session restart) successfully loaded
  it — and a *second* invocation right after an `Edit` to the file
  picked up the edit, while the *first* invocation right after that
  same edit had still served the pre-edit content. There is a real but
  short propagation delay of unknown, non-zero duration between a
  write/edit to `~/.claude/skills/<name>/SKILL.md` and that content
  being reliably served — never trust the very next invocation
  immediately after a write as proof of either success or failure;
  re-check after a few turns. **Project-local** (`.claude/skills/<name>/`
  inside a git worktree) discovery timing was only tested once, with
  zero delay, and failed — whether it also refreshes given more time is
  genuinely unconfirmed, not proven negative.
- **A genuinely fresh session/agent (not just "a few turns later" in an
  already-warmed-up session) has no observed delay at all.** Confirmed
  2026-09-08 via two independent fresh subagent sessions (no shared
  context with the session that wrote the files): both
  `Skill(frontend-design)` and `Skill(bloodmoon-deploy)` returned `PASS`
  on the very first invocation, with the correct, current content and
  the correct canonical source path
  (`C:\Users\Mini DELL3080\.claude\skills\<name>`). The "delay" observed
  above is specific to re-invoking a skill within the same session that
  just edited it, not a property of cold starts in general — don't
  overgeneralize a same-session propagation quirk into a rule about
  session startup itself.

## Blood Moon skills — canonical source

- `~/.claude/skills/` is the canonical git repo for `bloodmoon-*`
  skills (approved 2026-09-08) — tracks only `bloodmoon-*/`, never
  official Anthropic skills (`frontend-design`, etc.), via its own
  `.gitignore`.
- `frontend-design`: physically installed at
  `~/.claude/skills/frontend-design/`, byte-verified against the
  official repo, **and confirmed discoverable and loadable this same
  session** (`Skill(frontend-design)` returned its real content,
  matching the official repo).
- `bloodmoon-deploy`: canonicalized 2026-09-08 to
  `~/.claude/skills/bloodmoon-deploy/`, hash-verified identical to the
  `mu-bloodmoon-ops-hardening` origin before being edited to add
  governance-pack references, and **confirmed discoverable and loadable
  both same-session and from two independent fresh sessions** with the
  post-edit content. **The project-local origin copy has been removed**
  (2026-09-08, after full validation — see below); project-local skills
  are not needed in this environment, `~/.claude/skills/` alone is
  sufficient and correct.

### `bloodmoon-deploy` canonicalization — COMPLETE

1. Origin was preserved untouched through the entire validation process.
2. Hash computed (2026-09-08): `SKILL.md` `sha256:41617742...`,
   `references/migration-and-remote-access.md` `sha256:2a15ecb2...`.
3. Copied to `~/.claude/skills/bloodmoon-deploy/`.
4. Hash compared post-copy — identical, confirmed via `diff` (zero
   output) before any edit was made to the canonical copy.
5. The canonical copy was then edited (only the copy, never the
   origin) to add an "Engineering governance" section pointing at
   `docs/architecture/engineering-governance.md` and
   `branch-and-release-governance.md` — no content duplicated, only
   references + one-line invariants per this project's own "critical
   invariants may repeat a sentence" rule.
6. Committed inside `~/.claude/skills/`'s own git repo (`ee240de`,
   `feat: add Blood Moon deploy skill`).
7. Fresh-session validation (two independent subagents, no shared
   context): both skills `PASS`, correct source path, correct current
   content, `bloodmoon-deploy`'s "Engineering governance" section
   present.
8. Old copy at `mu-bloodmoon-ops-hardening/.claude/skills/bloodmoon-deploy/`
   compared against the canonical copy: `references/migration-and-remote-access.md`
   byte-identical; `SKILL.md` differed only by pure addition (the new
   "Engineering governance" section + an updated cross-repo note),
   nothing removed or contradicted — classified `SUPERSEDED`, not
   `DIVERGENT_UNKNOWN`. Confirmed untracked in the `mu-bloodmoon-ops-hardening`
   git repo (`git ls-files` returned nothing for that path) — safe to
   delete with no git history to lose.
9. **Old copy removed** (2026-09-08) — `rm -rf` scoped exactly to that
   one skill's folder, nothing else under that repo's `.claude/`
   touched. Re-validated post-removal via a third fresh subagent:
   `bloodmoon-deploy` still `PASS`, same canonical source path, same
   content — no hidden dependency on the deleted copy existed.

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
