#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SCRIPT="$PROJECT_ROOT/scripts/deploy-site.sh"
SERVICE_NAME="hackerspace-news-feed-container-deploy"
LEGACY_SERVICE_NAME="hackerspace-news-feed-deploy"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"
LEGACY_SERVICE_PATH="/etc/systemd/system/${LEGACY_SERVICE_NAME}.service"
LEGACY_TIMER_PATH="/etc/systemd/system/${LEGACY_SERVICE_NAME}.timer"
ESCAPED_PROJECT_ROOT="${PROJECT_ROOT// /\\ }"
ESCAPED_DEPLOY_SCRIPT="${DEPLOY_SCRIPT// /\\ }"
DEPLOY_BUILD_ARGS=()

print_usage() {
  cat <<'USAGE'
Install a systemd timer for Docker-based scheduled deploys.

Usage: ./scripts/install-deploy-site-timer.sh [--include-discovery-valid|--no-include-discovery-valid]

Default behavior: schedule containerized `deploy-site.sh build` without discovery-valid rows.

Options:
  --include-discovery-valid  Schedule container builds with discovery-valid rows included.
  --no-include-discovery-valid  Schedule container builds without discovery-valid rows.
  --help  Show this help and exit.

Examples:
  ./scripts/install-deploy-site-timer.sh
  ./scripts/install-deploy-site-timer.sh --include-discovery-valid
USAGE
}

# The timer owns only the scheduled Docker deploy. Legacy host-copy units are
# removed during install so there is one active deploy path after migration.
for arg in "$@"; do
  case "$arg" in
    --help)
      print_usage
      exit 0
      ;;
    --include-discovery-valid)
      DEPLOY_BUILD_ARGS=("--include-discovery-valid")
      ;;
    --no-include-discovery-valid)
      DEPLOY_BUILD_ARGS=()
      ;;
    *)
      echo "Unknown argument: $arg"
      print_usage
      exit 1
      ;;
  esac
done

DEPLOY_EXEC_START="$ESCAPED_DEPLOY_SCRIPT build"
if [[ ${#DEPLOY_BUILD_ARGS[@]} -gt 0 ]]; then
  DEPLOY_EXEC_START+=" ${DEPLOY_BUILD_ARGS[*]}"
fi

if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  echo "Deploy script is missing or not executable: $DEPLOY_SCRIPT"
  exit 1
fi

sudo systemctl disable --now "${LEGACY_SERVICE_NAME}.timer" 2>/dev/null || true
sudo systemctl stop "${LEGACY_SERVICE_NAME}.service" 2>/dev/null || true
sudo rm -f "$LEGACY_SERVICE_PATH" "$LEGACY_TIMER_PATH"

sudo tee "$SERVICE_PATH" > /dev/null <<EOF_SERVICE
[Unit]
Description=Deploy Hackerspace News Feed Docker static site
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=$ESCAPED_PROJECT_ROOT
ExecStart=$DEPLOY_EXEC_START
NoNewPrivileges=true
PrivateTmp=true
EOF_SERVICE

sudo tee "$TIMER_PATH" > /dev/null <<EOF_TIMER
[Unit]
Description=Run Hackerspace News Feed Docker deploy every hour

[Timer]
OnCalendar=hourly
Persistent=true
Unit=${SERVICE_NAME}.service

[Install]
WantedBy=timers.target
EOF_TIMER

sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}.timer"
sudo systemctl status "${SERVICE_NAME}.timer" --no-pager
