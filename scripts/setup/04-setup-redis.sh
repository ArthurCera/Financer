#!/usr/bin/env bash
# =============================================================================
# 04-setup-redis.sh — Start Redis via Docker Compose (idempotent)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[Redis] Starting container...${NC}"

cd "$PROJECT_ROOT"
docker compose up -d redis

echo -e "${YELLOW}[Redis] Waiting for health check...${NC}"

RETRIES=20
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}[Redis] Timed out waiting for container to be ready.${NC}"
    exit 1
  fi
  sleep 2
done

echo -e "${GREEN}[Redis] Ready at localhost:6379${NC}"
