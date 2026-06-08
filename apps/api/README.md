# Auto Job Apply - API

NestJS backend API with Fastify adapter, SOLID architecture, repository/service patterns, and BullMQ job processing.

## Prerequisites

- Node.js >= 20.0.0
- pnpm 9.15+
- Docker & Docker Compose (for Postgres and Redis)

## Setup

### 1. Install dependencies

From the monorepo root:

```bash
cd E:/claude_code_projects/auto-job-apply
pnpm install
```

### 2. Start infrastructure (Postgres + Redis)

```bash
docker-compose up -d postgres redis
```

### 3. Set up environment variables

Create `apps/api/.env`:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://jobagent:devpassword@localhost:5432/jobagent
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional - LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Optional - CAPTCHA
TWOCAPTCHA_API_KEY=

# Optional - Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
IMAP_HOST=
IMAP_PORT=
IMAP_USER=
IMAP_PASS=
```

### 4. Run database migrations

```bash
cd packages/db
pnpm drizzle-kit push
```

### 5. Start the API

```bash
cd apps/api
pnpm dev
```

This runs `nest start --watch`, which compiles and starts the NestJS app with hot reload. The server listens on `http://localhost:3000`.

### 6. Verify it works

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "postgres": "connected",
  "redis": "connected",
  "worker": "running",
  "uptime": 5
}
```

## Running with Docker

Start all services (Postgres, Redis, API, Web) together:

```bash
docker-compose up
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run tests |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm clean` | Remove dist/ |

## Architecture

```
apps/api/src/
├── main.ts                    # NestJS bootstrap (Fastify adapter)
├── app.module.ts              # Root module (17 imports)
│
├── core/                      # @Global: Config, Database, Redis, EventBus
│   ├── config/                # @nestjs/config with Zod validation
│   ├── database/              # Drizzle ORM client (DRIZZLE_CLIENT token)
│   ├── redis/                 # ioredis client (REDIS_CLIENT token)
│   └── event-bus/             # EventBus with Redis pub/sub (EVENT_BUS token)
│
├── common/                    # Shared utilities
│   ├── decorators/            # @CurrentUser() param decorator
│   ├── guards/                # JwtAuthGuard (Passport)
│   ├── pipes/                 # ZodValidationPipe
│   ├── filters/               # Global exception filter
│   └── interceptors/          # Request logging interceptor
│
├── auth/                      # JWT authentication (Passport)
├── llm/                       # Multi-provider LLM (OpenAI, Anthropic, Ollama)
├── search/                    # Job discovery with pluggable sources
├── resume/                    # Profile management, ATS scoring, agents
├── application/               # Application lifecycle with idempotency
├── inbox/                     # Email classification
├── outreach/                  # Networking and recruiter outreach
├── research/                  # Company research, scam detection
├── scheduling/                # BullMQ queue management, rate limiting
├── settings/                  # User preferences, autonomy mode
├── notifications/             # Notifications and alert rules
├── analytics/                 # Dashboard, funnel, LLM spend tracking
├── agent-control/             # Pause/resume/kill switch, GDPR endpoints
├── health/                    # Unauthenticated health check
├── websocket/                 # @WebSocketGateway with Redis pub/sub
└── queue/                     # 8 BullMQ processors + scheduled jobs
```

## Design Patterns

### Repository Pattern

Each module with database access has a dedicated repository class injected via an interface token:

```typescript
@Injectable()
export class SearchRepository implements ISearchRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findJobsByUser(userId: string, filters: JobFilter) { /* ... */ }
}
```

### Service Pattern

Business logic is isolated in services that depend on repository interfaces:

```typescript
@Injectable()
export class SearchService implements ISearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY) private readonly repo: ISearchRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async runSearch(userId: string, criteria: SearchCriteria) { /* ... */ }
}
```

### Dependency Inversion

All DI uses string tokens, never concrete classes:

```typescript
// Constants
export const SEARCH_SERVICE = 'SEARCH_SERVICE';
export const SEARCH_REPOSITORY = 'SEARCH_REPOSITORY';

// Module wiring
@Module({
  providers: [
    { provide: SEARCH_REPOSITORY, useClass: SearchRepository },
    { provide: SEARCH_SERVICE, useClass: SearchService },
  ],
})
export class SearchModule {}
```

### Controller Pattern

Controllers handle HTTP concerns only:

```typescript
@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(@Inject(SEARCH_SERVICE) private readonly searchService: ISearchService) {}

  @Get()
  async listJobs(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(JobFilterSchema)) filters: JobFilter,
  ) {
    return this.searchService.listJobs(user.sub, filters);
  }
}
```

## API Routes

### Auth (no auth required)
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (JWT guard)

### Jobs
- `GET /api/v1/jobs` - List jobs with filters
- `GET /api/v1/jobs/:id` - Get job by ID
- `POST /api/v1/jobs/url` - Add job by URL
- `DELETE /api/v1/jobs/:id` - Delete job
- `POST /api/v1/jobs/search/run` - Trigger search

### Profiles & Resumes
- `GET /api/v1/profiles` - List profiles
- `GET /api/v1/profiles/:id` - Get profile
- `POST /api/v1/profiles` - Create profile
- `PUT /api/v1/profiles/:id` - Update profile
- `DELETE /api/v1/profiles/:id` - Delete profile
- `POST /api/v1/resumes/score` - Score ATS compatibility
- `GET /api/v1/resumes/templates` - List templates

### Applications
- `GET /api/v1/applications` - List applications
- `GET /api/v1/applications/:id` - Get application
- `GET /api/v1/applications/review-queue` - Review queue
- `GET /api/v1/applications/dead-letter` - Dead letter queue
- `POST /api/v1/applications/:id/approve` - Approve application
- `POST /api/v1/applications/:id/reject` - Reject application
- `POST /api/v1/applications/:id/retry` - Retry failed application

### Inbox
- `GET /api/v1/inbox` - List emails
- `POST /api/v1/inbox/scan` - Trigger inbox scan

### Outreach & Contacts
- `GET /api/v1/outreach` - List outreach messages
- `POST /api/v1/outreach/:id/approve` - Approve and send
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact

### Research
- `GET /api/v1/companies/:id/research` - Get company research
- `POST /api/v1/companies/:id/research` - Trigger research

### Settings
- `GET /api/v1/settings` - Get all settings
- `PUT /api/v1/settings/autonomy` - Update autonomy mode
- `PUT /api/v1/settings/llm` - Update LLM settings
- `PUT /api/v1/settings/blacklists` - Update blacklists

### Notifications & Alerts
- `GET /api/v1/notifications` - List notifications
- `PUT /api/v1/notifications/:id/read` - Mark as read
- `PUT /api/v1/notifications/read-all` - Mark all as read
- `GET /api/v1/alerts/rules` - List alert rules
- `POST /api/v1/alerts/rules` - Create alert rule
- `DELETE /api/v1/alerts/rules/:id` - Delete alert rule

### Analytics & Monitoring
- `GET /api/v1/analytics/overview` - Dashboard overview
- `GET /api/v1/analytics/funnel` - Application funnel
- `GET /api/v1/monitoring/llm/spend` - LLM cost summary
- `GET /api/v1/monitoring/llm/requests` - LLM request log
- `GET /api/v1/monitoring/agent-log` - Agent work log

### Agent Control
- `GET /api/v1/agent/status` - Get agent status
- `POST /api/v1/agent/pause` - Pause agent
- `POST /api/v1/agent/resume` - Resume agent
- `POST /api/v1/agent/kill` - Kill switch
- `POST /api/v1/data/export` - Export data (GDPR)
- `DELETE /api/v1/data/delete` - Delete data (GDPR)

### Health (no auth required)
- `GET /health` - Health check

### WebSocket
- `ws://localhost:3000/ws` - WebSocket connection

## Queue Processors

All 8 BullMQ queues run inside the API process via `@nestjs/bullmq`:

| Queue | Concurrency | Schedule |
|-------|-------------|----------|
| job-search | 2 | Every 6 hours |
| job-validation | 5 | Every 24 hours |
| application | 1 | On demand |
| outreach | 2 | On demand |
| inbox-scan | 1 | Every 15 minutes |
| research | 3 | On demand |
| follow-up | 2 | On demand |
| maintenance | 1 | Daily at 3am |

## Troubleshooting

### `nest` command not found

The NestJS CLI is in devDependencies. Use:

```bash
pnpm exec nest start --watch
# or
npx nest start --watch
```

### Decorator metadata errors

The shared tsconfig at `tooling/tsconfig/node.json` already has `experimentalDecorators: true` and `emitDecoratorMetadata: true` enabled.

### Redis connection refused

Ensure Redis is running:

```bash
docker-compose up -d redis
```

### Database connection errors

Ensure Postgres is running and the database exists:

```bash
docker-compose up -d postgres
```

## Tech Stack

- **Runtime**: NestJS with Fastify adapter
- **Database**: PostgreSQL via Drizzle ORM
- **Cache/Queue**: Redis + BullMQ
- **Auth**: Passport JWT
- **Validation**: Zod (shared schemas from `@auto-job-apply/shared-types`)
- **WebSocket**: `@nestjs/websockets` with raw `ws` adapter
- **LLM**: OpenAI, Anthropic, Ollama (pluggable providers)
