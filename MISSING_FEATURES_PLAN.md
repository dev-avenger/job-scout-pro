# Missing Functionalities & Features Plan

**Cross-referenced against**: `specs.md` (product specification), `lovable-prompt.md` (UI design spec), and current codebase.

## How to Read This Document

Each item is tagged with:

- **Layer**: `[DB]` `[API]` `[UI]` `[EXT]` `[QUEUE]` `[LLM]`
- **Status**: `STUB` (code exists but does nothing), `MISSING` (no code at all), `PARTIAL` (some logic exists, incomplete)
- **Spec ref**: Which section of specs.md or lovable-prompt.md defines this feature

---

## 1. Queue Processors (All 8 are Empty Stubs)

Every queue processor only logs a message and returns. None execute real business logic.

| # | Processor | Status | Spec Reference | What It Should Do |
|---|-----------|--------|----------------|-------------------|
| 1.1 | `JobSearchProcessor` | `STUB` | specs: "Job sourcing pipeline", "Finds and scores jobs" | Query configured job sources (Indeed API, Adzuna, RSS feeds, Google Jobs, Playwright crawl), parse results, deduplicate against existing jobs, score relevance, insert new jobs into DB, emit `job.discovered` events. Specs say runs every 6 hours. |
| 1.2 | `JobValidationProcessor` | `STUB` | specs: "Job validation pipeline" | Liveness check (visit URL via Playwright, confirm listing is live), expiration detection, duplicate detection (fuzzy matching), scam detection via LLM agent, structured data extraction. Update `validationStatus` field, emit `job.validated` events. |
| 1.3 | `ApplicationProcessor` | `STUB` | specs: "Fills out applications", "Logs into portals" | Full application pipeline: select resume profile, tailor resume via LLM, generate cover letter, look up portal mapping, navigate portal via extension/Playwright, fill forms via DOM analysis + form filler agents, handle CAPTCHA, submit, update status. Specs define idempotency, partial form recovery, screenshot on failure. |
| 1.4 | `OutreachProcessor` | `STUB` | specs: "Finds hiring managers and sends outreach", "Automates follow-ups" | Send outreach emails via SMTP, personalize messages per contact/company, track delivery status, schedule follow-ups with human-like timing, emit `email.sent` events. |
| 1.5 | `InboxScanProcessor` | `STUB` | specs: "Monitors your inbox for replies" | Connect to IMAP, fetch new emails every 15 minutes, classify via LLM agent (interview/rejection/acknowledgement/recruiter/spam), link to applications, extract calendar events from interview invites, emit `email.received` events. |
| 1.6 | `ResearchProcessor` | `STUB` | specs: "Assesses company stability and culture", "Prepares you for interviews" | Research company via LLM + web scraping (Glassdoor, domain age, tech stack), compute stability/culture/glassdoor scores, detect scams, update companies table, generate interview prep materials. |
| 1.7 | `FollowUpProcessor` | `STUB` | specs: "Automates follow-ups" | Check applications past configurable follow-up threshold, draft follow-up and thank-you emails, schedule outreach messages, detect ghosting patterns. Specs say runs once daily. |
| 1.8 | `MaintenanceProcessor` | `STUB` | specs: "Continuous refresh", schedule section | Purge expired portal mappings (30-day cache), re-check job liveness (daily for <7 days old, every 3 days for older), clean old notifications, aggregate analytics, rotate LLM logs (90-day retention). Specs say runs nightly. |

---

## 2. AI Agents (All 7 are Empty Stubs)

Every agent class only extends `BaseAgent` with no methods. Prompt templates ARE registered in `llm.service.ts` (8 prompts) but no agent calls them.

| # | Agent | Status | Spec Reference | What It Should Do |
|---|-------|--------|----------------|-------------------|
| 2.1 | `ResumeTailorAgent` | `STUB` | specs: "Per-job resume tailoring" | Clone base resume, extract keywords from job description, rewrite summary, reorder skills, augment bullets, validate ATS compliance 0-100, iterate until passing threshold, generate PDF/DOCX/plain text. Specs: "AI humanisation layer" — remove generic AI phrases, vary sentence structure. |
| 2.2 | `CoverLetterAgent` | `STUB` | specs: "Fills out applications" — cover letter | Accept profile + job + company research, generate personalized cover letter. Specs: "Persona-driven writing" calibrating tone to target industry. A/B test different styles. |
| 2.3 | `DomAnalyzerAgent` | `STUB` | specs: "DOM analysis with LLM interpretation" | Capture rendered DOM of career/application page, identify form fields (label, selector, type, required, options), cache selectors per domain for 30 days, self-healing on site redesign. Specs: the agent "does not rely on hardcoded selectors." |
| 2.4 | `FormFillerAgent` | `STUB` | specs: "Fills out applications" | Map form fields to saved answers + profile data, generate answers for unmatched fields using LLM, handle multi-page forms, conditional branches. Specs: "never fabricates skills, experience, or qualifications." |
| 2.5 | `EmailClassifierAgent` | `STUB` | specs: "Monitors your inbox" | Classify email as interview/rejection/acknowledgement/recruiter/spam/unknown with confidence score. Extract interview details (date, time, format, location, interviewer). |
| 2.6 | `ScamDetectorAgent` | `STUB` | specs: "Detects job scams and fraud" | Check for: vague company, unrealistic pay, upfront payment requests, domain mismatches, newly created profiles. Company verification: business registration, domain age, LinkedIn/Glassdoor presence. Return scam score 0-1 + red flags. |
| 2.7 | `InterviewPrepAgent` | `MISSING` | specs: "Prepares you for interviews" | Prompt template exists but no agent class. Generate likely technical + behavioral questions with suggested answers, STAR-method frameworks, company-specific talking points, questions to ask interviewer. Detect AI screening vs human interview. |

---

## 3. Core Service Logic (Stubs and Incomplete)

| # | Service | Status | Spec Reference | What's Missing |
|---|---------|--------|----------------|----------------|
| 3.1 | `DeduplicationEngine` | `STUB` | specs: "Duplicate detection" | Returns `false` always. Should use fuzzy matching on title+company ("Senior Software Engineer" vs "Sr. Software Eng."), check externalId, sourceUrl. Merge duplicates keeping earliest posting date. |
| 3.2 | `JobScorer` | `STUB` | specs: "Finds and scores jobs" | Returns `0.5` always. Should compute: relevance (NLP semantic matching, transferable skills), callback probability (applicant count, posting age, match score), competition level, tech stack alignment, cultural fit. |
| 3.3 | `JobValidator` | `PARTIAL` | specs: "Job validation pipeline" | Only checks title/company. Should: visit URL for liveness, check expiration dates, run scam detector, enforce quality gate (no submission below relevance/ATS thresholds). |
| 3.4 | `AtsScorer` | `STUB` | specs: "Resume builder module" — ATS | Returns hardcoded 75. Should analyze keyword density vs job description, section completeness, formatting compliance, action verb usage. Specs: "validates ATS compliance on a 0-100 scale, iterates until passing threshold." |
| 3.5 | `AnswerBank` | `STUB` | specs: "What it learns over time", "Portal learning" | Completely empty. Should CRUD `saved_answers` table, lookup by field label/type, track usage frequency, learn from manual form submissions. Specs: "Every answer you provide is saved and reused automatically." |
| 3.6 | `PortalMappingCache` | `STUB` | specs: "What it learns over time" | Completely empty. Should cache form structures in Redis, lookup by domain+path, track success/failure rates, 30-day expiry. Specs: "Portal mappings are cached for 30 days." |
| 3.7 | `RateLimiter` | `PARTIAL` | specs: "CAPTCHA and anti-bot strategy" | Basic sliding window exists but not integrated. Specs define per-platform caps: LinkedIn 5/day, Workday 10/day, Greenhouse 15/day, Indeed 20/day. |

---

## 4. LLM Provider Implementations

| # | Provider | Status | What's Missing |
|---|----------|--------|----------------|
| 4.1 | `OpenAIProvider` | `NEEDS VERIFY` | Need to verify if actual API calls are implemented or stubbed |
| 4.2 | `AnthropicProvider` | `NEEDS VERIFY` | Need to verify if actual API calls are implemented or stubbed |
| 4.3 | `OllamaProvider` | `NEEDS VERIFY` | Need to verify if actual API calls are implemented or stubbed |

Specs define: per-task model routing (premium for resume/cover letter, economy for classification), Ollama as zero-cost fallback when cloud budget exhausted, auto-detection of available Ollama models.

---

## 5. API Endpoint Gaps (vs specs.md)

### 5.1 Search / Jobs `[API]` `PARTIAL`
- `POST /jobs/search/run` returns canned response without enqueuing BullMQ job
- **Missing**: Job source CRUD (`jobSources` table exists) — specs: "Source channels panel" with per-source configuration
- **Missing**: Target company CRUD (`targetCompanies` table exists) — specs: "Target Companies panel"
- **Missing**: Job scoring details not surfaced (relevanceScore, callbackProbability, competitionLevel in DB)
- **Missing**: Bulk URL import endpoint — specs: "Upload CSV"
- **Missing**: Email forwarding address display — specs: "Forward email" source

### 5.2 Applications `[API]` `PARTIAL`
- **Missing**: `POST /applications` to queue a new application from a jobId
- **Missing**: Application event history endpoint (`applicationEvents` table)
- **Missing**: Saved answers CRUD (`savedAnswers` table) — specs: "Answer bank"
- **Missing**: Portal mappings viewer (`portalMappings` table)
- **Missing**: Application withdrawal endpoint — specs: "Application withdrawal when you accept an offer"
- **Missing**: Kanban board data endpoint (grouped by status)

### 5.3 Inbox `[API]` `PARTIAL`
- `POST /inbox/scan` returns canned response without enqueuing
- **Missing**: Single email detail endpoint
- **Missing**: Reclassify email endpoint
- **Missing**: Link email to application manually
- **Missing**: IMAP configuration endpoint

### 5.4 Outreach `[API]` `PARTIAL`
- **Missing**: Create outreach message (draft)
- **Missing**: Update/edit message before sending
- **Missing**: Delete message
- **Missing**: Update/delete contact
- **Missing**: Generate outreach message via LLM for a contact

### 5.5 Research / Companies `[API]` `PARTIAL`
- **Missing**: List all researched companies
- **Missing**: Create company manually
- `triggerResearch()` generates LLM text but doesn't parse/save structured data (stability score, culture score, glassdoor rating, tech stack)

### 5.6 Settings `[API]` `MISSING` — Most of specs "What you provide" section
- **Missing endpoints for** (all have DB columns in `userPreferences`): target roles, locations, salary range, remote preference, daily app cap, stealth mode, activity hours, notification channel preferences
- **Missing**: Per-user API key management (OpenAI, Anthropic) — specs: "Your preferred LLM provider and API key"
- **Missing**: SMTP/IMAP email configuration — specs: "Gmail / Outlook integration"
- **Missing**: CAPTCHA service configuration — specs: "2Captcha, Anti-Captcha, CapSolver"
- **Missing**: Per-feature autonomy override table — specs: "Mixing modes per feature"

### 5.7 Notifications `[API]` `PARTIAL`
- **Missing**: Unread count endpoint (for badge)
- **Missing**: Delete notification
- **Missing**: Alert rule evaluation engine — rules exist in DB but nothing triggers them

### 5.8 Agent Control `[API]` `PARTIAL`
- `POST /data/export` — canned response, no actual export — specs: "Export all data (JSON/CSV)"
- `DELETE /data/delete` — canned response, no deletion — specs: "Delete account and all data"
- **Missing**: Queue stats endpoint — `SchedulingService.getQueueStats()` exists but not exposed
- **Missing**: Kill switch that also withdraws pending applications — specs: "Kill Switch stops all activity and withdraws all pending applications"

### 5.9 Auth `[API]` `MISSING`
- **Missing**: Password reset flow
- **Missing**: Email verification
- **Missing**: Change password endpoint
- **Missing**: Progressive trust escalation logic — specs: "Full Autopilot requires completing 30 supervised applications first"

---

## 6. Frontend Pages — Missing vs Lovable Prompt

### 6.1 Onboarding Flow `[UI]` `MISSING`
**Lovable prompt**: 5-step wizard with progress indicator
- Step 1: Profile import (drag-drop PDF/DOCX, LinkedIn, GitHub) — `MISSING`
- Step 2: Preferences (target roles, salary slider, locations, blacklists, daily cap) — `MISSING`
- Step 3: Dry-run preview (5 sample jobs with what agent would submit) — `MISSING`
- Step 4: Credential setup (per-portal, Ollama connection test) — `MISSING`
- Step 5: Autonomy selection (visual cards, LLM provider, budget caps) — `MISSING`
- `onboardingCompleted` flag exists on user but nothing sets it to true

### 6.2 Dashboard `[UI]` `PARTIAL`
**Current**: 4 stat cards, agent status, 2 quick actions
**Lovable prompt requires**:
- Top bar: Pause All (yellow), Kill Switch (red), notification bell, global search (Cmd+K), settings gear — `MISSING`
- Budget status bar (LLM spend vs daily cap, color-coded) — `MISSING`
- Stats row: total applications, interviews scheduled, response rate %, offer count, active outreach, today's jobs discovered — `PARTIAL` (4 of 6)
- Activity feed: chronological timeline of agent actions — `MISSING`
- Priority notifications: MFA requests, CAPTCHA queue, budget alerts — `MISSING`
- Job sourcing status widget (green/yellow/red per source) — `MISSING`

### 6.3 Job Sources & Discovery `[UI]` `MISSING`
**Lovable prompt**: This is a complete separate screen (not the current JobQueue)
- Source channels panel: card per source with stats, config, health — `MISSING`
- Target companies panel: editable list with auto-discover careers page — `MISSING`
- Job ingestion log: live-updating table with color-coded validation status — Current JobQueue is a basic version
- Manual add options: paste URL, upload CSV, email forwarding address, bulk company import — `PARTIAL` (only paste URL exists)
- DOM analysis viewer: screenshot with colored overlay, selector confidence — `MISSING`
- Source health: per-source success rates over 7/30 days — `MISSING`

### 6.4 Application List & Kanban `[UI]` `PARTIAL`
**Lovable prompt requires two views**:
- Table view: sortable, filterable, with relevance/ATS/callback scores, template used — `PARTIAL` (basic table exists, no scores)
- Kanban view: drag-and-drop columns (Wishlist→Queued→Applied→Interview→Offer→Rejected→Withdrawn) — `MISSING`
- Multi-select checkboxes for bulk actions — `MISSING`
- Filter bar: status, date range, score ranges, source, company, location — `MISSING`

### 6.5 Application Detail View `[UI]` `MISSING`
**Lovable prompt**: Slide-over or full page with tabs:
- Header: job title, company logo, posting URL, source badge, template badge — `MISSING`
- Score cards: Relevance, ATS, Scam, Stability, Cultural Fit, Tech Stack, Callback Probability — `MISSING`
- Tab: Resume Sent (PDF preview) — `MISSING`
- Tab: Cover Letter (with diff against base) — `MISSING`
- Tab: Form Answers (every field and answer) — `MISSING`
- Tab: Emails (thread view) — `MISSING`
- Tab: Company Brief (research summary) — `MISSING`
- Tab: Outreach Log — `MISSING`
- Tab: Timeline (every agent action for this application) — `MISSING`
- Tab: LLM Costs (per-request breakdown) — `MISSING`
- Action buttons: Withdraw, Follow up, Mark as interviewed, Retry, Flag mistake — `MISSING`

### 6.6 Resume Builder `[UI]` `PARTIAL`
**Current**: Profile form with name, contactInfo, summary, skills only
**Lovable prompt requires split-pane layout** (form left, live PDF preview right):
- Contact info: full form with region-dependent fields (photo, DOB, nationality, father's name, CNIC, marital status) — `MISSING`
- Professional summary: AI generate button, tone selector — `MISSING`
- Work experience: repeatable entries with AI bullet generator — `MISSING`
- Education: repeatable entries with GPA scale selector — `MISSING`
- Skills: tag input with auto-categorisation, proficiency levels, GitHub import — `PARTIAL` (basic skills only)
- Projects: repeatable with tech stack tags, GitHub import — `MISSING`
- Certifications: repeatable with credential URL — `MISSING`
- Languages: repeatable with CEFR grid for Europass — `MISSING`
- Publications, Volunteer, References sections — `MISSING`
- Template picker: visual grid with flag icons, region→layout→theme layers, preview with user's data — `MISSING` (basic template list exists)
- Live PDF preview — `MISSING`
- Resume tailoring UI (select job → generate tailored version) — `MISSING`
- Cover letter generation UI — `MISSING`
- Export buttons (PDF, DOCX, JSON, HTML) — `MISSING`
- Resume version history — `MISSING`
- Resume import (LinkedIn, PDF parse, GitHub) — `MISSING`

### 6.7 Analytics Dashboard `[UI]` `PARTIAL`
**Current**: Overview cards, funnel, LLM spend, request table, agent log
**Lovable prompt requires chart grid**:
- Response rate: line chart over time — `MISSING`
- Interview conversion funnel: vertical funnel visualization — `PARTIAL` (horizontal bars exist)
- Source effectiveness: horizontal bar chart — `MISSING`
- Application volume: area chart with cumulative overlay — `MISSING`
- Resume A/B results: comparison table with statistical significance — `MISSING`
- Skill demand: word cloud or bar chart — `MISSING`
- Timing heatmap: calendar-style by day/hour — `MISSING`
- Outreach performance: grouped bar chart — `MISSING`
- Job sourcing breakdown: pie/donut chart — `MISSING`
- Cost per application: line chart trending down — `MISSING`

### 6.8 Interview Prep Page `[UI]` `MISSING`
**Lovable prompt**: Per-interview view with:
- Company research brief card — `MISSING`
- Question bank (behavioral, technical, company-specific) — `MISSING`
- Mock interview launcher (AI chat-based) — `MISSING`
- Take-home assignment section — `MISSING`
- Calendar details with timezone, interviewer LinkedIn — `MISSING`
- AI vs Human interview indicator — `MISSING`

### 6.9 Salary Centre `[UI]` `MISSING`
**Lovable prompt**:
- Pipeline salary chart (box plot) — `MISSING`
- Total compensation breakdown (stacked bar) — `MISSING`
- Offer comparison matrix — `MISSING`
- Negotiation scripts with copy buttons — `MISSING`
- Contract review results (flagged clauses) — `MISSING`
- Offer deadline tracker — `MISSING`

### 6.10 Networking & CRM `[UI]` `MISSING`
**Lovable prompt**:
- Contact list (searchable, filterable) — `MISSING`
- Contact detail view with interaction timeline — `MISSING`
- Upcoming events — `MISSING`
- Briefing generator (pre-meeting panel) — `MISSING`

### 6.11 Monitoring & Observability `[UI]` `MISSING`
**Lovable prompt**: 6-tab interface:
- Tab: Portal Health — table with success rates, DOM analysis history — `MISSING`
- Tab: Error Log — filterable with screenshots, bulk retry — `MISSING`
- Tab: LLM Costs — daily/monthly charts, breakdown table, model usage donut — `PARTIAL` (basic spend numbers exist)
- Tab: LLM Request Log — expandable rows with full prompt/response — `PARTIAL` (basic table exists)
- Tab: Agent Work Log — timeline feed with module badges — `PARTIAL` (basic list exists)
- Tab: Fine-tuning — data readiness, start training, A/B comparison — `MISSING`
- Tab: Alerts — rule builder, alert history — `MISSING`

### 6.12 CAPTCHA & Queue Management `[UI]` `MISSING`
**Lovable prompt**:
- Dead-letter queue with screenshots and retry — `MISSING`
- CAPTCHA queue with inline solve UI — `MISSING`
- Portal status board (health, rate limits, ban risk) — `MISSING`

### 6.13 Documents Library `[UI]` `MISSING`
**Lovable prompt**:
- Grid/list of all documents (resumes, cover letters) — `MISSING`
- Version history with diff view — `MISSING`
- Performance metrics per document (callback rate) — `MISSING`

### 6.14 Settings Page `[UI]` `PARTIAL`
**Current**: Autonomy mode, LLM budget, blacklists, data management
**Lovable prompt requires tabbed interface**:
- Autonomy: per-feature override table, progressive trust escalation — `MISSING`
- LLM Provider: model selector, API key inputs with test button, per-task model routing table, budget sliders, Ollama detection, fine-tuning panel — `MISSING` (basic budget only)
- Job Sources: API keys, Playwright settings, target companies, RSS URLs — `MISSING`
- Notifications: channel × event type matrix — `MISSING`
- Blacklists — `EXISTS` (current implementation)
- Credentials: per-portal credential table — `MISSING`
- Privacy: stealth mode, employer blocklist, activity hours picker, browser profile isolation — `MISSING`
- Danger zone: kill switch, export, delete — `PARTIAL` (basic buttons exist)

### 6.15 Navigation Structure `[UI]` `PARTIAL`
**Lovable prompt sidebar**:
```
Current sidebar:              Spec sidebar:
├── Dashboard          ✓     ├── Dashboard
├── Job Queue          ~     ├── Jobs (Discovery & Sources, Queue, Wishlist)
├── Applications       ~     ├── Applications (Kanban, Table)
├── Resume Builder     ~     ├── Resume Builder
├── Analytics          ~     ├── Documents
├── Settings           ~     ├── Analytics
                             ├── Interviews
                             ├── Salary & Offers
                             ├── Networking & CRM
                             ├── Monitoring (6 tabs)
                             └── Settings
```
- **Missing nav items**: Documents, Interviews, Salary & Offers, Networking & CRM, Monitoring
- **Missing sidebar elements**: Pause All button, current LLM spend display, agent status indicator
- **Missing**: Global search (Cmd+K)
- **Missing**: Dark mode support

---

## 7. Real-Time / WebSocket Integration `[UI]` `MISSING`

Server-side WebSocket gateway + Redis pub/sub fully implemented. Frontend has zero integration.

| # | Feature | Spec Reference | Status |
|---|---------|----------------|--------|
| 7.1 | WebSocket client hook | lovable: "Real-time updates" | `MISSING` |
| 7.2 | Live activity feed on Dashboard | lovable: "Activity feed" | `MISSING` |
| 7.3 | Live application status updates | lovable: "Real-time updates" | `MISSING` |
| 7.4 | Live job discovery toasts | lovable: "Notifications" | `MISSING` |
| 7.5 | CAPTCHA intervention modal | specs: "CAPTCHA and anti-bot strategy" | `MISSING` |
| 7.6 | Budget alert toasts | specs: "Budget alerts" | `MISSING` |
| 7.7 | Notification badge update | lovable: "notification bell with badge count" | `MISSING` |

---

## 8. Browser Extension `[EXT]` `PARTIAL`

| # | Feature | Spec Reference | Status |
|---|---------|----------------|--------|
| 8.1 | Auth token storage | specs: "Browser extension" | `MISSING` - No auth, API calls unauthenticated |
| 8.2 | Structured job capture | specs: "Save this job" button | `PARTIAL` - Detects pages but no data extraction |
| 8.3 | Form structure capture | specs: "Portal learning from manual applications" | `MISSING` - Handler exists but no DOM parsing |
| 8.4 | Credential storage | specs: "Portal credentials via browser extension" | `MISSING` |
| 8.5 | Portal session forwarding | specs: "Logs into portals" | `MISSING` - `portalSessions` table unused |
| 8.6 | Manual application observation | specs: "Portal learning from manual applications" | `MISSING` - Should record fields, answers, flow for learning |
| 8.7 | Popup UI | lovable: not specified for extension | `MISSING` - Unstyled HTML |
| 8.8 | Bidirectional API comms | specs: form filling via extension | `MISSING` |

---

## 9. Email Integration `[API]` `MISSING`

| # | Feature | Spec Reference | Status |
|---|---------|----------------|--------|
| 9.1 | IMAP client | specs: "Gmail / Outlook — inbox monitoring" | `MISSING` |
| 9.2 | SMTP client | specs: "Automates follow-ups and communication" | `MISSING` |
| 9.3 | Email parsing | specs: "Monitors your inbox" | `MISSING` |
| 9.4 | Email → application linking | specs: "Monitors your inbox" | `MISSING` |
| 9.5 | Calendar event extraction | specs: "Google Calendar integration" | `MISSING` |
| 9.6 | Email alias system | specs: "Smart email alias system" (SimpleLogin/Addy.io) | `MISSING` |

---

## 10. Job Source Integrations `[API]` `MISSING`

| # | Source | Spec Reference | Status |
|---|--------|----------------|--------|
| 10.1 | Indeed API | specs: "Indeed Publisher API" | `MISSING` |
| 10.2 | Adzuna API | specs: "Adzuna API" | `MISSING` |
| 10.3 | Playwright Crawl | specs: "Browser automation with Playwright" | `MISSING` (no Playwright dep) |
| 10.4 | Google Jobs | specs: "Google Jobs aggregation" | `MISSING` |
| 10.5 | RSS Feed | specs: "RSS and Atom feeds" | `STUB` |
| 10.6 | Manual URL | specs: "Manual URL paste" | `PARTIAL` (saves URL, no page scraping) |
| 10.7 | Email Forward | specs: "Email forwarding" | `MISSING` |
| 10.8 | Bulk CSV Import | specs: "Bulk import" | `MISSING` |
| 10.9 | Company Career Crawling | specs: "Company career page crawling" | `MISSING` |

---

## 11. Domain Event Wiring `[API]` `MISSING`

21 events defined, 4 emitted, 0 handled. Specs: "Modules communicate through a central event bus."

Event handlers should:
- `job.discovered` → queue validation job, create notification, push to WebSocket
- `job.validated` → if valid, make available for application queue
- `application.queued` → start application processor
- `application.submitted` → create notification, update analytics
- `application.failed` → create notification, add to dead-letter after 3 failures
- `email.received` → if interview, create notification + calendar event; if rejection, update status
- `captcha.needed` → push to WebSocket for manual solve
- `budget.threshold` → create notification, push alert
- `budget.exhausted` → pause all cloud LLM, switch to Ollama fallback
- `answer.learned` → update answer bank

---

## 12. Features in Specs Not Represented in Codebase at All

These features exist in `specs.md` but have zero code (no DB tables, no API endpoints, no UI):

| # | Feature | Spec Section | Impact |
|---|---------|-------------|--------|
| 12.1 | Google Sheets sync | "Tracks everything in database and Google Sheets" | No Google Sheets API integration |
| 12.2 | Google Calendar integration | "Google Calendar integration" | No calendar API |
| 12.3 | LinkedIn profile optimization | "Optimises your LinkedIn profile" | No LinkedIn API |
| 12.4 | GitHub profile import | "GitHub integration" | No GitHub API beyond extension |
| 12.5 | WhatsApp/Telegram notifications | "Multi-channel notifications" | No messaging integrations |
| 12.6 | Slack notification channel | "Integrations" | No Slack webhook |
| 12.7 | Webhook integrations | "Configurable webhooks" | No webhook system |
| 12.8 | Visa sponsorship scoring | "Visa sponsorship scoring" | No immigration databases |
| 12.9 | Skill gap analysis | "Analyses skill gaps" | No skill gap engine |
| 12.10 | Salary benchmarking | "Salary and financial intelligence" | No salary data source |
| 12.11 | Employment contract review | "Employment contract review" | No contract analysis |
| 12.12 | Resume A/B testing analytics | "Resume A/B testing" | `abVariant` column exists but no orchestration |
| 12.13 | Application timing optimization | "Timing and prioritisation" | No optimal time scheduling |
| 12.14 | Browser fingerprint randomization | "Browser fingerprint randomization" | No stealth/anti-detect |
| 12.15 | Residential proxy rotation | "Residential proxy rotation" | No proxy integration |
| 12.16 | Online presence audit | "Digital footprint and compliance" | No audit engine |
| 12.17 | Progressive trust escalation | "Progressive trust escalation" | guidedAppCount/supervisedAppCount columns exist but no enforcement logic |
| 12.18 | Persistent memory system | "Persistent memory" (short/long/episodic) | No memory architecture |

---

## 13. Fine-Tuning Pipeline `[API]` `[DB]` `MISSING`

DB tables exist (`fineTuningData`, `fineTuningJobs`) and `FineTuningStatus` enum is defined.
Specs: "Fine-tuning on your data" — style fine-tuning after 50+ apps, form-filling fine-tuning, A/B validation.

| # | Feature | Status |
|---|---------|--------|
| 13.1 | Collect training data from user corrections | `MISSING` |
| 13.2 | API endpoints for fine-tuning CRUD | `MISSING` |
| 13.3 | Fine-tuning job submission (OpenAI or local Ollama LoRA) | `MISSING` |
| 13.4 | A/B validation (base vs fine-tuned) | `MISSING` |
| 13.5 | Model swap after fine-tuning | `MISSING` |
| 13.6 | UI: data readiness indicator, start training button, results | `MISSING` |

---

## 14. Security & Auth Gaps

| # | Feature | Spec Reference | Status |
|---|---------|----------------|--------|
| 14.1 | Password hashing | specs: "credentials encrypted at rest" | `PARTIAL` |
| 14.2 | Refresh token rotation | auth best practices | `PARTIAL` |
| 14.3 | Rate limiting on auth | specs: "Rate limiting" | `MISSING` |
| 14.4 | Credential encryption | specs: "encrypted at rest with user-provided master key" | `MISSING` |
| 14.5 | Per-user API key storage | specs: "Your preferred LLM provider and API key" | `MISSING` |
| 14.6 | GDPR data export/deletion | specs: "GDPR-compliant" | `STUB` (endpoints return canned responses) |

---

## 15. Testing

| # | Area | Status |
|---|------|--------|
| 15.1 | Unit tests for services | `MISSING` - Zero test files |
| 15.2 | Unit tests for agents | `MISSING` |
| 15.3 | Integration tests for controllers | `MISSING` |
| 15.4 | E2E tests | `MISSING` |
| 15.5 | Frontend tests | `MISSING` |

---

## Recommended Implementation Priority

### Phase A: Core Intelligence (make agents work)
1. Verify/implement LLM provider API calls (4.1-4.3)
2. Implement all 7 AI agents with real LLM calls (2.1-2.7)
3. Implement DeduplicationEngine, JobScorer, AtsScorer with real logic (3.1-3.4)
4. Implement AnswerBank and PortalMappingCache (3.5-3.6)

### Phase B: Pipeline Backbone (make queues process real work)
5. Implement JobSearchProcessor with ManualURL + RSS sources (1.1)
6. Implement JobValidationProcessor (1.2)
7. Implement ApplicationProcessor core pipeline (1.3)
8. Wire API endpoints to enqueue BullMQ jobs (5.1, 5.2)
9. Wire domain event handlers (11)

### Phase C: Frontend — Core Screens (per lovable prompt priority)
10. Build Dashboard per lovable spec (6.2) — activity feed, budget bar, notification bell
11. Build Job Sources & Discovery page (6.3) — source cards, target companies, ingestion log
12. Build Application Detail View (6.5) — slide-over with tabs
13. Add Kanban view to Applications (6.4)
14. Complete Resume Builder — all section editors, live PDF preview, template picker (6.6)
15. Build Onboarding 5-step wizard (6.1)

### Phase D: Frontend — Supporting Screens
16. Build Settings with all tabs per lovable spec (6.14)
17. Build Monitoring page with 6 tabs (6.11)
18. Build Interview Prep page (6.8)
19. Build Networking & CRM page (6.10)
20. Build Notifications center
21. Build global search (Cmd+K)
22. WebSocket integration (7.1-7.7)

### Phase E: Communication & Integrations
23. Email integration — IMAP/SMTP (9.1-9.6)
24. Implement InboxScanProcessor, OutreachProcessor, FollowUpProcessor (1.4, 1.5, 1.7)
25. Additional job sources — Indeed, Adzuna, Playwright (10.1-10.4)
26. Complete browser extension (8.1-8.8)

### Phase F: Advanced Features
27. Salary Centre page (6.9)
28. Documents Library (6.13)
29. CAPTCHA queue UI + solving service integration (6.12)
30. Fine-tuning pipeline (13)
31. Resume A/B testing
32. Google Sheets/Calendar integrations (12.1-12.2)
33. Dark mode, keyboard shortcuts, accessibility

### Phase G: Production Hardening
34. Security hardening (14)
35. Comprehensive test suite (15)
36. Progressive trust escalation enforcement (12.17)
37. Data export/deletion (GDPR) (14.6)
38. Stealth mode + anti-detect (12.14-12.15)

---

## Summary Statistics

| Category | Spec Defines | Implemented | Stub/Partial | Missing |
|----------|-------------|-------------|--------------|---------|
| Queue Processors | 8 | 0 | 8 stubs | 0 |
| AI Agents | 8 | 0 | 7 stubs | 1 |
| Core Services | 7 | 0 | 3 partial | 4 |
| API Endpoints | ~60 needed | ~30 working | ~15 canned | ~15 missing |
| Frontend Pages | 14 screens (lovable) | 7 exist | 7 partial | 7+ missing |
| Job Sources | 9 (incl bulk, crawl) | 0 | 2 stubs | 7 |
| Domain Events | 21 defined | 4 emitted | 0 handled | 17 not emitted |
| Email System | 6 features | 0 | 0 | 6 |
| Extension | 8 features | 0 | 2 partial | 6 |
| Integrations (GSheets, Calendar, etc.) | 8 | 0 | 0 | 8 |
| Tests | All areas | 0 | 0 | All |

**Bottom line**: The architecture, DB schema, type system, NestJS module structure, and WebSocket gateway are solid foundations. The LLM service has prompt templates and model routing ready. The primary gap is **implementation logic**: agents need real LLM calls, queue processors need business logic, the frontend needs 7+ additional screens and completion of 7 existing ones, and the email/extension subsystems are unstarted. The specs.md is ambitious (~730 lines of features), and the current codebase implements roughly 15-20% of the specified functionality.


## Deferred — last phase
- **SuccessFactors company hunt**: SF company IDs are arbitrary (e.g. `systemvent`) and career pages are unindexed, so bulk discovery by guessing is not viable. Approach for last phase: collect target enterprises from the user, check each careers page for `career*.sapsf.eu` redirects, and register them with the existing SuccessFactors adapter (verified working via Systems Ltd).
