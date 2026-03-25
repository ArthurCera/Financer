#!/usr/bin/env bash
# =============================================================================
# migrate.sh — Run PostgreSQL migrations in order
#
# Usage:
#   bash scripts/migrate.sh           Run all pending migrations
#   bash scripts/migrate.sh --seed    Also run seed data
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${PROJECT_ROOT}/apps/backend/shared/db/migrations"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

RUN_SEED=false
for arg in "$@"; do
  case $arg in
    --seed) RUN_SEED=true ;;
  esac
done

# Load .env
if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a; source "${PROJECT_ROOT}/.env"; set +a
fi

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGDATABASE="${POSTGRES_DB:-financer}"
PGUSER="${POSTGRES_USER:-financer}"
export PGPASSWORD="${POSTGRES_PASSWORD:-financer_local}"

# Use local psql if available, otherwise run through the Docker container
if command -v psql &>/dev/null; then
  run_sql() {
    local file="$1"
    psql -h "$PGHOST" -p "$PGPORT" -d "$PGDATABASE" -U "$PGUSER" -f "$file" -v ON_ERROR_STOP=1
  }
else
  echo -e "${YELLOW}[Migrate] psql not found locally — running via Docker container${NC}"
  run_sql() {
    local file="$1"
    # Copy SQL into the container and execute it there
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" exec -T postgres \
      psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$file"
  }
fi

echo -e "${YELLOW}[Migrate] Running migrations from ${MIGRATIONS_DIR}${NC}"

# Run numbered migrations in order (001_, 002_, ... — excludes 000_seed_categories.sql)
for migration in $(ls "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | grep -v '000_seed' | sort); do
  filename=$(basename "$migration")
  echo -e "${YELLOW}[Migrate] Applying: ${filename}${NC}"
  run_sql "$migration"
  echo -e "${GREEN}[Migrate] Done: ${filename}${NC}"
done

# Optionally run seed
if [ "$RUN_SEED" = true ]; then
  SEED_FILE="${MIGRATIONS_DIR}/000_seed_categories.sql"
  if [ -f "$SEED_FILE" ]; then
    echo -e "${YELLOW}[Migrate] Seeding categories...${NC}"
    run_sql "$SEED_FILE"
    echo -e "${GREEN}[Migrate] Seed complete.${NC}"
  fi
fi

echo -e "${GREEN}[Migrate] All migrations applied successfully.${NC}"
