#!/usr/bin/env bash
# =============================================================================
# start.sh — Nuke, setup, and run all Financer services
#
# Usage:
#   bash start.sh                  # Full nuke + setup + run
#   bash start.sh --no-llm         # Skip Ollama setup
#   bash start.sh --lite-llm       # Use lighter LLM models (≤8 GB VRAM)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Forward flags to setup-all.sh
SETUP_FLAGS=()
for arg in "$@"; do
  case "$arg" in
    --no-llm|--lite-llm) SETUP_FLAGS+=("$arg") ;;
    *) echo -e "${RED}Unknown flag: $arg${NC}"; exit 1 ;;
  esac
done

# Cleanup on exit
BACKEND_PID=""
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# -------------------------------------------------------------------------
# Step 1: Nuke
# -------------------------------------------------------------------------
echo ""
echo -e "${BOLD}=== Step 1/3: Nuking environment ===${NC}"
echo ""
bash "${SCRIPT_DIR}/scripts/nuke.sh" --force

# -------------------------------------------------------------------------
# Step 2: Setup
# -------------------------------------------------------------------------
echo ""
echo -e "${BOLD}=== Step 2/3: Setting up environment ===${NC}"
echo ""
bash "${SCRIPT_DIR}/scripts/setup-all.sh" "${SETUP_FLAGS[@]+"${SETUP_FLAGS[@]}"}"

# -------------------------------------------------------------------------
# Step 3: Run everything
# -------------------------------------------------------------------------
echo ""
echo -e "${BOLD}=== Step 3/3: Starting all services ===${NC}"
echo ""

# Docker
echo -e "${YELLOW}Starting Docker services...${NC}"
cd "$SCRIPT_DIR" && docker compose up -d

# Ollama
if command -v ollama &>/dev/null && ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
  echo -e "${YELLOW}[Ollama] Starting service...${NC}"
  ollama serve &>/dev/null &
  MAX_WAIT=15
  WAITED=0
  until curl -sf http://localhost:11434/api/tags &>/dev/null; do
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
      echo -e "${YELLOW}[Ollama] Failed to start within ${MAX_WAIT}s — continuing anyway.${NC}"
      break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
  done
  [ "$WAITED" -lt "$MAX_WAIT" ] && echo -e "${GREEN}[Ollama] Service is ready.${NC}"
fi

# Backend (background)
echo -e "${YELLOW}Starting backend services...${NC}"
bash "${SCRIPT_DIR}/scripts/run/run-backend.sh" &
BACKEND_PID=$!

# Wait for health checks
echo -e "${YELLOW}Waiting for backend services to be ready...${NC}"
PORTS=(${AUTH_SERVICE_PORT:-3001} ${EXPENSE_SERVICE_PORT:-3002} ${BUDGET_SERVICE_PORT:-3003} ${INCOME_SERVICE_PORT:-3004} ${DASHBOARD_SERVICE_PORT:-3005} ${LLM_SERVICE_PORT:-3006})
for PORT in "${PORTS[@]}"; do
  RETRIES=30
  until curl -sf "http://localhost:${PORT}/health" &>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
      echo -e "${YELLOW}[warn] Service on :${PORT} did not respond in time — continuing anyway.${NC}"
      break
    fi
    sleep 1
  done
done
echo -e "${GREEN}Backend services ready.${NC}"

# Frontend (foreground)
echo -e "${YELLOW}Starting frontend...${NC}"
bash "${SCRIPT_DIR}/scripts/run/run-frontend.sh"
