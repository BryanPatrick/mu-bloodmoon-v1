#!/usr/bin/env bash
# Phase AA / Part 6 & 7 -- a safe, repeatable MySQL restore test.
#
# NEVER points at production by design: the target host/port/user/database
# are all required parameters with no production-shaped default, and this
# script refuses to run against a database whose name doesn't start with
# the expected test prefix (RESTORE_TEST_DB_PREFIX), so a copy-pasted
# production DATABASE_URL can't be pointed at this script by accident.
#
# Usage:
#   RESTORE_TEST_DB_HOST=127.0.0.1 \
#   RESTORE_TEST_DB_PORT=3306 \
#   RESTORE_TEST_DB_USER=bloodmoon \
#   RESTORE_TEST_DB_PASSWORD=*** \
#   RESTORE_TEST_DB_NAME=bloodmoon_restore_test_20260905 \
#     ./restore-test.sh /path/to/backups/bloodmoon/daily/20260905-031700
#
# Intended targets: a disposable container database, an isolated local
# database created solely for this test, or a documented external test
# environment -- never bloodmoon_local/bloodmoon_local_claude directly
# (those are live shared dev/e2e databases) and never a production DB.
set -Eeuo pipefail

run_dir="${1:?Usage: restore-test.sh <backup-run-directory>}"
[[ -d "$run_dir" ]] || { echo "Not a directory: $run_dir"; exit 1; }
[[ -f "$run_dir/database.sql.gz" ]] || { echo "No database.sql.gz in $run_dir"; exit 1; }

DB_HOST="${RESTORE_TEST_DB_HOST:?RESTORE_TEST_DB_HOST is required}"
DB_PORT="${RESTORE_TEST_DB_PORT:-3306}"
DB_USER="${RESTORE_TEST_DB_USER:?RESTORE_TEST_DB_USER is required}"
DB_PASSWORD="${RESTORE_TEST_DB_PASSWORD:-}"
DB_NAME="${RESTORE_TEST_DB_NAME:?RESTORE_TEST_DB_NAME is required}"
DB_PREFIX="${RESTORE_TEST_DB_PREFIX:-bloodmoon_restore_test_}"

if [[ "$DB_NAME" != "$DB_PREFIX"* ]]; then
  echo "Refusing to run: RESTORE_TEST_DB_NAME ('$DB_NAME') does not start with '$DB_PREFIX'."
  echo 'This guard exists so a production or shared-dev database name can never be passed by accident.'
  exit 1
fi

echo "Step 1/4: verifying archive integrity before attempting any restore..."
"$(dirname "$0")/verify-backup-integrity.sh" "$run_dir"

echo "Step 2/4: restoring into isolated database '$DB_NAME' on $DB_HOST:$DB_PORT..."
export MYSQL_PWD="$DB_PASSWORD"
gzip -dc "$run_dir/database.sql.gz" | mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME"
echo 'Restore completed without a fatal mysql error.'

echo "Step 3/4: checking that tables actually exist and hold plausible data..."
table_count="$(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" -N -B -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME'")"
echo "Tables present: $table_count"
if (( table_count == 0 )); then
  echo 'FAIL: schema loaded zero tables.'
  unset MYSQL_PWD
  exit 1
fi

mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" -N -B -e \
  "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = '$DB_NAME' ORDER BY table_rows DESC LIMIT 10"
unset MYSQL_PWD

echo "Step 4/4: done. Prisma-level connectivity/read is verified separately --"
echo "point DATABASE_URL at this same database and run a read-only Prisma query"
echo "(e.g. 'npx prisma db pull --print' or a targeted findFirst) by hand."
echo "OVERALL: PASS -- schema loaded, $table_count tables present in '$DB_NAME'."
