/**
 * Employer Report Renderer — FPP §5.1B
 *
 * Generates the employer-facing ReportObject with 8 structured sections.
 * MUST always pass through the disclosure filter — never copies user report.
 *
 * Section structure (FPP §5.1B):
 *   1. מטרת המסמך (Purpose of this document)
 *   2. סיכום השפעה תפקודית (Functional work-impact summary)
 *   3. חסמי נגישות עיקריים (Key accessibility barriers — filtered)
 *   4. 3 התאמות מומלצות (Top 3 management/workplace adjustments)
 *   5. תקשורת מסייעת (What communication helps)
 *   6. מה להימנע (What to avoid)
 *   7. עדיפות יישום (Implementation priority)
 *   8. הערת הרצאה (Optional note — training/consultation may help)
 *
 * Human review rule (FPP §5.4): employer reports MUST be human-approved before sending.
 * The report is always created in 'admin_review_required' state.
 *
 * Transformation rule (FPP §5.2): this is a standalone document.
 * It does not copy or reference user report content.
 */

import { createReport } from '../core/models/report.js';
import { filterForEmployer } from '../core/recommendation/disclosureFilter.js';
import { runRecommendationPipeline } from '../core/recommendation/pipeline.js';
import { attachSignalIds } from '../conversation/sessionManager.js';
import { saveChains } from '../admin/base44Store.js';

// ─── Section builders ─────────────────────────────────────────────────────────

/**
 * Build section 1 — Purpose of this document.
 * Standard boilerplate explaining why the employer receives this.
 * @returns {string}
 */
function buildSection1_Purpose() {
  return 'מסמך זה נועד לסייע למנהלים ולמחלקות משאבי אנוש לתמוך בעובד/ת בצורה יעילה ומכבדת. המסמך מבוסס על מידע שהעובד/ת בחר/ה לשתף, ומתמקד בהתאמות מעשיות — לא באבחנות רפואיות.';
}

/**
 * Build section 2 — Functional work-impact summary.
 * Uses the filtered work impact from the disclosure filter.
 *
 * @param {object} filteredData - Output of filterForEmployer()
 * @returns {object}
 */
function buildSection2_WorkImpactSummary(filteredData) {
  return filteredData.workImpactSummary;
}

/**
 * Build section 3 — Key accessibility barriers (filtered by disclosure level).
 * Returns named barriers at partial_contextual+, or generic categories at functional_only.
 *
 * @param {object} filteredData
 * @param {string} disclosureLevel
 * @returns {string[]}
 */
function buildSection3_KeyBarriers(filteredData, disclosureLevel) {
  if (filteredData.namedBarriers?.length) {
    return filteredData.namedBarriers.map(b => b.en ?? b.id);
  }
  // functional_only: return category labels only
  return (filteredData.generalAccommodationCategories ?? []).map(cat => {
    const labels = {
      low_cost_adjustments:    'Low-cost environment adjustments',
      structural_changes:      'Structural / procedural changes',
      management_practices:    'Management practice improvements',
      physical_environment:    'Physical environment adjustments',
      scheduling_flexibility:  'Scheduling flexibility',
    };
    return labels[cat] ?? cat;
  });
}

/**
 * Build section 4 — Top 3 recommended adjustments.
 * Uses the employer package from the recommendation pipeline.
 *
 * @param {object[]} employerPackage
 * @returns {string[]}
 */
function buildSection4_TopAdjustments(employerPackage) {
  return employerPackage.slice(0, 3).map(r => r.renderedText?.he ?? '');
}

/**
 * Build section 5 — What communication helps.
 * Static guidance on effective management communication styles.
 * @returns {string[]}
 */
function buildSection5_WhatHelps() {
  return [
    'תקשורת ישירה וברורה — הימנעות משפה דחופה או מעורפלת.',
    'מתן הקשר ומטרה לכל משימה שניתנת.',
    'עדכון מוקדם לפני שינויים בסביבה, לוח הזמנים, או הרכב הצוות.',
    'דלת פתוחה לשיחות פרטיות — ללא לחץ לשתף מידע רפואי.',
  ];
}

/**
 * Build section 6 — What to avoid.
 * Evidence-based list of management behaviors that amplify PTSD symptoms.
 * @returns {string[]}
 */
function buildSection6_WhatToAvoid() {
  return [
    'הרמת קול, שפה לחוצה, או "פקודות" ללא הסבר.',
    'שאלות פרטניות על שירות צבאי, פציעות, או חוויות קשות.',
    'שינויים פתאומיים במקום ישיבה, שעות, או מבנה הצוות ללא הודעה.',
    'פעילויות חברתיות עם תוכן לוחמני (מטווחים, סיורים).',
    'הפניות פומביות לאתגרים הרגשיים של העובד/ת בנוכחות אחרים.',
  ];
}

/**
 * Build section 7 — Implementation priority.
 * Prioritizes actions by cost and expected impact based on the recommendation summary.
 *
 * @param {object} filteredData
 * @param {object[]} employerPackage
 * @returns {{ immediate: string[], near_term: string[], longer_term: string[] }}
 */
function buildSection7_ImplementationPriority(filteredData, employerPackage) {
  const immediate  = employerPackage.filter(r => r.timeHorizon === 'immediate').map(r => r.renderedText?.he ?? '');
  const near_term  = employerPackage.filter(r => r.timeHorizon === 'near_term').map(r => r.renderedText?.he ?? '');
  const longer_term = employerPackage.filter(r => r.timeHorizon === 'longer_term').map(r => r.renderedText?.he ?? '');
  return { immediate, near_term, longer_term };
}

/**
 * Build section 8 — Optional lecture/training note.
 * Included when the lecture signal suggests an org-level opportunity.
 *
 * @param {object} filteredData
 * @returns {string | null}
 */
function buildSection8_LectureNote(filteredData) {
  const signal = filteredData.lectureOpportunitySignal;
  if (!signal?.hasOrgLevelOpportunity) return null;
  return 'ייתכן שהארגון שלכם ייהנה מהרצאה על נגישות בעבודה עבור אנשים עם רקע טראומטי. לפרטים נוספים — צרו קשר עם WorkAdviser.';
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Render a complete employer-facing ReportObject.
 *
 * Always created in 'admin_review_required' state — human approval is mandatory
 * before this report is sent to any employer (FPP §5.4).
 *
 * Throws if disclosureLevel === 'no_disclosure' (enforced by filterForEmployer).
 *
 * @param {object} pipelineResult - Output of runPipeline()
 * @param {object} profile        - UserProfile
 * @param {object} [opts]
 * @param {object[]} [opts.templateOverrides]  - Injected templates for testing
 * @param {string}   [opts.sessionId]          - Session ID for persisting TracingChains
 * @param {object[]} [opts.normalizedSignals]  - NormalizedSignal[] for signal→chain attachment
 * @returns {Promise<import('../core/models/report.js').ReportObject>}
 * @throws {Error} If disclosure level is no_disclosure
 */
export async function renderEmployerReport(pipelineResult, profile, opts = {}) {
  const disclosureLevel = profile?.disclosurePreference ?? 'no_disclosure';

  // Disclosure gate — throws immediately at no_disclosure
  const filteredData = filterForEmployer(pipelineResult, profile, disclosureLevel);

  // Get employer-package recommendations
  let recResult = runRecommendationPipeline(pipelineResult, profile, {
    templateOverrides: opts.templateOverrides,
  });

  // Attach signal IDs and persist TracingChains (FPP §9.6)
  if (opts.normalizedSignals?.length) {
    recResult = attachSignalIds(recResult, opts.normalizedSignals);
  }
  if (opts.sessionId && recResult.chains?.length) {
    await saveChains(opts.sessionId, profile?.userId ?? null, recResult.chains);
  }

  const employerPackage = recResult.packages.employer;

  const sections = {
    purpose:               buildSection1_Purpose(),
    work_impact_summary:   buildSection2_WorkImpactSummary(filteredData),
    key_barriers:          buildSection3_KeyBarriers(filteredData, disclosureLevel),
    top_adjustments:       buildSection4_TopAdjustments(employerPackage),
    what_communication_helps: buildSection5_WhatHelps(),
    what_to_avoid:         buildSection6_WhatToAvoid(),
    implementation_priority: buildSection7_ImplementationPriority(filteredData, employerPackage),
    lecture_note:          buildSection8_LectureNote(filteredData),
  };

  // Employer reports ALWAYS require human approval before delivery
  return createReport({
    caseId: profile?.userId ?? null,
    reportType: 'employer',
    state: 'admin_review_required',
    sections,
    disclosureLevel,
    deliveryChannel: 'admin_manual',
    metadata: {
      filteredAt: filteredData.filteredAt,
      recommendationSummary: recResult.summary,
    },
  });
}
