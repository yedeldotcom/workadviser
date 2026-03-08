# WorkAdviser — Master Build Plan
**FPP Pilot: PTSD Workplace Accessibility Guidance System**
Last updated: 2026-03-08 | Branch: `claude/review-fpp-pilot-FGQv2`

---

## Current State

The repo contains a working 5-engine **reasoning pipeline** (pure JS, in-memory, no persistence):

| Engine | File | Status |
|--------|------|--------|
| Engine 1: Intake | `src/engine1_intake/` | ✅ Done — 13-barrier Likert scoring, cluster aggregation, 5 co-occurrence patterns |
| Engine 2: Interpretation | `src/engine2_interpretation/` | ✅ Done — trajectory model, 3 risk flags, investment priorities |
| Engine 3: Translation | `src/engine3_translation/` | ✅ Done — 13 barriers → workplace scenarios + accommodations (interview quotes) |
| Engine 4: Implementation | `src/engine4_implementation/` | ✅ Done — 15 organizational procedure modules, 3 readiness levels |
| Engine 5: Framing | `src/engine5_framing/` | ✅ Done — 4 audience types, Natal 7-pillar model, objection handling |
| Pipeline | `src/pipeline/` | ✅ Done — `runPipeline()` + `runPipelineHebrew()`, JSON + Hebrew output |
| Tests | `tests/pipeline.test.js` | ✅ Done — 15 tests covering all engines + integration |

**What is missing (FPP scope not yet built):**
- Persistent data model (User, UserProfile, InterviewSession, etc.)
- State machines (interview, output release, recommendation lifecycle)
- WhatsApp conversation engine
- Structured report objects with disclosure filtering
- Admin command center
- Lead/lecture opportunity detection
- Raw source file extraction → formal knowledge base

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
**Status: ⬜ Not Started**

Actions:
- [ ] Create `docs/`, `knowledge/raw/`, `knowledge/extracted/`, `scripts/`, `src/core/`, `src/engines/`, `tests/core/`
- [ ] Move FPP .md → `docs/`
- [ ] Move 7 Hebrew source files → `knowledge/raw/` (rename to safe ASCII names)
- [ ] Move `src/engine1_intake/` → `src/engines/intake/`
- [ ] Move `src/engine2_interpretation/` → `src/engines/interpretation/`
- [ ] Move `src/engine3_translation/` → `src/engines/translation/`
- [ ] Move `src/engine4_implementation/` → `src/engines/implementation/`
- [ ] Move `src/engine5_framing/` → `src/engines/framing/`
- [ ] Update all import paths in `src/pipeline/index.js`, `src/pipeline/demo.js`, `tests/pipeline.test.js`
- [ ] Copy this plan to `docs/MASTER_PLAN.md` (permanent location)
- [ ] Verify tests still pass after reorganization: `npm test`

**Files touched:** All src/ engine files (import-only changes), pipeline/index.js, pipeline/demo.js, tests/pipeline.test.js, package.json scripts

---

### Step 0.5 — Raw Files Analysis (Pre-Data Model)
**Status: ⬜ Not Started — SEPARATE SESSION (Claude Opus 4.6)**
**Rationale:** The 7 source files are large Hebrew documents (PDF, XLSX, PPTX, DOCX). Claude Opus 4.6 handles complex Hebrew document comprehension and structured extraction more reliably than Sonnet for this task. Run this step in a dedicated session, commit + push outputs, then continue Step 1 here.

**Purpose:** Before building formal data model objects, extract structured knowledge from the 7 Hebrew source documents. This step produces the ground truth that populates KnowledgeItem objects in the formal data model.

**Source files and their FPP roles (§3.1):**

| File (after rename) | Original Name | FPP Role |
|---------------------|---------------|----------|
| `knowledge/raw/barriers_questionnaire.docx` | שאלון חסמים בתעסוקה.docx | Classification authority |
| `knowledge/raw/barriers_background.docx` | רקע לשאלון חסמים מתוך האוגדן.docx | Interpretation authority |
| `knowledge/raw/barriers_visual.docx` | שאלון החסמים ויזואלי.docx | Visual/UI reference |
| `knowledge/raw/interview_challenges.xlsx` | אתגרי נגישות כפי שעלו מראיונות.xlsx | Applied pattern authority |
| `knowledge/raw/org_procedures.docx` | ספר נהלים ארגוני לדוגמה.docx | Employer implementation authority |
| `knowledge/raw/employer_presentation.pptx` | הרצאה למעסיקים כנס נכי צהל גרסתסופית.pptx | Communication authority |
| `knowledge/raw/ptsd_at_work.pdf` | איך פוסט טראומטים מרגישים בעבודה_.pdf | Clinical/experiential authority |

**Actions for the Opus session:**
- [ ] Repo reorganization (Step 0) must be done FIRST so `knowledge/raw/` exists
- [ ] Add extraction dependencies to package.json: `xlsx`, `mammoth`, `pdf-parse`
- [ ] Create `scripts/extract-knowledge.js`:
  - Parse `interview_challenges.xlsx` → `knowledge/extracted/interview_patterns.json`
    - Extract: challenge categories, frequency counts, employer context, quotes
  - Parse `barriers_questionnaire.docx` via mammoth → `knowledge/extracted/barriers_classification.json`
    - Extract: full barrier list, sub-items, scoring instructions
  - Parse `barriers_background.docx` via mammoth → `knowledge/extracted/barriers_interpretation.json`
    - Extract: clinical correlations, trajectory notes, interpretation rules
  - Parse `org_procedures.docx` via mammoth → `knowledge/extracted/org_procedures.json`
    - Extract: procedure modules, role assignments, readiness levels
  - Parse `ptsd_at_work.pdf` via pdf-parse → `knowledge/extracted/ptsd_at_work.json`
    - Extract: symptom descriptions, workplace manifestations, key statistics
  - PPTX → use `officeparser` or `pptx2json` → `knowledge/extracted/employer_framing.json`
    - Extract: Natal 7 pillars, 3 workplace challenges, core messaging
- [ ] Add npm script: `"extract": "node scripts/extract-knowledge.js"`
- [ ] Run extraction, validate outputs are non-empty JSON
- [ ] Write `knowledge/extracted/README.md` — document each file: source role, what was extracted, gaps found, what new barriers/patterns/scenarios/templates were discovered vs. already in code
- [ ] Commit + push to `claude/review-fpp-pilot-FGQv2`

**Why this comes before Step 1:** The extracted content directly determines:
- Which KnowledgeItem types need to be formally represented
- Validation that our 13-item barrier list is complete (or needs additions)
- New patterns and scenarios not yet in workplace_scenarios.js
- Procedure modules not yet in procedures.js

**Output:** `knowledge/extracted/*.json` + `knowledge/extracted/README.md` — structured knowledge ready to be loaded by `src/core/knowledge/knowledgeBase.js`

**Session prompt for Opus 4.6 session:** See bottom of this document → "Opus Session Prompt"

---

### Step 1 — Core Data Model (FPP §9.1)
**Status: ⬜ Not Started**

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
**Status: ⬜ Not Started**

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

### Step 3 — Landing Page + WhatsApp Entry (FPP §2.3A, §2.3B)
**Status: ⬜ Not Started**

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

### Step 4 — Interview / Session Handling (FPP §2.3B, §2.5)
**Status: ⬜ Not Started**

- [ ] Create `src/conversation/onboarding.js` — structured onboarding flow (FPP §7.3)
  - Explain what this stage is
  - Why questions are asked
  - What the user gets
  - What is optional
  - What may be shared
  - Whether human review may occur
  - Pause/skip/stop instructions
- [ ] Create `src/conversation/interviewer.js` — adaptive question flow
  - Start with low-intensity questions
  - Adaptive branching based on responses
  - Pause/skip/resume handling (save state to UserProfile)
  - Distress check-in logic (after high-intensity questions)
  - Distress interruption protocol (stop escalation, shift to containment)
- [ ] Create `src/conversation/sessionManager.js`
  - Create/resume InterviewSession
  - Write messages to InterviewSession.messages[]
  - Normalize signals from responses (text → NormalizedSignal)
  - Handle dropout types (intentional | silent | distress | trust)
  - Re-entry flow: show where process stopped, what was saved, what's next
- [ ] Create `src/conversation/voiceHandler.js` — voice note transcription stub (Whisper API or similar)
- [ ] LLM integration: connect operating prompt from FPP §8 as system prompt for interview turn generation

---

### Step 5 — Admin Queues + Main Case Page (FPP §6.1)
**Status: ⬜ Not Started**

- [ ] Create `src/admin/` — backend API for admin web app
- [ ] Admin queue endpoints:
  - `GET /admin/queues/new-users`
  - `GET /admin/queues/active-cases`
  - `GET /admin/queues/review-required`
  - `GET /admin/queues/leads-ready`
- [ ] Main case page endpoint: `GET /admin/cases/:caseId` — returns full case workspace:
  - User info
  - InterviewSession history + messages
  - NormalizedSignals
  - Logic map (Engine 1-5 outputs)
  - RecommendationWorkbench (see Step 6)
  - ReportObjects with states
  - ApprovalObjects
  - AuditLog
- [ ] Inline case actions:
  - `POST /admin/cases/:caseId/approve-report`
  - `POST /admin/cases/:caseId/reject-report`
  - `POST /admin/cases/:caseId/edit-recommendation`
  - `POST /admin/cases/:caseId/add-note`
  - `POST /admin/cases/:caseId/mark-followup`
- [ ] Role/permission middleware (5 roles from FPP §6.4)
- [ ] Admin web frontend (minimal — React or plain HTML+JS)

---

### Step 6 — Logic Map + Recommendation Workbench (FPP §4, §4.5)
**Status: ⬜ Not Started**

**Upgrade reasoning pipeline to formal recommendation architecture (FPP §4.4):**

- [ ] Create `src/core/recommendation/pipeline.js` — formal 7-step selection pipeline:
  1. Case profiling (employment stage, barrier set, trigger set, amplifiers, disclosure level, workplace type, change events)
  2. Candidate retrieval from KnowledgeBase
  3. Eligibility gating (7 gates: barrier fit, context fit, actor fit, disclosure fit, feasibility fit, safety fit, freshness fit)
  4. Multi-dimensional scoring (8 dimensions: barrier relevance, context fit, feasibility, expected impact, disclosure compatibility, evidence strength, safety/trust fit, diversity contribution)
  5. Deduplication + diversity (no near-duplicate families in top set)
  6. Packaging (audience-specific RecommendationPackages)
  7. Review (confidence thresholds → assign ReviewStatus)

- [ ] Create `src/core/recommendation/disclosureFilter.js` — critical: filters employer output by disclosure level
  - Disclosure spectrum: none → functional → partial_contextual → full_voluntary
  - Employer output must never derive directly from full user analysis

- [ ] Add recommendation IDs + versioning to all existing templates in `src/engines/translation/workplace_scenarios.js`
- [ ] Add recommendation tracking fields to all templates (retrievalCount, inclusionCount, etc.)
- [ ] Create visible logic map for admin workbench:
  - Input → Detection → Interpretation → Applied Pattern → Output (FPP §4.1)
  - Each step must be inspectable and editable inline
- [ ] Confidence levels on all outputs (high | medium | low | escalate)
- [ ] Fallback paths: clarifying question → low-confidence option set → human review route
- [ ] Time horizon tagging on all RenderedRecommendations (immediate | near_term | longer_term)

---

### Step 7 — Report Objects + Release States (FPP §5)
**Status: ⬜ Not Started**

Build all 4 output types as structured report objects with proper state machines:

**End-User Report (FPP §5.1A):**
- [ ] 8-section structure: what we understood | main barriers | what amplifies them | top 3 user recommendations | top 3 employer actions | suggested conversation prep | resources | what was NOT shared
- [ ] Hebrew copy tone from FPP §7.4
- [ ] Delivered via WhatsApp summary + secure web link

**Employer-Facing Report (FPP §5.1B):**
- [ ] 8-section structure: purpose | functional work-impact summary | key accessibility barriers | top 3 adjustments | what communication helps | what to avoid | implementation priority | optional lecture note
- [ ] Hebrew copy tone from FPP §7.5
- [ ] **Must pass through disclosure filter** — never copy user report
- [ ] Requires human approval before sending (FPP §5.4)

**Anonymous Organizational Signal (FPP §5.1C):**
- [ ] 6-section structure: why org receives this | general trauma barrier indication | common patterns | org-level actions | optional lecture invitation | explicit no-identifying-info statement
- [ ] Hebrew copy tone from FPP §7.6
- [ ] Requires human approval (FPP §5.4)

**Lead Object (FPP §5.1D):**
- [ ] All fields from FPP §5.1D
- [ ] Lecture opportunity detection logic (case indicates org-level need)
- [ ] LeadHandoffState machine

**All Reports:**
- [ ] ReleaseState machine applied to every report object
- [ ] Revision model (FPP §5.5): clarification request | correction request | sharing-boundary change | new-information update | versioned reissue
- [ ] Reports never silently overwritten — always versioned reissue

---

### Step 8 — Lead Export / API Handoff (FPP §6.5)
**Status: ⬜ Not Started**

- [ ] Create `src/export/leadExporter.js`
  - Export only minimum necessary data (FPP §6.5 safe fields list)
  - Log every export: what sent, to which system, when, by which trigger, under which consent basis
- [ ] Create `POST /admin/leads/:leadId/export` endpoint
- [ ] Webhook/API stub for external CRM handoff
- [ ] Audit trail for all exports

---

### Step 9 — Follow-Up / Change-Event Layer (FPP §5.7)
**Status: ⬜ Not Started**

- [ ] Create `src/followup/scheduler.js` — cadence-based check-in scheduling
- [ ] Create `src/followup/changeEventDetector.js` — event-based triggers
  - 15 event types: hired, new_role, promotion, new_boss, team_change, schedule_change, hybrid_change, leave, return, fired, resigned, relocated, commute_change
- [ ] Revalidation levels: light_refresh | partial_revalidation | full_reassessment
- [ ] Staleness detection: when recommendations become stale (major context change, disclosure change, manager change, time elapsed)
- [ ] WhatsApp follow-up message templates (Hebrew)

---

### Step 10 — Gap Visibility + Recommendation Analytics (FPP §3.6, §4.9)
**Status: ⬜ Not Started**

**Gap Visibility (FPP §3.6):**
- [ ] Create `src/admin/gapVisibility.js`
  - Gap types: knowledge | logic | rule | workflow/interface
  - Coverage dimensions: barrier × stage × actor × workplace_type × intervention_type
  - Show: weak zones | high-output/low-evidence areas | repeated admin corrections | high-conflict areas | what type of new source is needed

**Recommendation Analytics (FPP §4.9):**
- [ ] Feedback collection: delivery feedback | usefulness feedback | employer action feedback | admin quality feedback
- [ ] Analytics endpoints: retrieval frequency, inclusion frequency, approval rate, stale rate
- [ ] Knowledge promotion workflow (FPP §3.7): case_only → candidate_pattern → validated → rule_update_candidate
  - De-identify before promotion
  - Log source case(s), who promoted, scope (global | campaign | segment)

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

## Immediate Next Actions (This Session)

1. **Step 0**: Reorganize repo (move files, rename engines, update imports, verify tests pass)
2. Copy this plan to `docs/MASTER_PLAN.md` after Step 0
3. **→ STOP:** Trigger Opus 4.6 session for Step 0.5 (raw files analysis), then resume here for Step 1+

## Session Handoff Order

```
[This session]  Step 0 — reorganize repo + copy plan to docs/MASTER_PLAN.md
[Opus session]  Step 0.5 — raw files analysis → commit/push knowledge/extracted/
[This session]  Step 1+ — core data model, state machines, etc.
```

---

## Progress Checklist (Summary)

- [ ] Step 0: Repo reorganization ← **next in this session**
- [ ] Step 0.5: Raw files analysis + knowledge extraction ← **separate Opus session**
- [ ] Step 1: Core data model (18 objects)
- [ ] Step 2: State machines (5 machines)
- [ ] Step 3: Landing page + WhatsApp entry
- [ ] Step 4: Interview / session handling + LLM integration
- [ ] Step 5: Admin queues + main case page
- [ ] Step 6: Logic map + recommendation workbench (disclosure filter)
- [ ] Step 7: Report objects + release states (4 output types)
- [ ] Step 8: Lead export / API handoff
- [ ] Step 9: Follow-up / change-event layer
- [ ] Step 10: Gap visibility + recommendation analytics

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
