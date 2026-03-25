# Financer

A full-stack personal finance organizer with AI capabilities. Manage expenses, budgets, and income — with LLM-powered categorization, OCR receipt scanning, and a contextual chat assistant.

---

## Project Overview

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20+ + TypeScript — 6 microservices (AWS Lambda style) |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia |
| Database | PostgreSQL 16 + pgvector extension |
| Cache | Redis 7 — dashboard cache-aside, sliding-window rate limiting |
| Message Queue | RabbitMQ 3 — async LLM job queue with DLX/DLQ |
| LLM | Ollama (local) — `qwen3.5:9b` (chat), `glm-ocr` (OCR), `bge-m3` (embeddings) |
| ORM | Drizzle ORM |
| DI Container | tsyringe |
| Infrastructure | Serverless Framework (local) + Terraform (AWS) |
| Monorepo | pnpm workspaces |

### Project Structure

```
Financer/
├── apps/
│   ├── backend/
│   │   ├── shared/               # Shared library for all microservices
│   │   │   ├── interfaces/       # IRepository, ILLMProvider, ICacheService, etc.
│   │   │   ├── abstracts/        # BaseLLMProvider, BaseRepository
│   │   │   ├── types/            # Domain DTOs and error classes
│   │   │   ├── repositories/     # CategoryRepository, ExpenseRepository (shared)
│   │   │   ├── services/         # RedisService (ICacheService impl)
│   │   │   ├── middleware/       # JWT auth middleware
│   │   │   ├── utils/            # Response helpers, JWT, error handler, ownership
│   │   │   └── db/               # Drizzle client, Redis client, schema, migrations
│   │   ├── auth-service/         # JWT auth — port 3001
│   │   ├── expense-service/      # Expense + Category CRUD — port 3002
│   │   ├── budget-service/       # Budget management — port 3003
│   │   ├── income-service/       # Income records — port 3004
│   │   ├── dashboard-service/    # Aggregated summary + admin panel — port 3005
│   │   └── llm-service/          # LLM, OCR, chat, vector search — port 3006 (+3007 SSE)
│   └── frontend/                 # Vue 3 SPA (includes e2e/ Playwright tests)
├── packages/
│   └── shared/                   # Frontend+backend shared types and API contracts
├── scripts/
│   ├── setup/                    # Idempotent install scripts (Node, pnpm, Docker, Ollama)
│   ├── run/                      # Dev runners (interactive menu, backend, frontend)
│   ├── setup-all.sh              # Run all setup scripts
│   ├── migrate.sh                # Run DB migrations
│   └── nuke.sh                   # Tear down and rebuild everything
├── infra/
│   └── terraform/                # AWS IaC (VPC, RDS, Lambda, ECS, API GW, S3+CloudFront)
├── tests/
│   └── backend/                  # Vitest E2E tests for all 6 microservices
├── docker-compose.yml            # Local PostgreSQL, Redis, RabbitMQ
├── docker-init/                  # SQL run at PostgreSQL container start (pgvector)
├── .env.example                  # All environment variables with defaults
├── eslint.config.mjs             # Flat ESLint config (TS + Vue)
├── vitest.config.ts              # Backend test configuration
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## How to Run

### Prerequisites

- **Docker Desktop** with WSL2 integration enabled
  - Settings → Resources → WSL Integration → enable for your distro → Apply & Restart
- **Node.js** >= 20 (`node -v` to check)
- **pnpm** >= 9 — installed automatically by setup script if missing

### Quick Start

#### Option A — Automated setup (recommended for first time)

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

#### Option B — Manual setup (if you already have Node 20+ and pnpm)

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install all workspace dependencies
pnpm install

# 3. Start Docker services (PostgreSQL, Redis, RabbitMQ)
pnpm run docker:up

# 4. Run database migrations (creates tables, admin user, demo data, and seeds categories)
bash scripts/migrate.sh --seed

# 5. (Optional) Install and start Ollama for LLM features
bash scripts/setup/06-setup-ollama.sh

# 6. Start the interactive run menu
bash scripts/run/run-all.sh
```

> **Docker permission on Linux/WSL2:** If you see a Docker socket permission error, either
> run `sudo usermod -aG docker $USER && newgrp docker` (permanent, requires re-login) or
> prefix with `sg docker -c "bash scripts/setup-all.sh"` for the current session only.

### Running Services

#### Interactive menu (recommended)
```bash
bash scripts/run/run-all.sh
# or
pnpm dev
```

Options:
1. Start Docker services (PostgreSQL, Redis, RabbitMQ)
2. Start/check Ollama (LLM service)
3. Run backend microservices
4. Run frontend
5. Run everything (Docker + Ollama + backend + frontend)
6. Stop Docker services
7. View Docker logs
8. Run database migrations
9. Quit

The "Run everything" option starts Docker, ensures Ollama is running, launches all 6 backend services, waits for health checks on ports 3001-3006, then starts the frontend.

#### Manual
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

### Service Ports

| Service | Port | Routes |
|---|---|---|
| auth-service | 3001 | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout` |
| expense-service | 3002 | `GET/POST /expenses`, `PUT/DELETE /expenses/:id`, `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| budget-service | 3003 | `GET/POST /budgets`, `PUT/DELETE /budgets/:id` |
| income-service | 3004 | `GET/POST /income`, `PUT/DELETE /income/:id` |
| dashboard-service | 3005 | `GET /dashboard`, `GET /admin/users`, `PUT /admin/users/:id`, `GET /admin/stats`, `GET /admin/llm-usage`, `GET /admin/llm-stats` |
| llm-service | 3006 | `POST /llm/ocr`, `POST /llm/categorize`, `POST /llm/categorize-batch`, `POST /llm/chat`, `GET /llm/chat/job/:id`, `GET /llm/chat/history` |
| llm-stream | 3007 | `POST /llm/chat/stream` (SSE) |

Health check on every service: `GET /health`

```bash
curl http://localhost:3001/health
# {"success":true,"data":{"service":"auth-service","status":"ok"}}
```

### LLM Model Requirements

| | Full | Lite (`--lite-llm`) |
|---|---|---|
| **OCR** | `glm-ocr` — ~6-8 GB | `moondream` — ~4 GB |
| **Chat / Categorisation** | `qwen3.5:9b` — ~5-6 GB (4-bit) | `phi4-mini` — ~3 GB |
| **Embeddings** | `bge-m3` — <1 GB (1024 dims) | `nomic-embed-text` — <1 GB (768 dims) |
| **Peak VRAM** | ~8 GB (one model loaded at a time) | ~4 GB |

> When using lite embeddings, set `OLLAMA_EMBED_DIMENSIONS=768` in `.env`.
> If you already ran migrations with the default `1024` schema, run `nuke + setup` to recreate the vector column.

### Environment Variables

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
| `OLLAMA_EMBED_DIMENSIONS` | `1024` | Embedding vector size (768 for lite) |

### Database Migrations

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
| `000_seed_categories.sql` | 10 default categories (Food & Dining, Transport, Housing, Health, Entertainment, Shopping, Education, Utilities, Travel, Other) |
| `001_create_extensions.sql` | Enables `uuid-ossp` and `vector` (pgvector) |
| `002_create_users.sql` | Users table with `updated_at` trigger |
| `003_create_categories.sql` | Expense categories |
| `004_create_expenses.sql` | Expenses with category FK and period index |
| `005_create_budgets.sql` | Budgets per category per month |
| `006_create_incomes.sql` | Income records |
| `007_create_llm_chats.sql` | Chat history with HNSW vector index |
| `008_add_user_roles.sql` | Adds `role` column to users (`user` / `admin`) |
| `009_seed_admin_and_demo.sql` | 4 users (admin, demo, jane, bob) with expenses, income, budgets, LLM chats |
| `010_add_user_categories.sql` | Adds `user_id` FK to categories for per-user custom categories |

### Default Users

After running migrations with `--seed`, four users are seeded:

| User | Email | Password | Role |
|---|---|---|---|
| Admin | `root@financer.local` | `root` | admin |
| Demo User | `demo@financer.local` | `demo` | user |
| Sarah Chen | `user2@financer.local` | `demo` | user |
| Mike Johnson | `user3@financer.local` | `demo` | user |

The demo user comes with 80+ expenses, 14 income records, budgets, and 22 LLM chat messages across multiple months. The admin user has access to the admin dashboard (`/admin`) with platform stats, user management, and LLM usage analytics.

### Setup Scripts

Individual scripts in `scripts/setup/` — each is idempotent (safe to re-run):

| Script | What it does |
|---|---|
| `01-install-node.sh` | Installs Node.js via nvm if not present |
| `02-install-pnpm.sh` | Installs pnpm if not present |
| `03-setup-postgres.sh` | Starts PostgreSQL container and runs migrations |
| `04-setup-redis.sh` | Starts Redis container |
| `05-setup-rabbitmq.sh` | Starts RabbitMQ container (management UI on :15672) |
| `06-setup-ollama.sh` | Installs Ollama and pulls `qwen3.5:9b`, `glm-ocr`, `bge-m3` (full — ~8 GB) |
| `06-setup-ollama-lite.sh` | Installs Ollama and pulls `phi4-mini`, `moondream`, `nomic-embed-text` (lite — ~4 GB) |

```bash
# Run all at once
bash scripts/setup-all.sh

# Skip Ollama (faster setup for non-LLM development)
bash scripts/setup-all.sh --no-llm
```

### Testing

#### Backend E2E Tests

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

#### Frontend E2E Tests

30 test specs using **Playwright** (Chromium). Tests run against the full stack (backend + frontend).

```bash
# Install browser (first time only)
cd apps/frontend && npx playwright install --with-deps chromium

# Run tests (backend + frontend must be running)
pnpm --filter @financer/frontend test:e2e

# Headed mode (visible browser)
pnpm --filter @financer/frontend test:e2e:headed
```

Test specs: `auth`, `dashboard`, `expenses`, `budgets`, `income`, `categories`, `admin`, `chat`.

---

## Architecture & Features

### Architecture

All backend code follows **SOLID principles** — non-negotiable:

- Every service's business logic is defined behind an **interface**. No concrete class is ever exposed across service boundaries.
- **Constructor injection only** via tsyringe — no `new ConcreteClass()` in business logic, no service locator.
- **No cross-service imports** — services only import from `apps/backend/shared/`.
- **LLM, OCR, Vector DB, Queue, and Cache** are behind abstract interfaces. The concrete provider (Ollama, pgvector, RabbitMQ, Redis) is swappable by changing a single DI binding.
- **Template Method pattern** on `BaseLLMProvider` — retry logic, exponential backoff, and transient error detection are handled in the abstract base class; subclasses only implement `executeComplete()` and `executeEmbed()`.
- **Facade pattern** on `LLMService` — delegates to `CategorizationService`, `ChatService`, and `OCRService` behind a single interface.

Key abstractions:

| Interface | Implementation | Used by |
|---|---|---|
| `ILLMProvider` | `OllamaProvider` | llm-service |
| `IOCRProvider` | `OllamaOCRProvider` | llm-service |
| `IVectorRepository` | `PgVectorRepository` | llm-service |
| `IQueueService` | `RabbitMQService` | llm-service |
| `ICacheService` | `RedisService` | all services |
| `IRepository<T>` | Per-entity repository classes | all services |
| `ILLMService` | `LLMService` (facade) | llm-service handlers + stream server |

### Features

#### Core (auth, expenses, budgets, income, dashboard)
- JWT authentication with access/refresh token rotation and Redis-backed refresh storage
- Expense, Budget, Income CRUD with multi-tenant ownership validation (`findOwnedOrThrow`)
- Category management — 10 seeded defaults + per-user custom categories
- Dashboard with 6 parallel data fetches, Redis cache-aside (5 min TTL)
- Sliding-window rate limiting with atomic Redis Lua scripts
- Pagination on all list endpoints with `okPaginated` response helper
- Frontend: Vue 3 Composition API, Pinia stores, Tailwind CSS, ApexCharts, JWT interceptors with automatic token refresh

#### LLM & AI
- **OCR** — upload receipt/payslip image, extract structured expense data via vision model
- **Auto-categorize** — per expense or batch for a month, with RabbitMQ async queue (DLX/DLQ, retry with exponential backoff)
- **Chat** — RAG-powered financial assistant with pgvector similarity search, recent financial data context, and conversation history
- **SSE streaming** — separate Express server (port 3007) streams Ollama tokens in real-time to the frontend chat widget
- **Embeddings** — fire-and-forget upserts to pgvector with HNSW index for fast similarity search

#### Admin
- Platform stats, detailed LLM analytics (messages, active users, activity bars)
- User management — list all users, toggle roles (user/admin)
- Role-based access control — JWT role claim, admin middleware, frontend route guards
- Admin/client view toggle in layout header

### Infrastructure (Terraform)

The `infra/terraform/` directory contains valid Terraform that models the production AWS architecture. It is **not applied automatically** — it serves as deployment documentation and a starting point for real provisioning.

| Module | AWS Service |
|---|---|
| `vpc` | VPC, public/private subnets, NAT gateway |
| `rds` | RDS PostgreSQL 16 (pgvector compatible) |
| `elasticache` | ElastiCache Redis 7 |
| `mq` | AmazonMQ (RabbitMQ 3.13) |
| `lambda` | One reusable Lambda module called per service |
| `api_gateway` | HTTP API Gateway routing to Lambda functions |
| `ollama` | ECS Fargate task for Ollama (GPU-enabled) |
| `frontend` | S3 bucket + CloudFront distribution for Vue SPA |

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in terraform.tfvars with real values
terraform init
terraform plan
```
