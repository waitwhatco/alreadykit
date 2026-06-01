#!/usr/bin/env bash
# build.sh — assemble the marketing site for alreadykit.com
# Output: ./dist/
# Excludes: internal docs (PRD/MODULE/CLAUDE), deps, caches.
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

echo "→ Copying marketing files"
rsync -a \
  --exclude='dist/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='.turbo/' \
  --exclude='.git/' \
  --exclude='.claude/' \
  --exclude='.gstack/' \
  --exclude='.vscode/' \
  --exclude='.idea/' \
  --exclude='*.md' \
  --exclude='PRD-*' \
  --exclude='MODULE-*' \
  --exclude='build.sh' \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='*.bak' \
  ./ "$DIST/"

# Size and file-count summary
TOTAL_SIZE=$(du -sh "$DIST" | cut -f1)
FILE_COUNT=$(find "$DIST" -type f | wc -l | tr -d ' ')
LARGEST=$(find "$DIST" -type f -exec du -k {} + | sort -rn | head -3 | awk '{printf "  %s KB  %s\n", $1, $2}')

echo ""
echo "✓ Build complete"
echo "  Output:     $DIST/"
echo "  Files:      $FILE_COUNT"
echo "  Total size: $TOTAL_SIZE"
echo ""
echo "Largest files:"
echo "$LARGEST"
echo ""

# Verify no file exceeds Cloudflare Pages' 25 MiB limit
OVERSIZED=$(find "$DIST" -type f -size +25M)
if [ -n "$OVERSIZED" ]; then
  echo "✗ ERROR — files exceed Cloudflare Pages 25 MiB limit:"
  echo "$OVERSIZED" | while read -r f; do
    SIZE=$(du -h "$f" | cut -f1)
    echo "    $SIZE  $f"
  done
  exit 1
fi

# Optional: deploy
if [ "${1:-}" = "--deploy" ]; then
  echo "→ Deploying to Cloudflare Pages…"
  npx wrangler pages deploy "$DIST" --project-name alreadykit --commit-dirty=true

  # Push URL changes to IndexNow (Bing/Yandex/ChatGPT-Search)
  if [ -x "$SCRIPT_DIR/scripts/indexnow.sh" ]; then
    echo ""
    "$SCRIPT_DIR/scripts/indexnow.sh"
  fi
fi
