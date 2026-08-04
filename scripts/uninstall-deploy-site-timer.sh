#!/usr/bin/env bash

set -euo pipefail

SERVICE_NAME="hackerspace-news-feed-container-deploy"
LEGACY_SERVICE_NAME="hackerspace-news-feed-deploy"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"
LEGACY_SERVICE_PATH="/etc/systemd/system/${LEGACY_SERVICE_NAME}.service"
LEGACY_TIMER_PATH="/etc/systemd/system/${LEGACY_SERVICE_NAME}.timer"

sudo systemctl disable --now "${SERVICE_NAME}.timer" 2>/dev/null || true
sudo systemctl stop "${SERVICE_NAME}.service" 2>/dev/null || true
sudo systemctl disable --now "${LEGACY_SERVICE_NAME}.timer" 2>/dev/null || true
sudo systemctl stop "${LEGACY_SERVICE_NAME}.service" 2>/dev/null || true
sudo rm -f "$SERVICE_PATH" "$TIMER_PATH" "$LEGACY_SERVICE_PATH" "$LEGACY_TIMER_PATH"
sudo systemctl daemon-reload
sudo systemctl reset-failed

echo "Stopped ${SERVICE_NAME}.service"
echo "Removed ${SERVICE_NAME}.service and ${SERVICE_NAME}.timer"
echo "Removed legacy ${LEGACY_SERVICE_NAME}.service and ${LEGACY_SERVICE_NAME}.timer if present"
echo "systemd daemon reloaded"
