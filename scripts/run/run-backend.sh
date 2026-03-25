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
    kill "$pid" 2>/dev/null || true
  done
  echo -e "${GREEN}All services stopped.${NC}"
}

trap cleanup EXIT INT TERM

echo -e "${BOLD}Starting backend microservices...${NC}"

for SERVICE in "${!SERVICE_PORTS[@]}"; do
  SERVICE_DIR="${BACKEND_DIR}/${SERVICE}"
  PORT="${SERVICE_PORTS[$SERVICE]}"

  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${YELLOW}[${SERVICE}] Directory not found, skipping.${NC}"
    continue
  fi

  LAMBDA_PORT=$((PORT + 1000))
  echo -e "${YELLOW}[${SERVICE}] Starting on port ${PORT} (lambda: ${LAMBDA_PORT})...${NC}"
  (
    cd "$SERVICE_DIR"
    pnpm serverless offline --httpPort "$PORT" --lambdaPort "$LAMBDA_PORT" --noPrependStageInUrl 2>&1 \
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
