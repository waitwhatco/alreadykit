#!/usr/bin/env bash
# build.sh — assemble the marketing site for alreadykit.com
# Output: ./dist/
#
# Usage:
#   ./build.sh           # build only
#   ./build.sh --deploy  # build + wrangler pages deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DIST="dist"

echo "→ Cleaning $DIST/"
rm -rf "$DIST"
mkdir -p "$DIST"

echo "→ Copying files"
# Copy each top-level item individually (avoids cp circular-directory error)
find . -maxdepth 1 \
  ! -name '.' \
  ! -name 'dist' \
  ! -name 'node_modules' \
  ! -name '.git' \
  ! -name '.claude' \
  ! -name '.gstack' \
  ! -name '.vscode' \
  ! -name '.idea' \
  ! -name '.next' \
  ! -name '.turbo' \
  ! -name 'build.sh' \
  ! -name 'package.json' \
  ! -name 'package-lock.json' \
  ! -name 'pnpm-lock.yaml' \
  ! -name 'bun.lockb' \
  ! -name '*.swp' \
  ! -name '*.bak' \
  -exec cp -r {} "$DIST/" \;

# Remove any markdown files that snuck in
find "$DIST" -name "*.md" -delete 2>/dev/null || true
find "$DIST" -name ".DS_Store" -delete 2>/dev/null || true

FILE_COUNT=$(find "$DIST" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$DIST" | cut -f1)

echo ""
echo "✓ Build complete — $FILE_COUNT files, $TOTAL_SIZE"

# Verify no file exceeds Cloudflare Pages' 25 MiB limit
OVERSIZED=$(find "$DIST" -type f -size +25M)
if [ -n "$OVERSIZED" ]; then
  echo "✗ ERROR — files exceed Cloudflare Pages 25 MiB limit:"
  echo "$OVERSIZED"
  exit 1
fi

# Optional: deploy locally
if [ "${1:-}" = "--deploy" ]; then
  echo "→ Deploying to Cloudflare Pages…"
  npx wrangler pages deploy "$DIST" --project-name alreadykit --commit-dirty=true

  if [ -x "$SCRIPT_DIR/scripts/indexnow.sh" ]; then
    echo ""
    "$SCRIPT_DIR/scripts/indexnow.sh"
  fi
fi
