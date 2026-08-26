# VPS ingestion

How knowledge gets pulled from the live VPS, and the hard boundary around it.

## The boundary

Read-only, always. No SSH shell access is used for anything beyond listing/hashing/downloading files and running SELECT-only SQL through the existing, credentialed RemoteOps tooling (`D:\MU\Tools\RemoteOps\`). Never restart a service, never change a config, never write to the database, never rotate a secret, never touch Cloudflare/cPanel production settings from this workflow.

## What already exists (as of 2026-08-17)

A complete filesystem inventory of the VPS (`WIN-K82J9TU944D`, Windows Server 2012 R2) lives at `catalog/vps-inventory.json`, built in 15 documented batches (`docs/vps-inventory-batch-log.md`) via a low-level SSH primitive (`Invoke-BloodMoonRemote`) used directly, in small sub-batches, to avoid the connection hanging on a single oversized recursive call. It covers: source-code hunts across every real and backup MuServer path (0 source files found — runtime-only, as expected), all real user profiles, `ProgramData`, all discovered archives (hash-listed, never extracted), the VPS's own MU client installation, and 14 days of Windows Event Logs. It also flagged one sensitive artifact by path only (`Senha SQL.txt` on the Administrator desktop) — filename and size recorded, contents never read or printed.

**49 vendor tutorial files** were copied from `C:\MuServer\Tutoriais\` with full SHA-256 remote+local hash verification, landing at `Research/Vendor/Tutorials/` (27 `.htm`, 3 `.html`, 6 `.png`, 2 `.rtf`, 11 `.txt`, plus a `manifest.json` recording each file's verified hash match). 43 of 49 have been read and normalized into `docs/vendor-tutorials-knowledge-extraction.md`.

## What the current tooling exposes

`D:\MU\Tools\RemoteOps\bm-remote.ps1` (see `CHEATSHEET.md`) exposes a fixed set of documented, reviewed subcommands: `health`, `status`, `muserver-status`, `processes`, `services`, `ports`, `logs <target>`, `download-logs`, `config-list` (a hardcoded 3-path list — `Common.dat` ×2, `CustomFakeOnline.txt`), `hash <path>`, `download <path> <dest>`, `compare-file`, `snapshot-config`, `drop-config`, `fakeonline-show`. `bm-sql.ps1` exposes SELECT-only SQL access.

**As of 2026-08-26, a safe, allowlisted, recursive directory-listing subcommand exists**: `bm-remote inventory <root>` (table output) and `bm-remote inventory-json <root>` (JSON, for piping to a file), with an optional `-hash` flag for opt-in SHA-256 hashing (skipped above `InventoryMaxHashBytes`, currently 50MB). `<root>` must be exactly one of, or a genuine subdirectory of, the roots listed in `InventoryAllowedRoots` in `config\remoteops.json` (currently `Data`, `Tutoriais`, `GameServer\DATA`, `GameServerCS\DATA` — deliberately excludes user profiles, `ProgramData`, and log directories, which have their own dedicated read paths already). Path validation (`Test-BloodMoonInventoryPathAllowed` in the RemoteOps module) rejects wildcards, `..` traversal, and control characters outright, and is covered by 21 unit tests in `Tools\RemoteOps\tests\test-inventory-safety.ps1` that run without any SSH connection. Filenames matching `InventoryDenyNamePatterns` (password/secret/credential/token-suggestive) are redacted in the output (extension/size/mtime kept, name replaced) rather than omitted, matching the sanitize-not-omit convention used elsewhere in this tooling. Reparse points (junctions) are listed but never recursed into, avoiding the recursion-loop risk documented in the original 2026-08-17 inventory's batch log.

To extend the allowlist to a new root, add it to `InventoryAllowedRoots` in `config\remoteops.json` — a one-line, reviewable change — rather than bypassing the tool.

## Incremental sweeps

Given the full 2026-08-17 baseline is comprehensive and (as of any given sweep) only days-to-weeks old, an incremental VPS check should be **light**, not a re-run of the full 15-batch inventory:

1. Run `bm-remote inventory-json <root>` against the highest-value known paths (`C:\MuServer\Data\Custom`, `C:\MuServer\Tutoriais`) and diff the resulting name/size/mtime/hash list against the previous capture (e.g. `RemoteData/Inventory/*.json` from a prior run) or against `catalog/vps-inventory.json` / `Research/Vendor/Tutorials/manifest.json`.
2. Classify each entry NEW / CHANGED (size or mtime differs) / UNCHANGED / REMOVED (present in the old capture, absent in the new one).
3. For anything NEW or CHANGED that looks like a tutorial or config file, follow the normal RAW capture path (`bm-remote download`, hash-verify, land under `Research/Vendor/` or `RemoteData/`).
4. Never attempt an ad-hoc, undocumented remote command against the live production VPS to work around the allowlist — extend `InventoryAllowedRoots` first, with a reviewed, deliberate change.

## Secrets

Any VPS file suspected of containing a credential (matched by filename, or discovered on read) is captured per [raw-capture.md](raw-capture.md)'s `RAW_CAPTURE = SANITIZED_SECURITY` rule — metadata only, value never stored, never printed.
