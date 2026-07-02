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
  ! -name 'graphify-out' \
  ! -name '.DS_Store' \
  ! -name 'build.sh' \
  ! -name 'package.json' \
  ! -name 'package-lock.json' \
  ! -name 'pnpm-lock.yaml' \
  ! -name 'bun.lockb' \
  ! -name 'bun.lock' \
  ! -name 'wrangler.toml' \
  ! -name '*.swp' \
  ! -name '*.bak' \
  -exec cp -r {} "$DIST/" \;

# Remove any markdown files that snuck in
find "$DIST" -name "*.md" -delete 2>/dev/null || true
find "$DIST" -name ".DS_Store" -delete 2>/dev/null || true

echo "→ Normalizing SEO (hreflang, canonical, social tags, sitemap)"
node scripts/seo-normalize.mjs "$DIST"

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

# Optional: deploy. alreadykit.com is a Cloudflare Worker (static-assets
# binding in wrangler.toml), not Pages — deploy with `wrangler deploy`.
if [ "${1:-}" = "--deploy" ]; then
  echo "→ Deploying Worker to alreadykit.com…"
  npx wrangler deploy

  if [ -x "$SCRIPT_DIR/scripts/indexnow.sh" ]; then
    echo ""
    "$SCRIPT_DIR/scripts/indexnow.sh"
  fi
fi
