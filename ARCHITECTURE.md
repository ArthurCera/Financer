# Financer — Architecture and Design Document

This document describes every architectural decision, feature, trade-off, and design pattern in the Financer project. It serves as a complete reference for understanding why the system is built the way it is.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Service Architecture](#service-architecture)
3. [Data Model](#data-model)
4. [Authentication and Authorization](#authentication-and-authorization)
5. [Multi-Tier Role System](#multi-tier-role-system)
6. [LLM Features](#llm-features)
7. [Frontend Architecture](#frontend-architecture)
8. [Infrastructure](#infrastructure)
9. [Design Patterns](#design-patterns)
10. [Trade-offs and Decisions](#trade-offs-and-decisions)
11. [Security Model](#security-model)

---

## 1. System Overview

Financer is a personal finance management platform built as a monorepo with six backend microservices, a Vue 3 single-page application, and local LLM integration via Ollama. The system supports multi-tenant account hierarchies where administrators manage sub-accounts, with AI features for expense categorization, receipt OCR, and contextual financial chat.

### Why Microservices

Each backend service corresponds to a bounded context (auth, expenses, budgets, income, dashboard/admin, LLM). Services are deployed as AWS Lambda functions via the Serverless Framework, which gives:

- **Independent scaling** — the LLM service can be allocated more memory (1024 MB) and longer timeouts (120s) without affecting CRUD services.
- **Fault isolation** — a crash in the LLM service doesn't take down expense management.
- **Independent deployment** — updating categorization logic doesn't require redeploying auth.

The trade-off is operational complexity: six serverless.yml configs, six package.json files, and a shared library that must be compiled before consumers can type-check.

### Why Monorepo (pnpm workspaces)

- **Shared types** — `@financer/shared` (packages/shared) defines TypeScript interfaces consumed by both frontend and backend. A change to an API contract is immediately visible to all consumers.
- **Shared backend library** — `@financer/backend-shared` (apps/backend/shared) provides database clients, ORM schemas, repositories, middleware, and utilities. No code duplication across services.
- **Atomic changes** — a feature like multi-tier roles that touches every service can be developed, reviewed, and tested as a single unit.

---

## 2. Service Architecture

### Auth Service (port 3001)

**Purpose:** User registration, login, JWT token management, profile retrieval, and logout.

**Functions:**
- `register(email, password, name)` — creates a new admin user, returns JWT pair. Passwords hashed with bcrypt (10-15 rounds, configurable via BCRYPT_ROUNDS).
- `login(email, password)` — validates credentials, returns access + refresh tokens.
- `refresh(refreshToken)` — rotates the refresh token (revoke-on-use), issues a new pair. Looks up the user's current role so the new access token reflects any role changes.
- `me()` — returns the authenticated user's profile (id, email, name, role, managedBy).
- `logout()` — revokes the refresh token from Redis.

**Design decisions:**
- **Refresh token rotation** — each use of a refresh token revokes the old one and issues a new pair. This limits the window of a stolen refresh token. Tokens are stored in Redis with a 7-day TTL.
- **Role in access token** — the JWT `role` claim enables authorization checks without a database lookup on every request. The trade-off is that role changes don't take effect until the next token refresh.
- **No session table** — refresh tokens live in Redis, not PostgreSQL. This avoids write amplification on the primary database for high-frequency token operations.

### Expense Service (port 3002)

**Purpose:** CRUD for expenses and per-user categories.

**Functions:**
- `listExpenses(userId, filters)` — paginated list with optional category, date range, and search filters.
- `createExpense(userId, data)` — creates an expense, validates categoryId ownership.
- `updateExpense(userId, expenseId, data)` — updates with ownership check via `findOwnedOrThrow`.
- `deleteExpense(userId, expenseId)` — deletes with ownership check.
- `listCategories(userId)` — returns default categories (userId=null) plus user's custom categories.
- `createCategory(userId, data)` — creates a user-scoped category.
- `updateCategory(userId, categoryId, data)` — updates with ownership check.
- `deleteCategory(userId, categoryId)` — deletes with ownership check, blocks deletion of default categories.

**Design decisions:**
- **Ownership validation** — `findOwnedOrThrow(id, userId)` is the single enforcement point. Every mutation checks that the resource belongs to the requesting user (or acting-as user).
- **Categories are user-scoped** — default categories have `userId: null` and are visible to all users. Custom categories are linked to a specific user. This avoids duplication while allowing customization.

### Budget Service (port 3003)

**Purpose:** Monthly budget targets per category.

**Functions:**
- `listBudgets(userId, month, year)` — returns budgets for a specific month, with spent amounts joined from expenses.
- `createBudget(userId, data)` — creates a budget, enforces one-per-category-per-month.
- `updateBudget(userId, budgetId, data)` — updates amount, with ownership check.
- `deleteBudget(userId, budgetId)` — deletes with ownership check.

### Income Service (port 3004)

**Purpose:** Income record tracking.

**Functions:**
- `listIncome(userId, filters)` — paginated list with date filters.
- `createIncome(userId, data)` — creates income record.
- `updateIncome(userId, incomeId, data)` — updates with ownership check.
- `deleteIncome(userId, incomeId)` — deletes with ownership check.

### Dashboard Service (port 3005)

**Purpose:** Aggregated financial summaries and admin/superadmin panel.

**Functions:**
- `getDashboard(userId, month?, year?)` — returns total expenses, income, budgets, expenses-by-category breakdown, and budget-vs-actual comparisons. Supports optional month/year filtering (omit for all-time data). Cached in Redis for 5 minutes.
- `getAdminUsers(callerRole, callerId)` — role-aware user listing. Admins see only their sub-accounts. Superadmins see all users.
- `getAdminStats(callerRole, callerId)` — aggregate platform stats (total users, expenses, income, chats). Admins get stats scoped to themselves + their sub-accounts.
- `updateUserRole(callerId, callerRole, targetId, newRole)` — admins can only change roles of their own sub-accounts; superadmins can change any role. Prevents changing own role.
- `getLLMUsage()` — superadmin-only. Per-user chat message counts and last activity.
- `getDetailedLLMStats()` — superadmin-only. Message volumes, active users, activity timelines.
- `getSubAccounts(adminId)` — returns the admin's managed sub-accounts with expense/spending summaries.
- `createSubAccount(adminId, email, password, name)` — creates a user with `role: 'user'` and `managedBy: adminId`. Passwords hashed with bcrypt.
- `getExpensesByCategory(callerRole, callerId, month?, year?)` — aggregate expense breakdown by category across all sub-accounts (admin) or all users (superadmin). Supports optional period filtering. Returns `CategoryBreakdownResponse[]` with totals and percentages.
- `getCategoryCounts(callerRole, callerId, month?, year?)` — count of expenses per category across scoped users. Supports optional period filtering. Returns `CategoryCountResponse[]` for the admin dashboard's item-count donut chart.
- `getPeriodTotals(callerRole, callerId, month?, year?)` — returns period-scoped `totalIncome` and `totalExpenseAmount` for the admin's sub-accounts. Used by the admin dashboard summary cards.
- `getSubAccountDetail(adminId, subAccountId, month?, year?)` — returns a full `AdminSubAccountDetailResponse` containing the sub-account's dashboard data (expenses by category, budget vs actual, recent expenses), income records, and chat history. Supports optional period filtering and "all" mode. Verifies admin ownership before returning data.

**Design decisions:**
- **Dashboard caching** — Redis cache-aside with 5-minute TTL. The dashboard aggregates across expenses, income, and budgets — three separate database queries. Caching avoids repeated joins on every page load.
- **Role-scoped stats** — admins see a filtered view rather than a separate endpoint. This simplifies the API surface while enforcing data boundaries at the service layer.
- **Admin detail endpoint** — rather than requiring the frontend to call multiple service APIs with `X-Acting-As`, a single `/admin/sub-accounts/:id/detail` endpoint returns all data needed for the admin's sub-account detail panel. This avoids race conditions with the global acting-as header and keeps authorization server-side.
- **Superadmin data isolation** — the superadmin user management table uses an accordion layout grouping admins with their sub-accounts. Expense data is only shown for sub-accounts, not admin rows. Superadmins see platform-wide aggregates but not individual financial data, consistent with the privacy boundary in `resolveEffectiveUserId()`.
- **Role update ownership check** — admins can only change roles of users they manage (`managedBy = callerId`). Superadmins can change any role. This prevents privilege escalation via the API.
- **Period-aware admin charts** — the admin dashboard's expense charts and summary cards support month/year filtering with an "All" checkbox for all-time data. Period totals (income, expense amounts) are fetched via a dedicated `/admin/period-totals` endpoint.
- **Cache invalidation on categorization** — the LLM service invalidates the dashboard Redis cache after both single and batch categorization, ensuring category changes are reflected immediately without waiting for TTL expiry.

### LLM Service (port 3006 + 3007)

**Purpose:** AI features — chat, categorization, OCR, embeddings.

Detailed in [Section 6: LLM Features](#llm-features).

### Shared Library (@financer/backend-shared)

The shared library under `apps/backend/shared/` provides:

- **Database clients** — Drizzle ORM connection (`db`), Redis client, connection pooling.
- **Drizzle schemas** — type-safe table definitions for users, categories, expenses, budgets, incomes, llm_chats.
- **Repository implementations** — `CategoryRepository`, `SharedExpenseRepository`, `UserReadRepository` used by multiple services.
- **Auth middleware** — `authenticate()`, `authenticateFull()`, `authenticateAdmin()`, `authenticateWithRole()`, `resolveEffectiveUserId()`.
- **Type definitions** — domain DTOs (`UserDto`, `ExpenseDto`, etc.), error classes (`AppError`, `NotFoundError`, `ForbiddenError`, etc.).
- **Utilities** — JWT sign/verify, response helpers (`ok`, `okPaginated`, `created`), error handler wrapper.

**Compilation model:** The shared library has its own `tsconfig.json` and compiles to `.js` + `.d.ts` files alongside the source. Consumer services reference these compiled outputs via `paths` in their tsconfig. This means `tsc` in the shared directory must complete before service type-checks can succeed.

---

## 3. Data Model

### Tables

**users**
- `id` (UUID, PK) — auto-generated
- `email` (VARCHAR 255, unique)
- `password_hash` (VARCHAR 255) — bcrypt hash
- `name` (VARCHAR 255)
- `role` (VARCHAR 10) — CHECK constraint: 'superadmin', 'admin', 'user'. Default: 'admin'
- `managed_by` (UUID, FK -> users.id, ON DELETE SET NULL) — self-referencing FK for admin-to-user hierarchy
- `created_at`, `updated_at` (TIMESTAMPTZ)

**categories**
- `id` (UUID, PK)
- `name`, `color`, `icon` (VARCHAR)
- `is_default` (BOOLEAN) — true for the 11 seeded categories
- `user_id` (UUID, FK -> users.id, nullable) — null = default category, non-null = user's custom category
- `created_at`

**expenses**
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users.id, ON DELETE CASCADE)
- `category_id` (UUID, FK -> categories.id, ON DELETE SET NULL)
- `amount` (NUMERIC)
- `description` (VARCHAR, nullable)
- `date` (DATE)
- `created_at`, `updated_at`
- Index on `(user_id, date)` for efficient period queries

**budgets**
- `id` (UUID, PK)
- `user_id`, `category_id` (FKs)
- `amount` (NUMERIC)
- `month` (INTEGER 1-12), `year` (INTEGER)
- `created_at`, `updated_at`
- Unique constraint on `(user_id, category_id, month, year)`

**incomes**
- `id` (UUID, PK)
- `user_id` (FK)
- `amount`, `description`, `source`, `date`
- `created_at`, `updated_at`

**llm_chats**
- `id` (UUID, PK)
- `user_id` (FK)
- `role` (VARCHAR) — 'user' or 'assistant'
- `content` (TEXT)
- `embedding` (VECTOR) — pgvector column for similarity search
- `created_at`
- HNSW index on `embedding` for fast approximate nearest neighbor queries

### Key Relationships

- `users.managed_by -> users.id` — self-referencing FK. When an admin creates a sub-account, the sub-account's `managed_by` is set to the admin's ID. `ON DELETE SET NULL` ensures sub-accounts aren't orphaned if the admin is deleted.
- Expenses, budgets, income cascade-delete with their user.
- Categories use `SET NULL` on user deletion — default categories (userId=null) persist.

---

## 4. Authentication and Authorization

### JWT Strategy

Two token types with separate secrets:

- **Access token** (short-lived, default 15m) — contains `{ sub: userId, role: UserRole, type: 'access' }`. Signed with `JWT_SECRET`.
- **Refresh token** (long-lived, default 7d) — contains `{ sub: userId, type: 'refresh' }`. Signed with `JWT_REFRESH_SECRET`.

**Why separate secrets:** If `JWT_SECRET` is compromised, only access tokens are affected (15m window). Refresh tokens remain valid and can be revoked from Redis. This limits blast radius.

### Token Flow

1. User logs in -> auth-service returns `{ accessToken, refreshToken, expiresIn }`.
2. Frontend stores tokens in Pinia store (memory, not localStorage — cleared on tab close).
3. Every API request includes `Authorization: Bearer <accessToken>`.
4. When a request returns 401, the frontend interceptor calls `/auth/refresh` with the refresh token.
5. On success, the new access token replaces the old one and the original request is retried.
6. On failure (refresh token expired/revoked), the user is logged out.

### Middleware Functions

- `authenticate(event)` — extracts `userId` from the access token. Used by simple endpoints that only need the caller's identity.
- `authenticateFull(event)` — extracts `{ sub: userId, role }` from the access token. Used when role-based logic is needed.
- `authenticateAdmin(event)` — calls `authenticateFull`, rejects if role is not 'admin' or 'superadmin'.
- `authenticateWithRole(event, ...roles)` — variadic role check. Returns userId if the caller has one of the specified roles.
- `resolveEffectiveUserId(event, callerId, callerRole, userRepo)` — the core acting-as resolver. See [Section 5](#multi-tier-role-system).

---

## 5. Multi-Tier Role System

### Hierarchy

```
superadmin
  |-- admin (self-registered, managedBy: null)
        |-- user (sub-account, managedBy: adminId)
```

### resolveEffectiveUserId()

This middleware function is called by every data endpoint (expenses, budgets, income, chat). It determines whose data to access:

1. Check for `X-Acting-As` header.
2. If absent, return the caller's own ID (default behavior).
3. If present:
   - **Users** cannot act as anyone — reject with 403.
   - **Superadmins** cannot act as anyone — reject with 403 ("cannot access individual user data").
   - **Admins** — look up the target user. Verify `targetUser.managedBy === callerId`. If not, reject with 403.
   - If valid, return the target user's ID.

**Why superadmins can't act-as:** This is a deliberate design choice. Superadmins see platform-wide statistics but have no access to individual financial data. This separation exists because a platform administrator should not need to read someone's expense descriptions or chat messages. It's a privacy boundary, not a technical limitation.

### Frontend Implementation

- **SubAccount Store** (`subaccount.store.ts`) — manages the active sub-account state and provides `switchToSubAccount(userId)` / `switchToOwnAccount()` methods.
- **API Service** — a request interceptor on every axios instance checks `_actingAsUserId` and injects the `X-Acting-As` header if set.
- **AppLayout** — the sidebar shows a sub-account list for admins. Clicking a sub-account calls `switchToSubAccount()`, which triggers a watch in every data view (Dashboard, Expenses, Budgets, Income, Chat) to refetch data.
- **LLM Store** — `resetForAccountSwitch()` clears chat messages and reloads history when switching accounts, ensuring the chat always reflects the active account's conversation.

---

## 6. LLM Features

### Provider Architecture

```
ILLMProvider (interface)
  |-- BaseLLMProvider (abstract) — retry logic, exponential backoff
        |-- OllamaProvider (concrete) — HTTP calls to Ollama API
```

**ILLMProvider** defines: `complete(prompt, options)`, `embed(text)`, `isAvailable()`.

**LLMOptions:** `temperature`, `maxTokens`, `systemPrompt`, `format`, `think` (enable/disable model reasoning).

**BaseLLMProvider:** Template Method pattern. Handles retry with exponential backoff (1 attempt for completions, 2 for embeddings). Subclasses implement `executeComplete()` and `executeEmbed()`.

**OllamaProvider:** 45s timeout for completions, 30s for embeddings. Passes the `think` parameter to the Ollama API — qwen3.5 uses a separate `thinking` field, not inline `<think>` blocks.

### Chat Service

**Flow:**
1. User sends a message.
2. System prompt is constructed with: current date, user's recent financial summary, few-shot examples for tool-call format.
3. RAG context: pgvector similarity search on past conversations (top 5 results, 5s timeout, degrades gracefully if pgvector is slow).
4. The message + context is sent to Ollama with `think: false` (fast, deterministic JSON for tool detection).
5. If the model responds with a tool call (e.g., `get_expenses`, `get_budgets`), the tool is executed against the database, and the result is fed back to the model.
6. The tool-call loop repeats until the model produces a natural-language response (not a tool call).
7. Final answer is generated with `think: true` (higher quality) and temperature 0.7.
8. The user message and assistant response are saved to `llm_chats` with embeddings for future RAG context.

**Available tools:** `get_expenses(month, year)`, `get_budgets(month, year)`, `get_income(month, year)`, `get_categories()`.

**Design decisions:**
- **Synchronous chat** — the `/llm/chat` endpoint blocks until the full response is ready. This simplifies the API contract (single request/response) and avoids the complexity of WebSocket or polling for non-streaming use.
- **Separate streaming server** — SSE streaming runs on a separate Express server (port 3007) because AWS Lambda has a 30s timeout and doesn't support long-lived connections. The streaming server shares the same business logic via the shared library.
- **Tool-call loop** — rather than making multiple round-trips from the frontend, the backend handles the entire tool-calling conversation internally. This reduces latency and keeps tool execution server-side.

### Categorization Service

**Flow:**
1. Given an expense description and amount, build a prompt with few-shot examples covering all 11 default categories.
2. Call Ollama with `think: false`, temperature 0, maxTokens 20 — deterministic single-word output.
3. Multi-tier matching against known category names: exact match > contains > substring > JSON parse fallback.
4. Cache the result in Redis (1h TTL, keyed by hash of description + amount + available categories).
5. For batch mode, process up to 5 expenses concurrently.

**Why 29 few-shot examples:** Coverage matters more than example count. Each of the 10 categories has 2-4 examples covering edge cases (e.g., "Uber" maps to Transport, not Shopping). This makes the model robust to ambiguous descriptions without fine-tuning.

### OCR Service

**Flow:**
1. Frontend uploads a receipt image (base64).
2. The vision model (`glm-ocr`) extracts structured JSON: `{ amount, date, description, merchant }`.
3. The handler passes the extracted description to `CategorizationService.categorizeDescription()` to resolve a categoryId.
4. The full result (including categoryId) is returned to the frontend, which pre-fills the expense form.

**Why a separate OCR model:** OCR requires a vision model (image input), while chat/categorization are text-only. Running both through a single model would mean always loading the larger vision model even for text tasks. Separating them allows Ollama to unload one when loading the other.

### Embedding Strategy

- **Model:** bge-m3 (1024 dimensions) or nomic-embed-text (768 dimensions for lite).
- **Storage:** pgvector VECTOR column on `llm_chats` with an HNSW index.
- **When:** Embeddings are generated fire-and-forget after saving chat messages. If embedding fails, the message is still saved — RAG context will simply miss it.
- **Retrieval:** Before each chat, the system queries for the 5 most similar past messages using cosine similarity with a 5-second timeout. If the query times out, chat proceeds without RAG context.

**Why HNSW over IVFFlat:** HNSW provides better recall at the scale of per-user chat history (hundreds to low thousands of vectors). IVFFlat requires a minimum number of vectors to build effective clusters and performs poorly on small datasets.

---

## 7. Frontend Architecture

### Stack

- **Vue 3** with `<script setup>` and Composition API (no Options API).
- **Pinia** for state management — one store per domain (auth, expense, budget, income, dashboard, llm, category, admin, subaccount).
- **Tailwind CSS** for styling — no CSS modules, no scoped styles.
- **Axios** for API calls — one axios instance per microservice, each with an interceptor for JWT token injection and automatic refresh on 401.
- **ApexCharts** for dashboard visualizations.

### Smart/Dumb Component Pattern

- **Views** (in `src/views/`) are smart components — they interact with stores, handle routing, and orchestrate data fetching.
- **Components** (in `src/components/`) are dumb/presentational — they receive props and emit events.

### API Service

`src/services/api.service.ts` creates six axios instances (one per backend service). Each instance:
1. Injects `Authorization: Bearer <token>` from the auth store.
2. Injects `X-Acting-As: <userId>` if an admin has switched to a sub-account.
3. On 401 response, attempts token refresh. If refresh succeeds, retries the original request. If not, redirects to login.

### Account Switching

When an admin clicks a sub-account in the sidebar:
1. `subAccountStore.switchToSubAccount(userId)` sets `_actingAsUserId` in the API service.
2. Every view watches `subAccountStore.activeSubAccountId` — when it changes, all data is refetched.
3. The LLM store calls `resetForAccountSwitch()` to clear chat messages before reloading history.
4. A banner shows "Viewing: [name]'s account" above the main content.
5. Clicking "My Account" calls `switchToOwnAccount()`, clearing the acting-as state.

### Router Guards

- `/admin` routes require `role === 'admin' || role === 'superadmin'`.
- All other authenticated routes just check for a valid token.
- Unauthenticated users are redirected to `/login`.

---

## 8. Infrastructure

### Local Development

- **Docker Compose** runs PostgreSQL 16 (pgvector), Redis 7, and RabbitMQ 3.
- **Serverless Framework** (`serverless-offline`) runs each Lambda handler as a local HTTP server.
- **Ollama** runs natively (not in Docker) for GPU access.

### AWS Production (Terraform)

The `infra/terraform/` directory contains a complete AWS deployment with 8 reusable modules:

**Networking (VPC module):**
- VPC with 10.0.0.0/16 CIDR
- 2 public subnets (10.0.0.0/24, 10.0.1.0/24) with Internet Gateway
- 2 private subnets (10.0.10.0/24, 10.0.11.0/24) with NAT Gateway
- All database, cache, Lambda, and ECS resources in private subnets

**Database (RDS module):**
- PostgreSQL 16 with pgvector (extension created via migration)
- gp3 storage, encrypted at rest
- Performance Insights enabled (7-day free tier retention)
- Configurable: multi-AZ, deletion protection, backup retention (7 days default)
- Private subnet only, security group allows port 5432 from VPC CIDR only

**Cache (ElastiCache module):**
- Redis 7.0 replication group (single node for dev, expandable)
- Transit and at-rest encryption
- Automatic snapshots with 1-day retention
- Auto minor version upgrades

**Message Queue (MQ module):**
- AmazonMQ RabbitMQ 3.13 (single instance)
- AMQPS (port 5671) — TLS enforced
- Private subnet, not publicly accessible

**Compute (Lambda module):**
- Reusable module instantiated 6 times (one per service)
- Node.js 20.x runtime, configurable memory/timeout
- VPC-attached with egress-only security group
- CloudWatch log groups with configurable retention
- Placeholder ZIP packaging — real code deployed via CI/CD

**API Gateway:**
- HTTP API (v2) with path-based routing to Lambda functions
- CORS configured: explicit origin allowlist, Authorization + X-Acting-As headers
- Throttling: 50 rps steady state, 100 burst
- Auto-deploy stage

**LLM Infrastructure:**
- **Ollama on ECS Fargate** — container with EFS volume mount for persistent model storage. Service discovery via AWS Cloud Map for internal DNS resolution.
- **LLM Streaming Server (ECS)** — separate Fargate task running Express SSE server. Port 3007, VPC-internal only.
- **LLM Queue Worker (ECS)** — separate Fargate task consuming from RabbitMQ. Egress-only security group (no inbound ports).

**Frontend (AWS Amplify):**
- Amplify app with Vue 3 build spec (npm ci + npm run build, dist output)
- SPA rewrite rule: all non-file routes serve index.html
- Environment variables for VITE_* API URLs injected at build time
- Optional custom domain association
- Production branch deployment

**Secrets Management:**
- SSM Parameter Store for database password and JWT secret
- ECS tasks use `secrets` block to inject at container start (not plaintext environment variables)
- Lambda functions reference secrets via environment variables (passed from Terraform variables)
- IAM policy grants the ECS execution role `ssm:GetParameters` access scoped to specific parameter ARNs

**Remote State:**
- S3 bucket with versioning, KMS encryption, public access blocked
- DynamoDB table for state locking
- Bootstrap resources created with local state, then migrated via `terraform init -migrate-state`

---

## 9. Design Patterns

### Dependency Injection (tsyringe)

Every service has a `container.ts` that registers concrete implementations against interface tokens:

```typescript
container.register('IExpenseRepository', { useClass: ExpenseRepository });
container.register('ICacheService', { useClass: RedisService });
```

Services receive dependencies via constructor injection with `@inject()` decorators. This enables:
- **Testing** — swap real repositories for in-memory fakes.
- **Flexibility** — replace Redis with Memcached, Ollama with OpenAI, or pgvector with Pinecone by changing one binding.

### Repository Pattern

All data access goes through repository interfaces (`IRepository<T>`, `IExpenseRepository`, etc.). Repositories return DTOs, never raw ORM rows. This decouples business logic from the database schema.

### Facade Pattern

`LLMService` is a facade that delegates to `ChatService`, `CategorizationService`, and `OCRService`. The handler layer only interacts with `LLMService`, keeping the API surface clean while the implementation is split into focused classes.

### Template Method Pattern

`BaseLLMProvider` implements retry logic and error classification. Subclasses (`OllamaProvider`) only implement `executeComplete()` and `executeEmbed()`. This ensures consistent retry behavior across any future LLM provider.

### Cache-Aside Pattern

The dashboard service implements cache-aside with Redis:
1. Check Redis for cached result.
2. If miss, query the database.
3. Store the result in Redis with a 5-minute TTL.
4. Return the result.

Cache invalidation is time-based (TTL expiry), not event-based. This is acceptable because dashboard data is aggregate and tolerates 5 minutes of staleness.

### Sliding Window Rate Limiting

LLM endpoints are rate-limited using Redis sorted sets with Lua scripts for atomicity:
- Key: `rate_limit:{userId}`
- Members: request timestamps
- Window: 60 seconds
- Limit: 20 requests per user per minute

The Lua script atomically removes expired entries, counts remaining, and adds the new timestamp. This prevents race conditions in concurrent requests.

---

## 10. Trade-offs and Decisions

### New signups default to admin, not user

**Decision:** Every account created via `/auth/register` gets `role: 'admin'`.

**Rationale:** Financer is designed as a multi-tenant personal finance tool. Each registrant is the administrator of their own financial domain — they manage their own data and can create sub-accounts (e.g., family members, dependents). Making the default role 'user' would require a separate admin creation flow and add friction to the signup experience.

**Trade-off:** There is no way to create a standalone 'user' account via self-registration. Users (sub-accounts) can only be created by admins through the dashboard. This is intentional — sub-accounts represent delegated access, not independent accounts.

### Superadmin cannot access individual user data

**Decision:** Superadmins are blocked from using the `X-Acting-As` header.

**Rationale:** Platform administrators need visibility into aggregate metrics (how many users, total expenses, LLM usage) but should not be able to browse individual financial records or chat histories. This is a privacy-first design — if a superadmin needs to debug a user's issue, they should do so through logs or with explicit user consent, not by impersonating the user.

**Trade-off:** Superadmins cannot perform support actions like fixing a user's miscategorized expense. This is accepted as a feature, not a limitation.

### Local Ollama instead of cloud LLM APIs

**Decision:** All LLM features use locally-running Ollama models instead of OpenAI, Anthropic, or other cloud APIs.

**Rationale:**
- **Privacy** — financial data never leaves the user's machine or private VPC.
- **Cost** — no per-token charges. Once models are downloaded, inference is free.
- **Latency** — no network round-trip to an external API. Local inference on modern GPUs is competitive with cloud API latency.
- **Offline capability** — the system works without internet access after initial model download.

**Trade-off:** Model quality is lower than GPT-4 or Claude. The 9B parameter qwen3.5 model is capable but not state-of-the-art. Complex financial questions may get less accurate answers. OCR accuracy with glm-ocr is good but not perfect on handwritten receipts.

### Synchronous chat instead of streaming by default

**Decision:** The primary `/llm/chat` endpoint is synchronous (blocks until full response is ready).

**Rationale:** The tool-calling loop requires multiple LLM round-trips (detect tool call -> execute tool -> feed result back -> generate answer). Streaming the intermediate tool-call steps would expose internal implementation details to the frontend. The synchronous endpoint keeps the API contract simple: send message, receive answer.

**Trade-off:** Users see a loading spinner instead of tokens appearing in real-time. The separate SSE streaming server (port 3007) exists for scenarios where streaming is worth the added complexity.

### Redis for refresh tokens instead of PostgreSQL

**Decision:** Refresh tokens are stored in Redis, not in a database table.

**Rationale:** Refresh tokens have a fixed TTL (7 days) and are checked on every token refresh. Redis handles TTL-based expiry natively and supports O(1) lookups. Storing them in PostgreSQL would require periodic cleanup jobs and add write load to the primary database.

**Trade-off:** If Redis goes down, all users must re-login (refresh tokens are lost). This is acceptable because Redis is a cache-only deployment (no persistence configured in docker-compose), and re-login is a low-severity inconvenience.

### No cross-service communication

**Decision:** Backend services never call each other directly. All inter-service data sharing goes through the shared library or the database.

**Rationale:** Direct service-to-service calls create tight coupling, cascading failures, and complex dependency graphs. The shared database acts as the integration layer — services read from the same tables via the shared repository layer.

**Trade-off:** Some data fetching is redundant. For example, the dashboard service computes expense totals by querying the expenses table directly rather than calling the expense service. This duplicates the query logic but avoids runtime coupling.

### pgvector instead of a dedicated vector database

**Decision:** Vector embeddings are stored in PostgreSQL using the pgvector extension, not in a dedicated vector database like Pinecone, Weaviate, or Milvus.

**Rationale:** Adding a separate vector database would introduce another infrastructure dependency, another connection to manage, and another point of failure. pgvector is sufficient for the scale of per-user chat history (hundreds to thousands of vectors) and supports HNSW indexing for fast approximate nearest neighbor queries.

**Trade-off:** At large scale (millions of vectors), a dedicated vector database would offer better performance and features (filtering, metadata, sharding). For a personal finance app, this scale is unlikely to be reached.

### Compiled shared library instead of live TypeScript

**Decision:** The backend shared library compiles to `.js` + `.d.ts` files. Consumer services reference the compiled output, not the TypeScript source.

**Rationale:** Serverless-plugin-typescript (used by each service) compiles each service independently. It cannot resolve TypeScript imports from external workspace packages. The compiled approach ensures compatibility with the serverless build pipeline.

**Trade-off:** Developers must rebuild the shared library (`cd apps/backend/shared && npx tsc`) after changes before service type-checks reflect the updates. This adds friction to the development loop but is a one-time cost per change.

---

## 11. Security Model

### Input Validation

All API inputs are validated with Zod schemas. Invalid requests are rejected with 400 status codes before reaching business logic. Validation covers:
- Type checking (string, number, UUID format)
- String length limits
- Date format and range validation
- Enum value validation (roles, categories)

### Ownership Validation

Every mutation (create, update, delete) on user-scoped resources checks that the requesting user owns the resource. This is enforced at the repository level via `findOwnedOrThrow(id, userId)`, not at the handler level. This ensures ownership checks cannot be accidentally bypassed by new code.

### Rate Limiting

LLM endpoints are rate-limited to 20 requests per user per minute using Redis sorted sets. The implementation uses Lua scripts for atomic check-and-increment, preventing race conditions. Non-LLM endpoints rely on API Gateway throttling (50 rps steady, 100 burst) for protection.

### CORS

API Gateway configures CORS with an explicit origin allowlist (default: `http://localhost:5173`). The `X-Acting-As` header is included in `allow_headers` to support sub-account switching from the frontend.

### Secrets

- **Local development:** Secrets are stored in `.env` (git-ignored). The `.env.example` template has placeholder values.
- **AWS production:** ECS task secrets are stored in SSM Parameter Store and injected at container start via the `secrets` block (never plaintext in task definitions). Lambda functions receive secrets as environment variables from Terraform variables (populated via `tfvars` or CI/CD).
- **JWT secrets:** Access and refresh tokens use separate secrets. Compromise of one does not compromise the other.

### Password Hashing

Bcrypt with configurable rounds (10-15, default 12). The round count is clamped to prevent both too-fast hashing (rounds < 10) and denial-of-service via excessive computation (rounds > 15).

### Frontend Security Headers

The frontend is hosted on AWS Amplify, which serves all traffic over HTTPS with managed TLS certificates. Security headers (HSTS, X-Frame-Options, X-Content-Type-Options) are configured at the Amplify app level via custom response headers or handled by the default Amplify CDN configuration.
