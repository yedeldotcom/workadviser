# WorkAdviser — Master Build Plan
**FPP Pilot: PTSD Workplace Accessibility Guidance System**
Last updated: 2026-03-10 | Branch: `claude/codebase-review-refactor-KNYnZ` | **Steps 0–11 + Infrastructure done + Enhanced Interview Logic + Codebase Review**

---

## Current State

The repo contains a working 5-engine **reasoning pipeline** deployed to Railway, connected to WhatsApp via Meta Cloud API, with a live Base44 admin panel.

| Engine | File | Status |
|--------|------|--------|
| Engine 1: Intake | `src/engines/intake/` | ✅ Done — 13-barrier Likert scoring, cluster aggregation, 5 co-occurrence patterns |
| Engine 2: Interpretation | `src/engines/interpretation/` | ✅ Done — trajectory model, 3 risk flags, investment priorities |
| Engine 3: Translation | `src/engines/translation/` | ✅ Done — 13 barriers → workplace scenarios + accommodations (interview quotes) |
| Engine 4: Implementation | `src/engines/implementation/` | ✅ Done — 15 organizational procedure modules, 3 readiness levels |
| Engine 5: Framing | `src/engines/framing/` | ✅ Done — 4 audience types, Natal 7-pillar model, objection handling |
| Pipeline | `src/pipeline/` | ✅ Done — `runPipeline()` + `runPipelineHebrew()`, JSON + Hebrew output |

**What is done beyond the 5-engine pipeline:**
- Knowledge extraction (Step 0.5): 7 Hebrew source docs → `knowledge/extracted/*.json`
- Core data model: 15 model files in `src/core/models/`
- State machines: 5 machines in `src/core/state/`
- Conversation engine: onboarding, interviewer, sessionManager, voiceHandler (Whisper), LLM client (FPP §8 prompt)
- Admin command center: store, queues, caseView, actions, permissions, Express router + server
- Recommendation workbench: 7-step selection pipeline + disclosure filter + TracingChain (FPP §9.6)
- Report renderers: user (8-section), employer (disclosure-filtered), anonymous org, lead detection
- Follow-up / change-event layer (Step 9): scheduler, changeEventDetector, staleness assessment
- Gap visibility + recommendation analytics (Step 10): weakZones, corrections, conflicts, knowledge promotion
- Landing Page + WhatsApp entry: webhook (Twilio/Meta/stub), sender, landingPage
- Lead export + CRM handoff: leadExporter with audit trail
- Base44 persistence layer: `src/admin/base44Client.js` + `src/admin/base44Store.js` — **live in production**
- Base44 Admin Panel (Step 11): **live** — Dashboard, Queues, Case Workspace, Leads, Analytics, Content Editor
- FPP §9.6 Non-Negotiables: all 7 PASS
- Railway deployment: live at production URL, serving `/whatsapp/webhook`

**Recent bug fixes (2026-03-09):**
- **Script jumping** (`src/whatsapp/userRouter.js`): After user consents ("כן"), the bot was calling the LLM with no conversation history, causing the LLM to regenerate onboarding content instead of asking the first interview question. Fix: intercept the `onboarding→active` transition in `routeMessage` and send the first scripted question (`Q-ENV-01`) directly from the question bank — no LLM call at that point.
- **Content Editor 404s** (`src/admin/router.js`): Base44 Content Editor was calling `GET /admin/content/onboarding` and `GET /admin/content/questions` but those endpoints didn't exist. Fix: added both endpoints returning `ONBOARDING_MESSAGES` and `QUESTION_BANK` respectively. Content is currently read-only (hardcoded in source); editing would require adding persistence.
- **Base44 filter/query fixes** (2026-03-08): `base44Store.js` — use `filter` param instead of `q` for Base44 filter queries; `upsert` split into separate `get` + `update`/`create` operations; filter response normalization; `encodeURIComponent` for query params.
- **Base44 data envelope fix** (2026-03-08): User custom fields (`phoneNumber`, `channel`, `consentState`, etc.) are stored inside a nested `data` object on the raw User record, not as top-level columns.

**Test status (as of 2026-03-08):**
- Core tests pass (engines 1–5, pipeline, reports rendering, conversation, recommendation)
- 26 subtests still fail — pre-existing architectural mismatch: tests written for old in-memory store but production code uses async Base44 store. Affected: `buildCaseWorkspace`, `approveReport`/`rejectReport`/`editRecommendation`/`addCaseNote`/`markFollowUp`/`markReportReadyForDelivery`, `promoteKnowledgeItem`, lead exporter, change-event detector, follow-up scheduler, `findOrCreateUser`/`findOrCreateSession`
- Fix: mock `base44Store.js` in test environments (see below)

**Enhanced Interview Logic (2026-03-10):**
- **Three-Chapter Interview Structure**: Interview is now divided into 3 chapters:
  - Chapter 1 (ch1_intro): Getting to know the user — employment status, job role, workplace type, team size
  - Chapter 2 (ch2_barriers): Barrier exploration — 13 barriers, adapted to user's specific workplace
  - Chapter 3 (ch3_recommendations): Recommendations with interactive review — user can request changes
- **Conversation History Fix**: `buildLLMHistory([])` bug fixed — LLM now receives actual conversation history (last 20 messages from store)
- **Message Persistence**: All inbound/outbound messages are now saved to Base44 via `saveMessage()`
- **Enhanced System Prompt**: Added three-chapter structure, gender-neutral Hebrew rule, interview conversation style guide, workplace-specific question instructions
- **Enriched Context Block**: LLM now receives: currentChapter, currentQuestion, progress, clusterTransition, chapterTransition, detectedSignalsSummary, userProfile data
- **Profile Extraction**: LLM returns `profileUpdates` JSON field with structured data (employmentStatus, workplaceType, jobRole, teamSize, timeInRole)
- **Content-Aware Question Selection**: `getNextQuestion()` supports chapter filtering and `mentionedTopics` for natural follow-ups
- **Warm Transitions**: First question after onboarding consent is now LLM-generated with warm bridge instruction
- **Gender-Neutral Hebrew**: All hardcoded Hebrew text updated to use plural/infinitive forms instead of slash constructions
- **Admin Panel**: New endpoints — `GET /admin/content/chapters`, `PUT /admin/content/chapters`, `GET /admin/sessions/chapter-progress`
- **Session Model**: New fields — `interviewChapter`, `recommendationSubState`, `userProfile`, `answeredQuestionIds`

**Codebase Review & Refactor (2026-03-10):**
- **Bug fix — sender.js**: Added missing `import { randomUUID } from 'node:crypto'`; removed use of undeclared `crypto` global. Fixes `ReferenceError` in stub/test mode (Node.js ≤ 20).
- **Bug fix — base44Client.js**: Moved env var validation (`BASE44_APP_ID`, `BASE44_API_KEY`) from module load time into `request()`. Module can now be imported in test environments without crashing.
- **Bug fix — sendMessages loop**: Replaced `texts.indexOf(text)` with indexed `for` loop to correctly handle duplicate message strings and avoid O(n) scan.
- **Test alignment — onboarding**: Updated 3 stale tests that expected 7 onboarding messages (old design) to match the current 1-message combined design (covers all FPP §2.5 elements).
- **JSDoc — base44Store.js**: Added `@param` and `@returns` annotations to `safeList` and `safeFilter`.
- **JSDoc — framing.js**: Added full `@param`/`@returns` to `generateFraming`; added JSDoc to private `buildNarrative`. Fixed undefined `FramingReport` return type to an inline shape definition.
- **No dead code found**: All exports are used; no unreachable branches or commented-out code found.

**What is still missing:**
- Content Editor write support: allow saving edits to onboarding messages and question bank (currently read-only)
- E2E integration tests with live WhatsApp (Meta Cloud API)
- Permanent Meta access token for production (use System User — see Infrastructure section)
- Base44 admin panel: create ContentConfig entity for `chapter_config` key (setup prompt below)

**Base44 Admin Panel Setup — Chapter Config:**
In the Base44 dashboard, create a new ContentConfig record with:
- configKey: `chapter_config`
- chapters: (see `/admin/content/chapters` endpoint for default structure)
This enables admin-editable chapter definitions and transition rules.

---

## Target Repository Structure

```
workadviser/
├── docs/
│   ├── FPP_Pilot_PTSD_Workplace_Accessibility_Guidance_System.md   ← moved from root
│   └── MASTER_PLAN.md                                               ← permanent progress tracker
├── knowledge/
│   ├── raw/                    ← Hebrew source documents (moved from root)
│   │   ├── barriers_questionnaire.docx
│   │   ├── barriers_background.docx
│   │   ├── barriers_visual.docx
│   │   ├── interview_challenges.xlsx
│   │   ├── org_procedures.docx
│   │   ├── employer_presentation.pptx
│   │   └── ptsd_at_work.pdf
│   └── extracted/              ← structured JSON outputs from raw file analysis
│       ├── barriers_classification.json
│       ├── barriers_interpretation.json
│       ├── interview_patterns.json
│       ├── org_procedures.json
│       ├── employer_framing.json
│       └── ptsd_at_work.json
├── scripts/
│   └── extract-knowledge.js    ← parses raw docs → knowledge/extracted/*.json
├── src/
│   ├── core/
│   │   ├── models/             ← FPP §9.1 core object schemas
│   │   │   ├── user.js
│   │   │   ├── userProfile.js
│   │   │   ├── interviewSession.js
│   │   │   ├── message.js
│   │   │   ├── normalizedSignal.js
│   │   │   ├── barrier.js
│   │   │   ├── trigger.js
│   │   │   ├── workplaceAmplifier.js
│   │   │   ├── changeEvent.js
│   │   │   ├── recommendation.js   ← family + template + rendered
│   │   │   ├── report.js           ← user + employer + anonymous + lead
│   │   │   ├── approvalObject.js
│   │   │   ├── auditLog.js
│   │   │   ├── ruleObject.js
│   │   │   └── knowledgeItem.js    ← 12 knowledge unit types
│   │   ├── state/              ← FPP §9.2 state machines
│   │   │   ├── interviewState.js
│   │   │   ├── releaseState.js
│   │   │   ├── recommendationLifecycle.js
│   │   │   ├── leadHandoffState.js
│   │   │   └── reviewApprovalState.js
│   │   └── knowledge/          ← live knowledge base (loaded from extracted/)
│   │       ├── index.js
│   │       ├── knowledgeBase.js
│   │       └── sourceGovernance.js
│   ├── engines/                ← renamed from engine1_intake etc.
│   │   ├── intake/             ← engine1_intake (import paths updated)
│   │   ├── interpretation/     ← engine2_interpretation
│   │   ├── translation/        ← engine3_translation
│   │   ├── implementation/     ← engine4_implementation
│   │   └── framing/            ← engine5_framing
│   └── pipeline/
│       ├── index.js            ← existing runPipeline() (import paths updated)
│       └── demo.js
├── tests/
│   ├── pipeline.test.js        ← existing (import paths updated)
│   └── core/                   ← new tests for data model + state machines
│       ├── models.test.js
│       └── stateMachines.test.js
├── README.md
└── package.json
```

---

## Build Order (from FPP §9.3)

Progress legend: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

### Step 0 — Repo Reorganization
**Status: ✅ Done** (commit `be07a56`)

- Created `docs/`, `knowledge/raw/`, `knowledge/extracted/`, `scripts/`, `src/core/`, `src/engines/`, `tests/core/`
- Moved FPP .md → `docs/`
- Moved 7 Hebrew source files → `knowledge/raw/` with ASCII names
- Moved `src/engine1_intake/` → `src/engines/intake/`
- Moved `src/engine2_interpretation/` → `src/engines/interpretation/`
- Moved `src/engine3_translation/` → `src/engines/translation/`
- Moved `src/engine4_implementation/` → `src/engines/implementation/`
- Moved `src/engine5_framing/` → `src/engines/framing/`
- Updated all import paths; fixed npm scripts; added extraction deps (xlsx, mammoth, pdf-parse, officeparser)
- All 15 tests pass after reorganization

---

### Step 0.5 — Raw Files Analysis (Pre-Data Model)
**Status: ✅ Done** (merged from separate session, commit `3330fc5`)

**Results:** 882 knowledge units extracted across 5 source roles. See `knowledge/extracted/README.md` for full breakdown.

| File | Role | Units | Quality |
|------|------|-------|---------|
| `knowledge/raw/barriers_questionnaire.docx` | Classification authority | 13 | ✅ All 13 barriers match existing `barriers.js` |
| `knowledge/raw/barriers_visual.docx` | Visual/UI reference | 0 | ⚠️ Image-only, no extractable text |
| `knowledge/raw/barriers_background.docx` | Interpretation authority | 3 | ⚠️ Short doc, partial clinical data |
| `knowledge/raw/interview_challenges.xlsx` | Applied pattern authority | 614 | ✅ Rich — 14 sheets, 112 quotes, 495 workplace manifestations, 7 triggers |
| `knowledge/raw/org_procedures.docx` | Implementation authority | 243 | ✅ 58 sections, 32 actions, 200 role refs |
| `knowledge/raw/employer_presentation.pptx` | Communication authority | 0 | ⚠️ Image-heavy, no extractable text |
| `knowledge/raw/ptsd_at_work.pdf` | Clinical/experiential authority | 9 | ⚠️ Image-heavy presentation |

**Key findings for Step 1:**
1. Barriers.js is **complete and correct** — 13-item taxonomy matches source exactly
2. **8 documented gaps** — see `knowledge/extracted/README.md` for full list
3. Interview xlsx is the richest source but covers 14 domains; **pilot scope = "משרדים ועבודה" sheet only**
4. **Trigger taxonomy** needs to be built from interview quotes and scenario friction types
5. **Workplace amplifier taxonomy** needs to be derived (no source doc defines it explicitly)
6. **Recommendation templates** need to be promoted from implicit accommodation actions to formal objects with IDs/versions
7. **framing.js hardcoded content** is accepted as canonical communication authority (PPTX/PDF unreadable)

---

### Step 1 — Core Data Model (FPP §9.1)
**Status: ✅ Done** (commit `a70239f`+)

Build explicit objects for all 18+ required types. Use JSDoc for type definitions (TypeScript migration optional later).

**Files to create in `src/core/models/`:**

#### `user.js`
```js
// Fields: id, createdAt, channel ('whatsapp' | 'web'), phoneNumber, consentState, partnerSource
```

#### `userProfile.js`
```js
// Fields: userId, identityBasics, employmentContext, disclosurePreferences,
//         interviewHistory[], followUpHistory[], changeEvents[], generatedOutputs[],
//         adminReviewHistory[], recommendationHistory[], supportSafetyState,
//         knowledgeContributionStatus
```

#### `interviewSession.js`
```js
// Fields: id, userId, state (InterviewStateMachine), phase, startedAt, lastActiveAt,
//         messages[], normalizedSignals[], detectedBarriers[], detectedTriggers[],
//         detectedAmplifiers[], consentSnapshot, dropoutType
```

#### `message.js`
```js
// Fields: id, sessionId, direction ('inbound'|'outbound'), inputType ('text'|'voice'|'image'),
//         rawContent, transcribedContent, timestamp, questionId
```

#### `normalizedSignal.js`
```js
// Fields: id, sourceMessageId, signalType, value, confidence, barrierIds[], triggerIds[],
//         amplifierIds[], questionId, detectedAt
```

#### `barrier.js` (extends existing barriers.js)
```js
// Fields: id, version, he, en, cluster, knowledgeSourceIds[], confidenceLevel,
//         lifecycleState
```

#### `trigger.js`
```js
// Fields: id, he, en, category, barrierIds[], knowledgeSourceIds[]
```

#### `workplaceAmplifier.js`
```js
// Fields: id, he, en, type ('sensory'|'relational'|'structural'|'temporal'),
//         worksplaceTypes[], barrierIds[]
```

#### `changeEvent.js`
```js
// Fields: id, userId, eventType (hired|new_role|promotion|new_boss|team_change|
//         schedule_change|hybrid_change|leave|return|fired|resigned|relocated|commute_change),
//         occurredAt, recordedAt, revalidationRequired, revalidationLevel
```

#### `recommendation.js`
```js
// RecommendationFamily: id, version, he, en, category
// RecommendationTemplate: id, version, familyId, barrierTags[], stageTags[],
//   workplaceTypeTags[], actorTags[], disclosureSuitability[], confidenceLevel,
//   lifecycleState, tracking{retrievalCount, inclusionCount, editCount, approvalCount,
//   usefulnessSignals, staleAt}, knowledgeSourceIds[]
// RenderedRecommendation: templateId, caseId, audience, disclosureLevel, renderedText{he,en},
//   timeHorizon ('immediate'|'near_term'|'longer_term'), actor, reviewStatus
```

#### `report.js`
```js
// ReportObject: id, version, caseId, reportType ('user'|'employer'|'anonymous_org'|'lead'),
//   state (ReleaseStateMachine), sections{}, disclosureLevel, generatedAt,
//   deliveryChannel, deliveredAt, adminReviewedAt, userApprovedAt
// LeadObject: id, orgName, contactPerson, contactChannel, sourceSignalType,
//   lectureOpportunityReason, orgType, recommendedLectureAngle, safeContextNotes,
//   consentStatus, exportState, exportTimestamp, exportTarget
```

#### `approvalObject.js`
```js
// Fields: id, reportId, type ('admin_approval'|'user_approval'), approvedBy,
//         approvedAt, notes, editSummary
```

#### `auditLog.js`
```js
// Fields: id, entityType, entityId, action, changedBy, changedAt, diff,
//         meaningChanged (bool), scope ('local'|'reusable'), reason
```

#### `ruleObject.js`
```js
// Fields: id, ruleType ('global'|'knowledge'|'logic'|'campaign'|'case_level'),
//         scope, definition, createdBy, updatedAt, changeLog[]
```

#### `knowledgeItem.js`
```js
// Fields: id, type (one of 12 from FPP §3.2), content{he,en}, sourceIds[],
//         confidenceLevel, lifecycleState, barrierTags[], stageTags[],
//         workplaceTypeTags[], promotionState ('case_only'|'candidate'|'validated'|'rule_candidate')
// KnowledgeSource: id, role ('classification'|'interpretation'|'applied_pattern'|
//   'implementation'|'communication'), filename, extractedAt, version
```

**Actions:**
- [ ] Create all 14 model files with JSDoc type definitions and factory functions
- [ ] Create `src/core/models/index.js` re-exporting everything
- [ ] Write `tests/core/models.test.js` — validate factory functions, required fields, defaults
- [ ] Verify tests pass: `npm test`

---

### Step 2 — State Machines (FPP §9.2)
**Status: ✅ Done**

**Files to create in `src/core/state/`:**

#### `interviewState.js`
States: `not_started → onboarding → active → paused → distress_hold → complete → dropped_silent → dropped_distress → dropped_trust`
Transitions: start, pause, resume, distressFlag, complete, drop
Saves: lastState, dropoutType, savedAt, resumePoint

#### `releaseState.js`
States: `draft_generated → admin_review_required → admin_approved → user_delivery_ready → delivered_to_user → user_viewed → user_approved_for_employer → employer_delivery_ready → sent_to_employer → employer_viewed → withheld → archived`
Transitions: submitForReview, approve, reject, deliver, recordView, requestEmployerShare, send, withhold, archive

#### `recommendationLifecycle.js`
States: `draft → active → monitored → experimental → deprecated → archived`
Transitions: activate, monitor, experiment, deprecate, archive

#### `leadHandoffState.js`
States: `detected → lead_created → ready_for_export → exported → failed → archived`
Transitions: createLead, prepareExport, export, fail, archive

#### `reviewApprovalState.js`
States: `pending → in_review → approved → rejected → escalated`
Transitions: assign, approve, reject, escalate

**Actions:**
- [ ] Create all 5 state machine files with explicit state/transition validation
- [ ] Create `src/core/state/index.js`
- [ ] Write `tests/core/stateMachines.test.js` — test valid + invalid transitions, state persistence
- [ ] Verify tests pass: `npm test`

---

### Step 3 — Interview / Session Handling + LLM Integration (FPP §2.3B, §2.5, §8)
**Status: ✅ Done**

> *Note: The original Step 3 (Landing Page + WhatsApp Entry) is deferred to Step 4 below — the conversation engine is the higher-value dependency. WhatsApp webhook layer wraps this module; it can be added later without changing conversation logic.*

- [x] Create `src/conversation/llmClient.js` — Anthropic SDK client + FPP §8 operating prompt
  - `buildSystemPrompt()` — verbatim FPP §8 prompt
  - `runInterviewTurn(messages, context)` → `{ nextMessage, detectedSignals[], confidenceLevel, shouldEscalate }`
  - `generateUserReport(signals, profile)` → Hebrew structured report
  - `generateEmployerReport(signals, profile, disclosureLevel)` → filtered employer report
- [x] Create `src/conversation/onboarding.js` — structured onboarding flow (FPP §7.3)
  - `ONBOARDING_MESSAGES[]` — full onboarding sequence in Hebrew
  - `getOnboardingScript()` — structured consent + context explanation steps
  - `shouldShowOnboarding(session)` — whether to show onboarding
- [x] Create `src/conversation/interviewer.js` — adaptive question flow
  - Question bank per barrier cluster (low → high intensity ordering)
  - `getNextQuestion(session, answeredBarriers)` — adaptive selection
  - Distress check-in logic after high-intensity questions
  - `isDistressSignal(message)` — heuristic distress detection
  - `getDistressResponse()` — containment protocol
- [x] Create `src/conversation/sessionManager.js`
  - `createSession(userId, phase)` — InterviewSession + state machine
  - `resumeSession(session)` — re-entry flow with context reminder
  - `recordInboundMessage(session, text, questionId)` — message + signal
  - `normalizeBarrierSignal(text, questionId, barrierIds)` → NormalizedSignal
  - `handleDistress(session)` → transitions to distress_hold state
  - `completeSession(session, responses)` → runs Engine 1–5 pipeline
- [x] Create `src/conversation/voiceHandler.js` — transcription stub
- [x] Tests in `tests/conversation/conversation.test.js`

---

### Step 4 — Landing Page + WhatsApp Entry (FPP §2.3A, §2.3B)
**Status: ⬜ Deferred** (was Step 3; moved after conversation engine)

**Landing Page:**
- [ ] Create `src/web/landing/` — static HTML/JS served page
  - Trust/privacy explanation
  - Partner visibility section
  - WhatsApp CTA button (wa.me link with pre-filled message)
  - Consent framing (human review disclosure, no legal/clinical advice)
  - Hebrew copy from FPP §7.1 and §7.2

**WhatsApp Entry Abstraction:**
- [ ] Create `src/whatsapp/webhook.js` — inbound message handler
- [ ] Create `src/whatsapp/sender.js` — outbound message sender
- [ ] Create `src/whatsapp/messageRouter.js` — routes inbound → session handler
- [ ] Abstract WhatsApp Business API client (Cloud API v20+)
- [ ] Add env config: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN`
- [ ] Write integration smoke test

**Dependencies to add:** express or fastify (webhook server), node-fetch or axios (API calls)

---

### Step 5 — Admin Queues + Main Case Page (FPP §6.1)
**Status: ✅ Done**

- [x] Create `src/admin/store.js` — in-memory Map registry (10 entity types), full CRUD + specialized queries, `resetStore()` for tests
- [x] Create `src/admin/permissions.js` — 5-role model, `can()`, `canAccessCase()`, Express middleware (`attachAdminIdentity`, `requireCapability`, `requireCaseAccess`)
- [x] Create `src/admin/queues.js` — 5 queue functions + `getQueueSummary()`
- [x] Create `src/admin/caseView.js` — `buildCaseWorkspace()`, `buildLogicMap()` (FPP §4.1 chain), `buildCaseSummary()`
- [x] Create `src/admin/actions.js` — `approveReport`, `rejectReport`, `editRecommendation`, `addCaseNote`, `markFollowUp`, `markReportReadyForDelivery` — all with mandatory AuditLog
- [x] Create `src/admin/router.js` — all queue + case endpoints with role/capability middleware
- [x] Create `src/admin/server.js` — `createAdminApp()` Express factory
- [x] Write + pass `tests/admin/admin.test.js` — 37 tests, 18 suites, all passing
- Admin web frontend (minimal UI) — deferred to later step

---

### Step 6 — Logic Map + Recommendation Workbench (FPP §4, §4.5)
**Status: ✅ Done**

- [x] Create `src/core/recommendation/disclosureFilter.js` — standalone disclosure gate
  - Spectrum: no_disclosure → functional_only → partial_contextual → full_voluntary
  - `filterForEmployer()` throws immediately at no_disclosure (FPP non-negotiable)
  - Per-level field rules: barriers, accommodations, amplifiers, contextNotes controlled precisely
  - Employer output is NOT a copy of user report — separate filter function
- [x] Create `src/core/recommendation/pipeline.js` — formal 7-step selection pipeline:
  1. `buildCaseProfile()` — extracts all case dimensions (barriers, severity, stage, disclosure, etc.)
  2. `retrieveCandidates()` — pulls templates from SCENARIO_DATABASE by barrier match
  3. `applyEligibilityGates()` — 7 hard gates: barrier_fit, stage_fit, workplace_type_fit, disclosure_fit, feasibility_fit, safety_fit, freshness_fit
  4. `scoreTemplate()` — 8 dimensions (0–100): barrier relevance, context fit, feasibility/cost, expected impact, disclosure compat, evidence strength, safety/trust fit, diversity contribution
  5. `deduplicateRecommendations()` — maxPerFamily + maxTotal limits
  6. `packageRecommendations()` — audience-specific user/employer/hr packages
  7. `assignReviewStatus()` — high+≥70→approved, low/<50→rejected, else→pending
- [x] `runRecommendationPipeline()` — end-to-end entry point with gateLog, summary stats
- [x] Time horizon inferred: zero/low cost → immediate; medium → near_term; high → longer_term
- [x] Write + pass `tests/core/recommendation.test.js` — 45 tests, 12 suites, all passing

Deferred to later (when KnowledgeBase is live):
- [ ] Add stable IDs + versioning to `workplace_scenarios.js` templates
- [ ] Add tracking fields (retrievalCount, inclusionCount, etc.) to templates
- [ ] Fallback paths (clarifying question → low-confidence option set)

---

### Step 7 — Report Objects + Release States (FPP §5)
**Status: ✅ Done**

4 report renderers in `src/reports/`:

**End-User Report — `userReport.js` (FPP §5.1A):**
- [x] 8-section Hebrew renderer: what_we_understood | main_barriers | amplifiers | user_recommendations | employer_actions | conversation_prep | resources | what_was_not_shared
- [x] Sections built from intake + interpretation + recommendation pipeline output
- [x] Conversation prep includes objection handling from Engine 5 framing
- [x] no_disclosure: employer_actions shows blocked message (not empty)
- [x] State: admin_review_required when needsHumanReview; else draft_generated
- [x] `createUserReportRevision()` — versioned reissue (FPP §5.5): never silently overwrites

**Employer Report — `employerReport.js` (FPP §5.1B):**
- [x] 8-section renderer: purpose | work_impact_summary | key_barriers | top_adjustments | what_communication_helps | what_to_avoid | implementation_priority | lecture_note
- [x] Always passes through `filterForEmployer()` — throws at no_disclosure
- [x] Always created in admin_review_required state (FPP §5.4 mandatory approval)
- [x] Employer output is NOT a copy of user report — separate section builders

**Anonymous Org Signal — `anonymousReport.js` (FPP §5.1C):**
- [x] 6-section renderer: why_org_receives_this | general_barrier_indication | common_patterns | org_level_actions | lecture_invitation | no_identifying_info
- [x] disclosureLevel always 'no_disclosure' — no PII ever included
- [x] Always admin_review_required; safe at all disclosure levels including no_disclosure
- [x] Mandatory no_identifying_info section in every output

**Lead Object — `leadReport.js` (FPP §5.1D):**
- [x] `shouldCreateLead()` — detects high-severity + org-relevant pattern criteria
- [x] `buildLeadObject()` — builds LeadObject with lecture angle, context notes, consent status
- [x] `detectAndBuildLead()` — combined entry point (detection + build)
- [x] Starts in 'detected' export state; must be manually escalated
- [x] LECTURE_ANGLE_MAP maps dominant cluster → recommended lecture angle

**Model update:**
- [x] `createReport()` extended with `previousVersionId` and `metadata` fields

**Tests:** 36 tests, 7 suites — all passing. 230 total, no regressions.

---

### Step 8 — Lead Export / API Handoff (FPP §6.5)
**Status: ✅ Done**

- [x] `src/export/leadExporter.js` — lead lifecycle actions + export with SAFE_EXPORT_FIELDS whitelist
  - `buildExportPayload()` — strips caseId, createdAt, consentStatus, exportState; only org-level fields
  - `confirmLead()` — detected → lead_created
  - `markLeadReadyForExport()` — lead_created → ready_for_export
  - `exportLead()` — consent gate + state gate + internal/crm_webhook targets + audit log
  - `archiveLead()` — any state → archived with reason
  - `sendToWebhook()` — HTTP POST stub for external CRM
- [x] Admin router endpoints: GET /leads/:leadId, POST /leads/:leadId/confirm, /ready-for-export, /export, /archive
- [x] Audit log written for every export event (action, target, consentBasis, payloadFields)
- [x] 45 tests in `tests/export/leadExporter.test.js` — payload safety, full lifecycle, edge cases
- [x] `npm test` glob updated to include subdirectories: 275 tests, all passing

---

### Step 9 — Follow-Up / Change-Event Layer (FPP §5.7)
**Status: ✅ Done**

- [x] `src/followup/changeEventDetector.js` — change event recording and staleness assessment
  - `recordChangeEvent()` — 13 event types, auto-derives revalidation level, saves to store + profile
  - `assessStaleness()` — 5-rule priority check: full_reassessment → partial → light_refresh → disclosure change → time-based (180 days)
  - `resolveChangeEvent()` — marks event resolved when revalidation is complete
  - Staleness thresholds: full_reassessment=0d, partial=30d, light=90d, time-based=180d
- [x] `src/followup/scheduler.js` — WhatsApp check-in scheduling
  - `scheduleInitialFollowUp()` — 14 days after first report delivery
  - `schedulePeriodicCheckin()` — cadence per employment stage (job_seeking=14d, active=30d, leave=60d, etc.)
  - `scheduleEventTriggeredCheckin()` — 3 days after a ChangeEvent is recorded
  - `scheduleRevalidation()` — immediate, asks user to refresh their assessment
  - `markCheckinSent()` / `markCheckinResponded()` / `expirePendingCheckins()` — check-in state lifecycle
  - `getDueCheckins()` — returns pending check-ins whose scheduledFor ≤ now
  - `runScheduler()` — smart entry point: assesses staleness, picks the right check-in type
  - 4 Hebrew WhatsApp message templates (initial, periodic, event-triggered, revalidation)
- [x] `src/followup/index.js` — public API
- [x] Admin router — 5 new endpoints: record-change-event, resolve, staleness, schedule-followup, due-checkins
- [x] Store extended with `_changeEvents` and `_followUpCheckins` maps + CRUD functions
- [x] 44 tests in `tests/followup/followup.test.js` — 319 tests total, all passing

---

### Step 10 — Gap Visibility + Recommendation Analytics (FPP §3.6, §4.9)
**Status: ✅ Done**

**Gap Visibility (FPP §3.6) — `src/admin/gapVisibility.js`:**
- [x] `weakZones()` — finds uncovered barrier × stage × workplaceType cells (knowledge/logic/rule gap types)
- [x] `highOutputLowEvidence()` — templates with many inclusions but low confidence or thin sources
- [x] `repeatedAdminCorrections()` — templates with high edit-rate (critical/high/medium severity)
- [x] `highConflictAreas()` — templates with high rejection rate from audit log
- [x] `suggestNewSourceTypes()` — maps gap type → empirical_research / practitioner_guide / expert_protocol / case_pattern
- [x] `coverageSummary()` — aggregate stats: totalCells, coveragePercent, worstBarriers, worstStages

**Recommendation Analytics (FPP §4.9) — `src/admin/recommendationAnalytics.js`:**
- [x] `createFeedback()` — delivery / usefulness / employer_action / admin_quality feedback objects
- [x] `retrievalFrequency()` / `inclusionFrequency()` — rate per case
- [x] `approvalRate()` — with editRate breakdown
- [x] `staleRate()` — staleCount + staleRate across template registry
- [x] `templateSummary()` — per-template roll-up of all four metrics
- [x] `incrementTracking()` / `markTemplateStale()` — tracking helpers called by pipeline
- [x] Knowledge promotion (FPP §3.7): `promoteKnowledgeItem()` — case_only → candidate_pattern → validated → rule_update_candidate, audit logged with source cases + scope
- [x] `deIdentifyForPromotion()` — redacts IDs, emails, phone numbers, Hebrew name patterns; warns on dates

**Admin router — 6 new endpoints:** analytics/gaps, analytics/gaps/corrections, analytics/recommendations, analytics/recommendations/summary, analytics/recommendations/:templateId/feedback, knowledge/:itemId/promote

**Store extended** with `_knowledgeItems`, `_recommendationTemplates`, `_feedback` maps
**Permissions** — `view_queue` and `promote_knowledge` added to system_owner + admin_operator
**54 tests in `tests/admin/analytics.test.js`** — 373 tests total, all passing

---

## Non-Negotiables (FPP §9.6)

Enforce at every step:

- [ ] Every recommendation has stable ID + version
- [ ] Every important output is traceable (output → pattern → interpretation → signal → input)
- [ ] Every shareable output has explicit ReleaseState transitions
- [ ] Every admin edit is logged in AuditLog
- [ ] Disclosure filtering is a separate module — never mixed with case analysis
- [ ] Employer-facing output is NOT a copy of user report
- [ ] Pilot human-review points are enforced in workflow logic (not bypassable)

---

## LLM Integration Notes (FPP §8)

The FPP §8 operating prompt defines the in-product model behavior. Integration plan:
- Use Claude claude-sonnet-4-6 (or claude-haiku-4-5-20251001 for high-volume turns) via Anthropic SDK
- System prompt = FPP §8 operating prompt (verbatim, for pilot)
- Conversation turns: WhatsApp message → LLM generates next question + detects signals
- Structured output: LLM returns JSON `{ nextMessage, detectedSignals[], confidenceLevel, shouldEscalate }`
- Rule-based engine (current Engines 1-5) remains as **post-interview** reasoning layer
- Both layers coexist: LLM drives conversation, rule engine produces tracing/reports

---

## Immediate Next Actions

1. **Fix test suite** — guard `base44Client.js` so `BASE44_APP_ID` doesn't throw in test env (10 suites blocked)
2. **Set permanent Meta token** — follow System User steps in Infrastructure section above → update Railway `META_ACCESS_TOKEN`
3. **Content Editor write support** — add `PUT /admin/content/onboarding` and `PUT /admin/content/questions` endpoints backed by Base44 storage, so the admin panel can actually edit onboarding messages and question prompts without a code deploy
4. **WhatsApp conversation history** — `_handleActiveInterview` currently passes an empty history array to the LLM (`buildLLMHistory([])`). Real conversation history must be loaded from the message store to give the LLM proper context for follow-up turns.

---

## Progress Checklist (Summary)

- [x] Step 0: Repo reorganization ✅
- [x] Step 0.5: Raw files analysis + knowledge extraction ✅
- [x] Step 1: Core data model (18 objects) ✅
- [x] Step 2: State machines (5 machines) ✅
- [x] Step 3: Interview / session handling + LLM integration ✅ (formerly Step 4)
- [x] Step 4: Landing page + WhatsApp entry ✅
- [x] Step 5: Admin queues + main case page ✅
- [x] Step 6: Logic map + recommendation workbench (disclosure filter) ✅
- [x] Step 7: Report objects + release states (4 output types) ✅
- [x] Step 8: Lead export / API handoff ✅
- [x] Step 9: Follow-up / change-event layer ✅
- [x] Step 10: Gap visibility + recommendation analytics ✅
- [x] Step 11: Base44 Admin Panel (frontend) ✅ — live, includes Content Editor
- [ ] Infrastructure: fix test suite BASE44_APP_ID guard ⬜
- [ ] Content Editor write support ⬜
- [ ] WhatsApp LLM conversation history (currently passes empty array) ⬜

---

## Step 11 — Base44 Admin Panel (FPP §6)
**Status: ✅ Done**

Full admin panel is live as a Base44 app. Backend REST API at `/admin/*` serves all data. Includes Dashboard, Queues (4 tabs), Case Workspace, Leads, Analytics (2 sub-pages), and Content Editor (Onboarding Messages + Question Bank — currently read-only).

**Known gap:** Content Editor displays content but cannot save edits (no PUT endpoints yet — see Immediate Next Actions).

The prompt used to generate the Base44 app:

### Base44 Prompt

Paste the following into Base44 to generate the admin panel app:

```
Build a full admin panel for WorkAdviser — a post-trauma employment barrier
detection system. The backend REST API is at /admin (on Railway).
Use Bearer token auth (login via POST /admin/login with email+password).

--- PAGES ---

1. DASHBOARD (home)
   - 5 KPI cards: New Users | Active Cases | Review Required | Leads Ready | Knowledge Review
     (fetch GET /admin/queues/summary)
   - Bar chart: Session states breakdown (onboarding / active / paused / distress_hold)
   - Line chart: Reports generated over time (by generatedAt date)
   - Alert banner for any distress_hold cases (highlight in red)

2. QUEUES (tabbed view, 4 tabs)
   Tab 1 — New Users (GET /admin/queues/new-users)
     Table: userId | channel | partnerSource | createdAt | action button "View"

   Tab 2 — Active Cases (GET /admin/queues/active-cases)
     Table: sessionId | userId | channel | state | phase | lastActiveAt | barriersCaptured
     Red badge for distress_hold rows. Action: "Open Case"

   Tab 3 — Review Required (GET /admin/queues/review-required)
     Table: reportId | caseId | reportType | disclosureLevel | state | generatedAt | channel
     Sorted oldest-first. Actions: "Approve" | "Reject"

   Tab 4 — Leads Ready (GET /admin/queues/leads-ready)
     Table: leadId | orgName | orgType | consentStatus | createdAt
     Actions: "Confirm" | "Ready for Export" | "Export" | "Archive"

3. CASE WORKSPACE (GET /admin/cases/:caseId)
   - Case header: userId, channel, session state, phase
   - Detected barriers list
   - Reports section with per-report actions:
     * Approve (POST /admin/cases/:caseId/approve-report)
     * Reject (POST /admin/cases/:caseId/reject-report)
     * Edit recommendation inline (POST /admin/cases/:caseId/edit-recommendation)
       with fields: newText_he, meaningChanged toggle, reason, scope (local/reusable)
     * Mark delivery ready (POST /admin/cases/:caseId/mark-delivery-ready)
   - Notes panel: add note (POST /admin/cases/:caseId/add-note)
   - Follow-up panel:
     * Mark follow-up (POST /admin/cases/:caseId/mark-followup) with reason + dueAt
     * Schedule follow-up (POST /admin/cases/:caseId/schedule-followup)
       type: initial | periodic | event
     * View due check-ins (GET /admin/cases/:caseId/due-checkins)
   - Change events: record (POST /admin/cases/:caseId/change-event)
     and resolve (POST /admin/cases/:caseId/change-event/:eventId/resolve)
   - Staleness indicator (GET /admin/cases/:caseId/staleness) shown as a status badge

4. LEADS (lead detail page, GET /admin/leads/:leadId)
   - Lead info: orgName, orgType, lectureOpportunityReason, recommendedLectureAngle, consentStatus
   - Action buttons with confirmation dialogs: Confirm | Ready for Export | Export | Archive

5. ANALYTICS (2 sub-pages)
   Sub-page A — Recommendation Analytics (GET /admin/analytics/recommendations/summary)
     - Table of templates: templateId | retrievalFreq | inclusionFreq | approvalRate | staleRate
     - Bar chart: Top 10 templates by inclusion frequency
     - Per-template feedback form: feedbackType + polarity + notes
       (POST /admin/analytics/recommendations/:templateId/feedback)

   Sub-page B — Gap Visibility
     - GET /admin/analytics/gaps → show coverage summary + weak zones list
       Donut chart: covered vs weak zones
     - GET /admin/analytics/gaps/corrections → show
       "High output, low evidence" list
       "Repeated admin corrections" list
       "High conflict areas" list
     - Knowledge promotion: POST /admin/knowledge/:itemId/promote
       with scope + sourceCaseIds + notes

--- ROLES & PERMISSIONS ---
Roles: system_owner | case_manager | reviewer | lead_manager
Show/hide actions based on role returned at login.
system_owner sees everything. reviewer can only approve/reject/edit reports.
lead_manager only sees Leads tab.

--- DESIGN ---
- RTL-compatible layout (content is in Hebrew — newText_he fields)
- Clean dark sidebar nav
- Status badges with color coding:
  distress_hold = red, active = green, paused = yellow,
  draft_generated = orange, admin_approved = blue, delivery_ready = purple
- Confirmation modal for all destructive actions (reject, archive, export)
- Toast notifications on success/error
```

---

## Infrastructure & Deployment
**Added post-Step 10**

### Railway Deployment
- `railway.json` added — start command: `node src/server.js`
- Server runs on `PORT` env var (Railway injects this)
- Endpoint: `https://<app>.up.railway.app`
- WhatsApp webhook registered at: `https://<app>.up.railway.app/whatsapp/webhook`

**Required Railway env vars:**
| Var | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | Anthropic key for Claude (conversation engine) |
| `OPENAI_API_KEY` | OpenAI key for Whisper voice transcription |
| `META_ACCESS_TOKEN` | WhatsApp Cloud API permanent token (see below) |
| `META_PHONE_NUMBER_ID` | Phone number ID from Meta API Setup page |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA ID from Meta API Setup page |
| `WEBHOOK_VERIFY_TOKEN` | Secret string for Meta webhook verification |
| `WHATSAPP_PROVIDER` | `meta` |
| `BASE44_APP_ID` | Base44 app ID (required when persistence is enabled) |
| `BASE44_SERVICE_TOKEN` | Base44 service token (required when persistence is enabled) |

### WhatsApp Meta Cloud API — Permanent Token Setup

The Meta "API Setup" page only provides **temporary tokens**. For production use a permanent System User token:

1. Go to **business.facebook.com** → Settings → **Users → System Users**
2. Create a system user (Admin role)
3. Click **"Add assets"** → assign your WhatsApp app with full control
4. Click **"Generate new token"** → select your app → check `whatsapp_business_messaging` → set expiry to **Never**
5. Copy token → set as `META_ACCESS_TOKEN` in Railway

### Base44 Persistence Layer

**Files:**
- `src/admin/base44Client.js` — singleton SDK client, requires `BASE44_APP_ID` + `BASE44_SERVICE_TOKEN`
- `src/admin/base44Store.js` — async persistence layer implementing same interface as `store.js`

**Entity mapping (must be created in Base44 dashboard):**

| Base44 Entity | Maps to |
|--------------|---------|
| `User` | `_users` |
| `UserProfile` | `_profiles` |
| `InterviewSession` | `_sessions` |
| `Message` | `_messages` |
| `NormalizedSignal` | `_signals` |
| `Report` | `_reports` |
| `Lead` | `_leads` |
| `Approval` | `_approvals` |
| `AuditLog` | `_auditLog` |
| `PipelineResult` | `_pipelineResults` |
| `ChangeEvent` | `_changeEvents` |
| `FollowUpCheckin` | `_followUpCheckins` |
| `KnowledgeItem` | `_knowledgeItems` |
| `RecommendationTemplate` | `_recommendationTemplates` |
| `RecommendationFeedback` | `_feedback` |

**Note:** The webhook handler (`src/whatsapp/webhook.js`) currently uses the in-memory `store.js` to unblock the pilot while Base44 entities are being configured. Swap the import to `base44Store.js` once entities are created in the dashboard.

**Known issue:** `base44Client.js` throws at import time if `BASE44_APP_ID` is not set, which breaks test suites that import it transitively. Fix: add env guard at top of file:
```js
if (!process.env.BASE44_APP_ID && process.env.NODE_ENV !== 'test') {
  throw new Error('...');
}
```

---

## Opus Session Prompt (for Step 0.5)

> Paste this verbatim into a new Claude Opus 4.6 session:

---

```
You are continuing work on the WorkAdviser project — a PTSD workplace accessibility guidance system built for Israel.

## Context

Repository: /home/user/workadviser
Branch: claude/review-fpp-pilot-FGQv2
Plan file: docs/MASTER_PLAN.md (full build plan — read this first)

The repo has already been reorganized (Step 0 is done). Your task is **Step 0.5: Raw Files Analysis**.

## Your Task

Extract structured knowledge from 7 Hebrew source documents in `knowledge/raw/` and output structured JSON files to `knowledge/extracted/`.

These extracted files are the ground truth for the formal data model (Step 1), so they must be accurate, structured, and complete.

## Source Files and Their Roles

| File | Role (from FPP §3.1) |
|------|----------------------|
| `knowledge/raw/barriers_questionnaire.docx` | Classification authority — defines the barriers |
| `knowledge/raw/barriers_background.docx` | Interpretation authority — explains what barriers mean clinically |
| `knowledge/raw/barriers_visual.docx` | Visual/UI reference |
| `knowledge/raw/interview_challenges.xlsx` | Applied pattern authority — real interview data |
| `knowledge/raw/org_procedures.docx` | Employer implementation authority |
| `knowledge/raw/employer_presentation.pptx` | Communication authority (Natal 7-pillar, key messages) |
| `knowledge/raw/ptsd_at_work.pdf` | Clinical/experiential authority |

## Steps

1. Read `docs/FPP_Pilot_PTSD_Workplace_Accessibility_Guidance_System.md` — understand the full system
2. Read `docs/MASTER_PLAN.md` — understand the build plan and what Step 0.5 must produce
3. Read existing code in `src/engines/` — especially `barriers.js`, `workplace_scenarios.js`, `procedures.js` — to understand what is already modeled
4. Add dependencies to package.json: `xlsx`, `mammoth`, `pdf-parse`, `officeparser` (for PPTX)
5. Create `scripts/extract-knowledge.js` — a Node.js script that reads each raw file and writes structured JSON to `knowledge/extracted/`
6. Run the script and verify outputs are non-empty and structurally valid
7. Write `knowledge/extracted/README.md` documenting:
   - What was extracted from each file
   - Gaps found (missing data, unclear sections, files that couldn't be parsed)
   - New barriers, patterns, scenarios, or procedure modules discovered vs. what is already in code
   - Recommendations for what to add/change in Step 1 (data model) based on findings
8. Commit and push everything to branch `claude/review-fpp-pilot-FGQv2`

## Output Requirements

Each JSON file must use this envelope:
```json
{
  "source": "filename.docx",
  "role": "classification_authority",
  "extractedAt": "ISO timestamp",
  "version": "1.0",
  "data": { ... }
}
```

### `barriers_classification.json`
- Full barrier list (confirm/extend the 13 items already in code)
- Sub-items per barrier if any
- Severity scale definition
- Any scoring instructions

### `barriers_interpretation.json`
- Clinical correlation data (anxiety, depression, PTSD, functional difficulties, recovery, self-efficacy)
- Trajectory data per cluster over time
- Interpretation rules and notes
- Longitudinal findings from the background document

### `interview_patterns.json`
- All accessibility challenges from interviews, organized by category
- Frequency / prevalence indicators if present
- Employer context for each challenge
- Direct quotes from interviewees
- Any patterns or clusters that emerge from the data

### `org_procedures.json`
- All procedure modules from the handbook
- Role assignments per module
- Readiness level per module
- Action steps per module
- Confirm/extend the 15 modules already in code

### `employer_framing.json`
- Natal 7-pillar model (confirm/extend what is in framing.js)
- 3 core workplace challenges (sensory overload, uncertainty, insensitive management)
- Core messages and their intended audience
- Statistics cited (if any)
- Objection/response pairs if present

### `ptsd_at_work.json`
- Key symptoms and their workplace manifestations
- Key statistics cited
- Important framing concepts
- Anything not already captured in the other files

### `barriers_visual.json`
- How barriers are visually categorized/grouped
- Any weighting or prioritization implied by visual design
- Additional context not in the text questionnaire

## Important Rules

- Source files are in Hebrew — extract content faithfully, provide both Hebrew original and English translation for all key terms
- Do NOT invent or hallucinate content — if a section is unclear, note it as a gap
- Do NOT modify any existing src/ files in this session — only knowledge/ and scripts/
- Commit with clear message: "feat(knowledge): add raw files extraction and structured JSON outputs"
- Push to branch: claude/review-fpp-pilot-FGQv2
```
