# Lovable UI Design Prompt

I'm attaching my product specification (specs.md) for an autonomous job application agent. I need you to design and build the complete web-based UI for this product. Read the full specs.md file carefully before starting — it defines every feature, screen, and interaction.

## What to Build

A modern, responsive web application (the "status portal") that serves as the user's dashboard for managing their autonomous job search agent. The UI should cover the entire user journey from onboarding to daily use.

---

## Core Screens to Design

### 1. Onboarding Flow (First-run experience)

A multi-step wizard with progress indicator (5 steps):

- **Step 1 — Profile Import**: Upload resume (drag-and-drop for PDF/DOCX), connect LinkedIn, or paste GitHub username. Show parsed profile preview for confirmation with editable fields.
- **Step 2 — Preferences**: Form for target roles (tag input), salary range (dual-handle slider), location preferences (multi-select with remote/hybrid/onsite toggle), company blacklist (tag input), keyword blacklist (tag input), daily application cap (number input with sensible default of 15).
- **Step 3 — Dry-run Preview**: Show 5 sample job matches with what the agent would submit (tabbed view: tailored resume preview, cover letter, form answers). Allow inline corrections. Show where each job was sourced from.
- **Step 4 — Credential Setup**: Per-portal credential entry with clear labels showing which method is used (browser extension / OAuth / stored credential). Risk disclosure per portal. Ollama connection test (if local LLM selected).
- **Step 5 — Autonomy Selection**: Visual card selector for Guided/Supervised/Full Autopilot with clear explanation of each. Full Autopilot card shows lock icon with tooltip: "Unlocks after 30 successful supervised applications." LLM provider selection + daily/monthly budget caps on this step too.

### 2. Main Dashboard (Overview)

The primary landing page after onboarding:

- **Top bar**: Pause All button (yellow, prominent), Kill Switch button (red), notification bell with badge count, global search (Cmd+K), settings gear
- **Budget status bar**: Thin horizontal bar showing today's LLM spend vs. daily cap (color-coded: green/yellow/red) + monthly spend progress
- **Stats row**: Cards showing — total applications, interviews scheduled, response rate %, offer count, active outreach, today's jobs discovered
- **Activity feed**: Chronological timeline of recent agent actions (applications submitted, emails received, status changes, jobs discovered, errors) with timestamps and module badges
- **Priority notifications**: Highlighted cards at top for items needing attention (MFA requests, unanswered questions, interview confirmations, CAPTCHA queue, budget alerts)
- **Quick actions**: "Review queue" button (for Guided/Supervised mode items awaiting approval), "Add job URL" quick input, "Run search now" button
- **Job sourcing status**: Small widget showing source health (green/yellow/red dots per source: APIs, Playwright, extension, RSS)

### 3. Job Sources & Discovery

This screen shows where jobs come from, how they're discovered, and their validation status:

**Source Channels panel** (top row of cards):
- Card per source channel: Indeed API, LinkedIn API, Adzuna API, Playwright crawl, Google Jobs, RSS feeds, browser extension, manual URL, email forward
- Each card shows: jobs discovered today / this week, success rate %, last run time, next scheduled run, status indicator (green running / yellow degraded / red failing)
- Click a card to expand configuration (API keys, search terms, crawl frequency)

**Target Companies panel**:
- Editable list of companies whose career pages the agent crawls directly
- Each entry: company name, company logo (auto-fetched), career page URL (auto-discovered or manual override), crawl frequency selector, jobs found count, last crawled timestamp, health status
- "Add company" button — type company name or website URL, agent auto-discovers career page path (`/careers`, `/jobs`, `/join-us`, `/openings`)
- Bulk add: paste a list of company names

**Job Ingestion Log** (main table):
- Live-updating table showing every job as it enters the system
- Columns: timestamp, source channel (with icon), job title, company, location, validation status, action
- Color-coded rows: green (valid, queued for application), yellow (pending validation / liveness check), red (rejected)
- Rejected rows show reason on hover: expired, duplicate (link to original), scam-flagged (link to scam report), liveness check failed
- Filter bar: by source, by status, by date range, by company
- Export as CSV

**Manual Add Options** (sidebar or action bar):
- "Paste URL" — input field with paste button. Agent fetches URL via Playwright, shows extracted job details for confirmation before adding to queue.
- "Upload CSV" — drag-and-drop area for bulk URL import. Shows progress bar and per-URL validation results.
- "Forward email" — displays the designated forwarding email address with copy button and instructions.
- "Bulk company import" — upload a list of target company names/URLs.

**DOM Analysis Viewer** (advanced, collapsible section):
- When the agent analyzes a new career page for the first time, shows:
  - Screenshot of the career page with colored overlay boxes highlighting detected elements (job title = blue, company = green, location = purple, date = orange, apply button = red)
  - Detected selectors listed on the right with confidence percentage
  - "Correct" button per field — if agent misidentified something, user can click the correct element
  - Cache status: "Selectors cached for 30 days" with "Re-analyze now" button
- History of DOM analyses with success/failure per domain

**Source Health** (bottom section):
- Per-source success rates and error counts over 7/30 days
- Alerts when a source fails: API key expired, career page redesigned (selectors broken), rate limited, blocked

### 4. Application List & Kanban

Two view modes (toggle between them):

**Table view**:
- Sortable, filterable table
- Columns: job title, company (with logo), source, date applied, relevance score, ATS score, callback probability, competition level, status, template used
- Row click opens detail view (slide-over panel)
- Multi-select checkboxes for bulk actions (withdraw, archive, retry)
- Filter bar: status, date range, score ranges, source channel, company, location

**Kanban view**:
- Drag-and-drop columns: Wishlist → Queued → Applied → Interview → Offer → Rejected → Withdrawn
- Cards show: company logo, job title, location, key score (callback probability), days since applied
- Card color accent based on score (green high probability, yellow medium, red low)
- Count badge on each column header

### 5. Application Detail View

Slide-over panel (from right) or full page:

- **Header**: Job title, company (with logo + link), posting URL (clickable), date applied, source channel badge, template badge ("Europass — auto-selected for EU role" with override link)
- **Score cards row**: Relevance, ATS, Scam/Legitimacy, Stability, Cultural Fit, Tech Stack Alignment, Callback Probability — each as a small card with number and color
- **Tabs**:
  - **Resume Sent** — rendered PDF preview of the tailored resume that was submitted
  - **Cover Letter** — the generated cover letter with diff view against base template
  - **Form Answers** — every form field and the answer submitted, organized by page/step
  - **Emails** — thread view of all emails related to this application (sent/received)
  - **Company Brief** — research summary (financial health, culture, tech stack, RTO policy, Glassdoor scores)
  - **Outreach Log** — outreach emails sent, to whom, status, replies
  - **Timeline** — chronological log of every agent action for this application (discovered → validated → queued → tailored → submitted → confirmed → response)
  - **LLM Costs** — per-request breakdown for this specific application (how much the tailoring, cover letter, and form filling cost)
- **Status history**: Visual timeline with timestamps per status change
- **Action buttons**: Contextual to current status — Withdraw, Follow up, Mark as interviewed, Add note, Retry (if failed), Flag mistake (for agent learning)

### 6. Resume Builder

Two view modes with a **Page Builder** toggle button in the top bar:

**Default view** — profile detail card showing contact info, summary, skills badges, and a tabbed interface:
- **Sections tab**: Accordion-based section editors for all resume sections
- **Cover Letter tab**: AI cover letter generation panel
- **Job Match tab**: Job description match analysis with ATS scoring
- **Versions tab**: Resume version management and comparison

**Page Builder view** — split-pane layout:
- **Left panel (40%)**: Section order drag-and-drop list (via @dnd-kit), template gallery, theme customizer, export buttons (PDF, DOCX), ATS score sidebar, and inline section editors
- **Right panel (60%)**: Live A4 resume preview (794×1123px, responsively scaled) updating in real-time. Sticky-positioned with scroll area. Optional page break overlay showing dashed red lines at A4 boundaries.

**Top bar actions**: Page Builder toggle, AI Generate dialog button, JSON Export button, Clone Profile button, Edit Profile button

#### Profile Header

- **Back navigation**: Arrow button to return to profile list
- **Profile name** with Default badge (star icon) if set as default
- **Creation date** below the name
- **Action buttons row**: Page Builder, AI Generate, JSON Export, Clone, Edit Profile

#### Form Editor Sections

Each section is an accordion item in the Sections tab. Sections have full CRUD operations via REST API endpoints (`/profiles/:id/sections/:type`). Each section supports:
- Inline add/edit forms with Save/Cancel buttons
- Delete with confirmation
- Loading and error states
- AI bullet improvement button (sparkle icon) on description fields

**Contact Information** (displayed as a grid of icon+label+value cards in the profile detail view):
- Full name (first + last)
- Email address
- Phone number (with country code selector dropdown)
- LinkedIn URL (validated, shows preview of extracted username like "/in/johndoe")
- Personal website / portfolio URL
- GitHub URL (optional — auto-populates if GitHub username provided during setup)
- Address (city, state/province, country — full street address optional, most modern resumes use city + country only)
- Photo upload (shown/hidden based on selected region template — visible for EU, Gulf, Germany, India, Pakistan, Japan; hidden for US, UK, Australia)
- Date of birth (shown/hidden based on region)
- Nationality (shown/hidden based on region)
- Father's name (shown for Pakistan, India templates)
- CNIC number (shown for Pakistan template, optional)
- Marital status (shown for Gulf, Pakistan templates)
- Domicile / city of origin (shown for Pakistan template)

**Professional Summary** — free-text area with AI generate button, character count, and tone selector (confident / warm / authoritative).

**Work Experience** — repeatable section. Each entry: job title, company name, start date, end date (or "Present"), description/bullet points. Description field has an inline **AI bullet improvement button** (sparkle icon) — clicking sends the text to AI and shows an improved suggestion with Accept/Dismiss buttons. Drag to reorder entries.

**Education** — repeatable. Each entry: degree, field of study, institution, location, graduation date, GPA (optional, with scale selector: 4.0 / 5.0 / 10.0 / percentage), honors/awards.

**Skills** — tag input with auto-categorisation (Languages, Frameworks, Databases, Cloud, DevOps, Tools, Soft Skills). Drag to reorder. Proficiency level selector per skill (optional: beginner/intermediate/advanced/expert). "Import from GitHub" button that auto-detects languages/frameworks from repos.

**Projects** — repeatable. Each entry: project name, description, URL, technologies (comma-separated tag input). Description field has an inline AI bullet improvement button. Technology tags displayed as small badges.

**Certifications** — repeatable. Each entry: certification name, issuing organization, date issued, expiration date (optional), credential ID, verification URL.

**Languages** — repeatable. Each entry: language name, proficiency level dropdown (Native / Fluent / Professional / Intermediate / Basic). For Europass template: CEFR grid (Listening, Reading, Spoken Interaction, Spoken Production, Writing — each A1–C2 dropdown).

**Publications** (shown for Academic template only) — repeatable. Each entry: title, journal/conference, date, co-authors, DOI/link, citation count.

**Volunteer / Extracurricular** (optional, collapsed by default) — repeatable. Same structure as work experience including inline AI bullet improvement button on description.

**References** (shown/hidden based on region) — repeatable. Each entry: name, title, company, relationship, phone, email. Toggle for "Available on request" instead of listing individual references.

**Custom Sections** — users can create arbitrary sections with custom titles and key-value field items. Each custom section has add/edit/delete for individual items. Useful for non-standard sections specific to certain industries or regions.

#### AI Features Panel

**AI Generate Dialog** (modal):
- Job description textarea (required) + additional context textarea (optional)
- Triggers `POST /profiles/:id/tailor` to tailor the entire resume to the job
- Loading state with spinner, success message on completion, error handling

**Inline AI Bullet Writer**:
- Sparkle (✨) button appears next to each description field in Experience, Volunteer, and Projects sections
- On click: calls `POST /profiles/:id/ai/improve-bullet` with the current text
- Shows inline suggestion panel with the improved text
- Accept button replaces the original text; Dismiss closes the panel
- Loading and error states handled inline

**Cover Letter Panel** (tab in profile detail):
- Input fields: Job Title, Company Name, Job Description (textarea)
- "Generate Cover Letter" button triggers `POST /profiles/:id/cover-letter`
- Generated letter displayed in a bordered, whitespace-preserving block
- "Copy to Clipboard" button for quick copying
- Loading state with "Generating cover letter..." indicator

**Job Match Panel** (tab in profile detail):
- Job description textarea with "Analyze Match" button
- Calls `POST /profiles/:id/ats-score` with the job description
- Results display:
  - Overall score as a large number with color coding (green ≥70, yellow ≥40, red <40)
  - Section breakdown: skills, experience, education, keywords — each with score and progress bar
  - Matched keywords shown as green badges
  - Missing keywords shown as red outline badges
  - Improvement suggestions listed as bullet points

#### ATS Score Sidebar (Page Builder mode)

Persistent sidebar card in the left panel of Page Builder mode:

- **Circular SVG gauge** (0–100) with color-coded stroke (green ≥70, yellow ≥40, red <40)
- **Score label** centered inside the circle
- **Category breakdowns**: Formatting, Keywords, Content, Structure — each with label, score, and progress bar
- **Suggestions list**: Actionable tips with lightbulb icons
- Auto-fetches score on component mount via `POST /profiles/:id/ats-score`
- Loading state with spinner
- Graceful error handling with retry option

#### Template Selection System

**Visual Template Gallery** — displayed as a card in the Page Builder left panel. Uses a tabbed interface grouped by layout style (Skills-first, Chronological, Hybrid, Developer). Within each tab:

- Grid of template cards showing layout name + theme name
- Each card is clickable to select both layout and theme simultaneously
- Selected card highlighted with primary ring border and checkmark badge
- Cards show the theme's color scheme via accent styling

**Layer 1 — Region/Standard** (selected first, sets the structural format):

| Region | Template | Key Differences |
|---|---|---|
| US / Canada | Standard US | Single page preferred, no photo, no date of birth, no nationality. Skills-first or reverse-chronological. |
| Europe (EU) | Europass / EuroCV | Standardized EU format. Includes photo, date of birth, nationality, language proficiency grid (CEFR levels A1–C2). Multi-page accepted. |
| UK | UK Standard | 2 pages accepted. "Personal statement" instead of "professional summary." No photo. References section common. |
| Australia / NZ | Australian CV | 2–3 pages standard. Visa/work rights status prominent. "Key achievements" section. Referees with full contact details. |
| Middle East / Gulf | Gulf CV | Photo required. Includes nationality, visa status, date of birth, marital status, religion (optional). 2–3 pages. |
| India | Indian Resume | Photo common. Date of birth, father's name (declining but still seen), declaration section at bottom. 2–3 pages. |
| Pakistan | Pakistani CV | Photo expected. Father's name, CNIC number (optional), date of birth, marital status, domicile/city, declaration section. 2–3 pages. References with full contact details. |
| Japan | Rirekisho (履歴書) | Standardized JIS format. Photo required (specific size), chronological only. Separate shokumu keirekisho (職務経歴書) for work history. |
| Germany / DACH | German Lebenslauf | Photo expected, date/place of birth, nationality. Reverse-chronological. Signed and dated at bottom. |
| China | Chinese Resume | Photo required, date of birth, political affiliation (optional), hukou status. Often bilingual. |
| Academic (global) | Academic CV | No page limit. Publications, grants, teaching, conference presentations, research interests, committee service. |

When a region is selected, the builder automatically:
- Shows/hides fields appropriate to that region (photo upload, DOB, nationality, father's name, CNIC, etc.)
- Sets default page length expectations (shown as a guide in the preview pane)
- Adjusts section labels to regional conventions
- Formats dates to regional standard (MM/DD/YYYY vs DD/MM/YYYY vs YYYY-MM-DD)
- Applies appropriate address and phone number formatting

**Layer 2 — Layout style** (within the selected region):
- Skills-first (recommended for tech roles 2025+)
- Reverse-chronological (traditional)
- Hybrid (skills summary + chronological experience)
- Developer-specific (tech skills, projects, open source, certifications)

**Layer 3 — Visual theme** (cosmetic only, does not affect content/structure):
- Clean minimal (default)
- Professional classic
- Modern accent (subtle color bar)
- Compact dense (fits more content per page)

#### Custom Theme Customizer

A dedicated card in the Page Builder left panel for fine-tuning the visual appearance beyond predefined themes:

- **Color pickers** (5 fields): Primary, Secondary, Accent, Text, Background — each with a native color input and hex value display
- **Font selectors** (2 dropdowns): Heading font and Body font — curated list of web-safe fonts (Inter, Roboto, Open Sans, Lato, Merriweather, Playfair Display, Source Sans Pro, Nunito, Raleway, PT Sans)
- **Spacing sliders** (3 range inputs): Margin (12–48px), Section Gap (8–32px), Entry Gap (4–16px) — each showing current value
- **Reset to Defaults** button to revert all custom overrides
- Changes apply immediately to the live preview via store state merge with base template config

#### Resume Import Dialog

Modal dialog accessible from the profile view:

- **Drag-and-drop zone** using react-dropzone: "Drop your resume here" with upload cloud icon
- Accepted formats: PDF (.pdf) and DOCX (.docx) — max 10MB
- "Or click to browse" text link below drop zone
- File validation with format and size checks
- Upload progress with spinner and "Importing resume..." text
- On success: profile data auto-populated from parsed content with success message
- On error: descriptive error message with option to retry

#### Resume Versions

**Create Version Dialog** (in Versions tab):
- Version name input field
- Layout and Theme dropdowns (pre-filled with current selections)
- "Create Version" button — snapshots current profile state with layout/theme metadata
- Loading state during creation

**Versions Panel** (in Versions tab):
- List of all versions sorted by creation date (newest first)
- Each version card shows: version name, creation date, layout badge, theme badge, ATS score badge (if available)
- Click to select as active version (highlighted with primary border)
- Delete button with confirmation on each version card

**Version Comparison Dialog** (accessible from Versions tab):
- Full-screen dialog with two side-by-side live previews
- Dropdown selectors at the top to choose which two versions to compare
- Each preview renders with the version's stored layout and theme
- Versions auto-fetch from API on mount

#### Section Drag-and-Drop Reordering

In Page Builder mode, a dedicated card shows all resume sections as a sortable list:

- Each section shown as a draggable item with grip handle icon and section name
- Uses @dnd-kit/sortable for drag-and-drop functionality
- Reorder persists to the store's `sectionOrder` array
- Live preview updates immediately to reflect new section order
- Sections include: Summary, Experience, Education, Skills, Projects, Certifications, Languages, Publications, Volunteer, References

#### Export Options

Available in both default view (top bar) and Page Builder mode (left panel):

- **Export PDF** — renders with selected template, layout, and theme. Opens in new tab via `/api/v1/profiles/:id/export/pdf?layout=...&theme=...`
- **Export DOCX** — same pattern as PDF, Word-compatible output
- **Export JSON** — downloads full profile data as a formatted `.json` file (client-side blob download)

#### Profile Cloning

- **Clone button** in the profile detail header (next to Edit Profile)
- One-click duplication via `POST /profiles/:id/clone`
- Loading state with spinner during cloning
- Cloned profile appears in the profile list as a new entry

#### Undo/Redo

- Managed via Zustand store with `zundo` temporal middleware
- Tracks up to 50 history entries of profile data changes
- **Ctrl+Z** to undo, **Ctrl+Shift+Z** to redo
- State comparison via JSON equality (prevents duplicate history entries for identical states)
- Session-scoped (resets on page refresh)

#### Resume Analytics Panel

A dedicated analytics card showing resume engagement metrics:

- **Stats cards row** (2-column grid):
  - Total Views — large number with eye icon in blue circle
  - Total Downloads — large number with download icon in green circle
- **Downloads by Format** — list of format/count rows (PDF, DOCX, etc.)
- **Recent Activity** — bar chart showing views over the last 14 days. Bars are proportionally sized, hoverable with date+count tooltip
- **Empty state**: "No analytics data yet. Export or share your resume to start tracking." when both views and downloads are zero
- Gracefully handles missing analytics endpoint by showing zero-state placeholder data

#### Smart Template Suggestion

When applying to a job, the agent auto-selects the template based on job location:
- Germany → German Lebenslauf
- Australia → Australian CV
- EU (non-specific) → Europass
- Pakistan → Pakistani CV
- Academic position → Academic CV
- US tech company → Skills-first US

Badge on application detail view: "Template: Europass (auto-selected for EU role)" with override link.

### 7. Analytics Dashboard

Grid of chart cards (responsive, 2–3 columns):

- **Response rate**: Line chart over time (daily/weekly toggle), with overall percentage as a large number
- **Interview conversion funnel**: Vertical funnel visualization (Applications → Responses → Interviews → Offers) with drop-off percentages
- **Source effectiveness**: Horizontal bar chart — interviews per application by job board / source channel
- **Application volume**: Area chart (daily/weekly/monthly toggle) with cumulative line overlay
- **Resume A/B results**: Comparison table — resume variants with response rates and statistical significance indicators (✓ significant, ~ not yet)
- **Skill demand**: Horizontal bar chart or word cloud — most requested skills in target jobs
- **Timing heatmap**: Calendar-style heatmap showing response rates by day-of-week and hour
- **Outreach performance**: Grouped bar chart (open rate, reply rate, referral conversion rate)
- **Job sourcing breakdown**: Pie/donut chart showing which sources produce valid jobs (API vs Playwright vs extension vs manual)
- **Cost per application**: Line chart showing average LLM cost per application over time (should trend down as fine-tuning improves)

### 8. Interview Prep

Per-interview view (list of upcoming interviews on the left, detail on the right):

- **Company research brief**: Formatted card with company logo, business summary, recent news (last 3 months), Glassdoor ratings (overall, culture, work-life, compensation), funding stage, key leadership
- **Question bank**: Expandable accordion list organized by type (behavioral, technical, company-specific). Each question shows a suggested answer based on user's profile.
- **Mock interview launcher**: Button that opens an AI mock interview (chat-based or voice if supported)
- **Take-home assignment section**: Requirements summary, suggested approach, relevant resources, deadline countdown
- **Calendar details**: Date, time (with timezone), format (video/phone/in-person), location or meeting link, interviewer name and LinkedIn link
- **AI vs Human indicator**: Badge showing whether this is an AI screening or human interview with preparation tips for each

### 9. Salary Centre

- **Pipeline salary chart**: Box plot or range chart showing salary ranges for all active applications
- **Total compensation breakdown**: Stacked bar chart per offer (base, equity, bonus, benefits, PTO value)
- **Offer comparison matrix**: Side-by-side cards when multiple offers exist — weighted score at top, breakdown by criteria below
- **Negotiation scripts**: Expandable sections with copy buttons — counter-offer script, extension request, decline scripts
- **Contract review results**: Per-offer — flagged clauses listed with severity (green/yellow/red badges), plain-English explanation, suggested counter-language
- **Offer deadline tracker**: Timeline showing all active offer deadlines with countdown timers

### 10. Networking & CRM

- **Contact list**: Searchable, filterable table (name, company, role, relationship type, last contact date, next action due)
- **Contact detail view**: Interaction history timeline, notes field, tags, "reach out again" reminder scheduler, LinkedIn link
- **Upcoming events**: Cards with event name, date, location, attendees from target companies, RSVP status, prep briefing link
- **Briefing generator**: Pre-meeting panel showing talking points, shared connections, recent news about the contact/company, conversation starters

### 11. Settings

Organized by tabs or sidebar navigation:

- **Autonomy**: Global mode selector (visual cards) + per-feature override table matching the spec's table. Toggle for progressive trust escalation override.
- **LLM Provider**:
  - Model selector dropdown (grouped: Cloud Providers → OpenAI/Anthropic/Google/Mistral | Local → Ollama models auto-detected)
  - API key inputs per provider (masked, with test connection button)
  - Ollama server URL input (`http://localhost:11434` default, with connection status indicator and "Detect Models" button)
  - Per-task model routing table: task type (resume tailoring, cover letters, form parsing, classification, research, outreach) → assigned model dropdown. Shows estimated cost per task.
  - **Hard daily spend cap**: Slider + number input (default $5). Red text: "Agent stops all cloud LLM calls when this is reached."
  - **Hard monthly spend cap**: Slider + number input (default $100). Shows projection: "At current rate, you'll hit this on day X."
  - Budget alert thresholds: Checkboxes for 50%, 80%, 95% notifications
  - **Fine-tuning panel**: Data readiness progress bar ("67/50 applications — ready!"), "Start Fine-tuning" button (with local vs cloud choice), active training jobs list, A/B validation results (base vs fine-tuned comparison table), cost savings metric
- **Job Sources**: Configure API keys for job boards, Playwright crawl settings (headless/headed, proxy settings), target company list management, crawl frequency per source, RSS feed URLs, email forwarding address display
- **Notifications**: Channel toggles (desktop, email, WhatsApp, Telegram) × event type matrix (new job match, application submitted, response received, interview scheduled, offer, error, budget alert)
- **Blacklists**: Company blacklist (tag input with autocomplete), keyword blacklist (tag input)
- **Credentials**: Per-portal credential management — table showing portal name, method (extension/OAuth/stored), status (connected/expired/never set), last used. Edit/delete per row.
- **Privacy**: Stealth mode master toggle, employer blocklist (with subsidiary detection), activity hours schedule (calendar-style hour picker), browser profile isolation toggle
- **Danger zone**: Red-bordered section. Kill switch button, "Export all data" button (JSON/CSV), "Delete account and all data" button with confirmation dialog.

### 12. Monitoring & Observability (Advanced)

Tabbed interface within the Monitoring section:

**Tab: Portal Health**
- Table: portal name, logo, success rate 7d/30d/90d (as percentage with trend arrow), total attempts, last success, last failure, status badge (healthy/degraded/down)
- Click a row to see per-portal detail: timeline of successes/failures, common error types, DOM analysis history, selector cache age

**Tab: Error Log**
- Filterable table: timestamp, portal, error type (retryable/terminal/degraded), severity (low/medium/high/critical), retry count, associated job (link), screenshot link (thumbnail on hover)
- Bulk actions: retry all retryable, dismiss, escalate to dead-letter queue

**Tab: LLM Costs**
- **Daily spend chart**: Line chart with daily cap as horizontal red line. Current day highlighted.
- **Monthly cumulative chart**: Area chart with monthly cap line and projected trajectory dotted line.
- **Breakdown table**: By task type (tailoring, cover letters, research, form filling, classification) — columns: request count, total tokens, total cost, avg cost per request. Sortable.
- **Budget status bar**: Large, always-visible bar showing % of daily cap used (with color transition) and % of monthly cap used.
- **Model usage distribution**: Donut chart showing which models consumed what portion of budget.

**Tab: LLM Request Log**
- Filterable table: timestamp, model used, task type, tokens in, tokens out, cost, latency (ms), associated job/application (link), status (success/error)
- Click a row to expand: shows full prompt sent, full response received, and metadata
- Filter by: model, task type, date range, cost range (">$0.05"), associated job
- Export as CSV/JSON
- Aggregations at top: total requests today, total cost today, average latency, error rate

**Tab: Agent Work Log**
- Timeline/feed view of every agent action (not just LLM calls — all actions)
- Each entry: timestamp, module badge (resume/search/application/outreach/inbox/research/scheduling), action description, reasoning (expandable), outcome (success/failure/skipped), associated entities (job, company, contact)
- Searchable by keyword, filterable by module, date range, outcome
- Expandable detail showing inter-module communication for that action

**Tab: Fine-tuning**
- Data readiness indicator: progress bar showing applications reviewed vs. threshold needed (e.g., "127/50 — ready for fine-tuning")
- "Start Fine-tuning" button with options: Local (Ollama + LoRA) vs Cloud (OpenAI/Anthropic fine-tuning API)
- Active jobs table: job name, model base, started at, status (training/validating/complete/failed), progress %
- A/B comparison panel: side-by-side metrics — base model vs fine-tuned model (quality score, user edit rate, cost per task, latency)
- Cost savings metric: "Fine-tuned model has saved $X.XX this month vs. using base model"
- Retraining schedule: "Next retraining suggested at 200 applications (currently 127)"

**Tab: Alerts**
- Alert rules table: condition (failure rate >20%, portal down, spend >80% of cap, account ban, queue backing up), channel (email/webhook/desktop), status (active/paused), last triggered
- "Add alert rule" button: condition builder + channel selector + threshold inputs
- Alert history: log of all fired alerts with timestamp and resolution status

### 13. CAPTCHA & Queue Management

- **Dead-letter queue**: Table of applications that failed 3 times — columns: job title, company, portal, failure reason, last attempt, screenshot thumbnail. Actions per row: Retry, Skip permanently, Investigate (opens detail view with screenshot and error log)
- **CAPTCHA queue**: When agent needs manual CAPTCHA solving — shows the CAPTCHA image/iframe inline with input field and submit button. Count badge showing how many are waiting. Timeout indicator per item.
- **Portal status board**: Grid of portal cards (LinkedIn, Workday, Greenhouse, Lever, Indeed, etc.) — each showing: health score, rate limit status (X/Y used today), session status (active/expired), CAPTCHA frequency, ban risk indicator

### 14. Documents Library

- **Grid/list toggle**: Grid shows document thumbnails, list shows detailed rows
- **Columns/fields**: Document type (resume/cover letter/template), creation date, associated job, template used, performance metrics (callback rate for resumes that got responses)
- **Version history**: Per document — timeline of versions with "Compare" button opening a side-by-side diff view
- **Filters**: By type, date range, associated company/job, template, performance tier (high/medium/low callback rate)
- **Quick actions**: Duplicate, download, delete, "Use as base" (set as default template for new applications)

---

## Design System Requirements

- **Style**: Clean, professional, minimal. Think Linear or Notion — not flashy, not cluttered. Dense information display without feeling overwhelming.
- **Color scheme**: Neutral base (white/gray) with a single accent color (blue or indigo). Status colors: green (success/offer/healthy), yellow (pending/warning/degraded), red (rejected/error/danger/down). Use color sparingly — most UI should be grayscale with color for status and emphasis only.
- **Typography**: Inter font. Clear hierarchy with size and weight, not color. Monospace for technical data (costs, tokens, URLs, selectors).
- **Layout**: Sidebar navigation (collapsible to icons) + main content area. Responsive down to tablet (mobile is Phase 4).
- **Components**: Use shadcn/ui components as the base (cards, tables, badges, buttons, dialogs, sheets, tabs, tooltips, command palette, data tables with sorting/filtering).
- **Dark mode**: Support both light and dark themes. Default to system preference.
- **Empty states**: Design empty states for every section (first-time user, no data yet) with helpful prompts and action buttons ("Add your first job source", "Import your resume to get started").
- **Loading states**: Skeleton loaders for async content. Spinners for actions in progress.
- **Accessibility**: WCAG 2.1 AA — proper contrast ratios, visible focus states, ARIA labels, full keyboard navigation, screen reader support.
- **Data density**: Tables and lists should support compact/comfortable/spacious density toggle. Default: comfortable.

---

## Interaction Patterns

- **Guided/Supervised approval flow**: When items need approval, show a review card with full context (job details, tailored resume preview, cover letter, form answers, scores, cost estimate) and Approve / Edit / Reject buttons. Swipeable on tablet.
- **Notifications**: Toast notifications for real-time events (bottom-right). Bell icon opens notification panel (slide-over from right). Priority items pinned at dashboard top.
- **Search**: Global search (Cmd+K / Ctrl+K) across jobs, companies, contacts, documents, settings. Shows categorized results with keyboard navigation.
- **Filters**: Consistent filter bar pattern across all list views. Filters: status, date range, score ranges, source channel, company, location. Saved filter presets.
- **Bulk actions**: Multi-select checkboxes in table views. Action bar appears at bottom when items selected: bulk approve/reject/withdraw/retry/archive.
- **Real-time updates**: WebSocket or polling for live data — new jobs appearing, application status changes, agent activity feed, CAPTCHA queue updates. Subtle animation when new items appear.
- **Confirmation dialogs**: For destructive actions (withdraw, delete, kill switch) — require explicit confirmation with impact description.
- **Keyboard shortcuts**: Common actions accessible via keyboard (Cmd+K search, Esc to close panels, Enter to approve, arrow keys for navigation in lists).

---

## Navigation Structure

```
Sidebar:
├── Dashboard (overview)
├── Jobs
│   ├── Discovery & Sources
│   ├── Queue (scored, ready to apply)
│   └── Saved / Wishlist
├── Applications
│   ├── Active pipeline (Kanban)
│   └── All applications (table)
├── Resume Builder
├── Documents
├── Analytics
├── Interviews
├── Salary & Offers
├── Networking & CRM
├── Monitoring (collapsible)
│   ├── Portal Health
│   ├── Error Log
│   ├── LLM Costs & Requests
│   ├── Agent Work Log
│   ├── Fine-tuning
│   └── Alerts
└── Settings
```

Bottom of sidebar:
- Pause All button (always visible)
- Current LLM spend (mini display: "$2.34 / $5.00 today")
- Agent status indicator (running / paused / error)

---

## Technical Notes

- React + TypeScript application
- Tailwind CSS for styling
- shadcn/ui for component primitives
- Recharts or Nivo for data visualization (charts, funnels, heatmaps)
- TanStack Table for all data tables (sorting, filtering, pagination, virtual scrolling)
- React Query (TanStack Query) for server state management
- Route-based code splitting for performance
- WebSocket connection for real-time updates (agent activity, new jobs, status changes)
- All data is mock/placeholder for now — design the full UI with realistic sample data
- PDF preview: use react-pdf or iframe embed for resume preview
- Code editor component (Monaco or similar) for viewing LLM prompts/responses in request log

---

## Priority

Build screens in this order:

1. Main Dashboard
2. Job Sources & Discovery
3. Application List (table + Kanban)
4. Application Detail View
5. Onboarding Flow
6. Resume Builder (with template system)
7. Settings (especially LLM provider + cost caps)
8. Analytics Dashboard
9. Monitoring (LLM costs, request log, agent work log, fine-tuning panel)
10. Interview Prep
11. Salary Centre
12. CAPTCHA & Queue Management
13. Networking & CRM
14. Documents Library

Focus on getting the core loop right first (dashboard → job discovery → application queue → detail → approval flow), then expand outward to supporting screens.
