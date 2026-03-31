#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SCRIPT="$PROJECT_ROOT/scripts/deploy-site.sh"
SERVICE_NAME="hackerspace-news-feed-deploy"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
TIMER_PATH="/etc/systemd/system/${SERVICE_NAME}.timer"
ESCAPED_PROJECT_ROOT="${PROJECT_ROOT// /\\ }"
ESCAPED_DEPLOY_SCRIPT="${DEPLOY_SCRIPT// /\\ }"
DEPLOY_BUILD_ARGS=()

print_usage() {
  cat <<'EOF'
Install a systemd timer for scheduled deploys.

Usage: ./scripts/install-deploy-site-timer.sh [--include-discovery-valid|--no-include-discovery-valid]

Default behavior: schedule `deploy-site.sh build` without discovery-valid rows.

Options:
  --include-discovery-valid  Schedule builds with discovery-valid rows included.
  --no-include-discovery-valid  Schedule builds without discovery-valid rows.
  --help  Show this help and exit.

Examples:
  ./scripts/install-deploy-site-timer.sh
  ./scripts/install-deploy-site-timer.sh --include-discovery-valid
EOF
}

# Keep the installer contract explicit so the generated timer unit shows
# whether discovery-valid rows are included in scheduled builds.
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

sudo tee "$SERVICE_PATH" > /dev/null <<EOF
[Unit]
Description=Deploy Hackerspace News Feed static site
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$ESCAPED_PROJECT_ROOT
ExecStart=$DEPLOY_EXEC_START
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
sudo systemctl status "${SERVICE_NAME}.timer" --no-pager
