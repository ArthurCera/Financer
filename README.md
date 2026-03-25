# Financer

A full-stack personal finance organizer with AI capabilities. Manage expenses, budgets, and income — with LLM-powered categorization, OCR receipt scanning, and a contextual chat assistant.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20+ + TypeScript — microservices (AWS Lambda style) |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia |
| Database | PostgreSQL 16 + pgvector extension |
| Cache | Redis 7 — dashboard cache-aside, LLM rate limiting |
| Message Queue | RabbitMQ 3 — async LLM job queue |
| LLM | Ollama (local) — `qwen3.5:9b` (chat), `glm-ocr` (payslip OCR), `bge-m3` (embeddings) |
| ORM | Drizzle ORM |
| DI Container | tsyringe |
| Infrastructure | Serverless Framework (local) + Mock Terraform (AWS) |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
Financer/
├── apps/
│   ├── backend/
│   │   ├── shared/               # Shared interfaces, abstracts, DB clients, types
│   │   │   ├── interfaces/       # IRepository, ILLMProvider, ICacheService, etc.
│   │   │   ├── abstracts/        # BaseLLMProvider, BaseRepository
│   │   │   ├── types/            # Domain DTOs and error classes
│   │   │   └── db/               # postgres.client.ts, redis.client.ts, migrations/
│   │   ├── auth-service/         # JWT auth — port 3001
│   │   ├── expense-service/      # Expense CRUD — port 3002
│   │   ├── budget-service/       # Budget management — port 3003
│   │   ├── income-service/       # Income records — port 3004
│   │   ├── dashboard-service/    # Aggregated summary (Redis cached) — port 3005
│   │   └── llm-service/          # LLM, OCR, vector search — port 3006
│   └── frontend/                 # Vue 3 SPA (includes e2e/ Playwright tests)
├── packages/
│   └── shared/                   # Frontend+backend shared types and API contracts
├── scripts/
│   ├── setup/                    # Idempotent install scripts (Node, pnpm, Docker services, Ollama)
│   ├── run/                      # Dev runner scripts (interactive menu, backend, frontend)
│   ├── setup-all.sh              # Run all setup scripts
│   └── migrate.sh                # Run DB migrations
├── infra/
│   └── terraform/                # Mock AWS IaC (Lambda, RDS, ElastiCache, MQ, API Gateway)
├── tests/
│   └── backend/                  # Vitest E2E tests for all 6 microservices
├── docker-compose.yml            # Local PostgreSQL, Redis, RabbitMQ
├── docker-init/                  # SQL run at PostgreSQL container start
├── .env.example                  # All environment variables with defaults
├── vitest.config.ts              # Backend test configuration
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Prerequisites

- **Docker Desktop** with WSL2 integration enabled
  - Settings → Resources → WSL Integration → enable for your distro → Apply & Restart
- **Node.js** >= 20 (`node -v` to check)
- **pnpm** >= 9 — installed automatically by setup script if missing

---

## Quick Start

### Option A — Automated setup (recommended for first time)

Installs Node, pnpm, dependencies, Docker services, migrations, seeds, and Ollama:

```bash
# Full setup — pulls all LLM models (~8 GB peak VRAM)
bash scripts/setup-all.sh

# Lite LLM — smaller models, ≤4 GB VRAM
bash scripts/setup-all.sh --lite-llm

# No LLM — fastest, skips Ollama entirely
bash scripts/setup-all.sh --no-llm
```

Then start everything:

```bash
bash scripts/run/run-all.sh
```

### Option B — Manual setup (if you already have Node 20+ and pnpm)

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install all workspace dependencies
pnpm install

# 3. Start Docker services (PostgreSQL, Redis, RabbitMQ)
pnpm run docker:up

# 4. Run database migrations (creates tables, admin user, demo data, and seeds categories)
bash scripts/migrate.sh --seed

# 5. Start the interactive run menu
bash scripts/run/run-all.sh
```

> **Docker permission on Linux/WSL2:** If you see a Docker socket permission error, either
> run `sudo usermod -aG docker $USER && newgrp docker` (permanent, requires re-login) or
> prefix with `sg docker -c "bash scripts/setup-all.sh"` for the current session only.

---

## LLM Model Requirements

| | Full | Lite (`--lite-llm`) |
|---|---|---|
| **OCR** | `glm-ocr` — ~6–8 GB | `moondream` — ~4 GB |
| **Chat / Categorisation** | `qwen3.5:9b` — ~5–6 GB (4-bit) | `phi4-mini` — ~3 GB |
| **Embeddings** | `bge-m3` — <1 GB (1024 dims) | `nomic-embed-text` — <1 GB (768 dims) |
| **Peak VRAM** | ~8 GB (one model loaded at a time) | ~4 GB |

> When using lite embeddings, set `OLLAMA_EMBED_DIMENSIONS=768` in `.env`.
> If you already ran migrations with the default `1024` schema, run `nuke + setup` to recreate the vector column.

---

## Running Services

### Interactive menu (recommended)
```bash
bash scripts/run/run-all.sh
# or
pnpm dev
```

Options presented:
1. Start Docker services
2. Run backend microservices
3. Run frontend
4. Run everything
5. Stop Docker services
6. View Docker logs
7. Run database migrations

### Manual

```bash
# Docker services only
pnpm run docker:up

# Backend microservices only (ports 3001–3006)
bash scripts/run/run-backend.sh

# Frontend only
bash scripts/run/run-frontend.sh

# Stop Docker
pnpm run docker:down

# Follow Docker logs
pnpm run docker:logs
```

---

## Service Ports

| Service | Port | Routes |
|---|---|---|
| auth-service | 3001 | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| expense-service | 3002 | `GET/POST /expenses`, `PUT/DELETE /expenses/:id` |
| budget-service | 3003 | `GET/POST /budgets`, `PUT/DELETE /budgets/:id` |
| income-service | 3004 | `GET/POST /income`, `PUT/DELETE /income/:id` |
| dashboard-service | 3005 | `GET /dashboard`, `GET /admin/users`, `GET /admin/stats`, `GET /admin/llm-usage` |
| llm-service | 3006 | `POST /llm/ocr`, `POST /llm/categorize`, `POST /llm/categorize-batch`, `POST /llm/chat`, `GET /llm/chat/history` |

Health check endpoint on every service: `GET /health`

```bash
curl http://localhost:3001/health
# {"success":true,"data":{"service":"auth-service","status":"ok"}}
```

---

## Database Migrations

Migrations live in `apps/backend/shared/db/migrations/` and run in filename order.

```bash
# Run all migrations
bash scripts/migrate.sh

# Run migrations + seed default categories
bash scripts/migrate.sh --seed
```

Migration files:

| File | Description |
|---|---|
| `001_create_extensions.sql` | Enables `uuid-ossp` and `vector` (pgvector) |
| `002_create_users.sql` | Users table with `updated_at` trigger |
| `003_create_categories.sql` | Expense categories |
| `004_create_expenses.sql` | Expenses with category FK and period index |
| `005_create_budgets.sql` | Budgets per category per month |
| `006_create_incomes.sql` | Income records |
| `007_create_llm_chats.sql` | Chat history with HNSW vector index |
| `008_add_user_roles.sql` | Adds `role` column to users (`user` / `admin`) |
| `009_seed_admin_and_demo.sql` | Admin user + demo user with sample data |
| `000_seed_categories.sql` | 10 default categories (Food, Transport, Housing…) |

---

## Environment Variables

All variables are documented in `.env.example`. Key ones:

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `financer` | Database name |
| `POSTGRES_USER` | `financer` | Database user |
| `POSTGRES_PASSWORD` | `financer_local` | Database password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | RabbitMQ connection string |
| `JWT_SECRET` | *(change this)* | JWT signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_CHAT_MODEL` | `qwen3.5:9b` | Expense categorisation & chat |
| `OLLAMA_OCR_MODEL` | `glm-ocr` | Payslip / receipt OCR |
| `OLLAMA_EMBED_MODEL` | `bge-m3` | Vector embeddings |
| `OLLAMA_EMBED_DIMENSIONS` | `1024` | Embedding vector size (bge-m3) |

---

## Default Users

After running migrations, two users are seeded automatically:

| User | Email | Password | Role |
|---|---|---|---|
| Admin | `root@financer.local` | `root` | admin |
| Demo | `demo@financer.local` | `demo` | user |

The demo user comes with sample expenses, budgets, and income for the current month. The admin user has access to the admin dashboard (`/admin`) with system stats, user management, and LLM usage metrics.

---

## Setup Scripts

Individual scripts in `scripts/setup/` — each is idempotent (safe to re-run):

| Script | What it does |
|---|---|
| `01-install-node.sh` | Installs Node.js via nvm if not present |
| `02-install-pnpm.sh` | Installs pnpm if not present |
| `03-setup-postgres.sh` | Starts PostgreSQL container and runs migrations |
| `04-setup-redis.sh` | Starts Redis container |
| `05-setup-rabbitmq.sh` | Starts RabbitMQ container (management UI on :15672) |
| `06-setup-ollama.sh` | Installs Ollama and pulls `qwen3.5:9b`, `glm-ocr`, `bge-m3` (full — ~17 GB) |
| `06-setup-ollama-lite.sh` | Installs Ollama and pulls `phi4-mini`, `moondream`, `nomic-embed-text` (lite — ~8 GB) |

```bash
# Run all at once
bash scripts/setup-all.sh

# Skip Ollama (faster setup for non-LLM development)
bash scripts/setup-all.sh --no-llm
```

---

## Infrastructure (Mock Terraform)

The `infra/terraform/` directory contains valid Terraform that mirrors the production AWS architecture. It is **not applied automatically** — it serves as deployment documentation and a starting point for real provisioning.

Modules:

| Module | AWS Service |
|---|---|
| `vpc` | VPC, public/private subnets, NAT gateway |
| `rds` | RDS PostgreSQL 16 (pgvector compatible) |
| `elasticache` | ElastiCache Redis 7 |
| `mq` | AmazonMQ (RabbitMQ 3.13) |
| `lambda` | One reusable Lambda module called per service |
| `api_gateway` | HTTP API Gateway routing to Lambda functions |

To use it for real:
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in terraform.tfvars with real values
terraform init
terraform plan
```

---

## Development Phases

### Phase 1 — Environment & Infrastructure (complete)
- [x] pnpm monorepo scaffold
- [x] Docker Compose (PostgreSQL + pgvector, Redis, RabbitMQ)
- [x] Idempotent setup scripts
- [x] Database schema and migration runner
- [x] `apps/backend/shared/` — all interfaces, abstract classes, DB clients
- [x] 5 microservice scaffolds with serverless-offline
- [x] Mock Terraform for AWS

### Phase 2 — Core Backend + Frontend (complete)
- [x] Auth service — JWT register/login/refresh/me + Redis refresh token storage
- [x] Expense, Budget, Income services — full CRUD with ownership validation
- [x] Dashboard service — aggregated monthly summary with Redis cache (5 min TTL)
- [x] Vue 3 frontend — login, dashboard (ApexCharts), CRUD pages, Pinia stores, JWT interceptors

### Phase 3 — LLM Features (complete)
- [x] OCR endpoint — upload receipt/payslip image, extract structured expense data
- [x] Auto-categorize — per expense or batch for a month (RabbitMQ async queue)
- [x] Chat — context-aware RAG chat with pgvector similarity search
- [x] Frontend — receipt image upload in expense form, auto-categorize button, floating chat widget
- [x] OllamaProvider (extends BaseLLMProvider) — retry, rate limiting, structured JSON output
- [x] OllamaOCRProvider — vision model integration with Zod validation fallback
- [x] PgVectorRepository — raw SQL vector operations with HNSW index
- [x] RabbitMQService — async batch categorization job queue

### Phase 4 — Admin & Code Quality (complete)
- [x] Admin dashboard — system stats, user management, LLM usage metrics
- [x] Role-based access control — JWT role claim, admin middleware, frontend route guards
- [x] Admin/client view toggle — segmented control in layout header
- [x] Seeded admin user (root/root) and demo user with sample data
- [x] Code review — extracted shared utilities (date, formatting, error handling, constants)
- [x] Fixed N+1 queries in dashboard repository (batch category lookups)
- [x] Proper error classes (ForbiddenError, RateLimitError)

---

## Testing

### Backend E2E Tests

59 tests across all 6 microservices using **Vitest**. Tests make real HTTP requests against running services.

```bash
# Start backend services first
pnpm dev:backend

# Run tests
pnpm test:backend

# Watch mode
pnpm test:backend:watch
```

| Test file | Service | Tests | Coverage |
|---|---|---|---|
| `auth.test.ts` | auth (3001) | 12 | register, login, refresh, profile, admin role, validation |
| `expense.test.ts` | expense (3002) | 8 | CRUD lifecycle, auth, ownership, validation |
| `budget.test.ts` | budget (3003) | 8 | CRUD lifecycle, auth, ownership, validation |
| `income.test.ts` | income (3004) | 8 | CRUD lifecycle, auth, ownership, validation |
| `dashboard.test.ts` | dashboard (3005) | 11 | summary, period params, admin users/stats/llm-usage, role enforcement |
| `llm.test.ts` | llm (3006) | 12 | health, OCR, categorize, batch, chat, history, auth enforcement |

### Frontend E2E Tests

30 test specs using **Playwright** (Chromium). Tests run against the full stack (backend + frontend).

```bash
# Install browser (first time only)
cd apps/frontend && npx playwright install --with-deps chromium

# Run tests (backend + frontend must be running)
pnpm --filter @financer/frontend test:e2e

# Headed mode (visible browser)
pnpm --filter @financer/frontend test:e2e:headed
```

Test specs: `auth`, `dashboard`, `expenses`, `budgets`, `income`, `admin`, `chat`.

---

## Architecture Notes

All backend code follows **SOLID principles** and **Clean Code** — non-negotiable:

- Every service's business logic is defined behind an **interface**. No concrete class is ever exposed across service boundaries.
- **Constructor injection only** — no `new ConcreteClass()` in business logic, no service locator.
- **No cross-service imports** — services only import from `apps/backend/shared/`.
- **LLM, OCR, Vector DB, Queue, and Cache** are behind abstract classes. The concrete provider (Ollama, pgvector, RabbitMQ, Redis) is swappable by changing a single binding.

Key abstractions:

| Interface | Concrete implementation | Used by |
|---|---|---|
| `ILLMProvider` | `OllamaProvider` (Phase 3) | llm-service |
| `IVectorRepository` | `PgVectorRepository` (Phase 3) | llm-service |
| `IOCRProvider` | `OllamaOCRProvider` (Phase 3) | llm-service |
| `IQueueService` | `RabbitMQService` (Phase 3) | llm-service |
| `ICacheService` | `RedisService` | dashboard-service, auth-service, llm-service |
| `IRepository<T>` | Per-entity repository classes | All services |
