#!/usr/bin/env bash
# =============================================================================
# 03-setup-postgres.sh — Start PostgreSQL via Docker Compose (idempotent)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[PostgreSQL] Starting container...${NC}"

cd "$PROJECT_ROOT"

# Start only postgres
docker compose up -d postgres

echo -e "${YELLOW}[PostgreSQL] Waiting for health check...${NC}"

RETRIES=30
until docker compose exec -T postgres pg_isready -U financer -d financer &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}[PostgreSQL] Timed out waiting for container to be ready.${NC}"
    exit 1
  fi
  echo -e "${YELLOW}[PostgreSQL] Not ready yet, retrying... (${RETRIES} left)${NC}"
  sleep 2
done

echo -e "${GREEN}[PostgreSQL] Container is healthy.${NC}"
echo -e "${GREEN}[PostgreSQL] Setup complete.${NC}"
echo -e "  Host: localhost:5432"
echo -e "  Database: financer"
echo -e "  User: financer"
