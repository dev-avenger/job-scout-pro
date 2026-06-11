# Job Application Agent — Product Specification

## What this is

An autonomous agent that applies to software developer jobs on your behalf. You set it up once with your CV or LinkedIn profile, choose how much control you want to keep, and from that point it runs on its own — finding relevant jobs, building and tailoring resumes, filling out application forms, tracking every application in a database and Google Sheet, monitoring your inbox for responses, sending outreach and follow-ups, preparing you for interviews, providing salary intelligence, detecting scams, and managing your entire job search lifecycle from first application to accepted offer.

You choose your level of involvement. On **Full Autopilot**, the agent handles everything end to end — you check the dashboard when you feel like it and never approve a single action. On **Supervised**, it runs autonomously but pauses for the handful of decisions that genuinely need a human. On **Guided**, it does the heavy lifting but shows you everything before it goes out. You can mix modes per feature and change them at any time.

---

## What you provide

**Once, at setup:**
- Your CV as a PDF, DOCX, or LinkedIn data export — or build a new resume from scratch using the built-in resume builder
- Portal credentials — managed via browser extension (local storage, never server-side) or OAuth where supported. For headless automation mode: credentials encrypted at rest with user-provided master key. You are informed which portals require stored credentials and the associated risks.
- A Google Sheet where you want your applications tracked
- A few standard answers you want reused (expected salary, work authorisation status, willingness to relocate)
- Your preferred LLM provider and API key (OpenAI, Anthropic, Google, Mistral, local model via Ollama, or any OpenAI-compatible API)
- Your GitHub username (optional — for developer-specific resume features)
- Companies or keywords you want to blacklist (optional)
- Your notification preferences — desktop, email, WhatsApp, or Telegram (optional)
- Your visa/immigration status if applicable (optional)
- Your values and work preferences for cultural fit scoring (optional)
- Your preferred autonomy level — Full Autopilot, Supervised, or Guided (see Autonomy modes below)

**That's it.** Everything else is handled automatically.

---

## First-run experience

New users go through a guided onboarding that builds trust incrementally:

**Step 1 — Profile import** — upload resume or connect LinkedIn. The agent parses your profile and shows what it extracted for confirmation.

**Step 2 — Preference configuration** — set target roles, salary range, location preferences, company blacklist, and daily application cap.

**Step 3 — Dry-run preview** — the agent finds 5 matching jobs and shows exactly what it would submit (tailored resume, cover letter, form answers) without actually applying. You review and provide corrections.

**Step 4 — Guided mode (first 10 applications)** — the first 10 applications run in Guided mode regardless of chosen autonomy level. Every submission requires your approval. This teaches the agent your preferences and builds your confidence.

**Step 5 — Supervised mode unlock** — after 10 successful guided applications with <2 rejections from you, Supervised mode becomes available. Full Autopilot unlocks after 30 successful supervised applications.

**Progressive trust escalation** — the agent cannot be set to Full Autopilot on day one. Trust is earned through demonstrated accuracy. Users who want to skip ahead can override this in settings with an explicit acknowledgment.

---

## Autonomy modes

At setup you choose how much control the agent has. You can change your autonomy level at any time from the portal settings. Each level determines how much the agent does on its own versus how much it asks you first.

### Full Autopilot — zero human involvement

Full Autopilot requires completing 30 supervised applications first (see First-run experience). The agent answers unknown questions using saved answers, profile data, and learned patterns — never fabricating credentials. If confidence is below 70%, the answer is flagged for post-submission review in the audit log.

The agent runs the entire job search end to end without pausing: submits applications, sends outreach and follow-ups, monitors your inbox, updates the tracker, sends thank-you notes, and manages your pipeline silently. MFA-required portals with no workaround are skipped. Scam-flagged postings are silently discarded. Everything is logged for after-the-fact review.

### Supervised — minimal human involvement (default)

The agent handles the vast majority of tasks autonomously but pauses for: MFA verification codes, unanswerable questions (not in your profile or saved answers), recruiter messages needing a personal response, offers and negotiation, and interview confirmation. Everything else runs automatically. If a pause goes unanswered for a configurable timeout (default: 24 hours), the agent either skips or uses a best-guess answer flagged for later review.

### Guided — full human involvement

The agent does research and preparation but never submits anything without your explicit approval. Job discovery runs automatically but presents a curated list. Resume tailoring and form filling happen automatically but show a preview before submission. No outreach, follow-ups, or emails are sent without your approval.

### Mixing modes per feature

You can set autonomy on a per-feature basis:

| Feature | Full Autopilot | Supervised | Guided |
|---|---|---|---|
| Job search and matching | Automatic | Automatic | Automatic |
| Resume tailoring | Automatic | Automatic | Review before submit |
| Application submission | Automatic | Automatic | Review before submit |
| Outreach emails | Automatic | Automatic | Review before send |
| Follow-up emails | Automatic | Automatic | Review before send |
| Scam-flagged jobs | Auto-discard | Auto-discard | Notify and ask |
| Unanswerable questions | Best-guess answer | Pause and ask | Pause and ask |
| MFA challenges | Skip portal | Pause and ask | Pause and ask |
| Interview confirmation | Auto-confirm | Pause and ask | Pause and ask |
| Offer negotiation | Notify only | Pause and ask | Pause and ask |

### Pause-all and kill switch

Regardless of autonomy level, the portal provides a one-click **Pause All** button that immediately stops all agent activity. A separate **Kill Switch** stops all activity and withdraws all pending applications on portals that support withdrawal. Both are always accessible from the top of the portal.

---

## Resume builder module

The agent includes a full-featured resume builder. You can import an existing resume or create one from scratch, and the agent uses it as the foundation for every application. The builder UI is decomposed into focused, modular components for maintainability and uses Zustand for state management.

### Importing your existing resume

The builder accepts: **PDF** (LLM-enhanced extraction with OCR), **DOCX** (direct parsing), **LinkedIn data export** (richest import method), **LinkedIn PDF export**, **JSON Resume** (jsonresume.org standard), and **GitHub** (fetches repositories, contributions, and language statistics via API).

**Drag-and-drop import dialog** — a dedicated import dialog lets users drag and drop PDF, DOCX, or JSON files (up to 10MB) directly into the builder. PDF/DOCX files are sent to `POST /profiles/:id/import` (base64 JSON body), parsed server-side (pdf-parse / mammoth), heuristically mapped (contact info, summary, skills) and stored in full as `rawImport`. JSON Resume and Reactive Resume exports are detected and mapped client-side by `@auto-job-apply/resume-import` — Reactive Resume imports carry their page layout and custom sections over. Progress feedback and error handling are shown inline.

After import, all data is converted to JSON Resume format internally — the single source of truth for your profile.

### Building from scratch

A guided creation flow with section-by-section editing covering: contact information (name, email, phone number, LinkedIn URL, personal website/portfolio URL, GitHub URL, address, and region-dependent fields like photo, DOB, and nationality), professional summary, work experience, education, skills, projects, certifications, languages, and optional sections (publications, volunteer work, references, and user-defined custom sections). AI content generation from minimal input, a bullet point writer using the STAR method, content rewriter for clarity and ATS compatibility, and automatic skill extraction from work experience descriptions.

**Section CRUD** — each section (experience, education, skills, projects, certifications, languages, publications, volunteer, references) has full create/read/update/delete operations via dedicated API endpoints (`GET/POST /profiles/:id/sections/:type`, `PUT/DELETE /profiles/:id/sections/:type/:itemId`). Items are stored as JSONB arrays on the profile and support auto-generated UUIDs with self-healing ID backfill on read.

**Custom sections** — users can create arbitrary sections with custom titles and key-value field items beyond the predefined section types.

### Page Builder mode

Two builder surfaces exist:

**1. Profile detail split-pane (legacy v1)** — section order management via a single drag-and-drop list, template/layout/theme selection, export buttons, ATS score sidebar, inline section editors, and a live A4 preview (794×1123px, responsive scaling) with an optional dashed page-break overlay.

**2. Full-page React page builder (v2, canonical)** — opened via "Open page builder" on a profile, at route `/resume/:profileId/builder`. A three-pane editor:

- **Left — section library**: all 10 standard sections plus the profile's custom sections, each draggable onto the page or addable with one click. Unplaced sections wait here; placed ones are marked "On page". "Add custom section" opens the custom-section editor dialog.
- **Center — paginated canvas**: real A4/US-Letter pages rendered at true proportions. Sections are blocks that can be dragged **within a column, between sidebar/main columns, and across pages** (dnd-kit, pointer + keyboard sensors). Each block has hover controls: drag handle, hide/show (eye), remove-from-layout, and edit (custom sections). Pages can be added/removed; removing a page merges its sections into the previous page. Empty columns show a "Drop sections here" target.
- **Right — design panel** with three tabs: *Design* (visual template gallery + theme customizer for colors/typography/spacing), *Page* (A4/Letter format, one/two-column toggle, sidebar width slider, photo and personal-details visibility, date format), and *Templates* (template registry — see below).

**Layout model (v3)** — section placement is stored as `pages → rows → cells → ordered section ids`: each page is a vertical stack of rows, and each row holds 1–3 side-by-side cells with optional per-cell widths (15–85%) and a tinted (sidebar-look) background. Rows can be added/deleted from a hover toolbar on the canvas, split into 1/2/3 columns, and 2-cell rows cycle through width presets (50/50, 33/67, 67/33, 25/75). A `hiddenSections` list rides along, persisted as a versioned object in the profile's `sectionOrder` jsonb column. Legacy v1 `SectionOrderItem[]` arrays and v2 `pages → columns` objects are migrated automatically (`migrateLayoutState` in shared-types); all shapes are accepted by `PUT /profiles/:id`. Custom sections are referenced as `custom.<uuid>`. Templates may ship a v3-native `pageRows` placement (preferred over the v2 `pages` field).

**Builder behaviours** — undo/redo (zundo history, Ctrl+Z / Ctrl+Shift+Z and toolbar buttons), debounced autosave (~800ms) with Saved/Saving/Save-failed indicator, and a WYSIWYG **Export PDF** that posts the exact current design (template config + layout state) to the API. Text on the canvas is directly editable in place (contentEditable on the name, summary, skills, experience titles/bullets/descriptions, education degrees, project fields, and custom-section values); each edit is saved per-field to the profile on blur.

**Shared renderer** — a dedicated workspace package `@auto-job-apply/resume-renderer` renders sections with framework-pure React (inline styles, no Tailwind). The same components power the builder canvas, the live preview, and server-side PDF rendering, guaranteeing preview ≡ canvas ≡ exported PDF.

### Templates and formatting

The builder enforces ATS-friendly formatting by default: single-column layout, standard section headings, web-safe fonts, proper bullet formatting, no images or graphics, and text-selectable PDF output.

**Visual template gallery** — templates are displayed as a visual grid of preview cards (not just a dropdown) grouped by layout style via tabs (Skills-first, Chronological, Hybrid, Developer). Each card shows the layout name and visual theme, and clicking selects both the layout and theme simultaneously. The gallery replaces the old simple selector.

**Region-specific templates** — resume conventions vary significantly by country. The builder provides templates matching regional standards:
- **US / Canada** — single page, no photo, no DOB. Skills-first or reverse-chronological.
- **Europe (EU) — Europass / EuroCV** — standardised EU format with photo, DOB, nationality, and CEFR language proficiency grid. Multi-page accepted.
- **UK** — 2 pages accepted, "personal statement" instead of "professional summary," no photo.
- **Australia / NZ** — 2–3 pages, visa/work rights status prominent, referees with contact details.
- **Middle East / Gulf** — photo required, includes nationality, visa status, DOB, marital status.
- **Germany / DACH** — photo expected, DOB, nationality, signed and dated at bottom.
- **Japan** — Rirekisho (履歴書) standardised JIS format with separate shokumu keirekisho for work history.
- **India** — photo common, DOB, declaration section at bottom.
- **Pakistan** — photo expected, includes father's name, CNIC number (optional), DOB, marital status, domicile/city, and a declaration section. 2–3 pages standard. References with full contact details listed at the end.
- **Academic (global)** — no page limit, includes publications, grants, teaching, conferences, and research.

When a region is selected, the builder automatically shows/hides appropriate fields (photo, DOB, nationality), sets page length expectations, adjusts section labels, and formats dates to regional convention.

**Layout styles** within each region: skills-first (recommended for tech 2025+), reverse-chronological, hybrid, and developer-specific.

**Authentic Europass layout (`layoutVariant: 'label-left'`)** — the Europass built-in replicates the classic EU format faithfully: a left gutter (~26% width) carries the blue uppercase section labels ("Personal information", "Work Experience", "Education and Training", "Language Skills"), content sits in the right column, sections are separated by thin light-blue rules, the name renders in EU blue (#003399, Arial), the photo sits top-right, and personal details (DOB, nationality) appear under the contact lines. Any single-column design can switch between standard titles and the Europass left-gutter via Page setup → "Section titles".

**Per-section inner columns** — independent of page columns, each section's *items* can flow in 1–3 columns (e.g. skills or languages as a two-column grid). Controlled per block via the columns button in the section's hover toolbar, stored in the layout state (`sectionColumns`), persisted with autosave, honoured by the canvas, preview, and the WYSIWYG PDF engine (CSS multi-columns with `break-inside: avoid`; the pdfkit fallback renders items single-column). Templates ship sensible defaults (Europass and USA: skills in 2 columns).

**Custom theme customisation** — beyond selecting a predefined theme, users can fully customise the visual appearance:
- **Color pickers** for primary, secondary, accent, text, and background colors
- **Font selectors** for heading and body fonts (from a curated web-safe font list: Inter, Roboto, Open Sans, Lato, Merriweather, Playfair Display, Source Sans Pro, Nunito, Raleway, PT Sans)
- **Spacing sliders** for margin (12–48px), section gap (8–32px), and entry gap (4–16px)
- **Reset to default** button to revert all custom overrides
- Custom theme settings are merged with the base template configuration at render time and persisted via resume versions

**Auto-selection** — when applying to a job, the agent selects the appropriate regional template based on the job's location (e.g., German job → Lebenslauf, EU job → Europass, Australian job → Australian CV). The user can override this per application.

### Custom sections

Users can define **custom sections** beyond the 10 standard ones (e.g. Awards, Hackathons, Volunteer leadership). Each custom section has a title, a render style (`list`, `keyValue`, or `paragraph`) and items composed of label/value fields. They are first-class data: stored on the profile (`custom_sections` jsonb), validated by `CustomSectionSchema`, draggable in the page builder like any standard section, rendered in the live preview, and included in PDF and DOCX exports (both the WYSIWYG engine and the pdfkit/docx fallbacks). Imports can create them (JSON Resume awards/interests, Reactive Resume custom sections).

### Template registry

Templates are first-class entities (`resume_templates` table + `/api/v1/templates` CRUD):

- **Built-in regional templates** (code-defined, read-only): **Europass CV** (two-column, photo, personal details, EU date format), **USA Resume** (single column, Letter, no photo/personal details), **UK CV**, **Australia CV**, and **Pakistan CV** (photo, father's name/CNIC/domicile region fields) — plus general styles (Modern Sidebar, Minimal, Creative Banner). Applying one sets layout, columns, colors, typography, page format, and photo/personal-details visibility in one click.
- **My templates** — the current design can be saved as a named user template and deleted later; built-ins are protected server-side.
- **Shareable template files** — any design can be exported as a portable `.resume-template.json` (versioned `TemplateFileSchema`) and imported on another machine, validated with zod.
- The registry tab in the builder offers a region filter (All / General / Europe / USA / UK / Australia / Pakistan) with thumbnail previews.

### AI-powered features

**Per-job resume tailoring** — for every job the agent applies to, it automatically: clones your base resume, extracts and categorises keywords from the job description, analyses gaps, optimises content (rewrites summary, reorders skills, augments bullets), validates ATS compliance on a 0–100 scale, iterates until passing the threshold, generates outputs (PDF, DOCX, plain text), generates a matched cover letter, and saves everything linked to the job. Triggered from a dedicated AI Generate dialog where the user pastes a job description and optionally provides additional context.

**Inline AI bullet writer** — each experience, volunteer, and project entry has a sparkle (✨) button next to its description text. Clicking it sends the bullet to the AI for improvement (clearer, more impactful, ATS-optimised). The AI suggestion is shown inline with Accept/Dismiss buttons. Accepted text replaces the original description immediately.

**Cover letter generation** — a dedicated tab in the profile detail view lets users generate cover letters by providing a job title, company name, and job description. The AI generates a tailored cover letter that can be copied to clipboard.

**Job description match analysis** — a Job Match panel lets users paste a job description and receive an ATS-style analysis: overall match score, per-section breakdown (skills, experience, education, keywords), lists of matched and missing keywords, and actionable improvement suggestions.

### ATS scoring

**Real-time ATS score sidebar** — in Page Builder mode, a persistent sidebar shows the resume's ATS compatibility score as a circular SVG gauge (0–100). Below the score, per-category breakdowns (formatting, keywords, content, structure) are shown with progress bars. Actionable improvement suggestions are listed. The score auto-fetches on mount and can be re-triggered.

### Resume versions

**Version snapshots** — users can create named versions of their resume at any point, capturing the current layout, theme, and content. Each version stores the full profile snapshot, selected layout, theme, and an optional ATS score.

**Version management** — a Versions tab in the profile detail view lists all versions with timestamps and ATS scores. Users can select a version to preview, or delete versions they no longer need.

**Version comparison** — a full-screen dialog allows side-by-side comparison of any two versions, each rendered as a live preview with the version's stored layout and theme.

### Resume A/B testing

The agent tracks which resume variants lead to callbacks and interviews, identifying which writing styles and template choices perform best.

### Multiple resume profiles

Create multiple base profiles for different target roles. The agent automatically selects the best-fitting profile for each job.

**Profile cloning** — any profile can be duplicated with a single click. The clone copies all data except the ID and timestamps, making it easy to create variations for different target roles.

### Export options

**PDF engines** — PDF export uses a WYSIWYG engine by default: the server renders the profile with the same `@auto-job-apply/resume-renderer` components as the on-screen builder (react-dom SSR) and prints it with headless Chromium (`playwright-core`; binary via `PLAYWRIGHT_CHROMIUM_PATH` or `npx playwright-core install chromium-headless-shell`). If Chromium is unavailable, or `PDF_ENGINE=pdfkit` is set, it falls back automatically to the programmatic pdfkit engine (layout placement derived from the v2 layout via `legacyPlacementFromLayout`). The builder's Export PDF button posts the exact on-canvas design (`POST /profiles/:id/export/pdf` with config + layout state).

#### Other formats

- **PDF** — rendered with the selected template, layout, and theme
- **DOCX** — Word-compatible export
- **JSON** — full profile data exported as a formatted JSON file for backup or external processing
- All exports are available from the profile detail header and the Page Builder panel

### Undo/redo

The resume editor supports undo/redo via Zustand's `zundo` temporal middleware. Up to 50 history entries are maintained. Keyboard shortcuts: **Ctrl+Z** (undo) and **Ctrl+Shift+Z** (redo). History is tracked per-session and compares profile state via JSON equality.

### Resume analytics

A dedicated analytics panel tracks resume engagement: total views, total downloads, downloads broken down by format (PDF/DOCX), and a recent activity bar chart showing views over the last 14 days. Analytics data is fetched from the server and gracefully falls back to zero-state if the analytics endpoint is not yet available.

### Developer-specific features

GitHub integration, technical skills categorisation, project showcase with tech stacks and metrics, open source contributions, and certifications with verification links.

### AI humanisation layer

All AI-generated content passes through a humanisation step that removes generic AI phrases, varies sentence structure, injects specific personal details, and ensures the output would not be flagged by AI detection tools.

---

### Implementation & verification status (updated June 2026)

The resume builder module above is **implemented and test-verified**. Verification evidence (all runnable locally):

| Functionality | How it is verified |
|---|---|
| v3 layout engine (move/add/remove across cells, rows & pages, add/remove rows, cell-count & width changes, tint toggle, hide, page merge, two-column split, template apply, v1/v2→v3 migration, undo/redo) | store tests — `apps/web/src/stores/resume-builder-store.test.ts` |
| Builder canvas & section library UI (rendering, placeholders, custom sections, row toolbar, add/remove page buttons, hidden dimming, placed markers) | jsdom component tests — `apps/web/src/components/resume/builder/BuilderCanvas.test.tsx` |
| Drag-drop pipeline (library→cell, block→block, block→cell, cross-page, custom ids, no-op guards) | unit tests on the pure resolver — `apps/web/src/lib/builder-dnd.test.ts` (dnd-kit gesture→event translation is library-tested upstream) |
| Full builder page (profile load, v1 migration, custom-section auto-placement, debounced autosave of v3 payload, inline contentEditable field saves, WYSIWYG export POST, undo/redo buttons, error state) | integration tests with mocked API — `apps/web/src/pages/BuilderPage.test.tsx` |
| API round-trip (PUT v3/v2/v1 payload validation incl. 400s, templates CRUD + built-in protection + zod config validation, GET/POST PDF export returns real `%PDF` bytes for both v2 and v3 layouts, DOCX import extraction) | tests through the real Fastify HTTP pipeline (DB mocked) — `apps/api/src/resume/resume-builder.integration.test.ts` |
| JSON Resume / Reactive Resume importers | 13 unit tests — `packages/resume-import/src/import.test.ts` |
| Renderer output for all 8 built-in templates, hidden sections, personal details, template-file round-trip | 42-check SSR smoke suite (run during development) |
| Exported PDF content (header, summary, skills, experience, education, custom sections) | verified with `pdftotext` on pdfkit output; Chromium engine falls back gracefully when no browser is installed |

Run: `pnpm --filter @auto-job-apply/web test`, `pnpm --filter @auto-job-apply/api test`, `pnpm --filter @auto-job-apply/resume-import test`.

**Fixed during verification:** PDF/DOCX export endpoints used Express `res.set/res.end` against the Fastify adapter (runtime crash); now use `FastifyReply.headers/send`. The server-side import endpoint (`POST /profiles/:id/import`) specified above did not exist and has been implemented.

**Resume-module items specified but NOT yet implemented** (tracked, not silently dropped):

- LinkedIn data-export and LinkedIn-PDF import flows; GitHub repository/skills import
- Automatic template selection based on a job's location/region at application time
- Resume A/B testing analytics dashboard (schema field `abVariant` exists; no UI)
- Resume analytics backend (the `ResumeAnalyticsPanel` component exists but is not wired to a data source)
- True content auto-flow across pages (overflow is indicated; long sections do not split automatically)
- CEFR language-proficiency grid for Europass (languages render as a simple list)

**Wider portal status** (from a full audit of `specs.md` and `lovable-prompt.md` against the codebase, June 2026): core workflows — dashboard, onboarding wizard, job queue, applications list/detail (table + kanban), job sources, resume builder, core settings — are implemented. Partially implemented: monitoring tabs, networking CRM, ingestion logs, advanced settings (privacy, fine-tuning, per-task model routing). Not yet implemented: analytics dashboard charts, interview prep, salary centre, CAPTCHA dead-letter queue UI, documents library, global Cmd+K search, data-export/kill-switch settings. These are outside the resume-builder scope of the current work and remain roadmap items (see `MISSING_FEATURES_PLAN.md`).


## What the agent does

### Job sourcing pipeline

Jobs enter the system through multiple channels. The agent combines all sources into a single unified queue, deduplicates, validates, and scores before any application is attempted.

#### Source channels

**Job board APIs (primary, structured)** — the agent queries official APIs from platforms that provide them: Indeed Publisher API, Adzuna API, The Muse API, Glassdoor API, and LinkedIn Jobs API (via authorized partner access where available). These return structured JSON (title, company, location, description, URL, date posted, salary range, applicant count) and are the most reliable source.

**Browser automation with Playwright (primary, broad coverage)** — for job boards and company career pages without APIs, the agent uses Playwright to drive a real browser (Chromium). It navigates to target career pages, searches with configured keywords and filters, and extracts job listings directly from the rendered page. Playwright handles JavaScript-heavy sites, infinite scroll, "load more" buttons, pagination, and dynamically rendered content that simple HTTP scraping would miss.

**DOM analysis with LLM interpretation** — when the agent encounters a new career page for the first time, it does not rely on hardcoded selectors. Instead, it captures the rendered DOM and uses LLM-based analysis to identify: job listing containers (the repeating element per job), job title field, company name, location, posting date, job URL/link, salary if displayed, and "apply" button/link. The identified selectors are cached per domain. On subsequent visits, cached selectors are used first — if they fail (site redesign, dynamic IDs), the agent re-runs LLM DOM analysis automatically. This makes the scraper self-healing and able to work on career pages it has never seen before without manual configuration.

**Company career page crawling** — the agent maintains a configurable list of target companies. For each, it periodically visits their careers page (e.g., `stripe.com/jobs`, `notion.so/careers`) via Playwright, discovers new postings, and adds them to the queue. Career page URLs are auto-discovered from company websites by searching for common paths (`/careers`, `/jobs`, `/join-us`, `/openings`).

**RSS and Atom feeds** — some job boards and career pages expose RSS feeds. The agent subscribes to relevant feeds and polls them for new postings. Low-cost, real-time, and reliable where available.

**Google Jobs aggregation** — Google aggregates postings from across the web with structured data (JobPosting schema). The agent queries Google Jobs results for configured search terms, capturing listings that may not appear on individual boards.

**User-initiated sources:**
- **Browser extension** — a "Save this job" button appears on any webpage. One click captures the page URL, and the agent extracts the job details from the page content using LLM analysis.
- **Manual URL paste** — paste any job listing URL into the dashboard. The agent visits the URL via Playwright, extracts all job details from the rendered page, and adds it to the queue.
- **Email forwarding** — forward a job alert email (from LinkedIn, Indeed, or any board) to a designated address. The agent parses the email, extracts individual job listings and their URLs, and adds them to the queue.
- **Bulk import** — upload a CSV or JSON file of job URLs. The agent visits each, extracts details, and adds valid listings to the queue.

**Third-party aggregator APIs** — optional integration with scraping infrastructure services (SerpApi for Google Jobs results, or similar) for users who want broader coverage without running their own Playwright instances.

#### Job validation pipeline

Every job listing — regardless of source — passes through validation before entering the application queue:

**Liveness check** — the agent visits the actual job URL via Playwright and confirms the listing is still live. If the page returns 404, shows "position filled," "no longer accepting applications," or the apply button is disabled/missing, the job is marked as expired and excluded. Liveness is re-checked immediately before application submission as a final gate.

**Expiration detection** — the agent extracts and evaluates posting dates, application deadlines, and "closing date" fields. Jobs posted more than 30 days ago with no explicit deadline are flagged as likely stale. Jobs past their stated deadline are excluded automatically.

**Duplicate detection** — cross-references title, company, location, and description against all existing jobs in the database. Uses fuzzy matching (not just exact match) to catch reposts with slightly different titles ("Senior Software Engineer" vs "Sr. Software Eng.") or reposted on different boards. Duplicate jobs are merged — the earliest posting date is kept, and all source URLs are linked.

**Legitimacy check** — every listing runs through the scam detection pipeline (see "Detects job scams and fraud" below). Jobs that fail legitimacy scoring are excluded before they reach the queue.

**Structured data extraction** — for every valid job, the agent extracts and normalizes into a standard schema: title, company name, location (parsed to city/state/country), remote/hybrid/onsite classification, salary range (if present, normalized to annual), required skills, experience level, posting date, application deadline, job URL, apply method (direct link, ATS portal, email), applicant count (if visible), and job description (full text).

**Continuous refresh** — the agent re-checks saved jobs on a configurable schedule (default: daily for jobs < 7 days old, every 3 days for older jobs). If a previously valid job becomes expired or filled, it is removed from the active queue and marked accordingly.

### Finds and scores jobs

Every six hours the agent runs the sourcing pipeline across all configured channels. Discovered jobs are validated, deduplicated, and scored using semantic NLP-based matching that understands transferable skills, synonyms, and context.

**Response prediction** — callback probability percentage factoring in applicant count, connections, match score, posting age, and recruiter history. Improves over time.

**Competitive intelligence** — exact applicant count, accumulation rate, your percentile rank, and competition heat map.

**Predictive alerts** — monitors funding rounds, product launches, and leadership changes to predict hiring surges before listings appear.

**Timing and prioritisation** — queues submissions for optimal timing (Tuesday–Thursday mornings, employer timezone) and ranks by expected value: callback probability, desirability, effort, competition, and freshness.

### Fills out applications

When the agent reaches a new application form, it maps out every page, field, and dropdown. This map is saved permanently. Known portals are filled instantly without remapping.

For content generation — cover letters, summaries, open-ended answers — text is tailored to each job using keywords and language from the posting. The agent never fabricates skills, experience, or qualifications.

**Persona-driven writing** — calibrates tone to the target industry and company.

**Application A/B testing** — tests different versions of cover letters and answers, tracks results with statistical significance testing, and converges on winning variants.

### Logs into portals that require it

The agent manages portal sessions automatically: checks for saved sessions, attempts login with credentials, uses "Apply with LinkedIn" where available, and pauses for manual MFA only when no workaround exists. Sessions are saved for reuse.

**Smart email alias system** — generates a unique trackable email alias for every application. Spam detection and automatic deactivation of aliases for closed applications.

### Tracks everything in the database and Google Sheets

Every application is recorded the moment it is submitted and synced to your Google Sheet as a read-only view.

### Monitors your inbox for replies

Every fifteen minutes, the agent scans your inbox and classifies emails as: interview invite (extracts details, adds to calendar), rejection (updates status, saves feedback), automated acknowledgement (silently filed), or recruiter follow-up (notifies you).

### Finds hiring managers and sends outreach

Identifies hiring managers and recruiters, finds professional email addresses, and sends personalised outreach messages. Surfaces insider connections from your LinkedIn network. Tracks delivery status and replies.

**Recruiter behaviour analytics** — tracks response rates, ghost probability, and optimal follow-up timing per recruiter.

### Optimises your LinkedIn profile

Analyses your LinkedIn profile and provides actionable recommendations — headline rewrites, summary improvements, keyword additions, and completeness scoring.

LinkedIn — profile import and connection surfacing (read-only). LinkedIn automation (commenting, engagement, posting) is NOT supported due to aggressive bot detection and account ban risk.

### Automates follow-ups and communication

**Timed follow-up emails** — sent after a configurable number of days with no response.

**Thank-you notes** — drafted after interviews, referencing interview details.

**Multi-channel notifications** — desktop, email, WhatsApp, or Telegram.

**Google Calendar integration** — interviews, follow-ups, and deadlines automatically added.

### Prepares you for interviews

When an interview is confirmed, the agent prepares: a company research brief (business summary, news, culture ratings, funding, leadership), a question bank sourced from Glassdoor with suggested answers, AI mock interview sessions with scoring, and take-home assignment analysis with relevant resources. It detects AI screening platforms and adjusts preparation accordingly. Interview scheduling automation handles availability pages, timezone intelligence, and rescheduling.

### Provides salary and financial intelligence

**Salary benchmarking** — market salary data for each role included in every application record. Personalised predictions based on your experience, skills, and location with a skill premium calculator.

**Total compensation calculator** — models base salary plus RSU/stock vesting, 401k matching, insurance value, signing bonuses, and PTO value.

**Negotiation advisor** — market rate comparison and word-for-word negotiation scripts when you receive an offer.

**Multi-offer decision matrix** — weighted framework across compensation, growth, culture, location, and stability.

**Employment contract review** — AI analysis flagging non-competes, IP assignment, mandatory arbitration, and one-sided termination terms with risk ratings and suggested counter-language.

**Offer deadline management** — tracks deadlines with escalating notifications and "exploding offer" detection.

### Analyses skill gaps

Compares your skills against target role requirements, identifies gaps, and recommends learning paths. Updates your profile as you upskill. **Career change support** maps transferable skills to target industry language. **Job market trend forecasting** tracks emerging roles, skill premiums, and hiring velocity — proactively suggests adjacent roles when your target category contracts.

### Detects job scams and fraud

**AI-powered scam detection** — analyses every posting for fraud indicators: vague company names, unrealistic pay, upfront payment requests, domain mismatches, and newly created profiles. Each listing gets a legitimacy score.

**Company verification** — checks business registration databases, domain age, LinkedIn presence, Glassdoor presence, and BBB ratings.

### Assesses company stability and culture

**Company financial health score** — recent funding, runway estimates, layoff history, revenue signals, and a composite stability score.

**Cultural fit scoring** — analyses Glassdoor reviews, company culture signals, and leadership communications against your stated values.

**Glassdoor sentiment analysis** — NLP analysis to extract toxic culture indicators, detect fake review campaigns, and score interview process quality.

**Company tech stack detection** — detects actual technologies used via website fingerprinting, StackShare, engineering blogs, and employee LinkedIn profiles. Calculates a stack alignment score against your skills.

**Return-to-office policy tracking** — tracks current RTO policy and enforcement level for companies in your pipeline.

### Manages application lifecycle

Application withdrawal when you accept an offer, read receipt surfacing where platforms provide it, and reference management (tracks references, generates requests, alerts on overuse).

### Digital footprint and compliance

**Online presence audit** — scans your public presence and flags harmful content with remediation steps.

**Visa sponsorship scoring** — cross-references employers against DOL/USCIS databases for H-1B approval history and sponsorship likelihood. Immigration timeline planner for application windows and deadlines.

**Remote work assessment** — evaluates timezone overlap, sync hours, and async culture. Flags strict RTO enforcement.

**Workplace accommodation** — disclosure timing guidance, EEOC-compliant accommodation request templates, and documentation assistance.

### Networking and CRM

Generates personalised briefings before networking events or recruiter calls with conversation starters and shared connection points. Discovers relevant professional events where target company employees will be present. **Personal CRM** tracks every professional relationship with "reach out again" reminders.

### Stealth mode for confidential searches

Employer blocklist across all platforms (including subsidiaries), confidential resume mode, activity scheduling outside work hours, dedicated browser profile, and reference timing controls.

### Additional capabilities

**Freelance and contract support** — searches for contract, freelance, and part-time opportunities with appropriate application flows.

**Rejection response handling** — generates gracious responses and maintains a re-engagement database for re-applying when new roles open at previously-rejecting companies.

**Open source strategy** — recommends specific projects to contribute to for hiring visibility at target employers.

**Professional communities** — recommends associations and niche communities (Discord, Slack, Reddit) that serve as informal hiring channels.

**Accessibility** — full keyboard navigation, screen reader compatibility, high-contrast mode, and configurable text scaling.

---

## What your Google Sheet and status portal show

Each row represents one application. Columns fill progressively:

| What it tracks | When it's filled in |
|---|---|
| Job title and company | On application |
| Link to the job posting | On application |
| Where the job was found | On application |
| Date posted / Date applied | On application |
| Relevance score | On application |
| ATS compatibility score | On application |
| Resume version used | On application |
| Scam/legitimacy score | On application |
| Company stability score | On application |
| Cultural fit score | On application |
| Salary range (market data) | On application |
| Callback probability score | On application |
| Competition level (applicant count) | On application |
| Tech stack alignment score | On application |
| Remote work compatibility score | On application (for remote roles) |
| Current status (Applied / Interview / Rejected / Offer / Withdrawn) | Updated as emails arrive |
| Days to response | Calculated automatically |
| Interview date, format, and location | From interview invite |
| Outreach and follow-ups sent | When sent |
| Contract red flags found | When offer received |
| Equity vesting value projection | When offer received |

---

## Analytics dashboard

The status portal includes analytics that turn your job search into a data-driven process:

- **Response rate** — percentage of applications receiving any response, broken down by job board, role type, and company size
- **Interview conversion rate** — percentage of applications leading to interviews
- **Offer rate** — percentage of interviews leading to offers
- **Time-to-response** — average days between application and first response, with trends
- **Resume A/B test results** — which resume versions and cover letter styles perform best
- **Source effectiveness** — which job boards produce the most interviews per application
- **Application volume trends** — daily, weekly, and monthly counts with timeline view
- **Skill demand trends** — which skills appear most frequently in target jobs
- **Outreach performance** — open rates, reply rates, and referral conversion rates
- **Application timing heatmap** — which days and times produce the best response rates

---

## When the agent pauses and involves you

How often the agent pauses depends on your autonomy mode. In **Full Autopilot**, the agent never pauses. In **Guided**, it pauses before every submission. In **Supervised** (default), it pauses only for MFA codes, unanswerable questions, recruiter messages requiring personal response, offers, and interview confirmation.

**Learning from your answers:** Every answer you provide is saved and reused automatically. Over time, pauses decrease to near zero.

**Unanswered pause timeout:** Configurable duration (default: 24 hours). On timeout, the agent skips or uses a best-guess answer depending on your timeout policy.

---

## Schedule

The agent runs on a fixed schedule in the background:

- **Job search and applications** — runs four times a day, every six hours
- **Inbox monitoring** — runs every fifteen minutes
- **Follow-up emails** — checked and sent once daily
- **Outreach campaigns** — sent in batches with human-like timing throughout the day
- **Portal maintenance** — runs once per night to keep form knowledge current
- **Analytics refresh** — recalculated every hour
- **Networking event discovery** — runs daily
- **Offer deadline checks** — runs hourly when active offers exist

---

## Swappable LLM backend

The agent uses a configurable LLM layer that can be pointed at any supported model — OpenAI, Anthropic, Google, Mistral, a local model via Ollama, or any OpenAI-compatible API. You choose which model in configuration, and you can switch at any time. All prompts, form-filling logic, and content generation go through this single abstraction layer.

### Ollama integration

Ollama runs as a local LLM server on your machine. The agent connects to it like any other provider — point to `http://localhost:11434` in settings and select a model (Llama 3, Mistral, Phi, Gemma, etc.). All processing happens locally: no data leaves your machine, no API costs, no rate limits. You can run Ollama as the primary provider for full privacy, or as a fallback when cloud budget is exhausted. The agent auto-detects available Ollama models and shows them in the model selector.

### Cost controls

LLM usage is managed with hard constraints to prevent bill shock:

**Per-task model routing** — expensive models (GPT-4, Claude Opus) are used only for content generation (cover letters, open-ended answers). Cheaper models (GPT-4o-mini, Haiku, local Ollama) handle extraction, classification, form parsing, and routine decisions.

**Hard daily spend cap** — configurable maximum daily LLM spend (default: $5/day). This is a hard ceiling, not a soft warning — when the cap is reached, the agent stops all cloud LLM calls immediately. Remaining work is either queued for the next day or routed to Ollama if configured. The cap cannot be silently exceeded.

**Hard monthly spend cap** — configurable monthly maximum (default: $100/month). Prevents cost creep over time. The agent shows a projection ("At current rate, you will hit your monthly cap on day 22") and slows down proactively as the cap approaches.

**Per-application budget** — estimated LLM cost shown per application before submission. Average target: $0.10-0.30 per application. Applications projected to exceed $0.50 in LLM cost are flagged for review.

**Cost dashboard** — real-time spend tracking broken down by task type (tailoring, cover letters, research, form filling). Weekly cost reports via email.

**Local model fallback** — if cloud API budget is exhausted, the agent automatically falls back to a configured local model (Ollama) for continued operation at zero marginal cost, with a quality trade-off notification. This ensures the agent never stops working due to budget — it just switches to a free local model.

**Budget alerts** — notifications at 50%, 80%, and 95% of daily and monthly caps. Configurable thresholds.

### Request tracking and logging

Every LLM call is individually tracked and logged:

**Per-request log** — each LLM request records: timestamp, model used, task type (resume tailoring / cover letter / form parsing / classification / research / outreach), input token count, output token count, cost, latency (ms), and which application or job it was for.

**Request history** — searchable, filterable table of all LLM requests. Filter by model, task type, date range, cost range, or associated job. Useful for understanding where spend is going and identifying expensive operations.

**Agent work log** — a complete audit trail of agent activity beyond just LLM calls. Tracks every action the agent takes: portal visited, form filled, email sent, decision made, and the reasoning behind it. Each log entry includes timestamp, module (resume/search/application/outreach/inbox/research/scheduling), action taken, inputs used, outputs produced, and outcome.

**Inter-module communication log** — records messages between modules on the event bus: which module requested what from which other module, with payloads and responses. Useful for debugging unexpected behaviour.

**Log retention** — all logs retained for 90 days by default (configurable). Exportable as CSV or JSON for external analysis. Older logs summarised into aggregate statistics.

### Fine-tuning on your data

The agent improves its models using your accumulated data:

**Style fine-tuning** — after 50+ applications, the agent has enough data (your edits, approved vs. rejected drafts, successful vs. unsuccessful cover letters) to fine-tune a lightweight model on your writing style and preferences. Fine-tuned models produce first drafts that need fewer edits, reducing both cost and time.

**Form-filling fine-tuning** — portal field mappings, your saved answers, and correction patterns are used to fine-tune a smaller model specifically for form interpretation and filling. This reduces reliance on expensive large models for routine form work.

**Fine-tuning workflow** — when enough data is accumulated, the agent notifies you: "You have 127 reviewed applications. Fine-tuning a custom model would improve draft quality and reduce LLM costs by an estimated 30-40%. Proceed?" Fine-tuning runs locally via Ollama (using LoRA/QLoRA on a base model) or through cloud provider fine-tuning APIs (OpenAI, Anthropic) — your choice. Your data never leaves your machine if you choose local fine-tuning.

**A/B validation** — after fine-tuning, the agent runs both the base model and your fine-tuned model on the same tasks for 2 weeks, comparing quality scores. The fine-tuned model only replaces the base model if it demonstrably performs better.

**Incremental retraining** — fine-tuning is not a one-time event. As you accumulate more data (every 100 additional applications), the agent offers to retrain with the expanded dataset. Each iteration produces a more personalised model.

---

## Modular architecture

Internally, the agent uses a modular architecture with clearly separated concerns. Each module handles a specific domain (resume, search, application, outreach, inbox, research, scheduling) with its own data store and interface. Modules communicate through a central event bus. This is NOT a distributed microservices system — it's a single deployable application with clean internal boundaries. Different modules can use different LLM models for cost optimization.

### Persistent memory

The agent maintains hierarchical memory: **short-term** (session context), **long-term** (preferences, patterns, portal knowledge accumulated over months), and **episodic** (specific events like "user rejected Company X due to RTO policy"). Memory persists across sessions and informs every decision.

---

## Database and status portal

All application data is stored in a persistent database (source of truth). Google Sheets is synced as a read-only view.

A web-based status portal provides: overview dashboard, searchable application list, Kanban board (Wishlist → Applied → Interview → Offer → Rejected → Withdrawn), timeline view, per-application detail view (resume sent, cover letter, emails, saved answers used), analytics, document library with version history, interview prep materials, personal CRM, salary centre, stealth controls, offer centre with contract review and deadline tracking, priority-tiered notifications, and full settings configuration.

---

## What it learns over time

Every portal the agent visits is remembered — form structure, steps, fields, dropdowns — all stored and reused indefinitely. Portal mappings are cached for 30 days. On failure, the agent re-analyzes the page using LLM-based DOM interpretation rather than relying solely on static selectors. This handles portal updates, dynamic IDs, and layout changes without manual mapping updates.

The agent also continuously learns: your saved answers (reused automatically), what works (which resume styles and tones produce results), your preferences (roles you approve vs. decline), market patterns (effective boards and times), and your writing voice (improving with every edit you make to generated content).

### Portal learning from manual applications

When you apply manually through a job portal, the agent observes and records the entire flow:

**Field capture** — every form field (name, type, options, validation rules) is saved to the portal's mapping database.

**Flow recording** — the sequence of pages, steps, and conditional branches is stored as a replayable flow template.

**Answer persistence** — your manually entered answers are saved permanently and auto-populate the next time the same or similar field appears on any portal.

**Supplementary role** — this does NOT replace automated application. It feeds INTO the automated system: fields learned from manual applications improve future automated submissions on the same or similar portals.

**Progressive coverage** — after 20-30 manual applications across different ATS platforms, the agent has encountered most standard field types and can handle new portals with near-zero human input. Conditional branches (e.g., "visa sponsorship needed?" → "specify type") are replayed correctly in automated runs.

---

## Safety and quality controls

- **No hallucination** — never inserts skills, experience, or qualifications not on your actual resume
- **Human-like behaviour** — randomised delays, natural scrolling, realistic timing on all portals
- **Company and keyword blacklists** — permanently excluded companies and filtered terms
- **Quality gate** — no submission below configured relevance and ATS thresholds
- **Duplicate prevention** — never applies to the same job twice, even across boards
- **Rate limiting** — configurable daily caps per platform
- **Scam detection and company verification** — every posting checked before submission
- **Data privacy** — GDPR-compliant, no third-party sharing, credential encryption at rest
- **Autonomy controls** — agent cannot upgrade its own permissions. Pause All and Kill Switch always accessible.
- **Audit log** — every action logged with timestamp, decision, and reasoning. Rollback via flagging from portal.

---

## CAPTCHA and anti-bot strategy

The agent handles bot detection and CAPTCHA challenges through a layered approach:

**Automated CAPTCHA solving** — integrates with solving services (2Captcha, Anti-Captcha, CapSolver) as the primary handler. When a CAPTCHA appears during application flow, it is automatically routed to the solving service and the result injected without human intervention. Average solve time: 10-30 seconds.

**Browser fingerprint randomization** — uses puppeteer-extra-plugin-stealth or equivalent to randomize Canvas fingerprint, WebGL renderer, audio context, navigator properties, timezone, language, screen resolution, and installed plugins. Each session presents a unique, consistent fingerprint.

**Residential proxy rotation** — routes traffic through residential IPs with geographic targeting matching the user's stated location. Rotates per-session, not per-request, to avoid triggering anomaly detection.

**Rate limiting per platform** — each job board has a configured maximum actions-per-hour and applications-per-day. Defaults: LinkedIn (5/day), Workday (10/day), Greenhouse (15/day), Indeed (20/day). User-configurable.

**Human-like interaction patterns** — randomized delays between actions (2-8 seconds), natural mouse movements, scroll patterns, and realistic typing speeds with occasional corrections.

**Fallback escalation** — if automated solving fails 3 times consecutively for a portal, the application is queued for human-in-the-loop resolution (user solves CAPTCHA via notification) or skipped based on autonomy mode.

---

## Platform compliance strategy

Each job board is categorized by access method:

**API-based (safe)** — platforms with official APIs or partner programs. Applications submitted via API. No automation risk.
- Indeed Publisher API
- LinkedIn Easy Apply (via authorized partner, if available)
- Adzuna, The Muse, Glassdoor API

**Browser extension (low risk)** — the user's own browser, with the extension filling forms on their behalf. Indistinguishable from manual use.
- Greenhouse, Lever, Workday, BambooHR
- Any ATS with a standard web form

**Headless automation (managed risk)** — server-side browser automation with anti-detection. Used only when no extension or API path exists.
- Rate-limited, fingerprint-randomized, residential-proxied
- User acknowledges risk during setup

**Off-limits (not supported)** — platforms with aggressive automation detection that cannot be safely automated.
- Listed explicitly in documentation
- Subject to change as platforms update enforcement

**Outreach compliance:**
- CAN-SPAM: all outreach includes opt-out, physical address, honest subject lines
- GDPR: data export/deletion on request, no third-party sharing
- Platform ToS: no automated LinkedIn commenting, no fake engagement, no message spam

**User disclosure:** during setup, users are informed which platforms use automation vs. API vs. extension, and the associated risks per platform.

---

## Error recovery and failure handling

The agent assumes failure is normal and handles it gracefully:

**Retry with exponential backoff** — retryable failures (network timeouts, 5xx errors, session expiry) are retried up to 3 times with exponential delays (30s, 2min, 10min).

**Partial form recovery** — application form state is serialized after each page/step. If the browser crashes or session expires mid-application, the agent resumes from the last completed step rather than restarting.

**Dead-letter queue** — applications that fail 3 times are moved to a dead-letter queue visible in the dashboard. Users can retry manually, skip, or investigate.

**Failure classification** — every failure is categorized as: retryable (network, timeout), terminal (portal blocked, account banned, CAPTCHA unsolvable), or degraded (partial submission, missing confirmation).

**Screenshot on failure** — when an application fails, a screenshot of the final state is captured and stored for debugging.

**Portal health tracking** — the agent maintains a health score per portal (success rate over last 7 days). Portals with <50% success rate are flagged in the dashboard and deprioritized in the queue.

**Session invalidation recovery** — detects when a saved session is invalidated, automatically re-authenticates, and resumes the interrupted workflow.

**Idempotency** — every submission attempt is tracked with a unique ID. If the agent crashes after clicking "Submit" but before receiving confirmation, it checks whether the application was actually submitted before retrying (preventing double applications).

---

## Monitoring and observability

For the developer and advanced users:

**Portal health dashboard** — success/failure rates per job board over 7/30/90 days. Alerts when a portal breaks.

**Automation success rate** — percentage of applications that complete successfully vs. fail at each stage (login, form fill, submission, confirmation).

**LLM spend tracker** — cumulative and per-day API spend with projections against daily/monthly caps. Per-request cost breakdown (see Request tracking under LLM backend).

**Agent work log viewer** — complete audit trail of every agent action with timestamp, module, reasoning, and outcome. Searchable and filterable.

**LLM request inspector** — drill into individual LLM calls: see the prompt sent, response received, model used, tokens consumed, cost, and latency. Identify expensive or slow operations.

**Error log** — categorized errors with timestamps, screenshots, and retry counts. Filterable by portal, error type, and severity.

**Alerting** — configurable alerts (email/webhook) for: daily failure rate >20%, portal down, spend cap approaching (50%/80%/95%), account ban detected, queue backing up.

**Application funnel metrics** — jobs found → passed filters → applications attempted → submitted → confirmed → responses received. Drop-off at each stage identifies bottlenecks.

---

## Integrations

The agent connects with external tools to fit into your existing workflow:

- **Google Sheets** — real-time sync of all application data as a read-only view
- **Google Calendar** — interviews, follow-ups, and deadlines automatically added
- **Gmail / Outlook** — inbox monitoring for application responses
- **LinkedIn** — profile import and connection surfacing (read-only)
- **GitHub** — repository import for developer resume features
- **WhatsApp / Telegram** — notification delivery and status updates
- **Slack** — optional notification channel
- **Webhooks** — configurable webhooks for custom integrations
- **Browser extension** — Chrome/Firefox extension for one-click job saving, manual application tracking, and in-page form autofill
- **SimpleLogin / Addy.io** — email alias services for per-application tracking
- **Wappalyzer / BuiltWith** — company tech stack detection
- **REST API** — documented API for building custom integrations or mobile apps on top of the agent's data

---

## What it does not do

Regardless of autonomy mode, the agent has hard limits that can never be overridden:

- It does not apply to jobs you have already applied to
- It does not apply to jobs that are no longer live
- It does not fabricate any part of your profile — all content is derived from what you actually provide
- It does not share your data with third parties
- It does not store credentials in plain text — all passwords, API keys, and tokens are encrypted at rest
- It does not exceed your configured daily application caps
- It does not apply to jobs below your configured relevance or ATS score thresholds

The following depend on your autonomy mode:

| Behaviour | Full Autopilot | Supervised | Guided |
|---|---|---|---|
| Submit applications without review | Yes | Yes | No — requires approval |
| Send outreach without review | Yes | Yes | No — requires approval |
| Send follow-ups without review | Yes | Yes | No — requires approval |
| Answer unknown questions with best guess | Yes | No — pauses | No — pauses |
| Skip portals requiring manual MFA | Yes — skips | No — pauses | No — pauses |
| Respond to emails on your behalf | Never | Never | Never |
| Accept or reject offers | Never | Never | Never |
| Upgrade its own autonomy level | Never | Never | Never |

---

## Phase 4 — Future Features

These features are deferred from the initial release. They are valuable but non-essential for core operation.

### Mobile native app

A native iOS and Android app providing a mobile-first job search experience:
- Swipe-to-apply interface
- Biometric authentication
- Home screen widgets for at-a-glance status
- Push notification intelligence
- Camera integration for scanning business cards

### Team and agency mode

Support for recruitment agencies, career coaches, and job search teams:
- Multi-candidate pipeline with Kanban boards
- Recruiter-candidate assignment with workload balancing
- Bulk resume tailoring
- Aggregate analytics (placement rate, time-to-placement)
- Client portal for employer clients
- Template library sharing across teams

### Social proof aggregation

Automated collection and strategic deployment of social proof:
- Automated recommendation requests to former colleagues
- Testimonial library from LinkedIn, references, and performance reviews
- Context-aware deployment matching testimonials to applications
- Social proof score identifying portfolio gaps

### Portfolio website auto-generation

Auto-generated responsive portfolio website from resume data:
- One-click conversion with template selection and custom subdomain
- GitHub project showcase with auto-generated descriptions
- SEO optimisation and visitor analytics
- QR code generation for business cards

### Work sample and case study generation

For candidates who cannot share proprietary work:
- Case study generator from resume bullet points
- Code portfolio generation demonstrating listed skills
- Confidentiality-safe sanitisation
- Interactive hosted samples with analytics

### Technical blog and thought leadership

Draft blog posts and tutorials based on expertise:
- Topic suggestions based on trending technologies
- Cross-posting to Hashnode, Dev.to, Medium, and LinkedIn Articles
- SEO optimisation and publishing cadence management

### Alumni network leveraging

Map alumni networks across educational institutions and former employers:
- Cross-reference alumni with target company employees
- Identify warm introduction paths
- Contextual outreach referencing shared connections

### Professional development tracking

Automatic learning and credential tracking:
- Multi-platform credential sync (Coursera, Udemy, LinkedIn Learning, etc.)
- Certificate expiration tracking with renewal reminders
- Auto-resume update on completion
- Skill progression visualisation
- Learning recommendation engine

### Skills verification through micro-challenges

Proactive verified credential building:
- Identify which assessment platform each company uses
- Practice environments mirroring specific platforms
- Portfolio of verified scores for proactive sharing

### Interview recording and self-review

Post-interview analysis (with consent):
- Speech clarity and pace scoring
- Filler word frequency tracking
- Answer completeness mapping
- Improvement tracking across interviews
