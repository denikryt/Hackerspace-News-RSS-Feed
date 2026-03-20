#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TARGET_DIR="${TARGET_DIR:-/var/www/test.nachitima.com}"
RUN_MODE="deploy"

if [[ "${1:-}" == "build" ]]; then
  RUN_MODE="build"
elif [[ "${1:-}" == "render" ]]; then
  RUN_MODE="render"
elif [[ $# -gt 0 ]]; then
  echo "Unknown argument: $1"
  echo "Usage: ./scripts/deploy-site.sh [build|render]"
  exit 1
fi

cd "$ROOT_DIR"

run_privileged() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

if [[ "$RUN_MODE" == "build" ]]; then
  npm run build
elif [[ "$RUN_MODE" == "render" ]]; then
  npm run render
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build output not found: $DIST_DIR"
  echo "Run: npm run build"
  exit 1
fi

run_privileged rsync -av --delete "$DIST_DIR"/ "$TARGET_DIR"/
run_privileged systemctl reload nginx
