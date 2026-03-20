#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SCRIPT="$PROJECT_ROOT/scripts/deploy-site.sh"
SERVICE_NAME="hackerspace-news-feed-deploy"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"
ESCAPED_PROJECT_ROOT="${PROJECT_ROOT// /\\ }"
ESCAPED_DEPLOY_SCRIPT="${DEPLOY_SCRIPT// /\\ }"

if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  echo "Deploy script is missing or not executable: $DEPLOY_SCRIPT"
  exit 1
fi

sudo tee "$SERVICE_PATH" > /dev/null <<EOF
[Unit]
Description=Deploy Hackerspace News Feed static site
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$ESCAPED_PROJECT_ROOT
ExecStart=$ESCAPED_DEPLOY_SCRIPT
EOF

sudo tee "$TIMER_PATH" > /dev/null <<EOF
[Unit]
Description=Run Hackerspace News Feed deploy every hour

[Timer]
OnCalendar=hourly
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}.timer"
sudo systemctl start "${SERVICE_NAME}.service"
sudo systemctl status "${SERVICE_NAME}.service" --no-pager
sudo systemctl status "${SERVICE_NAME}.timer" --no-pager
