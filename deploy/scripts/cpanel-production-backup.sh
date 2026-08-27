#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

HOME_DIR="${HOME_DIR:-$HOME}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME_DIR/backups/bloodmoon}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-3}"
NODE_SELECTOR_FILE="${NODE_SELECTOR_FILE:-$HOME_DIR/.cl.selector/node-selector.json}"
NODE_APP_KEY="${NODE_APP_KEY:-bmapi}"
BACKUP_PATHS="${BACKUP_PATHS:-$HOME_DIR/bloodmoon-storage:$HOME_DIR/bmapi/storage:$HOME_DIR/bmapi/public:$HOME_DIR/bmweb/storage:$HOME_DIR/public_html/uploads}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
BACKUP_ALERT_EMAIL="${BACKUP_ALERT_EMAIL:-}"

timestamp="$(date +%Y%m%d-%H%M%S)"
run_dir="$BACKUP_ROOT/daily/$timestamp"
log_dir="$BACKUP_ROOT/logs"
log_file="$log_dir/backup-$timestamp.log"
lock_file="$BACKUP_ROOT/.backup.lock"

mkdir -p "$run_dir" "$log_dir"
exec >> "$log_file" 2>&1

notify_failure() {
  local exit_code=$?
  echo "Backup failed with exit code $exit_code at $(date -Iseconds)."
  if [[ -n "$BACKUP_ALERT_EMAIL" ]] && command -v mail >/dev/null 2>&1; then
    printf 'Blood Moon production backup failed. Log: %s\n' "$log_file" \
      | mail -s 'Blood Moon backup failure' "$BACKUP_ALERT_EMAIL" || true
  fi
  exit "$exit_code"
}
trap notify_failure ERR

if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock_file"
  flock -n 9 || { echo 'Another backup is already running.'; exit 0; }
fi

if [[ -f "$HOME_DIR/.bloodmoon-backup.env" ]]; then
  # shellcheck disable=SC1090
  source "$HOME_DIR/.bloodmoon-backup.env"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  [[ -r "$NODE_SELECTOR_FILE" ]] || { echo "Missing Node selector file: $NODE_SELECTOR_FILE"; exit 1; }
  DATABASE_URL="$(python3 - "$NODE_SELECTOR_FILE" "$NODE_APP_KEY" <<'PY'
import json
import sys

with open(sys.argv[1], encoding='utf-8') as stream:
    config = json.load(stream)
print(config[sys.argv[2]]['env_vars']['DATABASE_URL'])
PY
)"
fi

eval "$(python3 - "$DATABASE_URL" <<'PY'
import shlex
import sys
from urllib.parse import unquote, urlparse

url = urlparse(sys.argv[1])
values = {
    'DB_HOST': url.hostname or 'localhost',
    'DB_PORT': str(url.port or 3306),
    'DB_USER': unquote(url.username or ''),
    'DB_PASSWORD': unquote(url.password or ''),
    'DB_NAME': unquote(url.path.lstrip('/')),
}
for key, value in values.items():
    print(f'{key}={shlex.quote(value)}')
PY
)"

[[ -n "$DB_USER" && -n "$DB_NAME" ]] || { echo 'Invalid DATABASE_URL.'; exit 1; }

echo "Starting production backup at $(date -Iseconds)."
export MYSQL_PWD="$DB_PASSWORD"
# Blood Moon uses none of MySQL's Events, Triggers, or stored
# Routines/Functions -- confirmed by an exhaustive grep across every
# migration.sql in apps/api/prisma/migrations/ (36 migrations, zero CREATE
# EVENT / CREATE TRIGGER / CREATE PROCEDURE / CREATE FUNCTION statements)
# and by this project's own established fact that it has no in-database or
# in-process scheduling at all (relies entirely on external cron invoking
# npm scripts, see docs/marketplace.md and game-provisioning reconciliation).
# --skip-events in particular avoids requiring the SHOW EVENTS/EVENT
# privilege on the production application DB user, which it does not have
# and does not need -- least privilege, not an oversight. If any of these
# MySQL-side objects are ever deliberately introduced, flip the matching
# flag back on at that time, not before.
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --skip-routines \
  --skip-triggers \
  --skip-events \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$run_dir/database.sql.gz"
unset MYSQL_PWD DB_PASSWORD DATABASE_URL

declare -a existing_paths=()
IFS=':' read -r -a configured_paths <<< "$BACKUP_PATHS"
for absolute_path in "${configured_paths[@]}"; do
  if [[ -e "$absolute_path" ]]; then
    existing_paths+=("${absolute_path#"$HOME_DIR/"}")
  fi
done

if (( ${#existing_paths[@]} > 0 )); then
  tar -czf "$run_dir/mutable-assets.tar.gz" -C "$HOME_DIR" "${existing_paths[@]}"
else
  echo 'No configured mutable asset directory exists; database backup will still be retained.'
fi

(
  cd "$run_dir"
  sha256sum ./* > SHA256SUMS
)

cat > "$run_dir/manifest.txt" <<EOF
created_at=$(date -Iseconds)
host=$(hostname)
database=$DB_NAME
asset_paths=${existing_paths[*]:-none}
EOF

if [[ -n "$RCLONE_REMOTE" ]]; then
  command -v rclone >/dev/null 2>&1 || { echo 'RCLONE_REMOTE is set but rclone is unavailable.'; exit 1; }
  rclone copy "$run_dir" "${RCLONE_REMOTE%/}/$timestamp" --checksum
  echo "Offsite copy completed: ${RCLONE_REMOTE%/}/$timestamp"
else
  echo 'Offsite copy is not configured; this backup remains on the hosting account only.'
fi

find "$BACKUP_ROOT/daily" -mindepth 1 -maxdepth 1 -type d -mtime "+$LOCAL_RETENTION_DAYS" -exec rm -rf -- {} +
find "$log_dir" -type f -name 'backup-*.log' -mtime +30 -delete

echo "Backup completed at $(date -Iseconds): $run_dir"
