#!/usr/bin/env bash
# CF-BACKUP-02 (2026-09-24) -- NOT ACTIVE, NOT WIRED INTO PRODUCTION CRON.
#
# A real, isolated follow-up step for an already-completed
# cpanel-production-backup.sh run: encrypts its database/asset archives
# with age, then hands the encrypted files to the SAME already-existing
# RCLONE_REMOTE mechanism that script already supports (never a new
# upload path) -- so pointing RCLONE_REMOTE at an R2 remote uploads the
# encrypted files, not the plaintext ones. This script changes nothing
# about the production cron script itself; it is meant to be invoked
# as a second, optional step after it, only once someone deliberately
# wires it in.
#
# This is the real pipeline shape CF-BACKUP-01/CF-BACKUP-02 proved:
# mysqldump -> gzip -> age encrypt -> upload -> remote size/hash
# verification -> manifest.json -- every stage of THAT chain was
# actually run against a real disposable database and a real private
# R2 bucket (bloodmoon-backups-private, non-production, CF-BACKUP-02).
#
# IMPORTANT, stated plainly: CF-BACKUP-02's own proof used the
# `age-encryption` npm package (Node/JS), not the standalone `age` CLI
# this script invokes below, because no `age` binary was available on
# the Windows machine that phase ran on. The cryptographic mechanism
# (age's passphrase/scrypt-based symmetric encryption) is identical
# either way and the round-trip was proven end-to-end -- but this
# script's specific `age` CLI invocation syntax has NOT itself been
# executed or verified. Confirm the exact flags against whatever real
# `age` version ends up installed on the target host before ever
# relying on this script for a real backup.
#
# Usage (manual, or as a future cron follow-up step -- never automatic
# today):
#   AGE_PASSPHRASE_FILE=/path/to/separately-held/key \
#   RCLONE_REMOTE=r2backup:bloodmoon-backups-private \
#     ./age-encrypt-backup.sh /path/to/backups/bloodmoon/daily/<timestamp>
#
# Requires: age (via `age` CLI or any age-spec-compatible tool),
# rclone (already a soft dependency of cpanel-production-backup.sh),
# sha256sum.
set -Eeuo pipefail

run_dir="${1:?Usage: age-encrypt-backup.sh <backup-run-directory>}"
[[ -d "$run_dir" ]] || { echo "Not a directory: $run_dir"; exit 1; }

AGE_PASSPHRASE_FILE="${AGE_PASSPHRASE_FILE:?AGE_PASSPHRASE_FILE is required -- the encryption key must never be inline or committed}"
[[ -r "$AGE_PASSPHRASE_FILE" ]] || { echo "Cannot read AGE_PASSPHRASE_FILE: $AGE_PASSPHRASE_FILE"; exit 1; }
RCLONE_REMOTE="${RCLONE_REMOTE:?RCLONE_REMOTE is required (reuses the same variable cpanel-production-backup.sh already supports)}"

command -v age >/dev/null 2>&1 || { echo "age is not installed -- see BACKUP_STRATEGY.md section 6."; exit 1; }
command -v rclone >/dev/null 2>&1 || { echo "rclone is not installed -- see CPANEL_BACKUP_AUTOMATION.md."; exit 1; }

timestamp="$(basename "$run_dir")"
# cpanel-production-backup.sh's own $timestamp is always YYYYMMDD-HHMMSS --
# reuse its date portion directly rather than re-deriving it, no date-math needed.
day="${timestamp:0:4}/${timestamp:4:2}/${timestamp:6:2}"

echo "Encrypting backup artifacts in $run_dir..."
declare -a encrypted_files=()
for name in database.sql.gz mutable-assets.tar.gz; do
  src="$run_dir/$name"
  [[ -f "$src" ]] || continue
  dst="$run_dir/$name.age"
  # NOT YET VERIFIED against a real age CLI (see the header note above) --
  # confirm this exact invocation, including how this age build accepts a
  # non-interactive passphrase, before ever relying on it for a real backup.
  age --encrypt --passphrase --output "$dst" "$src" < "$AGE_PASSPHRASE_FILE"
  encrypted_files+=("$dst")
  echo "  encrypted: $name -> $(basename "$dst") ($(stat -c%s "$dst" 2>/dev/null || stat -f%z "$dst") bytes)"
done

if (( ${#encrypted_files[@]} == 0 )); then
  echo "No database.sql.gz or mutable-assets.tar.gz found in $run_dir -- nothing to encrypt."
  exit 1
fi

echo "Uploading encrypted artifacts to $RCLONE_REMOTE (via the existing rclone mechanism)..."
for f in "${encrypted_files[@]}"; do
  key_name="$(basename "$f")"
  remote_path="${RCLONE_REMOTE%/}/database/$day/${timestamp}-${key_name}"
  if ! rclone copyto "$f" "$remote_path" --checksum; then
    echo "rclone upload failed for $f"
    exit 1
  fi
  echo "  uploaded: $key_name -> $remote_path"
done

echo "Verifying remote object sizes match local encrypted files (upload success alone is not sufficient)..."
for f in "${encrypted_files[@]}"; do
  key_name="$(basename "$f")"
  remote_path="${RCLONE_REMOTE%/}/database/$day/${timestamp}-${key_name}"
  local_size="$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")"
  remote_size="$(rclone size "$remote_path" --json 2>/dev/null | grep -oP '"bytes"\s*:\s*\K[0-9]+' || echo '')"
  if [[ "$local_size" != "$remote_size" ]]; then
    echo "SIZE MISMATCH for $key_name: local=$local_size remote=$remote_size"
    exit 1
  fi
  echo "  verified: $key_name ($local_size bytes, local and remote match)"
done

manifest_path="$run_dir/backup-manifest.json"
{
  echo "{"
  echo "  \"timestamp\": \"$timestamp\","
  echo "  \"backupType\": \"production-encrypted-offhost\","
  echo "  \"createdAt\": \"$(date -Iseconds)\","
  echo "  \"remote\": \"$RCLONE_REMOTE\","
  echo "  \"encryptedFiles\": [$(printf '\"%s\",' "${encrypted_files[@]##*/}" | sed 's/,$//')]"
  echo "}"
} > "$manifest_path"
echo "Manifest written: $manifest_path"

echo "Done. Plaintext archives remain in $run_dir under this script's own local-retention window (LOCAL_RETENTION_DAYS in cpanel-production-backup.sh) -- this script never deletes them; only the existing backup job's own retention cleanup does."
