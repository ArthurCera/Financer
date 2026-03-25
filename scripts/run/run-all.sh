#!/usr/bin/env bash
# =============================================================================
# run-all.sh — Interactive menu to start Financer services
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}"
echo "  ███████╗██╗███╗   ██╗ █████╗ ███╗   ██╗ ██████╗███████╗██████╗ "
echo "  ██╔════╝██║████╗  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗"
echo "  █████╗  ██║██╔██╗ ██║███████║██╔██╗ ██║██║     █████╗  ██████╔╝"
echo "  ██╔══╝  ██║██║╚██╗██║██╔══██║██║╚██╗██║██║     ██╔══╝  ██╔══██╗"
echo "  ██║     ██║██║ ╚████║██║  ██║██║ ╚████║╚██████╗███████╗██║  ██║"
echo "  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝"
echo -e "${NC}"

PS3=$'\nSelect an option: '

options=(
  "Start Docker services (PostgreSQL, Redis, RabbitMQ)"
  "Start/check Ollama (LLM service)"
  "Run backend microservices"
  "Run frontend"
  "Run everything (Docker + Ollama + backend + frontend)"
  "Stop Docker services"
  "View Docker logs"
  "Run database migrations"
  "Quit"
)

while true; do
  select opt in "${options[@]}"; do
    case $REPLY in
      1)
        echo -e "${YELLOW}Starting Docker services...${NC}"
        cd "$PROJECT_ROOT" && docker compose up -d
        echo -e "${GREEN}Docker services started.${NC}"
        break
        ;;
      2)
        echo -e "${YELLOW}Checking Ollama...${NC}"
        if ! command -v ollama &>/dev/null; then
          echo -e "${YELLOW}[Ollama] Not installed. Running setup...${NC}"
          bash "${SCRIPT_DIR}/../setup/06-setup-ollama.sh"
        elif ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
          echo -e "${YELLOW}[Ollama] Starting service...${NC}"
          ollama serve &>/dev/null &
          MAX_WAIT=15
          WAITED=0
          until curl -sf http://localhost:11434/api/tags &>/dev/null; do
            if [ "$WAITED" -ge "$MAX_WAIT" ]; then
              echo -e "${YELLOW}[Ollama] Failed to start within ${MAX_WAIT}s.${NC}"
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
        ollama list 2>/dev/null || true
        break
        ;;
      3)
        echo -e "${YELLOW}Starting backend services...${NC}"
        bash "${SCRIPT_DIR}/run-backend.sh"
        break
        ;;
      4)
        echo -e "${YELLOW}Starting frontend...${NC}"
        bash "${SCRIPT_DIR}/run-frontend.sh"
        break
        ;;
      5)
        echo -e "${YELLOW}Starting all services...${NC}"
        cd "$PROJECT_ROOT" && docker compose up -d
        # Ensure Ollama is running for llm-service
        if command -v ollama &>/dev/null && ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
          echo -e "${YELLOW}[Ollama] Starting service...${NC}"
          ollama serve &>/dev/null &
          sleep 3
        fi
        # Run backend in background, wait for all health endpoints before starting frontend
        bash "${SCRIPT_DIR}/run-backend.sh" &
        BACKEND_PID=$!
        echo -e "${YELLOW}Waiting for backend services to be ready...${NC}"
        # Service ports: auth=3001, expense=3002, budget=3003, income=3004, dashboard=3005, llm=3006
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
        bash "${SCRIPT_DIR}/run-frontend.sh"
        kill "$BACKEND_PID" 2>/dev/null || true
        break
        ;;
      6)
        echo -e "${YELLOW}Stopping Docker services...${NC}"
        cd "$PROJECT_ROOT" && docker compose down
        echo -e "${GREEN}Docker services stopped.${NC}"
        break
        ;;
      7)
        cd "$PROJECT_ROOT" && docker compose logs -f
        break
        ;;
      8)
        echo -e "${YELLOW}Running migrations...${NC}"
        bash "${SCRIPT_DIR}/../migrate.sh"
        break
        ;;
      9)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
      *)
        echo "Invalid option. Please choose 1-9."
        ;;
    esac
    break
  done
done
