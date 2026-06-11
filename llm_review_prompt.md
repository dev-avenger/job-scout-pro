# LLM Review Prompt — Job Application Agent Specs

Copy everything below the line and paste it into ChatGPT, Gemini, Grok, Mistral, Perplexity, or any other LLM. Attach or paste the full `specs.md` file after the prompt.

---

## Prompt

You are a senior product architect and AI/automation expert. I am building an autonomous job application agent — an AI-powered system that applies to software developer jobs on behalf of a user with minimal to zero human involvement.

I have attached the full product specification document (specs.md, approximately 1,000 lines). It covers the complete feature set I have designed so far.

I need you to perform a rigorous, brutally honest review of this specification. Do not be polite or diplomatic — I want genuine critical analysis. Structure your response in the following sections:

---

### 1. RELEVANCE AUDIT — Features to keep

Go through every feature and subsection in the spec. For each one, give a verdict:

- **CORE** — essential for an automated job application agent. Without this, the product does not work or is fundamentally incomplete.
- **HIGH VALUE** — not essential for launch but provides significant competitive advantage and clear user value.
- **NICE TO HAVE** — adds value but could be deferred to a later version without hurting the core product.
- **IRRELEVANT / CUT** — does not belong in a job application agent, adds bloat, distracts from the core mission, or is unrealistic to build. Explain why it should be removed.

Present this as a table with columns: Feature | Verdict | Reasoning (one sentence).

---

### 2. FEATURE BLOAT ANALYSIS

This spec has grown to 1,000+ lines and 74 subsections. Be direct:

- Is this spec trying to do too much? Where has scope creep gone too far?
- Which features are distractions disguised as features?
- Which features sound impressive but would be nearly impossible to implement reliably (technically infeasible, legally risky, or dependent on data that does not exist)?
- Which features would a real user never actually use even if they existed?
- If you had to cut this spec down to the 20 features that matter most, which 20 would you keep and why?

---

### 3. MISSING FEATURES

Despite the spec's size, are there any genuinely important features or capabilities that are missing? Think about:

- Core automation gaps (things the agent needs to do its primary job that are not covered)
- Edge cases in the application process that are not addressed
- User experience gaps (onboarding, error recovery, trust-building)
- Technical infrastructure requirements that are implied but not specified (error handling, retry logic, monitoring, logging, deployment)
- Legal and compliance requirements that are missing
- Anything a competitor would have that this spec does not mention

List each missing feature with a one-paragraph description of what it should do and why it matters.

---

### 4. ARCHITECTURE CONCERNS

Based on the spec, flag any architectural red flags:

- Features that conflict with each other or create contradictory user experiences
- Features that would be technically impossible to combine in a single system
- Scalability concerns
- Privacy/security risks that are underaddressed
- Dependencies on third-party services that are fragile or likely to break
- Anything that would make this system unmaintainable as it grows

---

### 5. PRIORITISED BUILD ORDER

If I were to build this system incrementally, what is the correct order? Give me:

- **Phase 1 (MVP)** — The minimum set of features to ship a working product that delivers value. What do I build first?
- **Phase 2 (Core expansion)** — Features that make the product competitive and sticky.
- **Phase 3 (Differentiation)** — Features that set this apart from competitors.
- **Phase 4 (Platform)** — Features that turn this into a platform or business (team mode, white-label, API, etc.)
- **Never build** — Features you recommend permanently removing from the roadmap.

---

### 6. COMPARATIVE ANALYSIS

How does this spec compare to existing products in the space (LazyApply, Sonara, JobCopilot, Simplify, Massive, LoopCV, Jobright, AIHawk)? Specifically:

- What does this spec have that none of them offer?
- What do they have that this spec is missing?
- Where is this spec overengineered compared to what the market actually needs?
- Where is it underengineered?

---

### 7. FINAL VERDICT

In 3-5 sentences, give your overall assessment of this specification. Is it a viable product? What is the single biggest risk? What is the single most valuable feature? What would you change first?

---

**IMPORTANT INSTRUCTIONS:**

- Be specific. Do not give vague feedback like "this is comprehensive." Point to exact features and sections.
- Be critical. I would rather hear "this feature is useless, cut it" than "this is a nice addition."
- Be practical. Judge features by whether they can actually be built and whether real users would actually use them, not by whether they sound impressive on paper.
- Assume I am a solo developer or a very small team (2-3 people). Factor in build complexity and maintenance burden.
- Do not summarise the spec back to me. I wrote it. Go straight to analysis.

---

[PASTE THE FULL specs.md FILE BELOW THIS LINE]
