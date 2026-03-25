# Financer

A full-stack personal finance application with AI capabilities, multi-tenant account management, and a microservice architecture. Manage expenses, budgets, and income — with LLM-powered categorization, OCR receipt scanning, and a contextual chat assistant.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20+ / TypeScript — 6 microservices (AWS Lambda via Serverless Framework) |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia |
| Database | PostgreSQL 16 + pgvector (vector embeddings) |
| Cache | Redis 7 — sliding-window rate limiting, dashboard cache-aside |
| Message Queue | RabbitMQ 3 — async LLM job queue |
| LLM | Ollama (local) — chat, categorization, OCR, embeddings |
| ORM | Drizzle ORM |
| DI Container | tsyringe |
| Infrastructure | Serverless Framework (local dev) + Terraform (AWS production) |
| Monorepo | pnpm workspaces |

---

## Quick Start

### Prerequisites

- **Docker Desktop** — with WSL2 integration enabled (Settings > Resources > WSL Integration)
- **Node.js** >= 20
- **pnpm** >= 9 (installed automatically by setup if missing)

### One-command setup

```bash
# Full setup + run — all services including LLM (~8 GB peak VRAM)
bash start.sh

# Lite LLM — smaller models, <=4 GB VRAM
bash start.sh --lite-llm

# No LLM — fastest, skips Ollama and llm-service entirely
bash start.sh --no-llm
```

### Manual setup

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Start Docker services (PostgreSQL, Redis, RabbitMQ)
pnpm run docker:up

# 4. Run database migrations + seed data
bash scripts/migrate.sh --seed

# 5. (Optional) Install Ollama for LLM features
bash scripts/setup/06-setup-ollama.sh       # Full models (~8 GB)
bash scripts/setup/06-setup-ollama-lite.sh   # Lite models (~4 GB)

# 6. Start services
pnpm dev                           # Interactive menu
pnpm dev:backend                   # Backend only (all 6 services)
bash scripts/run/run-backend.sh --no-llm   # Backend without llm-service
pnpm dev:frontend                  # Frontend only
```

> **Linux/WSL2 Docker permission:** If you see a Docker socket error, run
> `sudo usermod -aG docker $USER && newgrp docker` (requires re-login).

---

## Architecture

### Service Map

| Service | Port | Purpose |
|---|---|---|
| auth-service | 3001 | JWT auth — register, login, refresh, logout, profile |
| expense-service | 3002 | Expense + Category CRUD with ownership validation |
| budget-service | 3003 | Monthly budgets per category |
| income-service | 3004 | Income records |
| dashboard-service | 3005 | Aggregated stats, admin panel, sub-account management |
| llm-service | 3006 | AI features — chat, categorization, OCR, embeddings |
| llm-stream | 3007 | SSE streaming for real-time chat (Express, not Lambda) |

Health check on every service: `GET /health`

### Project Structure

```
Financer/
├── apps/
│   ├── backend/
│   │   ├── shared/               # Shared library (@financer/backend-shared)
│   │   │   ├── interfaces/       # IRepository, ILLMProvider, ICacheService, etc.
│   │   │   ├── abstracts/        # BaseLLMProvider, BaseRepository
│   │   │   ├── types/            # Domain DTOs and error classes
│   │   │   ├── repositories/     # CategoryRepository, UserReadRepository
│   │   │   ├── middleware/       # JWT auth, role guards, acting-as resolution
│   │   │   ├── utils/            # JWT signing/verify, response helpers
│   │   │   └── db/               # Drizzle client, Redis client, schemas, migrations
│   │   ├── auth-service/         # Port 3001
│   │   ├── expense-service/      # Port 3002
│   │   ├── budget-service/       # Port 3003
│   │   ├── income-service/       # Port 3004
│   │   ├── dashboard-service/    # Port 3005
│   │   └── llm-service/          # Port 3006 + 3007 (SSE)
│   └── frontend/                 # Vue 3 SPA + Playwright E2E tests
├── packages/
│   └── shared/                   # TypeScript API types shared between FE and BE
├── scripts/                      # Setup, run, migrate, nuke scripts
├── infra/
│   └── terraform/                # AWS IaC (VPC, RDS, Lambda, ECS, API GW, Amplify)
├── tests/                        # Backend E2E tests (Vitest)
├── docker-compose.yml            # Local PostgreSQL, Redis, RabbitMQ
├── start.sh                      # One-command nuke + setup + run
└── .env.example                  # Environment variable template
```

---

## Multi-Tier Role System

Financer uses a three-tier role hierarchy:

| Role | Description | Capabilities |
|---|---|---|
| **superadmin** | Platform administrator | Sees all users, platform stats, LLM analytics. Cannot access individual user data (expenses, chat). |
| **admin** | Account owner | Manages own finances. Creates and manages sub-accounts. Can view/edit sub-account data. Signs up via /register. |
| **user** | Sub-account | Created by an admin. Full finance features but managed by parent admin. |

### How it works

- **New signups are admins** — every account created through `/auth/register` gets the `admin` role with `managedBy: null`.
- **Admins create sub-accounts** — via the Admin Dashboard. Sub-accounts get `role: 'user'` and `managedBy: adminId`.
- **Account switching** — the sidebar shows sub-accounts. Clicking one injects the `X-Acting-As: <userId>` header into all API calls, scoping all data (expenses, budgets, income, chat) to that sub-account.
- **Superadmin isolation** — superadmins can see user lists and aggregate stats but are blocked from `X-Acting-As` to prevent accessing individual financial data.

### Default Users (seeded)

| User | Email | Password | Role | Managed By |
|---|---|---|---|---|
| Root Admin | `root@financer.local` | `root` | superadmin | - |
| Super Admin | `superadmin@financer.local` | `superadmin` | superadmin | - |
| Demo Admin | `admin@financer.local` | `demo` | admin | - |
| Demo User | `demo@financer.local` | `demo` | user | Demo Admin |
| Sarah Chen | `user2@financer.local` | `demo` | user | Demo Admin |
| Mike Johnson | `user3@financer.local` | `demo` | user | (unmanaged) |

The Demo Admin has two sub-accounts (Demo User and Sarah Chen). Mike Johnson exists as an unmanaged user account. Demo User has 80+ expenses, 14 income records, budgets, and 22 LLM chat messages.

---

## API Routes

### Auth Service (3001)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | - | Register new admin account |
| POST | /auth/login | - | Login, returns JWT tokens |
| POST | /auth/refresh | - | Refresh access token |
| GET | /auth/me | Bearer | Get current user profile |
| POST | /auth/logout | Bearer | Revoke refresh token |

### Expense Service (3002)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /expenses | Bearer | List expenses (paginated, filterable) |
| POST | /expenses | Bearer | Create expense |
| PUT | /expenses/:id | Bearer | Update expense |
| DELETE | /expenses/:id | Bearer | Delete expense |
| GET | /categories | Bearer | List categories |
| POST | /categories | Bearer | Create custom category |
| PUT | /categories/:id | Bearer | Update category |
| DELETE | /categories/:id | Bearer | Delete category |

### Budget Service (3003)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /budgets | Bearer | List budgets |
| POST | /budgets | Bearer | Create budget |
| PUT | /budgets/:id | Bearer | Update budget |
| DELETE | /budgets/:id | Bearer | Delete budget |

### Income Service (3004)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /income | Bearer | List income records |
| POST | /income | Bearer | Create income record |
| PUT | /income/:id | Bearer | Update income record |
| DELETE | /income/:id | Bearer | Delete income record |

### Dashboard Service (3005)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /dashboard | Bearer | Summary (expenses, income, budgets). Accepts `?month=&year=` or `?all=true` |
| GET | /admin/users | Admin+ | List users (scoped by role) |
| PUT | /admin/users/:id | Admin+ | Change user role (admins: own sub-accounts only) |
| GET | /admin/stats | Admin+ | Aggregate platform statistics |
| GET | /admin/llm-usage | Superadmin | LLM usage by user |
| GET | /admin/llm-stats | Superadmin | Detailed LLM analytics |
| GET | /admin/expenses-by-category | Admin+ | Aggregate expenses by category. Accepts `?month=&year=` or `?all=true` |
| GET | /admin/category-counts | Admin+ | Expense count per category. Accepts `?month=&year=` or `?all=true` |
| GET | /admin/period-totals | Admin+ | Period-scoped income + expense totals. Accepts `?month=&year=` or `?all=true` |
| GET | /admin/sub-accounts/:id/detail | Admin | Full dashboard + income + chat. Accepts `?month=&year=` or `?all=true` |
| GET | /admin/sub-accounts | Admin | List admin's sub-accounts |
| POST | /admin/sub-accounts | Admin | Create sub-account |

### LLM Service (3006)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /llm/ocr | Bearer | Extract expense data from receipt image |
| POST | /llm/categorize | Bearer | Categorize a single expense |
| POST | /llm/categorize-batch | Bearer | Batch categorize expenses |
| POST | /llm/chat | Bearer | Chat with financial assistant |
| GET | /llm/chat/history | Bearer | Get chat history |

All data endpoints support the `X-Acting-As` header for admins to operate on sub-account data.

---

## LLM Features

Three AI capabilities powered by local Ollama:

### Chat
- Tool-calling loop: LLM decides when to call tools (get_expenses, get_budgets, etc.)
- RAG context via pgvector similarity search on conversation history
- Scoped per user — when acting as a sub-account, chat answers reflect that account's data

### Categorization
- Maps expense descriptions to categories via LLM
- 29 few-shot examples, deterministic output (temperature 0)
- Results cached in Redis (1h TTL)
- Batch mode: up to 5 expenses concurrently

### OCR
- Vision model extracts structured data from receipt images (amount, date, description, merchant)
- Auto-categorizes the extracted description
- Frontend pre-fills the entire expense form

### Model Requirements

| | Full | Lite (`--lite-llm`) |
|---|---|---|
| Chat / Categorization | `qwen3.5:9b` (~5-6 GB) | `phi4-mini` (~3 GB) |
| OCR | `glm-ocr` (~6-8 GB) | `moondream` (~4 GB) |
| Embeddings | `bge-m3` (<1 GB, 1024 dims) | `nomic-embed-text` (<1 GB, 768 dims) |
| Peak VRAM | ~8 GB | ~4 GB |

> When using lite embeddings, set `OLLAMA_EMBED_DIMENSIONS=768` in `.env`.

---

## Database

### Migrations

15 migration files in `apps/backend/shared/db/migrations/`, run in filename order:

```bash
bash scripts/migrate.sh          # Run all migrations
bash scripts/migrate.sh --seed   # Migrations + seed categories
```

| File | Description |
|---|---|
| 000 | 11 default categories (Food, Transport, Housing, Health, Internet & Mobile, etc.) |
| 001 | Extensions: uuid-ossp, vector (pgvector) |
| 002 | Users table with updated_at trigger |
| 003 | Categories table |
| 004 | Expenses with category FK and period index |
| 005 | Budgets per category per month |
| 006 | Income records |
| 007 | Chat history with HNSW vector index |
| 008 | User roles column (user/admin) |
| 009 | Seed: admin, demo user, sample data (expenses, income, budgets, chats) |
| 010 | Per-user custom categories (user_id FK) |
| 011 | Budget updated_at tracking |
| 012 | Multi-tier roles (superadmin/admin/user) + managed_by column |
| 013 | Seed: superadmin, demo admin, link demo sub-accounts |
| 014 | Add "Internet & Mobile" default category |

---

## Testing

> **Note:** Tests are currently outdated and may fail. The backend and frontend have undergone significant changes (multi-tier admin views, new dashboard endpoints, period filtering, category updates) that are not yet reflected in the test suites. Tests need to be updated to cover the new admin chart endpoints, period-totals endpoint, sub-account detail flow, and the updated role authorization logic.

### Backend E2E (Vitest)

59 tests across 6 services. Tests make real HTTP requests against running services.

```bash
pnpm dev:backend          # Start services first
pnpm test:backend         # Run tests
pnpm test:backend:watch   # Watch mode
```

### Frontend E2E (Playwright)

30 specs running against the full stack (Chromium).

```bash
cd apps/frontend && npx playwright install --with-deps chromium
pnpm --filter @financer/frontend test:e2e
```

---

## Infrastructure (Terraform)

Production-ready AWS IaC in `infra/terraform/`. Not applied automatically — serves as deployment documentation and provisioning starting point.

| Module | AWS Service | Purpose |
|---|---|---|
| vpc | VPC, subnets, NAT | Network isolation (public + private subnets) |
| rds | RDS PostgreSQL 16 | Primary database with pgvector, encrypted, Performance Insights |
| elasticache | ElastiCache Redis 7 | Cache and rate limiting (encrypted in transit + at rest) |
| mq | AmazonMQ RabbitMQ 3.13 | Async job queue for LLM batch operations |
| lambda | Lambda (x6) | One function per microservice |
| api_gateway | HTTP API Gateway | Request routing with CORS and throttling |
| ollama | ECS Fargate + EFS | LLM model server with persistent model storage |
| frontend | AWS Amplify | SPA hosting with build pipeline and custom domain support |

Additional ECS tasks in main.tf: LLM streaming server (SSE) and queue worker.

Remote state: S3 + DynamoDB locking (bootstrap resources included).

Secrets management: ECS tasks use SSM Parameter Store via the `secrets` block.

```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=..." -var="jwt_secret=..." -var="jwt_refresh_secret=..." -var="rabbitmq_password=..."
```

---

## Environment Variables

All variables documented in `.env.example`. Key configuration:

| Variable | Default | Description |
|---|---|---|
| POSTGRES_HOST | localhost | PostgreSQL host |
| POSTGRES_DB | financer | Database name |
| REDIS_HOST | localhost | Redis host |
| JWT_SECRET | *(required)* | JWT signing secret |
| JWT_REFRESH_SECRET | *(required)* | Refresh token secret (must differ from JWT_SECRET) |
| OLLAMA_BASE_URL | http://localhost:11434 | Ollama API endpoint |
| OLLAMA_CHAT_MODEL | qwen3.5:9b | Chat and categorization model |
| OLLAMA_OCR_MODEL | glm-ocr | Receipt OCR model |
| OLLAMA_EMBED_MODEL | bge-m3 | Vector embeddings model |
| OLLAMA_EMBED_DIMENSIONS | 1024 | Embedding vector size (768 for lite) |

---

## Scripts

| Script | Description |
|---|---|
| `start.sh` | Full nuke + setup + run (accepts `--no-llm`, `--lite-llm`) |
| `scripts/setup-all.sh` | Install dependencies, Docker services, migrations, Ollama |
| `scripts/run/run-all.sh` | Interactive menu for starting services |
| `scripts/run/run-backend.sh` | Start all backend services (accepts `--no-llm`) |
| `scripts/run/run-frontend.sh` | Start Vue dev server |
| `scripts/migrate.sh` | Run database migrations (accepts `--seed`) |
| `scripts/nuke.sh` | Tear down environment (Docker volumes, node_modules, .env) |

Setup subscripts in `scripts/setup/` (each idempotent):

| Script | Purpose |
|---|---|
| 01-install-node.sh | Install Node.js via nvm |
| 02-install-pnpm.sh | Install pnpm |
| 03-setup-postgres.sh | Start PostgreSQL container + migrations |
| 04-setup-redis.sh | Start Redis container |
| 05-setup-rabbitmq.sh | Start RabbitMQ container |
| 06-setup-ollama.sh | Install Ollama + pull full models |
| 06-setup-ollama-lite.sh | Install Ollama + pull lite models |
