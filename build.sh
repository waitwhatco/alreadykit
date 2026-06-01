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
# Copy everything, then remove internal-only items from dist
cp -r . "$DIST/"

# Remove internal files from dist
rm -rf \
  "$DIST/dist" \
  "$DIST/node_modules" \
  "$DIST/.git" \
  "$DIST/.claude" \
  "$DIST/.gstack" \
  "$DIST/.vscode" \
  "$DIST/.idea" \
  "$DIST/.next" \
  "$DIST/.turbo" \
  "$DIST/build.sh" \
  "$DIST/package.json" \
  "$DIST/package-lock.json" \
  "$DIST/pnpm-lock.yaml"

# Remove markdown / internal docs
find "$DIST" -name "*.md" -delete 2>/dev/null || true
find "$DIST" -name ".DS_Store" -delete 2>/dev/null || true
find "$DIST" -name "*.swp" -delete 2>/dev/null || true

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
