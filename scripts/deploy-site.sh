#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_MODE="build"
RUN_LABEL="container build deploy"
SECONDS=0
BUILD_ARGS=()

print_usage() {
  cat <<'USAGE'
Build and publish the static site through Docker Compose.

Usage: ./scripts/deploy-site.sh [build|render] [--include-discovery-valid]

Default behavior: build and publish the site into the Docker web volume.

Modes:
  build   Run npm build inside the site-builder container.
  render  Run npm render inside the site-builder container.

Options:
  --include-discovery-valid  Pass the discovery-valid flag through to build mode.
  --help  Show this help and exit.

Examples:
  ./scripts/deploy-site.sh
  ./scripts/deploy-site.sh build
  ./scripts/deploy-site.sh build --include-discovery-valid
  ./scripts/deploy-site.sh render
USAGE
}

# Keep the CLI contract small because systemd calls this script directly.
# Build-only flags are intentionally not forwarded to render mode.
for arg in "$@"; do
  case "$arg" in
    --help)
      print_usage
      exit 0
      ;;
    build)
      if [[ "$RUN_MODE" != "build" ]]; then
        echo "Only one run mode may be specified."
        print_usage
        exit 1
      fi
      RUN_MODE="build"
      RUN_LABEL="container build deploy"
      ;;
    render)
      if [[ "$RUN_MODE" != "build" ]]; then
        echo "Only one run mode may be specified."
        print_usage
        exit 1
      fi
      RUN_MODE="render"
      RUN_LABEL="container render deploy"
      ;;
    --include-discovery-valid)
      BUILD_ARGS+=("$arg")
      ;;
    *)
      echo "Unknown argument: $arg"
      print_usage
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

docker compose build site-builder site

RUN_ENV=("-e" "SITE_BUILD_MODE=$RUN_MODE")
if [[ "$RUN_MODE" == "build" && ${#BUILD_ARGS[@]} -gt 0 ]]; then
  RUN_ENV+=("-e" "SITE_BUILD_ARGS=${BUILD_ARGS[*]}")
fi

docker compose run --rm "${RUN_ENV[@]}" site-builder
docker compose up -d site

# Validate the public container surface, not host filesystem state. The web
# service mounts the generated volume read-only, so these checks prove the
# deployed site is visible to nginx inside the container.
docker compose exec -T site test -f /usr/share/nginx/html/index.html
docker compose exec -T site test -f /usr/share/nginx/html/favicon.png
SITE_FILE_COUNT="$(docker compose exec -T site find /usr/share/nginx/html -type f | wc -l | tr -d ' ')"

echo "Container deploy published ${SITE_FILE_COUNT} files"
echo "Completed ${RUN_LABEL} in ${SECONDS}s"
