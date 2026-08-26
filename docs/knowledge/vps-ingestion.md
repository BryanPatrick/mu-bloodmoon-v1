# VPS ingestion

How knowledge gets pulled from the live VPS, and the hard boundary around it.

## The boundary

Read-only, always. No SSH shell access is used for anything beyond listing/hashing/downloading files and running SELECT-only SQL through the existing, credentialed RemoteOps tooling (`D:\MU\Tools\RemoteOps\`). Never restart a service, never change a config, never write to the database, never rotate a secret, never touch Cloudflare/cPanel production settings from this workflow.

## What already exists (as of 2026-08-17)

A complete filesystem inventory of the VPS (`WIN-K82J9TU944D`, Windows Server 2012 R2) lives at `catalog/vps-inventory.json`, built in 15 documented batches (`docs/vps-inventory-batch-log.md`) via a low-level SSH primitive (`Invoke-BloodMoonRemote`) used directly, in small sub-batches, to avoid the connection hanging on a single oversized recursive call. It covers: source-code hunts across every real and backup MuServer path (0 source files found — runtime-only, as expected), all real user profiles, `ProgramData`, all discovered archives (hash-listed, never extracted), the VPS's own MU client installation, and 14 days of Windows Event Logs. It also flagged one sensitive artifact by path only (`Senha SQL.txt` on the Administrator desktop) — filename and size recorded, contents never read or printed.

**49 vendor tutorial files** were copied from `C:\MuServer\Tutoriais\` with full SHA-256 remote+local hash verification, landing at `Research/Vendor/Tutorials/` (27 `.htm`, 3 `.html`, 6 `.png`, 2 `.rtf`, 11 `.txt`, plus a `manifest.json` recording each file's verified hash match). 43 of 49 have been read and normalized into `docs/vendor-tutorials-knowledge-extraction.md`.

## What the current tooling actually exposes

`D:\MU\Tools\RemoteOps\bm-remote.ps1` (see `CHEATSHEET.md`) exposes a fixed set of documented, reviewed subcommands: `health`, `status`, `muserver-status`, `processes`, `services`, `ports`, `logs <target>`, `download-logs`, `config-list` (a **hardcoded** 3-path list — `Common.dat` ×2, `CustomFakeOnline.txt` — not a generic directory listing), `hash <path>`, `download <path> <dest>`, `compare-file`, `snapshot-config`, `drop-config`, `fakeonline-show`. `bm-sql.ps1` exposes SELECT-only SQL access.

**There is currently no documented, reviewed, generic "list an arbitrary remote directory" subcommand.** The 2026-08-17 full inventory used a lower-level primitive (`Invoke-BloodMoonRemote`) directly, in a different session, with careful small-batch discipline to avoid hanging the SSH connection. That primitive is not exposed as a safe CLI command today.

## Incremental sweeps

Given the full 2026-08-17 baseline is comprehensive and (as of any given sweep) only days-to-weeks old, an incremental VPS check should be **light**, not a re-run of the full 15-batch inventory:

1. Re-run the fixed, documented `bm-remote config-list` and `bm-remote hash <path>` commands against the highest-value known paths (`C:\MuServer\Data\Custom\*.txt`, `C:\MuServer\Tutoriais\`) and diff hashes against `catalog/vps-inventory.json` / `Research/Vendor/Tutorials/manifest.json`.
2. If a genuine need arises for new generic directory listing (e.g. checking whether new files have appeared in `Tutoriais\`), that requires either extending `bm-remote.ps1` with a new, reviewed, read-only "list directory" subcommand (mirroring the shape of `hash`/`download`), or a future session repeating the original small-sub-batch `Invoke-BloodMoonRemote` approach with the same hang-avoidance discipline documented in `docs/vps-inventory-batch-log.md`.
3. Never attempt an ad-hoc, undocumented remote command against the live production VPS to work around the above — extend the tooling first, or defer.

## Secrets

Any VPS file suspected of containing a credential (matched by filename, or discovered on read) is captured per [raw-capture.md](raw-capture.md)'s `RAW_CAPTURE = SANITIZED_SECURITY` rule — metadata only, value never stored, never printed.
