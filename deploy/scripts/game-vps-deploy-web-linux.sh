#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/bloodmoon/app}"
REPO_URL="${REPO_URL:-https://github.com/BryanPatrick/mu-bloodmoon-v1.git}"
BRANCH="${BRANCH:-main}"
NODE_ENV="${NODE_ENV:-production}"

mkdir -p "$(dirname "$APP_ROOT")" /opt/bloodmoon/logs

if [[ -d "$APP_ROOT/.git" ]]; then
  echo "Updating repository in $APP_ROOT"
  git -C "$APP_ROOT" fetch origin "$BRANCH"
  git -C "$APP_ROOT" checkout "$BRANCH"
  git -C "$APP_ROOT" pull --ff-only origin "$BRANCH"
else
  echo "Cloning repository to $APP_ROOT"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_ROOT"
fi

cd "$APP_ROOT"

echo "Installing dependencies"
npm ci

echo "Building Nuxt web app"
npm run web:build

cat >/etc/systemd/system/bloodmoon-web.service <<SERVICE
[Unit]
Description=Blood Moon Nuxt web
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_ROOT
Environment=NODE_ENV=$NODE_ENV
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/node apps/web/.output/server/index.mjs
Restart=always
RestartSec=5
StandardOutput=append:/opt/bloodmoon/logs/web.log
StandardError=append:/opt/bloodmoon/logs/web-error.log

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable bloodmoon-web
systemctl restart bloodmoon-web
systemctl status bloodmoon-web --no-pager
