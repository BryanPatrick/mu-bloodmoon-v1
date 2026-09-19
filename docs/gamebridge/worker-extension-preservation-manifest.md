---
status: ACTIVE
category: gamebridge
audience: internal (engineering + Bryan)
lastVerified: 2026-09-19
---

# Worker command-type extension — preservation manifest (Phase 20A)

**This branch exists only so the code cannot be lost.** It does **not** make the
code current, reviewed, canonical or deployable. It is **not** merged to `main`.

## What it is

The Cloudflare Worker half of the GameBridge extension plan
(`docs/gamebridge/gamebridge-agent-extension-plan.md`, Part 1/7/13): Worker
routing, validation and D1 shape for four additional command types on the
`GAME_COMMAND_TRANSPORT`. Until this branch, the only copy was uncommitted
working-tree changes in another worktree; every committed branch (43 refs
checked on 2026-09-18) carried the CREATE-only Worker.

## Provenance

| Field | Value |
|---|---|
| Source worktree | `D:\MU\mu-bloodmoon-v1-openbeta` |
| Source branch / HEAD | `open-beta/p0-foundation` @ `2811522dfa7ec92a805ba0deca0f1ca97a4c33e4` (2026-09-06) |
| Source state | uncommitted (` M` ×3 tracked files, `??` migration) among 220 dirty entries |
| Preserved branch | `gamebridge/preserve-command-extension` |
| Base | `main` @ `c1b34062bf07c48e7a85e7548ff000a1a4aca1ff` |
| Preserved commit | `3e69937efa9a9706b78c111c63381c7bb3beb32c` (exact files) |
| Method | byte copy from the source working tree; `git hash-object` compared source vs preserved; **no edit** |

## Files (original hashes)

| Path | Lines | SHA-256 | Git blob (preserved) | Blob on main / source HEAD |
|---|---:|---|---|---|
| `apps/game-data-worker/src/commands.ts` | 387 | `18d2b9f2c7a17b6c258341eff4a966baca3994fbc76d4b5f0396703625673fcc` | `66f5fe179bed1fc1c3c1970be82a5f257038d5af` | `99a7b09b9c4493417fcc779738a810e369de8826` |
| `apps/game-data-worker/db/schema.sql` | 114 | `8d4a9655f06464d8acdb1e746863e92aa618318ff51eb12637fc60811fad28fd` | `48ffcf6d7d404fe9ce8a9d4841556339eb4c64c3` | `9af041a536035e88aba35f4e795851aae0faf473` |
| `apps/game-data-worker/test/commands.spec.ts` | 313 | `438fe4b029a413d3eea83b82d1e2e42d537e7710316f40cc4e3f1ca0911641e3` | `53ea1b5ad1681227a291b0c22d89c2a125546af4` | `87e3c60bf42102a7a111a5db8e502524c6778b6a` |
| `apps/game-data-worker/db/migrations/0004_gamebridge_extension_commands.sql` | 79 | `6175677eaed8080a229e08f80fe3c9f653a2acb3cc4404a9430f281636c768c7` | `f28253f0e6cbc6e262782fdea4dc304f89450acb` | identical on `main` — **not repeated here** |

The source `HEAD` blobs equal `main`'s for the three tracked files, so
`git diff main..gamebridge/preserve-command-extension` is exactly the
extension: 3 files, +313/−43 (`commands.ts` +189, `commands.spec.ts` +142,
`schema.sql` +25).

**Isolation check.** The three files contain only extension changes (every hunk
is inside command handling, its validation, or the extension's tests). No
unrelated dirty work was mixed in; a secret-pattern scan of the three files
found nothing.

## Command types present

| Type | Payload (Worker-validated) | Credential | Result shape |
|---|---|---|---|
| `CREATE_GAME_ACCOUNT` | none (as before) | AES-256-GCM envelope required | `membGuid` |
| `GRANT_VIP` | `{targetLevel 1–3, vipExpiresAt}` (rejects past SMALLDATETIME range 2079-06-06) | must be absent | `detailJson` |
| `SYNC_VIP_TIER` | `{desiredLevel 0–3, desiredVipExpiresAt}` (expiry required when level > 0) | must be absent | `detailJson` |
| `ANONYMIZE_GAME_ACCOUNT` | none | must be absent | `detailJson` |
| `PURGE_GAME_ACCOUNT` | `{betaCycleId}` (required) | must be absent | `detailJson` |

D1 shape: `command_type` CHECK widened to five values; credential columns
nullable; new `payload_json` and `result_detail_json`; a `membGuid` on a
non-CREATE result and a missing `detailJson` on a non-CREATE success are
rejected. **There is no currency command.**

## Test state

| Check | Result | When / how |
|---|---|---|
| `tsc --noEmit` (worker) | **0 errors** | re-run 2026-09-19 in a worktree of this branch, dependencies from a junction to the main checkout's `node_modules` (junctions are git-ignored; not committed) |
| `vitest run` (whole worker suite, local workerd + local D1) | **55/55 passed** (6 files) | same run |
| `test/commands.spec.ts` | **25/25** (10 base + 15 extension) | same run |
| Earlier record | "implemented and tested locally" (extension plan, 2026-08-30); 40/40 at Phase 3D-A for the pre-extension suite | historical |

Not re-run: the Agent (.NET) suite and the local SQL Server integration tests.

## Deployment state (verified read-only on 2026-09-19)

* Remote D1 `bloodmoon-game-data`: migrations **0001, 0002, 0003** applied
  (0003 on 2026-08-24); **`0004` is not applied**; `game_command.command_type`
  still has `CHECK (command_type = 'CREATE_GAME_ACCOUNT')`, so the remote
  database would reject the four extension types even if the Worker accepted them.
* Deployed Worker: last **code** upload 2026-08-24; every later version is a
  "Secret Change". Consistent with the committed CREATE-only code.
* Agent extension handlers default to disabled; the four SQL procedures are not
  installed on production; nothing here has ever carried a real command.

## What is NOT preserved by this branch (loss risk that remains)

* **The four stored procedures and their grants** —
  `references/game-data/sql-discovery/gamebridge-extension-20260830/derived/*.sql`
  (11 files) exist only untracked in the same openbeta worktree. One file,
  `local-writer-login.sql`, is flagged `SQL_LAB_SECRET_REVIEW_REQUIRED`, so it was
  **not** copied in this phase.
* The remaining ~215 dirty entries of that worktree (governed by earlier
  recovery phases and the byte-copy of its untracked *documentation* in
  `context/preservation/`).

## Rules for this branch

* No merge to `main`, no deploy, no push without Bryan's explicit instruction.
* Applying `0004` remotely, deploying this Worker and enabling any Agent kill
  switch are separate, individually authorised production steps.
* To restore: `git diff main..gamebridge/preserve-command-extension`, or check
  the branch out in a worktree.
