# Job Pipeline Audit — discovery → queue → auto-apply

Date: 2026-06-12. Scope: apps/api (search, queue, scheduling, application), apps/worker, apps/extension, apps/web wiring, packages/db.

## 1. Flow diagram (what triggers what)

```
TRIGGERS
  A) Web UI button "Run Search Now"
     Dashboard.tsx / JobQueue.tsx / JobSources.tsx
       -> POST /api/v1/jobs/search/run            (apps/api/src/search/search.controller.ts)
       -> BullMQ queue 'job-search' (job name 'manual-search', { userId })
  B) Cron: every 6h 'scheduled-search' (no userId -> fan out to all users with prefs)
     registered in QueueModule.onModuleInit       (apps/api/src/queue/queue.module.ts)

NOTE: ALL processors run INSIDE the API process via @nestjs/bullmq (QueueModule).
      apps/worker is an intentional no-op stub (guarded by WORKER_STANDALONE;
      if forced on, it would CONSUME and discard real jobs).

DISCOVERY
  'job-search' -> JobSearchProcessor.process()
       reads user_preferences.targetRoles (skips user if empty!)
       -> SearchService.runSearch(userId, criteria)   (search/search.service.ts)
            for each registered IJobSource (DI token JOB_SOURCES, search.module.ts):
              manual_url   (no-op generator)
              rss_feed     (default feeds; custom feeds unreachable - setFeedUrls never called)
              indeed_api   (HTML scrape of indeed.com - usually blocked)
              adzuna_api   (needs ADZUNA_APP_ID/ADZUNA_APP_KEY)
              google_jobs  (needs SERPAPI_KEY via SerpAPI)
              csv_import   (unreachable - setCsvData never called, no upload endpoint)
            -> JobValidator.validate() -> DeduplicationEngine.isDuplicate()
            -> INSERT INTO jobs (packages/db/src/schema/jobs.ts), validationStatus='valid'
            -> eventBus.emit('job.discovered')

  'job.discovered' (EventHandlersModule, core/event-bus/event-handlers.module.ts)
       -> enqueue 'job-validation' { jobId } + INSERT notification

VALIDATION
  'job-validation' -> JobValidationProcessor: re-validate + scamScore, update jobs row,
       emit 'job.validated'  (NOTHING listens to job.validated -> no auto-apply chain)

APPLY (manual trigger only)
  Web JobQueue.tsx "Apply" -> POST /api/v1/applications { jobId }
       (application/application.controller.ts)
       -> ApplicationService.queue(): INSERT applications row (status 'queued', idempotent)
       -> controller enqueues BullMQ 'application' (job 'apply')
  'application' -> ApplicationProcessor (queue/processors/application.processor.ts):
       rate-limit check (scheduling/rate-limiter.ts)
       -> ResumeTailorAgent.tailorResume()   [LLM; RESULT IS DISCARDED - never saved]
       -> CoverLetterAgent.generateCoverLetter() [saved to applications.coverLetter]
       -> sets status='submitted' WITHOUT ANY REAL SUBMISSION
          ("actual form filling would happen via browser extension" - it doesn't)
       -> emit 'application.submitted' -> notification

BROWSER EXTENSION (apps/extension)
  - SAVE_JOB -> POST /jobs/url (works)
  - CAPTURE_FORM -> POST /applications/form-capture (was 404; endpoint now added,
    persists to portal_mappings via PortalMappingCache)
  - It only OBSERVES/CAPTURES. It does NOT fill or submit forms.
  - DomAnalyzerAgent / FormFillerAgent / AnswerBank exist but are never invoked
    by the application pipeline.

FOLLOW-UP
  'follow-up' (daily 9am scheduler ADDED in this audit) -> FollowUpProcessor sweeps
  submitted apps >7 days without response -> enqueues 'outreach' follow-ups.
```

## 2. Stage status table

| Stage | Status | Evidence |
|---|---|---|
| Search trigger (manual API + 6h cron) | WORKS | `apps/api/src/search/search.controller.ts` (POST search/run), `apps/api/src/queue/queue.module.ts` (upsertJobScheduler) |
| Worker bootstrap | WORKS (by design in API) | `apps/api/src/queue/queue.module.ts` registers all 8 processors; `apps/worker/src/worker.ts` is a documented no-op stub |
| Queue names enqueuer vs processor | WORKS (consistent) | 8 names identical across `queue.constants.ts`, `queue.module.ts`, controllers, `apps/worker/src/processors/index.ts` |
| Job sources registered/instantiated | WORKS (6 sources via DI) | `apps/api/src/search/search.module.ts` JOB_SOURCES factory |
| Source: RSS default feeds | NEEDS-WORK | `sources/rss-feed.source.ts` — stackoverflow.com/jobs/feed is dead; custom feeds (`setFeedUrls`) never called |
| Source: Indeed scrape | NEEDS-WORK | `sources/indeed-api.source.ts` — plain fetch of indeed.com, Cloudflare-blocked in practice |
| Source: Adzuna / Google Jobs | WORKS with API keys | `sources/adzuna-api.source.ts`, `sources/google-jobs.source.ts` (skip gracefully without keys) |
| Source: CSV import | MISSING (unreachable) | `sources/csv-import.source.ts` — `setCsvData` has zero callers, no upload endpoint |
| Persist discovered jobs | WORKS | `search.service.ts` runSearch -> `search.repository.ts` insertJob -> `packages/db/src/schema/jobs.ts` |
| Dedup + validation | WORKS | `search/deduplication-engine.ts`, `search/job-validator.ts`, `queue/processors/job-validation.processor.ts` |
| Job scoring on discovery | NEEDS-WORK | `JobSearchProcessor.processDiscoveredJob` (scores + jobScorer) is dead code; `SearchService.runSearch` inserts without scores |
| GET /jobs/sources for the Sources UI | FIXED | `search.controller.ts` — route added before `:id` (was shadowed: "sources" parsed as job id -> UI always empty) |
| job_sources DB table | MISSING usage | `packages/db/src/schema/jobs.ts` defines `jobSources`; zero references in app code, no CRUD, no seed |
| Queue an application (manual) | WORKS | `application.controller.ts` POST / -> `application.service.ts` queue() + BullMQ 'apply' |
| Auto-apply after validation | MISSING | nothing subscribes to `job.validated`; no autonomous job->application bridge anywhere |
| Actual form-fill / submission | MISSING (simulated) | `queue/processors/application.processor.ts` line ~121 marks 'submitted' without submitting; no playwright; extension doesn't fill |
| Tailored resume used in application | NEEDS-WORK | `application.processor.ts` — `tailored` result discarded; no PDF generated/attached |
| Supervised autonomy / approval gate | NEEDS-WORK | controller enqueues 'apply' immediately regardless of `autonomyMode: 'supervised'`; `approve()` only flips status; `agent:paused` flag (agent-control.service.ts) never checked by processors |
| Extension form capture endpoint | FIXED | `application.controller.ts` POST form-capture -> `portal-mapping-cache.ts` set() (was 404) |
| Follow-up sweep | FIXED | `queue.module.ts` — FollowUpProcessor existed but no scheduler/enqueuer; daily 9am scheduler added |
| Research processor | NEEDS-WORK (idle) | `queue/processors/research.processor.ts` registered; nothing enqueues 'research' jobs |
| Inbox scan | WORKS (needs per-user IMAP config) | `queue/processors/inbox-scan.processor.ts` + 15-min scheduler; reads per-user `emailImapConfig` |
| DB migrations for core schema | FIXED (script) / NEEDS-RUN | only `0001_resume_page_builder.sql` exists, no meta journal — added `db:push` (drizzle-kit push) to `packages/db/package.json` + root `package.json` |
| Seeds | MISSING (empty, non-blocking) | `packages/db/src/seeds/seed.ts` only verifies connection; nothing requires seeding because sources are code-registered and user rows (incl. user_preferences) are created at register (`auth/auth.repository.ts`) |
| .env.example coverage | FIXED | added `CHROMIUM_PATH` alias note; all other `process.env` / ConfigService keys already present |

## 3. Exact first-run checklist

1. **Infra**: `docker compose up -d postgres redis` (docker-compose.yml: `pgvector/pgvector:pg16` on 5432, `redis:7-alpine` on 6379). The `api`/`web` compose services exist too but local dev runs them via pnpm.
2. **Env**: `cp .env.example .env`, then set:
   - `DATABASE_URL=postgresql://jobagent:devpassword@localhost:5432/jobagent` (default matches compose)
   - `REDIS_URL=redis://localhost:6379`
   - `JWT_SECRET=<random>`
   - LLM provider — at least one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, or run Ollama locally at `OLLAMA_BASE_URL=http://localhost:11434` (free fallback). Without any provider, job scam-validation/tailoring/cover letters fail (search inserts still work; LLM steps are try/caught).
   - Job sources: `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` (free at developer.adzuna.com) and/or `SERPAPI_KEY`. **Without these, real discovery depends only on the default RSS feeds, one of which is dead.**
3. **Install + build packages**: `pnpm install`, then `pnpm --filter @auto-job-apply/db build` (and `shared-*` build, or just `pnpm build`).
4. **Create schema**: `pnpm db:push` (drizzle-kit push — required; `pnpm db:migrate` only contains the resume-builder migration and has no meta journal). `pnpm db:seed` is a no-op (safe to skip).
5. **Start order**: API first (`pnpm --filter @auto-job-apply/api dev`, port 3000 — it hosts ALL queue processors and registers cron schedulers on boot), then web (`pnpm --filter @auto-job-apply/web dev`). Do NOT set `WORKER_STANDALONE=true`; apps/worker stubs would consume and discard real jobs.
6. **Create a user + preferences**: register via web; complete onboarding or `PUT /api/v1/settings/preferences` with `targetRoles` (and optionally `locations`, `salaryMin`, `skills`). **A user with empty `targetRoles` is silently skipped by every search.**
7. **Add a source / run a search**: Job Sources page → "Run Search Now" (or `POST /api/v1/jobs/search/run`). Watch API logs for `job-search-processor` / `search-service`; jobs appear in the Job Queue page (`GET /api/v1/jobs`). To add a single job: paste a URL under "Manual Add" (`POST /api/v1/jobs/url`). There is currently no UI/endpoint to add RSS/CSV sources — only env-keyed APIs and defaults.
8. **Apply**: Job Queue → Apply → `POST /api/v1/applications {jobId}`. The processor will tailor + write a cover letter and mark it "submitted" — **be aware this is a simulated submission** (no form is actually filled on any portal).

## 4. Top 5 priorities to make discovery→apply real

1. **Real submission executor** (biggest gap): `ApplicationProcessor` fakes submission. Wire DomAnalyzerAgent + FormFillerAgent + AnswerBank + PortalMappingCache into either a Playwright runner (api-side) or a true extension-driven flow (extension polls queued applications, fills forms, reports back). Everything around it (queue, rate limiter, events, retry/dead-letter) already works.
2. **Reliable discovery source by default**: Adzuna/SerpAPI keys are the only realistic sources. Replace dead `stackoverflow.com/jobs/feed`, expose `RssFeedSource.setFeedUrls` / `CsvImportSource.setCsvData` via endpoints backed by the unused `job_sources` table (CRUD + per-user configs), and make `SearchService.runSearch` read them.
3. **Autonomy bridge job→application**: subscribe to `job.validated` (or score threshold) and auto-call `ApplicationService.queue` for users with `autonomyMode='autonomous'`; enforce the supervised review gate (only enqueue the BullMQ 'apply' job after `approve()`), and honor the `agent:paused:<userId>` Redis flag inside processors.
4. **Use the tailored resume**: persist `tailorResume` output, render it to PDF (resume-renderer already exists), and attach it to the application record so the submitter has an artifact to upload.
5. **Scoring on the real path**: move the scoring/dedup logic from the dead `JobSearchProcessor.processDiscoveredJob` into `SearchService.runSearch` so `relevanceScore`/`callbackProbability` are populated and the UI can rank jobs.

## Fixes applied in this audit

| Fix | File |
|---|---|
| Added `GET /api/v1/jobs/sources` (before `:id`, which had been swallowing the path) returning registered sources + configured flags | `apps/api/src/search/search.controller.ts` |
| Added daily scheduler for the never-triggered `follow-up` queue | `apps/api/src/queue/queue.module.ts` |
| Added `POST /api/v1/applications/form-capture` (extension was getting 404) persisting via PortalMappingCache | `apps/api/src/application/application.controller.ts` |
| Added `db:push` scripts (core schema has no migrations; push is the only way to create it) | `packages/db/package.json`, root `package.json` |
| Documented `CHROMIUM_PATH` alias env var | `.env.example` |

## Update (scraping + Gemini)

Date: 2026-06-12 (follow-up to priority #2 above — "reliable discovery source by default").

- **Two new key-free scraping sources** registered ahead of the keyed sources in `JOB_SOURCES` (`apps/api/src/search/search.module.ts`), so default discovery no longer depends on Adzuna/SerpAPI keys:
  - `RemoteOkSource` (`remoteok` channel) — public `https://remoteok.com/api` JSON endpoint; skips the legal-notice first element, strips HTML descriptions, maps tags to `requiredSkills`, defaults location to "Remote".
  - `ArbeitnowSource` (`arbeitnow` channel) — public `https://www.arbeitnow.com/api/job-board-api`; honors `remoteOnly` via the API's `remote` flag.
  - Both filter by `criteria.keywords` / `excludeCompanies` / `postedWithinDays` like the RSS source and swallow fetch failures (a failing source never breaks the run). New `SourceChannel` enum values `remoteok` / `arbeitnow` added in `packages/shared-types`.
- **RSS defaults fixed** (`rss-feed.source.ts`): dead `stackoverflow.com/jobs/feed` removed; defaults are now `weworkremotely.com/categories/remote-programming-jobs.rss` and `remotive.com/remote-jobs/feed`.
- **New Gemini LLM provider** (`apps/api/src/llm/providers/gemini.provider.ts`): Google Generative Language REST API (`generateContent`), registered in `LlmService.onModuleInit` when `GEMINI_API_KEY` is set (model via `GEMINI_MODEL`, default `gemini-2.0-flash`, tier `standard`); added to the web Settings provider dropdown and `.env.example`. Pricing placeholders: $0.10/1M input, $0.40/1M output.
- Tests: `apps/api/src/search/sources/scraper-sources.test.ts`, `apps/api/src/llm/gemini.provider.test.ts` (fetch stubbed, no network).
