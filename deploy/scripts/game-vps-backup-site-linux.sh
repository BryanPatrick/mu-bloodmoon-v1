#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/bloodmoon/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ -z "$SITE_ROOT" ]]; then
  echo "SITE_ROOT is required. Example: SITE_ROOT=/var/www/mubloodmoon"
  exit 1
fi

if [[ ! -d "$SITE_ROOT" ]]; then
  echo "SITE_ROOT does not exist: $SITE_ROOT"
  exit 1
fi

mkdir -p "$BACKUP_ROOT"

SITE_NAME="$(basename "$SITE_ROOT")"
BACKUP_DIR="$BACKUP_ROOT/${SITE_NAME}-${STAMP}"
ARCHIVE="$BACKUP_ROOT/${SITE_NAME}-${STAMP}.tar.gz"

echo "Copying $SITE_ROOT to $BACKUP_DIR"
cp -a "$SITE_ROOT" "$BACKUP_DIR"

echo "Creating archive $ARCHIVE"
tar -czf "$ARCHIVE" -C "$BACKUP_ROOT" "$(basename "$BACKUP_DIR")"

echo "Backup complete:"
echo "$BACKUP_DIR"
echo "$ARCHIVE"
