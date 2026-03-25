#!/usr/bin/env bash
# =============================================================================
# run-frontend.sh — Start the Vue 3 frontend dev server
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/apps/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "${YELLOW}[Frontend] apps/frontend not found. Has the frontend been scaffolded yet?${NC}"
  exit 1
fi

# Load environment
if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a; source "${PROJECT_ROOT}/.env"; set +a
fi

echo -e "${YELLOW}[Frontend] Starting Vue dev server...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[Frontend] Installing dependencies...${NC}"
  pnpm install
fi

pnpm dev
