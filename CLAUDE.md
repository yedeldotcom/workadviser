# CLAUDE.md — WorkAdviser

## Project Identity

**WorkAdviser** is a PTSD workplace accessibility guidance system for Israel, built as a pilot for the FPP (Full Product Prompt). It helps people with PTSD understand workplace barriers, generates personalized recommendations, and produces employer-facing reports — all through a WhatsApp-first conversational flow.

- **Owner:** Yedel (yedeldotcom)
- **Data partner:** נט״ל team (provides source knowledge and clinical data)
- **Repo:** github.com/yedeldotcom/workadviser
- **Base44 admin panel:** https://passionate-work-wise-path.base44.app
- **Deployed on:** Railway (auto-deploys on push to `main`)
- **Primary language:** Hebrew (user-facing), English (code + internal logic)

---

## Tech Stack

- **Runtime:** Node.js (ES Modules — `"type": "module"`)
- **Server:** Express 5
- **Database/Backend:** Base44 (REST API via `src/admin/base44Client.js`)
- **WhatsApp:** Meta Cloud API (with Twilio and stub fallbacks)
- **LLM:** Anthropic Claude API (`@anthropic-ai/sdk`) for interview conversation
- **Voice:** OpenAI Whisper for voice-note transcription
- **Deployment:** Railway (Nixpacks build, `npm start`)
- **Tests:** Node.js built-in test runner (`node --test`)

---

## Architecture Overview

### 5-Engine Reasoning Pipeline (`src/engines/`)
1. **Intake** (`intake/`) — 13-barrier Likert scoring, cluster aggregation, co-occurrence patterns
2. **Interpretation** (`interpretation/`) — trajectory model, risk flags, investment priorities
3. **Translation** (`translation/`) — barriers → workplace scenarios + accommodations
4. **Implementation** (`implementation/`) — 15 organizational procedure modules, readiness levels
5. **Framing** (`framing/`) — 4 audience types, Natal 7-pillar model, objection handling

### Key Layers
- **Conversation** (`src/conversation/`) — onboarding, 3-chapter interviewer, sessionManager, voiceHandler, llmClient
- **Admin** (`src/admin/`) — Base44-backed store, queues, caseView, actions, permissions, analytics, router
- **Core** (`src/core/`) — 15 data models, 5 state machines, recommendation pipeline + disclosure filter
- **Reports** (`src/reports/`) — user (8-section), employer (disclosure-filtered), anonymous org, lead
- **WhatsApp** (`src/whatsapp/`) — webhook, sender, userRouter, landingPage
- **Follow-up** (`src/followup/`) — changeEventDetector, scheduler
- **Export** (`src/export/`) — leadExporter with audit trail

### Base44 Entity Mapping
See `src/admin/base44Store.js` for the full entity mapping:
- User, UserProfile, InterviewSession, Message, NormalizedSignal
- Report, Lead, Approval, AuditLog, PipelineResult
- ChangeEvent, FollowUpCheckin, KnowledgeItem
- RecommendationTemplate, RecommendationFeedback, ContentConfig

---

## Commands

```bash
npm start              # Start server (src/server.js)
npm test               # Run all tests
npm run pipeline:demo  # Run pipeline demo
npm run extract        # Extract knowledge from Hebrew source docs
npm run intake         # Run intake engine standalone
npm run interpret      # Run interpretation engine standalone
npm run translate      # Run translation engine standalone
npm run implement      # Run implementation engine standalone
npm run frame          # Run framing engine standalone
```

---

## Code Conventions

- **ES Modules only** — use `import`/`export`, never `require`
- **Functional style** — prefer plain functions over classes where possible
- **English for all code** — variable names, function names, comments in English
- **Hebrew for user-facing strings** — all product copy, WhatsApp messages, report text in Hebrew
- **Gender-neutral Hebrew** — use plural/infinitive forms (אפשר לספר, כדאי לבדוק), system persona speaks in female form (אני מבינה), never use slash constructions (את/ה, עובד/ת)
- **No unnecessary abstractions** — keep it simple, avoid premature patterns
- **Every recommendation has ID + version** — FPP §9.6 non-negotiable
- **Every shareable output has explicit state transitions** — tracked via state machines in `src/core/state/`
- **Every admin edit is logged** — audit trail via `appendAuditLog()`
- **Disclosure filtering is separate from case analysis** — see `src/core/recommendation/disclosureFilter.js`

---

## Testing Policy

- **All tests must pass before committing.** Run `npm test` and fix any failures.
- Known issue: some tests fail when `BASE44_APP_ID` is not set. Guard imports or mock `base44Client.js` in test environments.
- Test files live in `tests/` mirroring the `src/` structure.
- Use Node.js built-in `node:test` and `node:assert`.

---

## Git Workflow

- **Commit and push directly** to the working branch.
- Write clear, descriptive commit messages.
- Railway auto-deploys on push to `main` — be careful with main branch pushes.
- Always run tests before committing.

---

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `BASE44_APP_ID` + `BASE44_API_KEY` — required for persistence
- `ANTHROPIC_API_KEY` — required for interview LLM
- `WHATSAPP_PROVIDER` — `stub` | `twilio` | `meta`
- `META_ACCESS_TOKEN` + `META_PHONE_NUMBER_ID` — required for production WhatsApp
- Never commit `.env` files.

---

## Key Documents

- `docs/MASTER_PLAN.md` — living build tracker with full current state, what's done, what's missing
- `docs/FPP_Pilot_PTSD_Workplace_Accessibility_Guidance_System.md` — the Full Product Prompt (canonical spec)
- `knowledge/extracted/README.md` — knowledge extraction results and gap analysis

**Always read `docs/MASTER_PLAN.md` first** when starting work — it has the most current project state.

---

## Base44 Admin Panel — Update Protocol

**When any change requires updating the Base44 admin panel** (new entities, UI pages, backend logic, or schema changes), you MUST provide a **full copy-paste prompt** that can be pasted directly into Base44's AI editor.

### What triggers a Base44 update:
- Adding a new data model / entity type
- Changing entity field schemas
- Adding new admin pages or dashboard views
- Adding new backend functions or API integrations
- Changing queue logic, case views, or analytics
- Adding new content editor capabilities
- Any change to `src/admin/base44Store.js` entity mapping

### Required prompt format:

When a Base44 update is needed, output **one single copy-pastable code block** containing the entire prompt. The user must be able to select the full block and paste it directly into Base44's AI editor without any editing, rearranging, or combining of separate sections. Do NOT split the prompt across multiple code blocks — everything goes in ONE block.

```
📋 PASTE THIS INTO BASE44 AI EDITOR:

[Full prompt here — everything the AI editor needs in a single block:]
1. Entity/table definitions (field names, types, defaults)
2. UI layout instructions (what pages, what components, what data to show)
3. Backend logic (any server-side functions, computed fields, validations)
4. Relationships between entities
5. Any permissions or visibility rules

WHY: [1-2 sentence explanation of why this update is needed]
AFFECTED CODE: [which src/ files connect to this Base44 change]
```

**Critical rule:** The entire prompt MUST be in ONE code block. Never split it into multiple blocks, sections, or steps that require manual assembly.

### Current Base44 entities (must stay in sync):
User, UserProfile, InterviewSession, Message, NormalizedSignal, Report, Lead, Approval, AuditLog, PipelineResult, ChangeEvent, FollowUpCheckin, KnowledgeItem, RecommendationTemplate, RecommendationFeedback, ContentConfig

### Base44 API pattern:
- All persistence goes through `src/admin/base44Client.js` (api_key header auth)
- Store layer: `src/admin/base44Store.js` (async, with safe fallbacks)
- Custom fields are stored inside a `data` envelope on User entities
- Filter queries use `filter` param (not `q`)
- Always handle Base44 response envelope normalization (array, {data:[]}, {items:[]}, {results:[]})

---

## PR Auto-Generation Protocol

**When a pull request is needed**, auto-generate it using `gh` CLI with full details:

```bash
gh pr create \
  --title "Brief descriptive title" \
  --body "$(cat <<'EOF'
## Summary
- What changed and why
- Which engines/layers are affected

## Base44 Impact
- [ ] No Base44 changes needed
- [ ] Base44 update prompt included in PR description or comments

## Test Results
- All tests passing: yes/no
- New tests added: yes/no

## Deployment Notes
- Auto-deploys to Railway on merge to main
- Any manual steps needed (e.g., Base44 entity creation, env vars)

## FPP Alignment
- Which FPP sections this change relates to (e.g., §4.2 Recommendation Object Model)
EOF
)"
```

Always include:
- Summary of changes
- Whether Base44 needs updating (and include the prompt if so)
- Test status
- Deployment notes
- FPP section references where relevant

---

## FPP Non-Negotiables (§9.6)

These must always be maintained in code:
1. Every recommendation has ID + version
2. Every important output is traceable
3. Every shareable output has explicit state transitions
4. Every admin edit is logged
5. Disclosure filtering is separate from case analysis
6. Employer-facing output is never a copy of the user report
7. Pilot human-review points are enforced in workflow logic

---

## Common Pitfalls

- **Base44 User entity**: custom fields go inside `data` envelope, not top-level
- **Base44 filter queries**: use `filter` param, not `q`; use `encodeURIComponent` for query values
- **Phone numbers**: E.164 format with `+` prefix; `encodeURIComponent` to prevent `+` → space
- **LLM conversation history**: always pass actual conversation history (last 20 messages from store), never empty array
- **Onboarding → interview transition**: first question after consent is sent directly from question bank, not via LLM
- **Hebrew text**: always gender-neutral, always use plural/infinitive forms
- **Test environment**: guard `base44Client.js` so it doesn't throw when `BASE44_APP_ID` is unset
