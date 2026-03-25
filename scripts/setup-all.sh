#!/usr/bin/env bash
# =============================================================================
# setup-all.sh — Run all setup scripts in order
#
# Usage:
#   bash scripts/setup-all.sh              Run everything (full LLM models)
#   bash scripts/setup-all.sh --no-llm    Skip Ollama (fastest, no LLM)
#   bash scripts/setup-all.sh --lite-llm  Pull smaller models (≤8 GB VRAM total)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_LLM=false
LITE_LLM=false

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

for arg in "$@"; do
  case $arg in
    --no-llm)   SKIP_LLM=true ;;
    --lite-llm) LITE_LLM=true ;;
  esac
done

echo -e "${BOLD}======================================================"
echo -e "  Financer — Local Environment Setup"
echo -e "======================================================${NC}"

# Load .env if it exists
if [ -f "${SCRIPT_DIR}/../.env" ]; then
  set -a; source "${SCRIPT_DIR}/../.env"; set +a
  echo -e "${GREEN}[Setup] Loaded .env${NC}"
elif [ -f "${SCRIPT_DIR}/../.env.example" ]; then
  echo -e "${YELLOW}[Setup] .env not found. Copying from .env.example...${NC}"
  cp "${SCRIPT_DIR}/../.env.example" "${SCRIPT_DIR}/../.env"
  set -a; source "${SCRIPT_DIR}/../.env"; set +a
fi

echo ""
echo -e "${YELLOW}[1/8] Installing Node.js...${NC}"
bash "${SCRIPT_DIR}/setup/01-install-node.sh"

echo ""
echo -e "${YELLOW}[2/8] Installing pnpm...${NC}"
bash "${SCRIPT_DIR}/setup/02-install-pnpm.sh"
# Ensure pnpm is on PATH for subsequent steps
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"

echo ""
echo -e "${YELLOW}[3/8] Installing workspace dependencies...${NC}"
pnpm install

# ---------------------------------------------------------------------------
# Docker access check — must happen before any docker compose step
# ---------------------------------------------------------------------------
if ! docker info &>/dev/null 2>&1; then
  echo -e "${RED}[Setup] Docker is not accessible with the current user.${NC}"
  echo -e "${YELLOW}  Option 1 (one-time, requires re-login):${NC}"
  echo -e "    sudo usermod -aG docker \$USER && newgrp docker"
  echo -e "${YELLOW}  Option 2 (this session only):${NC}"
  echo -e "    sg docker -c \"bash scripts/setup-all.sh $*\""
  exit 1
fi

echo ""
echo -e "${YELLOW}[4/8] Setting up PostgreSQL...${NC}"
bash "${SCRIPT_DIR}/setup/03-setup-postgres.sh"

echo ""
echo -e "${YELLOW}[5/8] Running migrations + seeding categories...${NC}"
bash "${SCRIPT_DIR}/migrate.sh" --seed

echo ""
echo -e "${YELLOW}[6/8] Setting up Redis...${NC}"
bash "${SCRIPT_DIR}/setup/04-setup-redis.sh"

echo ""
echo -e "${YELLOW}[7/8] Setting up RabbitMQ...${NC}"
bash "${SCRIPT_DIR}/setup/05-setup-rabbitmq.sh"

echo ""
if [ "$SKIP_LLM" = true ]; then
  echo -e "${YELLOW}[8/8] Skipping Ollama (--no-llm flag set).${NC}"
elif [ "$LITE_LLM" = true ]; then
  echo -e "${YELLOW}[8/8] Setting up Ollama (lite models — ~4 GB peak VRAM)...${NC}"
  bash "${SCRIPT_DIR}/setup/06-setup-ollama-lite.sh"
else
  echo -e "${YELLOW}[8/8] Setting up Ollama (full models — ~8 GB peak VRAM)...${NC}"
  bash "${SCRIPT_DIR}/setup/06-setup-ollama.sh"
fi

echo ""
echo -e "${BOLD}${GREEN}======================================================"
echo -e "  Setup complete!"
echo -e "======================================================${NC}"
echo -e "  Run ${BOLD}bash scripts/run/run-all.sh${NC} to start all services."
echo -e "  Frontend: ${BOLD}cd apps/frontend && pnpm dev${NC} (port 5173)"
