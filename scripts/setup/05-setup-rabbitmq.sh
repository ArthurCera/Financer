#!/usr/bin/env bash
# =============================================================================
# 05-setup-rabbitmq.sh — Start RabbitMQ via Docker Compose (idempotent)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[RabbitMQ] Starting container...${NC}"

cd "$PROJECT_ROOT"
docker compose up -d rabbitmq

echo -e "${YELLOW}[RabbitMQ] Waiting for health check (this may take ~20s)...${NC}"

RETRIES=30
until docker compose exec -T rabbitmq rabbitmq-diagnostics ping &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}[RabbitMQ] Timed out waiting for container to be ready.${NC}"
    exit 1
  fi
  sleep 3
done

echo -e "${GREEN}[RabbitMQ] Ready.${NC}"
echo -e "  AMQP:       amqp://guest:guest@localhost:5672"
echo -e "  Management: http://localhost:15672  (guest / guest)"
