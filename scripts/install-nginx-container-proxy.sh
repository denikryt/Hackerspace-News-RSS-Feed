#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_SOURCE="$PROJECT_ROOT/deploy/nginx/hackerspace.news.container.conf"
AVAILABLE_PATH="/etc/nginx/sites-available/hackerspace.news"
ENABLED_PATH="/etc/nginx/sites-enabled/hackerspace.news"

print_usage() {
  cat <<'USAGE'
Install the host nginx reverse proxy for the Docker site container.

Usage: ./scripts/install-nginx-container-proxy.sh

The installed server block keeps host TLS and logs, then proxies hackerspace.news
to the Docker nginx container on 127.0.0.1:18088.
USAGE
}

if [[ "${1:-}" == "--help" ]]; then
  print_usage
  exit 0
fi

if [[ $# -gt 0 ]]; then
  echo "Unknown argument: $1"
  print_usage
  exit 1
fi

if [[ ! -f "$CONFIG_SOURCE" ]]; then
  echo "Nginx proxy template not found: $CONFIG_SOURCE"
  exit 1
fi

# Install from the checked-in template so the public nginx handoff is
# reproducible and can be reviewed before touching /etc/nginx.
sudo install -m 0644 "$CONFIG_SOURCE" "$AVAILABLE_PATH"
sudo ln -sfn "$AVAILABLE_PATH" "$ENABLED_PATH"
sudo nginx -t
sudo systemctl reload nginx

echo "Installed nginx container proxy: $ENABLED_PATH -> $AVAILABLE_PATH"
