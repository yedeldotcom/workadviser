# WorkAdviser — Master Build Plan

## Project Overview

PTSD Workplace Accessibility Guidance System for Israel.
Full Product Prompt: [docs/FPP_Pilot_PTSD_Workplace_Accessibility_Guidance_System.md](./FPP_Pilot_PTSD_Workplace_Accessibility_Guidance_System.md)

## Build Steps

### Step 0: Repository Reorganization (DONE)

- Moved raw Hebrew source documents to `knowledge/raw/`
- Moved FPP to `docs/`
- Created `knowledge/extracted/`, `scripts/`, `docs/` directories

### Step 0.5: Raw Files Analysis (DONE)

- Created `scripts/extract-knowledge.js` — parses all 7 source documents
- Extracted 882 knowledge units to `knowledge/extracted/`
- Documented 8 gaps in `knowledge/extracted/README.md`
- Key findings:
  - 13 barrier items match the existing engine model perfectly
  - Interview data (xlsx) is the richest source — 614 units across 14 domains
  - Procedures book provides strong implementation coverage — 243 units
  - PPTX and PDF files are image-heavy; communication authority content is already hardcoded in `engine5_framing/framing.js`
  - Missing formal taxonomies: triggers, workplace amplifiers, recommendation templates

### Step 1: Formal Data Model

Build the canonical data model from extracted knowledge.

Tasks:
1. Create `src/models/` directory with formal type definitions
2. Create trigger taxonomy (derived from interview quotes + scenario friction types)
3. Create workplace amplifier taxonomy (derived from friction types)
4. Promote accommodation actions to formal recommendation templates with IDs, versions, lifecycle
5. Add disclosure_suitability tags to all recommendation templates
6. Map procedure modules to employment stages
7. Create boundary/caution knowledge units from procedures book
8. Filter interview data to workplace-relevant domain for pilot scope

### Step 2: Landing Page + WhatsApp Entry

Build the entry layer.

Tasks:
1. Landing page with trust/process explanation (Hebrew copy from FPP §7.1-7.2)
2. WhatsApp CTA flow
3. Consent and privacy flow
4. Partner visibility

### Step 3: Interview/Session Handling

Build the conversation layer.

Tasks:
1. WhatsApp-first interview engine
2. Structured onboarding flow (FPP §7.3)
3. Text + voice input handling
4. Pause/skip/resume flow
5. Distress-safe pacing protocol
6. Adaptive branching based on barrier detection

### Step 4: Admin Queues + Case Page

Build the admin layer.

Tasks:
1. Admin queue system (new users, active cases, review needed, leads)
2. Main case page (user info, interview history, logic map, recommendations, reports)
3. Inline edit capabilities
4. Audit trail

### Step 5: Logic Map + Recommendation Workbench

Build the reasoning layer.

Tasks:
1. Full recommendation selection pipeline (FPP §4.4)
2. Visible logic map (input → detection → retrieval → filtering → scoring → selection → rendering)
3. Admin workbench for inspecting/editing each pipeline stage
4. Confidence scoring and fallback paths
5. Deduplication and diversity

### Step 6: Report Objects + Release States

Build the output layer.

Tasks:
1. End-user report generation (FPP §5.1A)
2. Employer-facing report generation (FPP §5.1B)
3. Anonymous organizational signal (FPP §5.1C)
4. Release state machine (draft → review → approved → delivered)
5. Human review enforcement for pilot
6. Disclosure filtering between user and employer reports

### Step 7: Lead Export/API Handoff

Build the commercial layer.

Tasks:
1. Lecture opportunity detection
2. Lead object creation (FPP §5.1D)
3. Export/API handoff mechanism
4. Minimum-necessary-data export filtering

### Step 8: Follow-up/Change-Event Layer

Build the longitudinal layer.

Tasks:
1. Cadence-based check-in system
2. Change event detection and tracking
3. Recommendation revalidation triggers
4. Staleness detection

### Step 9: Gap Visibility + Analytics

Build the governance layer.

Tasks:
1. Knowledge gap visibility (barrier × stage × actor × workplace type)
2. Recommendation analytics (retrieval, inclusion, edit, approval frequency)
3. Knowledge promotion workflow (case insight → candidate pattern → validated rule)
4. Admin analytics dashboard

## Architecture

```
workadviser/
├── docs/                           # Product documentation
│   ├── FPP_Pilot_*.md             # Full Product Prompt
│   └── MASTER_PLAN.md             # This file
├── knowledge/
│   ├── raw/                       # 7 Hebrew source documents
│   └── extracted/                 # Structured JSON from extraction
├── scripts/
│   └── extract-knowledge.js       # Step 0.5 extraction script
├── src/
│   ├── engine1_intake/            # Barrier detection (questionnaire scoring)
│   ├── engine2_interpretation/    # Clinical interpretation + trajectories
│   ├── engine3_translation/       # Workplace scenarios + accommodations
│   ├── engine4_implementation/    # Organizational procedures
│   ├── engine5_framing/           # Employer communication framing
│   └── pipeline/                  # Full pipeline orchestration
├── tests/
│   └── pipeline.test.js
└── package.json
```

## Source Document Roles (FPP §3.1)

| Role | Source | Engine |
|------|--------|--------|
| Classification authority | שאלון חסמים בתעסוקה | engine1_intake |
| Interpretation authority | רקע לשאלון חסמים | engine2_interpretation |
| Applied pattern authority | אתגרי נגישות (interviews) | engine3_translation |
| Implementation authority | ספר נהלים ארגוני | engine4_implementation |
| Communication authority | הרצאה למעסיקים + PDF | engine5_framing |
