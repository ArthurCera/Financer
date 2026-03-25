#!/usr/bin/env bash
# =============================================================================
# nuke.sh — Wipe the local Financer environment for a clean reinstall
#
# Usage:
#   bash scripts/nuke.sh           Interactive — prompts before each step
#   bash scripts/nuke.sh --force   Skip all prompts (CI / full reset)
#
# What gets removed:
#   - Docker containers + named volumes (wipes all DB/Redis/RabbitMQ data)
#   - All node_modules/ directories
#   - All dist/ build output directories
#   - pnpm-lock.yaml (optional)
#   - .env (optional)
#
# What is NEVER touched:
#   - .git/
#   - plans/
#   - infra/
#   - scripts/
#   - Source code (src/, apps/, packages/)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

FORCE=false
for arg in "$@"; do
  case $arg in
    --force) FORCE=true ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

confirm() {
  local prompt="$1"
  if [ "$FORCE" = true ]; then
    return 0
  fi
  read -rp "$prompt [y/N] " answer
  case "$answer" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

step() {
  echo -e "\n${BOLD}${YELLOW}▶ $1${NC}"
}

ok() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

skip() {
  echo -e "  – $1 (skipped)"
}

# ---------------------------------------------------------------------------
# Warning banner
# ---------------------------------------------------------------------------

echo -e "${RED}${BOLD}"
echo "  ███╗   ██╗██╗   ██╗██╗  ██╗███████╗"
echo "  ████╗  ██║██║   ██║██║ ██╔╝██╔════╝"
echo "  ██╔██╗ ██║██║   ██║█████╔╝ █████╗  "
echo "  ██║╚██╗██║██║   ██║██╔═██╗ ██╔══╝  "
echo "  ██║ ╚████║╚██████╔╝██║  ██╗███████╗"
echo "  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝"
echo -e "${NC}"
echo -e "${BOLD}This will destroy your local Financer environment.${NC}"
echo -e "Docker volumes (DB data), node_modules, and build artifacts will be deleted."
echo ""

if [ "$FORCE" = false ]; then
  if ! confirm "Are you sure you want to proceed?"; then
    echo -e "${GREEN}Aborted. Nothing was changed.${NC}"
    exit 0
  fi
fi

cd "$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Step 1 — Docker containers + volumes
# ---------------------------------------------------------------------------
step "Stopping and removing Docker containers + volumes"

if command -v docker &>/dev/null && docker compose version &>/dev/null 2>&1; then
  docker compose down -v --remove-orphans 2>&1 && ok "Docker containers and volumes removed" \
    || echo -e "  ${YELLOW}Warning: docker compose down failed (containers may already be stopped)${NC}"
else
  skip "Docker not available"
fi

# ---------------------------------------------------------------------------
# Step 2 — node_modules
# ---------------------------------------------------------------------------
step "Removing node_modules directories"

NODE_MODULES_DIRS=$(find . \
  -name 'node_modules' \
  -type d \
  -not -path '*/.git/*' \
  -prune \
  -print 2>/dev/null)

if [ -n "$NODE_MODULES_DIRS" ]; then
  COUNT=$(echo "$NODE_MODULES_DIRS" | wc -l | tr -d ' ')
  echo "  Found ${COUNT} node_modules director$([ "$COUNT" -eq 1 ] && echo 'y' || echo 'ies'):"
  echo "$NODE_MODULES_DIRS" | sed 's/^/    /'
  echo ""
  find . \
    -name 'node_modules' \
    -type d \
    -not -path '*/.git/*' \
    -prune \
    -exec rm -rf {} + 2>/dev/null || true
  ok "node_modules removed"
else
  skip "No node_modules found"
fi

# ---------------------------------------------------------------------------
# Step 3 — dist/ build outputs
# ---------------------------------------------------------------------------
step "Removing dist/ build directories"

DIST_DIRS=$(find . \
  -name 'dist' \
  -type d \
  -not -path '*/.git/*' \
  -not -path '*/node_modules/*' \
  -prune \
  -print 2>/dev/null)

if [ -n "$DIST_DIRS" ]; then
  find . \
    -name 'dist' \
    -type d \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -prune \
    -exec rm -rf {} + 2>/dev/null || true
  ok "dist/ directories removed"
else
  skip "No dist/ directories found"
fi

# ---------------------------------------------------------------------------
# Step 4 — pnpm-lock.yaml (optional)
# ---------------------------------------------------------------------------
step "pnpm-lock.yaml"

if [ -f "pnpm-lock.yaml" ]; then
  if confirm "  Remove pnpm-lock.yaml? (forces fresh dependency resolution)"; then
    rm -f pnpm-lock.yaml
    ok "pnpm-lock.yaml removed"
  else
    skip "pnpm-lock.yaml"
  fi
else
  skip "pnpm-lock.yaml not found"
fi

# ---------------------------------------------------------------------------
# Step 5 — .env (optional, extra warning)
# ---------------------------------------------------------------------------
step ".env file"

if [ -f ".env" ]; then
  echo -e "  ${YELLOW}Warning: removing .env will delete your local configuration.${NC}"
  echo -e "  You will need to run ${BOLD}cp .env.example .env${NC} and reconfigure before setup."
  if confirm "  Remove .env?"; then
    rm -f .env
    ok ".env removed"
  else
    skip ".env"
  fi
else
  skip ".env not found"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${GREEN}======================================================"
echo -e "  Environment wiped."
echo -e "======================================================${NC}"
echo ""
echo -e "To set up from scratch:"
echo -e "  ${BOLD}cp .env.example .env${NC}"
echo -e "  ${BOLD}bash scripts/setup-all.sh${NC}"
echo ""
echo -e "${YELLOW}Note: If Docker permission errors occur, run once:${NC}"
echo -e "  ${BOLD}sudo usermod -aG docker \$USER && newgrp docker${NC}"
