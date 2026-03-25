#!/usr/bin/env bash
# =============================================================================
# run-backend.sh — Start all backend microservices locally via serverless-offline
#
# Each service runs on its own port (mimicking separate Lambda deployments):
#   auth-service      → :3001
#   expense-service   → :3002
#   budget-service    → :3003
#   income-service    → :3004
#   dashboard-service → :3005
#   llm-service       → :3006
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/apps/backend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Load environment
if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a; source "${PROJECT_ROOT}/.env"; set +a
fi

declare -A SERVICE_PORTS=(
  ["auth-service"]=3001
  ["expense-service"]=3002
  ["budget-service"]=3003
  ["income-service"]=3004
  ["dashboard-service"]=3005
  ["llm-service"]=3006
)

PIDS=()

cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all backend services...${NC}"
  for pid in "${PIDS[@]}"; do
    # Kill the entire process group so child processes (serverless, sed) also terminate
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  # Give processes a moment to exit, then force-kill any survivors
  sleep 1
  for pid in "${PIDS[@]}"; do
    kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  done
  echo -e "${GREEN}All services stopped.${NC}"
}

trap cleanup EXIT INT TERM

# Check if Ollama is running (needed by llm-service)
if command -v ollama &>/dev/null; then
  if ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${YELLOW}[Ollama] Not running — starting service...${NC}"
    ollama serve &>/dev/null &
    OLLAMA_PID=$!
    MAX_WAIT=15
    WAITED=0
    until curl -sf http://localhost:11434/api/tags &>/dev/null; do
      if [ "$WAITED" -ge "$MAX_WAIT" ]; then
        echo -e "${YELLOW}[Ollama] Could not start within ${MAX_WAIT}s — llm-service will have limited functionality.${NC}"
        break
      fi
      sleep 1
      WAITED=$((WAITED + 1))
    done
    if [ "$WAITED" -lt "$MAX_WAIT" ]; then
      echo -e "${GREEN}[Ollama] Service is ready.${NC}"
    fi
  else
    echo -e "${GREEN}[Ollama] Already running.${NC}"
  fi
else
  echo -e "${YELLOW}[Ollama] Not installed — llm-service will have limited functionality. Run scripts/setup/06-setup-ollama.sh to install.${NC}"
fi

echo -e "${BOLD}Starting backend microservices...${NC}"

for SERVICE in "${!SERVICE_PORTS[@]}"; do
  SERVICE_DIR="${BACKEND_DIR}/${SERVICE}"
  PORT="${SERVICE_PORTS[$SERVICE]}"

  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${YELLOW}[${SERVICE}] Directory not found, skipping.${NC}"
    continue
  fi

  echo -e "${YELLOW}[${SERVICE}] Starting on port ${PORT}...${NC}"
  (
    cd "$SERVICE_DIR"
    pnpm serverless offline --httpPort "$PORT" --lambdaPort 0 --noPrependStageInUrl 2>&1 \
      | sed "s/^/[${SERVICE}] /"
  ) &
  PIDS+=($!)
done

if [ ${#PIDS[@]} -eq 0 ]; then
  echo -e "${YELLOW}No services started. Have you run setup first?${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}${BOLD}Backend services running:${NC}"
for SERVICE in "${!SERVICE_PORTS[@]}"; do
  echo -e "  ${SERVICE}: http://localhost:${SERVICE_PORTS[$SERVICE]}"
done
echo ""
echo -e "Press Ctrl+C to stop all services."

# Wait for all background processes
wait
