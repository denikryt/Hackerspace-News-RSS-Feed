#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TARGET_DIR="${TARGET_DIR:-/var/www/hackerspace.news}"
TARGET_PARENT_DIR="$(dirname "$TARGET_DIR")"
RUN_MODE="deploy"
RUN_LABEL="deploy"
SECONDS=0
STAGING_DIR=""
BUILD_ARGS=()

print_usage() {
  cat <<'EOF'
Deploy the current dist or run build/render before deploy.

Usage: ./scripts/deploy-site.sh [build|render] [--include-discovery-valid]

Default behavior: deploy the existing `dist/` contents.

Modes:
  build   Run `npm run build` before deploy.
  render  Run `npm run render` before deploy.

Options:
  --include-discovery-valid  Pass the discovery-valid flag through to build mode.
  --help  Show this help and exit.

Examples:
  ./scripts/deploy-site.sh
  ./scripts/deploy-site.sh build
  ./scripts/deploy-site.sh build --include-discovery-valid
  ./scripts/deploy-site.sh render
EOF
}

# Parse deploy mode and supported build flags explicitly so deploy can forward
# the same build contract as the npm CLI without guessing from position.
for arg in "$@"; do
  case "$arg" in
    --help)
      print_usage
      exit 0
      ;;
    build)
      if [[ "$RUN_MODE" != "deploy" ]]; then
        echo "Only one run mode may be specified."
        print_usage
        exit 1
      fi
      RUN_MODE="build"
      RUN_LABEL="build deploy"
      ;;
    render)
      if [[ "$RUN_MODE" != "deploy" ]]; then
        echo "Only one run mode may be specified."
        print_usage
        exit 1
      fi
      RUN_MODE="render"
      RUN_LABEL="render deploy"
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

run_privileged() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

cleanup() {
  if [[ -n "$STAGING_DIR" ]]; then
    run_privileged rm -rf "$STAGING_DIR"
  fi
}

trap cleanup EXIT

validate_dist() {
  if [[ ! -d "$DIST_DIR" ]]; then
    echo "Build output not found: $DIST_DIR"
    echo "Run: npm run build"
    exit 1
  fi

  local required_files=(
    "index.html"
    "favicon.png"
  )

  for relative_path in "${required_files[@]}"; do
    if [[ ! -f "$DIST_DIR/$relative_path" ]]; then
      echo "Build output missing required file: $DIST_DIR/$relative_path"
      exit 1
    fi
  done
}

prepare_staging_dir() {
  run_privileged mkdir -p "$TARGET_PARENT_DIR"
  STAGING_DIR="$(run_privileged mktemp -d "$TARGET_PARENT_DIR/.deploy-staging.XXXXXX")"
  run_privileged rsync -a --delete "$DIST_DIR"/ "$STAGING_DIR"/
}

publish_staging_dir() {
  run_privileged mkdir -p "$TARGET_DIR"
  run_privileged rsync -a --delete "$STAGING_DIR"/ "$TARGET_DIR"/
  run_privileged systemctl reload nginx
}

count_files() {
  local directory="$1"

  find "$directory" -type f | wc -l | tr -d ' '
}

if [[ "$RUN_MODE" == "build" ]]; then
  if [[ ${#BUILD_ARGS[@]} -gt 0 ]]; then
    npm run build -- "${BUILD_ARGS[@]}"
  else
    npm run build
  fi
elif [[ "$RUN_MODE" == "render" ]]; then
  npm run render
fi

validate_dist
prepare_staging_dir
publish_staging_dir

DIST_FILE_COUNT="$(count_files "$DIST_DIR")"
TARGET_FILE_COUNT="$(count_files "$TARGET_DIR")"

echo "Deploy sync result: ${TARGET_FILE_COUNT}/${DIST_FILE_COUNT} files present in ${TARGET_DIR}"

echo "Completed ${RUN_LABEL} in ${SECONDS}s"
