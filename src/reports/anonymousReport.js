/**
 * Anonymous Organizational Signal Renderer — FPP §5.1C
 *
 * Generates a non-identifying organization-level signal report.
 * Used when user chooses no personal disclosure but the case indicates
 * an org-level accessibility need.
 *
 * Section structure (FPP §5.1C):
 *   1. למה הארגון מקבל את זה (Why the org receives this)
 *   2. אינדיקציה כללית לחסמים (General indication of trauma-related barriers)
 *   3. דפוסים נפוצים (Common employer-relevant patterns)
 *   4. פעולות ברמת ארגון (Practical org-level actions)
 *   5. הזמנת הרצאה (Optional lecture invitation)
 *   6. הצהרת אי-זיהוי (Explicit no-identifying-information statement)
 *
 * Safety guarantees:
 *   - No barrier IDs, scores, or case-specific data
 *   - No individual identifiers
 *   - Framing is org-level only ("employees in your org may experience...")
 *   - Always requires human approval before sending (FPP §5.4)
 */

import { createReport } from '../core/models/report.js';

// ─── Section builders ─────────────────────────────────────────────────────────

/**
 * Build section 1 — Why the organization receives this.
 * @returns {string}
 */
function buildSection1_WhyOrgReceivesThis() {
  return 'ארגונך מקבל מסמך זה כחלק מפעילות WorkAdviser לקידום נגישות בסביבת העבודה לאנשים עם רקע טראומטי. המסמך מבוסס על אגרגציה של מידע ממספר מקרים — אין בו זיהוי של עובדים ספציפיים.';
}

/**
 * Build section 2 — General indication of trauma-related workplace barriers.
 * Org-level aggregate — never tied to an individual.
 *
 * @param {object} intake - Engine 1 output (used only for severity category)
 * @returns {string}
 */
function buildSection2_GeneralBarrierIndication(intake) {
  const severity = intake?.overallSeverity ?? 'moderate';
  const severityHe = { low: 'נמוך', moderate: 'בינוני', high: 'משמעותי', critical: 'גבוה מאוד' }[severity] ?? 'בינוני';

  return `עובדים עם רקע פוסט-טראומטי שעברו דרכנו דיווחו על חסמי נגישות בעצמה ${severityHe} בסביבות עבודה דומות לשלכם. חסמים אלו משפיעים על ריכוז, ניהול זמן, אינטראקציות חברתיות, ותפקוד יומיומי.`;
}

/**
 * Build section 3 — Common employer-relevant patterns.
 * Static list of workplace patterns that are common across cases.
 * Never derived from a single individual.
 *
 * @returns {string[]}
 */
function buildSection3_CommonPatterns() {
  return [
    'רגישות לרעשים, תאורה חזקה, וצפיפות — עלולה להשפיע על ריכוז ועל תחושת ביטחון.',
    'קושי עם שינויים פתאומיים בסביבה, בלוחות זמנים, או בהרכב הצוות.',
    'אינטראקציות מנהלות לא צפויות — במיוחד שפה לחוצה או פקודות ללא הקשר.',
    'פגישות ספונטניות ו"חובות הגעה" ללא הודעה מוקדמת.',
  ];
}

/**
 * Build section 4 — Practical org-level actions.
 * Evidence-based low/zero-cost changes the org can make.
 *
 * @returns {string[]}
 */
function buildSection4_OrgLevelActions() {
  return [
    'הגדרת "שעות שקטות" — שעות ביום שבהן רמת הרעש והשיחות מוגבלת.',
    'הכשרת מנהלים בתקשורת מיודעת טראומה (trauma-informed communication).',
    'מדיניות ברורה לגבי הודעה מוקדמת על שינויים בסביבת העבודה.',
    'מרחב פרטי לשיחות רגישות — ללא קירות זכוכית או אוזניים פתוחות.',
    'הנחיה לצוות: אין לשאול שאלות אישיות על שירות צבאי, פציעות, או חוויות קשות.',
  ];
}

/**
 * Build section 5 — Optional lecture invitation.
 * Included when the org-level signal suggests training would be beneficial.
 *
 * @param {boolean} hasLectureOpportunity
 * @returns {string | null}
 */
function buildSection5_LectureInvitation(hasLectureOpportunity) {
  if (!hasLectureOpportunity) return null;
  return 'WorkAdviser מציע הרצאות לארגונים על נגישות בעבודה לאנשים עם רקע פוסט-טראומטי. ההרצאה מגיעה מניסיון ישיר ומבוססת על מחקר עדכני. לפרטים — פנו אלינו.';
}

/**
 * Build section 6 — Explicit no-identifying-information statement.
 * This section is mandatory in every anonymous org signal (FPP §5.1C).
 *
 * @returns {string}
 */
function buildSection6_NoIdentifyingInfo() {
  return 'מסמך זה אינו מכיל שום מידע מזהה על עובדים ספציפיים. אין בו שמות, תאריכים, אבחנות, או פרטים שיכולים לקשור אותו לאדם מסוים. הוא מבוסס על אגרגציה של מידע בלבד, ומועבר בהסכמה מלאה של כל המעורבים.';
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Render a complete anonymous organizational signal ReportObject.
 *
 * Safe to produce at any disclosure level (including no_disclosure) because
 * it contains no individual-identifying data.
 *
 * Always created in 'admin_review_required' state — human approval is mandatory
 * before this report is sent to any organization (FPP §5.4).
 *
 * @param {object} pipelineResult   - Output of runPipeline()
 * @param {object | null} profile   - UserProfile (used only for userId and orgId)
 * @param {object} [opts]
 * @param {string} [opts.orgName]   - Target organization name
 * @param {boolean} [opts.hasLectureOpportunity] - Override lecture signal
 * @returns {import('../core/models/report.js').ReportObject}
 */
export function renderAnonymousOrgReport(pipelineResult, profile, opts = {}) {
  const { engines, summary } = pipelineResult;

  const hasLectureOpp = opts.hasLectureOpportunity ??
    (summary?.overallSeverity === 'high' || summary?.overallSeverity === 'critical');

  const sections = {
    why_org_receives_this:       buildSection1_WhyOrgReceivesThis(),
    general_barrier_indication:  buildSection2_GeneralBarrierIndication(engines.intake),
    common_patterns:             buildSection3_CommonPatterns(),
    org_level_actions:           buildSection4_OrgLevelActions(),
    lecture_invitation:          buildSection5_LectureInvitation(hasLectureOpp),
    no_identifying_info:         buildSection6_NoIdentifyingInfo(),
  };

  return createReport({
    caseId: profile?.userId ?? null,
    reportType: 'anonymous_org',
    state: 'admin_review_required', // mandatory human review before sending
    sections,
    disclosureLevel: 'no_disclosure', // anonymous org report never contains PII
    deliveryChannel: 'admin_manual',
    metadata: {
      orgName: opts.orgName ?? null,
      hasLectureOpportunity: hasLectureOpp,
    },
  });
}
