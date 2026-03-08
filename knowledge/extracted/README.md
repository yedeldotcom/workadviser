# Knowledge Extraction — Step 0.5 Results

## Summary

Extracted structured JSON from 7 Hebrew source documents.
Total: **882 knowledge units** across 5 source roles.

| # | File | Role | Units | Quality |
|---|------|------|-------|---------|
| 1 | שאלון חסמים בתעסוקה.docx | classification_authority | 13 | Good — all 13 barrier items extracted, matches `barriers.js` |
| 2 | שאלון החסמים ויזואלי.docx | classification_authority | 0 | Empty — file has no extractable text (likely image-based) |
| 3 | רקע לשאלון חסמים מתוך האוגדן.docx | interpretation_authority | 3 | Partial — short document, limited clinical correlation data |
| 4 | אתגרי נגישות כפי שעלו מראיונות.xlsx | applied_pattern_authority | 614 | Excellent — 14 sheets, 112 quotes, 495 workplace manifestations, 7 triggers |
| 5 | ספר נהלים ארגוני לדוגמה - נגישות רגשית.docx | implementation_authority | 243 | Good — 58 sections, 32 actions, 200 role references, 11 principles |
| 6 | הרצאה למעסיקים כנס נכי צהל גרסתסופית .pptx | communication_authority | 0 | Empty — PPTX is image-heavy, no extractable text |
| 7 | איך פוסט טראומטים מרגישים בעבודה_ - אנ״צ וננט״ל.pdf | communication_authority | 9 | Poor — PDF is image-heavy presentation, only 50 lines extracted |

## Knowledge Unit Breakdown

| Type | Count |
|------|-------|
| workplace_manifestation | 495 |
| implementation_action/role_assignment | 200 |
| signal/lived_experience_quote | 112 |
| implementation_action/action | 32 |
| barrier_definition | 13 |
| implementation_action/principle | 11 |
| trigger | 7 |
| workplace_manifestation/situation | 6 |
| signal/emotional_state | 3 |
| context_modifier/clinical_correlation | 2 |
| context_modifier/trajectory | 1 |

## Gaps Found

### GAP 1: Communication Authority sources are unreadable
**Files affected:** #6 (PPTX) and #7 (PDF)
**Impact:** HIGH — the framing engine (`engine5_framing/framing.js`) currently has hardcoded messages, objection responses, and Natal's 7-pillar model. These were likely hand-transcribed from these two files. Without automated extraction, the communication authority data lives only in engine code, not in the knowledge base.
**Action for Step 1:** Accept the hardcoded data in `framing.js` as the canonical communication knowledge. Consider OCR or manual transcription of these files if additional content is needed.

### GAP 2: Visual questionnaire is empty
**File affected:** #2 (שאלון החסמים ויזואלי.docx)
**Impact:** LOW — the regular questionnaire (#1) already contains all 13 barrier items. The visual version likely duplicates with formatting differences.
**Action for Step 1:** Confirm whether this file contains any additional phrasing variants not in #1. If so, manually extract. Otherwise, ignore.

### GAP 3: Interview data covers far more domains than the current model
**File affected:** #4 (xlsx)
**Impact:** HIGH — the spreadsheet has 14 sheets covering domains like healthcare, transportation, education, policing, media, public spaces, etc. The current `workplace_scenarios.js` only models the "משרדים ועבודה" (offices & work) domain. The other 13 sheets contain rich accessibility patterns that are **outside the current workplace scope** but could inform future expansion.
**Action for Step 1:** For the pilot, focus on the "משרדים ועבודה" sheet. Tag remaining sheets as `out_of_scope_pilot` but preserve for future use. The "המלצות כלליות" (general recommendations) sheet should be reviewed — it may contain cross-domain principles relevant to the pilot.

### GAP 4: Triggers are under-extracted
**Impact:** MEDIUM — only 7 explicit trigger mentions were found across all sources. The current engine has no formal trigger taxonomy. Triggers are implicit in scenarios and quotes but not structured.
**Action for Step 1:** Build a trigger taxonomy from:
- The interview quotes (112 quotes contain implicit triggers)
- The barriers background document
- Workplace scenarios already in `workplace_scenarios.js`

### GAP 5: No workplace amplifier taxonomy exists
**Impact:** MEDIUM — the FPP defines "workplace amplifiers" as a core knowledge unit type (§3.2), but no source document explicitly lists them. They must be derived from interview data and scenario patterns.
**Action for Step 1:** Derive workplace amplifiers from interview quotes and scenario `friction` types. Current friction types in `workplace_scenarios.js` are a starting point: `sensory_overload`, `authority_trigger`, `stigma`, `implicit_othering`, `attendance`, `reduced_capacity`, `task_paralysis`, `interpersonal_conflict`, `acute_episode`, `reduced_output`, `emotional_episode`, `missed_deadlines`, `disengagement`, `underperformance`.

### GAP 6: Recommendation families/templates not formally extracted
**Impact:** MEDIUM — the FPP defines recommendation families and templates (§4.2) as core objects. Current code has accommodation actions embedded in scenarios. These need to be promoted to first-class recommendation templates with IDs, versions, and lifecycle states.
**Action for Step 1:** Flatten all accommodation actions from `workplace_scenarios.js` and procedure modules from `procedures.js` into a unified recommendation template registry.

### GAP 7: No disclosure-level tagging in source data
**Impact:** MEDIUM — the FPP defines 4 disclosure levels (§LLM prompt). No source document tags recommendations by disclosure suitability. This must be manually assigned during Step 1.
**Action for Step 1:** Tag each recommendation template with disclosure_suitability: `no_disclosure | functional_only | partial_contextual | full_voluntary`.

### GAP 8: Employment stage coverage is uneven
**Impact:** LOW — the FPP defines 7 employment stages (§3.4). The procedures book covers recruitment and onboarding well, but later stages (retention-risk, return-to-work) have fewer structured procedures.
**Action for Step 1:** Map existing procedure modules to employment stages. Flag stages with <3 modules as needing enrichment.

## Current Engine Alignment

| FPP Knowledge Unit Type | Extracted? | In Engine Code? | Notes |
|------------------------|-----------|----------------|-------|
| barrier_definition | Yes (13) | Yes (barriers.js) | 1:1 match |
| signal / indicator | Partial (3) | No | Need trigger/signal taxonomy |
| context_modifier | Partial (3) | Yes (interpreter.js trajectories) | Background doc is thin |
| trigger | Partial (7) | No formal model | Implicit in scenarios |
| workplace_amplifier | No | No | Derive from friction types |
| workplace_manifestation | Yes (501) | Yes (workplace_scenarios.js) | Rich but multi-domain |
| recommendation_family | No | Implicit (procedure modules) | Need formal registry |
| recommendation_template | No | Implicit (accommodations) | Need formal registry |
| implementation_action | Yes (243) | Yes (procedures.js) | Good coverage |
| communication_framing | No (files unreadable) | Yes (framing.js hardcoded) | Accept engine as canonical |
| boundary / caution | No | No | Need to extract |
| sales_signal | No | Partial (framing.js) | Low priority for pilot |

## Recommendations for Step 1 (Data Model)

1. **Keep barriers.js as canonical** — the 13-item taxonomy matches the source exactly
2. **Build trigger taxonomy** from interview quotes + scenario friction types
3. **Build workplace amplifier taxonomy** from friction types
4. **Promote accommodations to recommendation templates** with IDs, versions, lifecycle
5. **Add disclosure_suitability tags** to all recommendation templates
6. **Add employment_stage tags** to procedure modules (partially done)
7. **Accept framing.js content as communication authority** since source files are unreadable
8. **Filter interview data to workplace domain** for pilot scope
9. **Create boundary/caution knowledge units** from procedures book safety sections
