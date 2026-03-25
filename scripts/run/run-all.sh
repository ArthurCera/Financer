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
  "Run backend microservices"
  "Run frontend"
  "Run everything (Docker + backend + frontend)"
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
        echo -e "${YELLOW}Starting backend services...${NC}"
        bash "${SCRIPT_DIR}/run-backend.sh"
        break
        ;;
      3)
        echo -e "${YELLOW}Starting frontend...${NC}"
        bash "${SCRIPT_DIR}/run-frontend.sh"
        break
        ;;
      4)
        echo -e "${YELLOW}Starting all services...${NC}"
        cd "$PROJECT_ROOT" && docker compose up -d
        # Run backend in background, wait for all health endpoints before starting frontend
        bash "${SCRIPT_DIR}/run-backend.sh" &
        BACKEND_PID=$!
        echo -e "${YELLOW}Waiting for backend services to be ready...${NC}"
        PORTS=(3001 3002 3003 3004 3005)
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
      5)
        echo -e "${YELLOW}Stopping Docker services...${NC}"
        cd "$PROJECT_ROOT" && docker compose down
        echo -e "${GREEN}Docker services stopped.${NC}"
        break
        ;;
      6)
        cd "$PROJECT_ROOT" && docker compose logs -f
        break
        ;;
      7)
        echo -e "${YELLOW}Running migrations...${NC}"
        bash "${SCRIPT_DIR}/../migrate.sh"
        break
        ;;
      8)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
      *)
        echo "Invalid option. Please choose 1-8."
        ;;
    esac
    break
  done
done
