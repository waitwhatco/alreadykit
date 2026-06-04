#!/usr/bin/env bash
# deploy-site.sh — Deploy alreadykit.com via Cloudflare Worker + static assets
#
# alreadykit.com is served by a CF Worker named "alreadykit" (wrangler.toml).
# This script builds dist/ then runs `wrangler deploy` from the repo root.
#
# Auth: wrangler's OAuth refresh flow — DO NOT pass CLOUDFLARE_API_TOKEN.
# If wrangler reports "Invalid access token", run `wrangler login` once.
#
# Usage:
#   ./scripts/deploy-site.sh
#   ./scripts/deploy-site.sh --dry-run

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "✗ wrangler is not authenticated. Run: npx wrangler login" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "→ Building dist/..."
bash build.sh

echo "  Files: $(find dist -type f | wc -l | tr -d ' ') | Size: $(du -sh dist | cut -f1)"

if $DRY_RUN; then
  echo "  [dry-run] would run: wrangler deploy (worker: alreadykit → alreadykit.com)"
else
  echo "→ Deploying worker to alreadykit.com..."
  npx wrangler deploy 2>&1
  echo "✓ Live at https://alreadykit.com"

  if [ -x "$REPO_ROOT/scripts/indexnow.sh" ]; then
    echo ""
    "$REPO_ROOT/scripts/indexnow.sh"
  fi
fi
