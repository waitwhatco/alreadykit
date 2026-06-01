#!/usr/bin/env bash
# deploy-site.sh — Deploy alreadykit.com to Cloudflare Pages
#
# CF Pages is NOT connected to GitHub (direct upload mode).
# Run this after every commit that touches landing site files.
#
# Auth: wrangler's OAuth refresh flow — DO NOT pass CLOUDFLARE_API_TOKEN.
# If wrangler reports "Invalid access token", run `wrangler login` once.
# Rationale + reference in .cursor/rules/cloudflare.mdc
#
# Usage:
#   ./scripts/deploy-site.sh
#   ./scripts/deploy-site.sh --dry-run

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# Confirm wrangler can talk to Cloudflare. If this fails the user needs
# `wrangler login` — paste-a-token-into-keychain is NOT the workaround.
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "✗ wrangler is not authenticated. Run: npx wrangler login" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEPLOY_DIR="$(mktemp -d)"
trap 'rm -rf "$DEPLOY_DIR"' EXIT

echo "→ Assembling deploy directory..."
rsync -a \
  --exclude='template/' \
  --exclude='.claude/' \
  --exclude='.cursor/' \
  --exclude='.gstack/' \
  --exclude='node_modules/' \
  --exclude='.wrangler/' \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='.cfignore' \
  --exclude='*.md' \
  --exclude='scripts/' \
  "$REPO_ROOT/" "$DEPLOY_DIR/"

echo "  Files: $(find "$DEPLOY_DIR" -type f | wc -l | tr -d ' ') | Size: $(du -sh "$DEPLOY_DIR" | cut -f1)"

if $DRY_RUN; then
  echo "  [dry-run] would deploy $DEPLOY_DIR to CF Pages project 'already'"
  echo "  Contents: $(ls "$DEPLOY_DIR" | tr '\n' ' ')"
else
  echo "→ Deploying to Cloudflare Pages..."
  npx wrangler pages deploy "$DEPLOY_DIR" \
    --project-name already \
    --branch main 2>&1
  echo "✓ Live at https://alreadykit.com"
fi
