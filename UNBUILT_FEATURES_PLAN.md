# Unbuilt Features — Implementation Plan

_Created 2026-06-20. Companion to `specs.md` and `MISSING_FEATURES_PLAN.md`._

This plan covers the spec'd features that are **not yet built** (the 🔲 list from the
spec-vs-code audit), after this session closed out the previously-partial backend gaps
(outreach drafting, salary/skill-gap research agents, notification dispatch, kill-switch
withdrawal, fine-tuning persistence, CRM add-contact). Items are grouped by effort and
dependency, with a recommended sequence. Each entry notes the touch points so work can
start without re-discovery.

Legend: **S** ≈ <1 day, **M** ≈ 1–3 days, **L** ≈ 1–2 weeks, **XL** ≈ multi-week / external dependency.

---

## Tier 1 — Wire existing backends to UI (fast wins, no new infra)  · ✅ **DONE (2026-06-20)**

All six shipped; API + web typecheck clean. New endpoints: `POST /research/interview-prep`,
`POST /research/skill-gap` (now also accepts `{ applicationId }`), `POST /outreach` (save draft),
`GET /documents`. No DB migrations, no shared-types enum changes.

### 1.1 Salary Centre page → salary agent  · ✅
- `SalaryCentre.tsx` rewritten: form (title/location/seniority/skills) → `POST /research/salary`,
  renders midpoint/range/confidence + rationale + notes.

### 1.2 Interview Prep page → interview-prep agent  · ✅
- `POST /research/interview-prep { applicationId }` resolves job+company+default profile
  server-side (`ResearchService.loadApplicationContext`). `InterviewPrep.tsx` lists
  `status=interview` applications and renders per-interview prep (questions, talking points,
  questions-to-ask, concerns, company insights).

### 1.3 Skill-gap surface  · ✅
- Skill-gap **tab** added to `ApplicationDetail.tsx`; `POST /research/skill-gap` extended to
  accept `{ applicationId }` (reuses the same loader). Renders gap score, matched/missing/
  transferable, and a learning plan.

### 1.4 Outreach suggestions in CRM  · ✅
- "Draft Outreach" dialog in `Networking.tsx` → `POST /outreach/suggest`; editable subject/body
  saved via new `POST /outreach` (status `draft`, respects autonomy — no auto-send from UI).

### 1.5 CAPTCHA-queue UI → existing human-queue  · ✅
- `CaptchaQueue.tsx` lists `needs_captcha` + `needs_login` apps with a "Solve in browser"
  action (`POST /applications/:id/submit-assisted`) and refresh.

### 1.6 Documents library  · ✅
- `GET /documents` aggregates tailored resumes (download via `/applications/:id/resume.pdf`)
  and cover letters (inline text) from applications + resume versions. `Documents.tsx` is a
  grouped read/download view. Upload remains out of scope (read/download only).

---

## Tier 2 — New self-contained features (no third-party risk)

### 2.1 Resume A/B testing  · ✅ **DONE (2026-06-21)**
- Note: the `resumeVersions.abVariant`/`callbackReceived` columns were dormant and
  disconnected from the apply flow (no `resume_versions` row is created during
  application), so the variant is recorded on a **new `applications.ab_variant`
  column** (migration `0004_resume_ab_variant.sql`) instead.
- Axis chosen: **tailoring strategy** — variant A (impact-narrative) vs B (ATS
  keyword-dense), assigned round-robin per user at tailor time in the application
  processor and fed to the tailor agent as an alternate directive.
- Analytics: `GET /analytics/ab-results` aggregates callback (interview/offer) rate
  per variant; surfaced as a "Resume A/B Testing" section on the Analytics page.

### 2.2 Global Cmd+K search  · ✅ **DONE (2026-06-21)**
- Frontend-only `CommandPalette` (uses the already-installed `cmdk`), mounted in
  `Layout` and opened via ⌘/Ctrl+K or a top-bar "Search" button.
- Searches static page-nav commands + lazily-loaded applications, contacts, and
  jobs (existing `/applications`, `/contacts`, `/jobs` list endpoints) with cmdk's
  built-in fuzzy filtering; selecting routes to the item (application → detail,
  contact → Networking, job → Jobs queue).

### 2.3 Missing job sources  · **M each**
- **RSS-as-channel**: ✅ **already built** — `rss-feed.source.ts` is a complete,
  registered `IJobSource` (parses feeds via `rss-parser`, filters, normalizes);
  `rss_feed` is in the `SourceChannel` enum and Settings has the feed-URL UI. The
  original audit missed it. No work needed.
- **Email-forwarding ingestion**: a dedicated inbound address / IMAP folder scan that
  reuses the existing IMAP client + an LLM extraction agent to pull listings from alert emails.
- **Google Jobs / SerpApi aggregator**: optional `jobSources` type `serpapi` behind a user
  API key (no scraping). Career-page crawler: extend the existing watchlist crawl to
  auto-discover `/careers` paths.

### 2.4 BambooHR ATS support  · ✅ **DONE (2026-06-20)**
- **Sourcing**: `bamboohr` watchlist adapter fetches the public `/careers/list` JSON and
  enriches descriptions from `/careers/{id}/detail` (`company-watchlist.source.ts`).
  Selectable in the JobSources UI.
- **Apply**: `ats-apply.service.ts` detects `*.bamboohr.com/careers/{id}` and prepares the
  universal field schema (name/email/phone/address/links/resume/cover letter); the generic
  browser-apply path drives the form. Rate limit added (15/day). Detection unit-tested.
- **Headless reveal**: `applyAtsForm` now calls `revealApplicationForm()` which clicks
  BambooHR's "Apply for This Job" CTA and waits for the form fields before filling, so the
  fully headless path works (not just extension/assisted).
- **Remaining nuance**: the headless field-fill matches on the fixed schema's field
  ids/names; exact BambooHR DOM attribute names should be confirmed against a live tenant
  (label-based extension fill is unaffected).

### 2.5 Company stability / culture / tech-stack scoring  · ✅ **DONE (2026-06-21)**
- New `CompanyScoringAgent` (LLM, structured output) scores stability/culturalFit
  (0-100), glassdoorRating (0-5 or null), techStack, and rtoPolicy from public
  signals, deliberately conservative when signal is thin.
- `ResearchService.scoreAndPersistCompany` writes those existing `companies`
  columns; called both from `triggerResearch` (so the brief now also populates
  scores) and a new `analyzeCompanyForApplication` (resolves company from the
  application; scores by `job.companyName` when no company row is linked).
- Endpoint `POST /research/company { applicationId }`; surfaced as a "Company
  Signals" card in the ApplicationDetail Company tab (run/re-analyze).

---

## Tier 3 — External integrations (need credentials / OAuth, manageable)

### 3.1 Google Sheets sync (read-only mirror)  · **M**
- Per-application write to a user-connected sheet. Needs Google OAuth + `googleapis`.
- Add a `sheets` integration in settings; sync on `application.submitted`/status events
  (event bus already emits these).

### 3.2 Google Calendar  · **M**
- On interview classification (`inboxEmails.classification='interview'`), create a calendar
  event. `calendarEventCreated` flag already in schema. Same OAuth as 3.1.

### 3.3 Messaging notification channels (WhatsApp/Telegram/Slack)  · ⏳ **Slack + Telegram DONE (2026-06-21)**
- `NotificationsService.sendToChannel` now handles `slack` (incoming-webhook URL) and
  `telegram` (bot token + chat id from `notificationChannels`) alongside webhook/email;
  `dispatch()` routes alert rules through it. Credentials are user-supplied at runtime —
  no build-time secrets / OAuth.
- Config: `PUT /settings/notification-channels` persists Slack URL + Telegram token/chat
  id into the `notificationChannels` JSONB (no migration). `POST /notifications/test-channel`
  sends a sample message. Settings → Notifications has a "Messaging Channels" card with
  Save + per-channel "Send test".
- **WhatsApp still TODO** — needs a paid Business API / Twilio account, so deferred.

### 3.4 LinkedIn profile optimizer (read-only)  · **M**
- Import-only (no automation, per spec). Parse a LinkedIn export → LLM recommendations.
  Reuse `packages/resume-import` for parsing.

---

## Tier 4 — Heavy / higher-risk (scope carefully before committing)

### 4.1 Anti-bot infrastructure  · **XL**
- Residential proxy rotation, fingerprint randomization (stealth plugin), and paid CAPTCHA
  solving (2Captcha/Anti-Captcha/CapSolver). Real cost + ToS/compliance review required.
- Until then, keep the human-in-the-loop CAPTCHA queue (1.5) as the supported path and
  document the limitation (spec currently over-promises here).

### 4.2 Real fine-tuning execution  · **L**
- This session persisted examples/jobs + JSONL export. Remaining: submit a job to a provider
  fine-tuning API (OpenAI/Anthropic) or run local LoRA via Ollama, poll status, store
  `resultModelId`, and A/B validate vs base. Gate behind explicit user opt-in + cost notice.

### 4.3 Total-comp calculator / contract review / negotiation advisor  · **L**
- LLM-assisted, offer-stage features. Build the Offer Centre shell first, then layer each.

### 4.4 Visa/immigration scoring, online-presence audit, stealth mode  · **L each**
- Each needs external data sources (DOL/USCIS, web search). Defer until Tier 1–3 land.

---

## Recommended sequence

1. **Tier 1** in full (≈1 sprint): turns five stub pages into working features against
   backends that already exist — highest value-per-effort, no new infra.
2. **2.4 BambooHR** + reconcile the two `specs.md` honesty gaps (BambooHR, kill-switch wording).
3. ~~**2.1 A/B testing** and **2.3 RSS source**~~ ✅ done (2.3 was already built).
   Next unblocked Tier 2: **2.2 Cmd+K search** and **2.5 company scoring**.
4. **Tier 3 integrations** once a Google OAuth app + messaging tokens are provisioned.
5. **Tier 4** only with explicit product sign-off on cost/compliance.

## Honesty gaps to reconcile in `specs.md` now (no code needed)
- **BambooHR**: ✅ resolved — now genuinely supported for both sourcing and apply (see 2.4).
- **Kill switch**: now genuinely withdraws *pending* (pre-submission) applications; it does
  **not** retract already-submitted external applications. Spec wording implies it does —
  update to match the implemented behaviour.
