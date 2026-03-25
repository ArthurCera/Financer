# 🏦 Finance Organizer Portfolio Project: Multi-Phase Development Plan

> **Key Takeaway:**
> This plan delivers a production-grade, full-stack Finance Organizer app with a microservice Node.js/TypeScript backend, Vue 3/Tailwind CSS frontend, PostgreSQL (with pgvector), RabbitMQ, Redis, local Ollama LLM, and a vector DB for chat storage. Every step is meticulously categorized, strictly follows SOLID and clean code principles, and leverages interface-driven design for maximum maintainability and extensibility.

---

## ⚠️ SOLID + Clean Code Mandate — Non-Negotiable

Every backend service MUST adhere to the following without exception:

- **Define business logic behind an interface.** Never expose a concrete class across service boundaries.
- **Use constructor injection exclusively.** No `new ConcreteClass()` inside business logic. No service locator pattern.
- **Never import from another microservice directly.** All cross-service contracts go through `apps/backend/shared/` only.
- **LLM, OCR, Vector DB, Queue, and Cache integrations MUST be behind abstract classes.** The concrete implementation (Ollama, pgvector, RabbitMQ, Redis) must be swappable by changing a single binding.
- **Single Responsibility:** Each class/function has exactly one reason to change.
- **Open/Closed:** Add new behavior by creating new implementations, not by modifying existing abstractions.
- **Interface Segregation:** Keep interfaces narrow. No class is forced to implement methods it does not use.
- **Dependency Inversion:** High-level modules (services) depend on abstractions. Low-level modules (repositories, providers) implement them.

---

## 📋 Plan Overview

- **Phase 1:** Environment & Infrastructure Setup
- **Phase 2:** Core Backend & Frontend Development
- **Phase 3:** LLM, OCR, and Advanced AI Integration
- **Refinement History:** 5+ Iterative Improvements
- **Appendices:** Folder Structures, Schema, Code Patterns, Docs

---

## 🚦 Phase 1: Environment & Infrastructure Setup

### 1.1. Monorepo Project Structure

> **Monorepo** enables shared code, unified tooling, and strict separation of concerns for microservices and frontend .

```
finance-organizer/
├── apps/
│   ├── backend/         # Node.js microservices (TypeScript)
│   └── frontend/        # Vue 3 + Tailwind CSS SPA
├── scripts/             # Local setup, orchestration, and utility scripts
├── infra/
│   ├── terraform/       # Mock AWS IaC (Lambda, RDS, Redis, RabbitMQ, S3)
│   └── serverless/      # serverless-offline configs for local Lambda simulation
├── packages/            # Shared libraries (DTOs, types, utils)
└── README.md
```
> **Key Principle:** Each service/module is isolated, interface-driven, and adheres to SOLID/clean code .

---

### 1.2. Automated Local Setup Scripts

- **Idempotent Bash/PowerShell scripts** for:
  - PostgreSQL (with pgvector)
  - Node.js (via fnm/nvm)
  - pnpm (for Vue)
  - Ollama (local LLM)
  - Redis, RabbitMQ
- **Component selection menu** for granular installs , .

**Example Bash Menu:**
```bash
PS3="Select component to install: "
select opt in "Node.js" "pnpm" "PostgreSQL" "Ollama" "Redis" "RabbitMQ" "All" "Quit"; do
  # ...case logic for each install...
done
```
- **Docs:** [Ollama Install](https://docs.ollama.com/), [fnm](https://github.com/Schniz/fnm), [Tesseract.js](https://github.com/naptha/tesseract.js)

---

### 1.3. Local Microservice Orchestration

- **Scripts to run all microservices** (backend) and frontend in parallel.
- **serverless-offline** for AWS Lambda simulation .
- **Docker Compose** (optional) for orchestrating DB, Redis, RabbitMQ, Ollama.

---

### 1.4. Mock AWS Infrastructure-as-Code

- **Terraform modules** for:
  - Lambda (Node.js)
  - API Gateway
  - RDS PostgreSQL
  - ElastiCache Redis
  - Amazon MQ (RabbitMQ)
  - S3
- **Best practices:** Modular structure, environment-specific variable files , .

**Docs:**  
- [Terraform AWS Lambda](https://spacelift.io/blog/terraform-aws-lambda)  
- [Terraform RDS PostgreSQL](https://dev.to/yet_anotherdev/terraforming-aws-rds-a-practical-guide-with-postgres-42ka)  
- [Terraform ElastiCache Redis](https://github.com/cloudposse/terraform-aws-elasticache-redis)  
- [Terraform Amazon MQ](https://samyouaret.com/blog/deploying-rabbitmq-with-amazon-mq-using-terraform/)

---

## 🛠️ Phase 2: Core Backend & Frontend Development

### 2.1. Backend Microservices (Node.js/TypeScript)

#### 2.1.1. Architecture & Patterns

- **Strict SOLID & Clean Code:**  
  - All services, repositories, and integrations are defined by interfaces or abstract classes , .
  - Dependency Injection via **`tsyringe`** (lighter, decorator-based, optimal for Lambda cold starts).
  - Repository pattern for DB access.
  - Factory pattern for entity creation.

**Example: LLMProvider Interface**
```typescript
export interface LLMProvider {
  generateResponse(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
}
```
- **Docs:** [tsyringe](https://github.com/microsoft/tsyringe), [Clean Architecture TS](https://dev.to/dvorlandi/implementing-clean-architecture-with-typescript-3jpc)

---

#### 2.1.2. PostgreSQL Schema & ORM

- **Schema:**  
  - `users`, `accounts`, `budgets`, `categories`, `transactions`, `llm_chats` (with vector column for embeddings) , .
- **ORM:**  
  - **Drizzle ORM** for type-safe, modern TypeScript support and native pgvector integration .

**Example: LLM Chat Table**
```sql
CREATE TABLE llm_chats (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  embedding vector(768),  -- dimension set by OLLAMA_EMBED_DIMENSIONS in .env (model-dependent)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **Docs:** [Drizzle ORM](https://orm.drizzle.team/docs), [pgvector](https://github.com/pgvector/pgvector)

---

#### 2.1.3. Authentication & User Management

- **JWT Auth:**  
  - `jsonwebtoken` for access/refresh tokens , .
  - Middleware for token validation, user context injection.
  - Refresh endpoint, secure storage of refresh tokens (HTTP-only cookies) .

**Example Middleware:**
```typescript
import jwt from 'jsonwebtoken';
export function authenticateToken(req, res, next) { /* ... */ }
```
- **Docs:** [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)

---

#### 2.1.4. Core Endpoints

- **User:** Register, login, profile.
- **Dashboard:** Retrieve monthly expenses, budgets.
- **Expenses:** CRUD endpoints.
- **Budgets:** Set/create/delete.
- **Income:** CRUD for money received.

---

#### 2.1.5. RabbitMQ & Redis Integration

- **RabbitMQ:**  
  - `amqplib` with an abstract queue interface for LLM job queuing , .
  - Work queue and pub/sub patterns.

**Queue Interface Example:**
```typescript
export interface IQueue<T> {
  enqueue(job: T): Promise<void>;
  consume(handler: (job: T) => Promise<void>): Promise<void>;
}
```
- **Docs:** [amqplib](https://github.com/amqp-node/amqplib)

- **Redis:**  
  - `node-redis` for dashboard caching (cache-aside pattern) and rate limiting (fixed window counter) , .

**Rate Limiting Example:**
```typescript
async function rateLimit(req, res, next) { /* ... */ }
```
- **Docs:** [node-redis](https://redis.io/docs/latest/develop/clients/nodejs/)

---

### 2.2. Frontend (Vue 3 + Tailwind CSS)

#### 2.2.1. Project Setup

- **Vite** for fast dev/build .
- **Pinia** for state management .
- **Vue Router** for navigation .
- **Tailwind CSS** for styling .

#### 2.2.2. Folder Structure

```
src/
├── assets/
├── components/
├── composables/
├── layouts/
├── router/
├── services/
├── store/
├── views/
├── App.vue
└── main.ts
```
- **Docs:** [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html), [Pinia](https://pinia.vuejs.org/)

---

#### 2.2.3. Core Pages & Components

- **Login Page:** Auth form, JWT handling.
- **Dashboard:**  
  - Monthly expenses chart (**ApexCharts** — better Vue 3 support, richer chart-type switcher).
  - Budget comparison, chart type switcher (bar, line, donut/pie).
- **Expense/Budget/Income CRUD:** Forms and tables.
- **API Service Layer:** Abstracts backend calls.

---

## 🤖 Phase 3: LLM, OCR, and Advanced AI Integration

### 3.1. LLM Integration (Ollama, Vector DB)

- **Agnostic LLMProvider Interface:**  
  - Abstracts Ollama, OpenAI, etc. for chat, embeddings, OCR , .
- **Vector DB:**  
  - Use pgvector (PostgreSQL extension) for chat context storage and similarity search , .

**Embedding Workflow:**
1. Generate embedding via Ollama API.
2. Store in `llm_chats` table.
3. On query, embed input and perform nearest neighbor search.

---

### 3.2. OCR Payslip Extraction

- **Ollama Llama 3.2 Vision** for end-to-end OCR and structured data extraction , .
- **Fallback:** Tesseract.js for simple OCR .
- **Image Preprocessing:** Binarization, deskewing, noise removal for accuracy .

**Structured Output Strategy (in priority order):**

1. **Ollama structured output** — pass a JSON schema directly to the model via `format` for deterministic, typed responses. This is the primary path and avoids post-processing entirely.
2. **Zod fallback** — if the model returns malformed or partial JSON (can happen on smaller models), parse and validate with a Zod schema, coercing or discarding invalid fields rather than hard-failing.

**Example: Ollama OCR Call**
```typescript
const res = await ollama.chat({
  model: 'glm-ocr',
  messages: [{ content: 'Extract fields...', images: ['./payslip.png'] }],
  format: schema, // JSON schema — Ollama enforces structure at generation time
});
// Zod validation as fallback safety net
const parsed = PayslipSchema.safeParse(JSON.parse(res.message.content));
```

---

### 3.3. LLM-Driven Features

- **Expense Categorization:**
  - Endpoint for auto-categorizing expenses (by ID, batch, or month).
  - Uses structured output (Ollama `format` field) to return `{ categoryId, confidence }` — Zod validates as fallback.
- **LLM Chat:**
  - Chat endpoint with context management (vector search on `llm_chats` via pgvector).
- **Frontend Integration:**
  - Upload payslip (image) in expense form.
  - Auto-categorize button on dashboard.
  - LLM chat icon (floating, right-side pop-up).

> **Typing rule (all phases):** `const` everywhere. No `var`, no `let` unless a value genuinely needs reassignment. All function parameters and return types must be explicitly typed.

---

## 📦 Appendices

### A. Backend Microservice Folder Structure

Each service is **independently deployable** with its own `package.json` and entry point (Lambda handler). Services never import from each other — only from `shared/`.

```
apps/backend/
├── shared/                        # No business logic — only contracts
│   ├── interfaces/
│   │   ├── IRepository.ts         # Generic base: findById, save, delete
│   │   ├── IUserRepository.ts
│   │   ├── IExpenseRepository.ts
│   │   ├── IBudgetRepository.ts
│   │   ├── IIncomeRepository.ts
│   │   ├── ICacheService.ts
│   │   ├── IQueueService.ts
│   │   ├── ILLMProvider.ts        # complete(), embed(), isAvailable()
│   │   ├── IVectorRepository.ts   # upsert(), similaritySearch()
│   │   └── IOCRProvider.ts        # extractFromImage()
│   ├── abstracts/
│   │   ├── BaseLLMProvider.ts     # Retry, rate-limit, logging — no Ollama specifics
│   │   └── BaseRepository.ts      # Shared Drizzle query helpers
│   ├── types/
│   │   └── index.ts               # DTOs: UserDto, ExpenseDto, DashboardDto...
│   └── db/
│       ├── postgres.client.ts
│       └── redis.client.ts
│
├── auth-service/
│   ├── src/
│   │   ├── handlers/              # Lambda entry: handler.ts
│   │   ├── services/              # AuthService implements IAuthService
│   │   ├── repositories/          # UserRepository implements IUserRepository
│   │   └── validators/
│   ├── package.json
│   └── tsconfig.json
│
├── expense-service/               # same structure as auth-service
├── budget-service/
├── income-service/
├── dashboard-service/             # reads from cache (Redis) first, then DB
└── llm-service/                   # Phase 3: OllamaProvider, PgVectorRepository, RabbitMQ worker
    ├── src/
    │   ├── handlers/
    │   ├── providers/             # OllamaProvider extends BaseLLMProvider
    │   ├── repositories/          # PgVectorRepository implements IVectorRepository
    │   ├── workers/               # RabbitMQ consumer for batch categorization
    │   └── ocr/                   # OllamaOCRProvider implements IOCRProvider
    ├── package.json
    └── tsconfig.json
```

**Key rule:** `llm-service/providers/OllamaProvider.ts` is the only file that knows Ollama exists. All other code calls `ILLMProvider`.

> **`packages/shared` vs `apps/backend/shared`:**
> - `packages/shared/` (monorepo root) — frontend-backend shared types only (API response DTOs, enums used by both sides)
> - `apps/backend/shared/` — backend-only interfaces, abstract classes, and DB clients; never imported by the frontend

### B. PostgreSQL Schema (Drizzle ORM)

- See [Schema Example](#21.2-postgresql-schema--orm) above.

### C. Key Libraries & Docs

| Concern         | Library/Tool         | Docs/Links                                                                 |
|-----------------|---------------------|----------------------------------------------------------------------------|
| ORM             | Drizzle ORM         | [Drizzle Docs](https://orm.drizzle.team/docs)                              |
| LLM             | Ollama              | [Ollama API](https://docs.ollama.com/api)                                  |
| Queue           | amqplib             | [amqplib](https://github.com/amqp-node/amqplib)                            |
| Cache/RateLimit | node-redis          | [node-redis](https://redis.io/docs/latest/develop/clients/nodejs/)         |
| DI              | tsyringe            | [tsyringe](https://github.com/microsoft/tsyringe)                          |
| Charts          | ApexCharts (Vue 3)  | [ApexCharts Vue](https://apexcharts.com/docs/vue-charts/)                  |
| Frontend        | Vue 3, Pinia, Tailwind | [Vue](https://vuejs.org/), [Pinia](https://pinia.vuejs.org/)            |

---

## ✅ Conclusion

> **This plan delivers a robust, scalable, and maintainable Finance Organizer portfolio project. Every phase is meticulously structured, strictly adheres to SOLID and clean code principles, and leverages modern TypeScript, Node.js, and Vue.js best practices. All backend integrations (LLM, queue, cache, DB) are interface-driven for maximum flexibility and testability.**

---

**Ready to proceed with implementation or for any phase?**