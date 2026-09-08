#!/usr/bin/env bash
# Phase AA / Part 5 -- "a backup file existing is not sufficient."
# Re-verifies a completed cpanel-production-backup.sh run directory,
# independently of when/how it was produced. Read-only: never modifies,
# decompresses-in-place, or deletes anything under the run directory.
#
# Usage: verify-backup-integrity.sh /path/to/backups/bloodmoon/daily/20260905-031700
set -Eeuo pipefail

run_dir="${1:?Usage: verify-backup-integrity.sh <backup-run-directory>}"
[[ -d "$run_dir" ]] || { echo "Not a directory: $run_dir"; exit 1; }

ok=1
fail() {
  echo "FAIL: $1"
  ok=0
}
pass() {
  echo "PASS: $1"
}

# 1. Checksums -- every file the backup run wrote must still match its own
# recorded SHA-256. This catches silent bit-rot/truncation after the fact,
# not just at write time (cpanel-production-backup.sh's own gzip -t check
# only proves the archive was readable the moment it was created).
if [[ -f "$run_dir/SHA256SUMS" ]]; then
  if (cd "$run_dir" && sha256sum -c SHA256SUMS --quiet); then
    pass 'SHA256SUMS verified'
  else
    fail 'SHA256SUMS mismatch -- one or more files changed since the backup was created'
  fi
else
  fail 'SHA256SUMS file is missing'
fi

# 2. Archive readability -- gzip -t decompresses and checks the CRC/length
# trailer without writing decompressed output anywhere.
if [[ -f "$run_dir/database.sql.gz" ]]; then
  if gzip -t "$run_dir/database.sql.gz" 2>/dev/null; then
    pass 'database.sql.gz is a readable gzip archive'
  else
    fail 'database.sql.gz failed gzip integrity check'
  fi
else
  fail 'database.sql.gz is missing'
fi

# 3. SQL dump readability -- a real mysqldump always opens with a
# recognizable header comment. This is a cheap, DB-free sanity check, NOT
# a guarantee the dump restores cleanly -- that is what restore-test.sh
# verifies, against an isolated database, separately from this script.
if [[ -f "$run_dir/database.sql.gz" ]]; then
  header="$(gzip -dc "$run_dir/database.sql.gz" 2>/dev/null | head -c 4096)"
  if grep -q -- '-- MySQL dump' <<< "$header" || grep -q -- '-- Dump completed' <<< "$header" || grep -qi 'CREATE TABLE' <<< "$header"; then
    pass 'database.sql.gz decompresses to what looks like a real SQL dump'
  else
    fail 'database.sql.gz does not look like a mysqldump SQL file (no recognizable header)'
  fi
fi

if [[ -f "$run_dir/mutable-assets.tar.gz" ]]; then
  if tar -tzf "$run_dir/mutable-assets.tar.gz" >/dev/null 2>&1; then
    pass 'mutable-assets.tar.gz is a readable tar archive'
  else
    fail 'mutable-assets.tar.gz failed tar integrity check'
  fi
fi

# 4. Manifest -- timestamp, source environment (host), database/schema
# identifier must all be present and non-empty.
if [[ -f "$run_dir/manifest.txt" ]]; then
  missing=()
  for field in created_at host database; do
    grep -q "^${field}=" "$run_dir/manifest.txt" && [[ -n "$(grep "^${field}=" "$run_dir/manifest.txt" | cut -d= -f2-)" ]] || missing+=("$field")
  done
  if (( ${#missing[@]} == 0 )); then
    pass 'manifest.txt has created_at, host, and database fields populated'
  else
    fail "manifest.txt is missing or has empty fields: ${missing[*]}"
  fi
else
  fail 'manifest.txt is missing'
fi

echo '---'
if (( ok == 1 )); then
  echo "OVERALL: PASS ($run_dir)"
  exit 0
else
  echo "OVERALL: FAIL ($run_dir)"
  exit 1
fi
