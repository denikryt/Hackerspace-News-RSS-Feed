#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TARGET_DIR="/var/www/test.nachitima.com"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build output not found: $DIST_DIR"
  echo "Run: npm run build"
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

run_privileged rsync -av --delete "$DIST_DIR"/ "$TARGET_DIR"/
run_privileged systemctl reload nginx
