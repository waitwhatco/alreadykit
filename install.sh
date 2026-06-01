#!/usr/bin/env bash
set -euo pipefail

# ─── Already installer ────────────────────────────────────────────────────────
# Usage: curl -fsSL https://already.wait-what.shop/install.sh | bash
# Or:    curl -fsSL https://already.wait-what.shop/install.sh | bash -s -- --dir my-saas
# ─────────────────────────────────────────────────────────────────────────────

ALREADY_VERSION="1.0"

# Colours
R='\033[0;31m'; G='\033[0;32m'; Y='\033[0;33m'
B='\033[0;34m'; DIM='\033[2m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${G}✔${NC}  $*"; }
info() { echo -e "${B}→${NC}  $*"; }
warn() { echo -e "${Y}!${NC}  $*"; }
fail() { echo -e "${R}✘${NC}  $*" >&2; exit 1; }
step() { echo; echo -e "${BOLD}$*${NC}"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}Already${NC} ${DIM}v${ALREADY_VERSION} installer${NC}"
echo -e "${DIM}Production-ready Next.js SaaS starter · already.wait-what.shop${NC}"
echo

# ─── OS check ─────────────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin) ;;
  Linux)  warn "Linux detected. Homebrew steps will be skipped — install Node 20+, pnpm 9+, and the Supabase CLI manually if missing." ;;
  *)      fail "Unsupported OS: $OS. Already's installer supports macOS and Linux." ;;
esac

# ─── Argument parsing ─────────────────────────────────────────────────────────
TARGET_DIR=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --dir|-d) TARGET_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ─── Step 1: Homebrew (macOS only) ────────────────────────────────────────────
step "1 / 5 — Checking tools"

if [[ "$OS" == "Darwin" ]]; then
  if ! command -v brew &>/dev/null; then
    info "Homebrew not found — installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ok "Homebrew installed"
  else
    ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
  fi
fi

# ─── Step 2: Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Node.js not found — installing via Homebrew..."
  [[ "$OS" == "Darwin" ]] || fail "Install Node.js 20+ manually: https://nodejs.org"
  brew install node@20
  brew link node@20 --force --overwrite
  ok "Node.js $(node --version)"
else
  NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
  if (( NODE_MAJOR < 20 )); then
    warn "Node.js $(node --version) found — Already requires 20+."
    if [[ "$OS" == "Darwin" ]]; then
      info "Upgrading via Homebrew..."
      brew install node@20 && brew link node@20 --force --overwrite
    else
      fail "Please upgrade Node.js to 20+: https://nodejs.org"
    fi
  fi
  ok "Node.js $(node --version)"
fi

# ─── Step 3: pnpm ─────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  info "pnpm not found — installing..."
  npm install -g pnpm@latest
  ok "pnpm $(pnpm --version)"
else
  PNPM_MAJOR=$(pnpm --version | cut -d. -f1)
  if (( PNPM_MAJOR < 9 )); then
    info "pnpm $(pnpm --version) found — upgrading to 9+..."
    npm install -g pnpm@latest
  fi
  ok "pnpm $(pnpm --version)"
fi

# ─── Step 4: Supabase CLI ─────────────────────────────────────────────────────
if ! command -v supabase &>/dev/null; then
  info "Supabase CLI not found — installing..."
  if [[ "$OS" == "Darwin" ]]; then
    brew install supabase/tap/supabase
  else
    warn "Install the Supabase CLI manually: https://supabase.com/docs/guides/cli"
    warn "Then re-run: pnpm setup"
  fi
  command -v supabase &>/dev/null && ok "Supabase CLI $(supabase --version)"
else
  ok "Supabase CLI $(supabase --version)"
fi

# ─── Step 5: Get the repo ─────────────────────────────────────────────────────
step "2 / 5 — Your Already repository"

echo
echo -e "  ${DIM}After purchase, Polar sends you a GitHub invite. Accept it, then go to${NC}"
echo -e "  ${DIM}${BOLD}github.com/waitwhatco/already-template${NC}${DIM}, click 'Use this template' →${NC}"
echo -e "  ${DIM}'Create a new repository', then paste that repo URL below.${NC}"
echo

if [[ -z "$TARGET_DIR" ]]; then
  read -rp "  Repo URL (github.com/you/your-repo): " REPO_URL
  echo
  read -rp "  Local folder name [my-saas]: " TARGET_DIR
  TARGET_DIR="${TARGET_DIR:-my-saas}"
else
  read -rp "  Repo URL (github.com/you/your-repo): " REPO_URL
fi

# Normalise URL
REPO_URL="${REPO_URL#https://}"
REPO_URL="${REPO_URL#http://}"
REPO_URL="https://${REPO_URL}"

if [[ -d "$TARGET_DIR" ]]; then
  fail "Directory '$TARGET_DIR' already exists. Choose a different name with --dir."
fi

step "3 / 5 — Cloning"
git clone "$REPO_URL" "$TARGET_DIR"
ok "Cloned into ./${TARGET_DIR}"

cd "$TARGET_DIR"

# ─── Step 6: Install dependencies ─────────────────────────────────────────────
step "4 / 5 — Installing dependencies"
pnpm install
ok "Dependencies installed"

# ─── Step 7: Env file ─────────────────────────────────────────────────────────
step "5 / 5 — Environment"

if [[ ! -f ".env.local" ]]; then
  cp .env.example .env.local
  ok "Created .env.local from .env.example"
else
  warn ".env.local already exists — skipping copy"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${G}Already is ready.${NC}"
echo
echo -e "  ${BOLD}What to do next:${NC}"
echo
echo -e "  ${B}1${NC}  Open ${BOLD}.env.local${NC} and fill in your Supabase + Stripe keys"
echo -e "     ${DIM}Docs: https://already.wait-what.shop/docs/#env-vars${NC}"
echo
echo -e "  ${B}2${NC}  Run ${BOLD}pnpm setup${NC}  — validates env, migrates DB, bootstraps Stripe"
echo
echo -e "  ${B}3${NC}  Run ${BOLD}pnpm dev${NC}    — starts Next.js + local Supabase + Stripe listener"
echo
echo -e "  ${B}4${NC}  Open ${BOLD}localhost:3000${NC}"
echo
echo -e "  ${DIM}Full quickstart: https://already.wait-what.shop/docs/${NC}"
echo -e "  ${DIM}Beginner's handbook: https://already.wait-what.shop/guide/${NC}"
echo

cd - > /dev/null
