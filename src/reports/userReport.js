/**
 * User Report Renderer — FPP §5.1A
 *
 * Generates the end-user facing ReportObject with 8 structured sections.
 * The user report is the primary output of the WorkAdviser system.
 *
 * Section structure (FPP §5.1A):
 *   1. מה הבנו (What we understood)
 *   2. חסמים עיקריים (Main workplace barriers)
 *   3. מה מקשה עוד יותר (What amplifies them)
 *   4. המלצות לך (Top 3 recommendations for user)
 *   5. מה מעסיק יכול לעשות (Top 3 employer actions)
 *   6. הכנה לשיחה (Suggested conversation prep / wording)
 *   7. משאבים (Resources)
 *   8. מה לא שותף (What was NOT shared without approval)
 *
 * Release state: starts at 'draft_generated', requires admin review before delivery.
 * Human review rule (FPP §5.4): may be AI-drafted; flagged for review if low confidence.
 *
 * Revision model (FPP §5.5): reports are never silently overwritten.
 * createUserReportRevision() creates a new versioned ReportObject.
 */

import { createReport } from '../core/models/report.js';
import { runRecommendationPipeline } from '../core/recommendation/pipeline.js';

// ─── Section builders ─────────────────────────────────────────────────────────

/**
 * Build section 1 — What we understood.
 * Summary of the user's situation as captured by the interview.
 *
 * @param {object} intake   - Engine 1 output
 * @param {object} interp   - Engine 2 output
 * @returns {string} Hebrew text
 */
function buildSection1_WhatWeUnderstood(intake, interp) {
  const severity = intake.overallSeverity;
  const severityHe = { low: 'נמוך', moderate: 'בינוני', high: 'גבוה', critical: 'גבוה מאוד' }[severity] ?? 'לא ידוע';
  const barrierCount = (intake.criticalBarriers ?? []).length;
  const trajectory = interp.trajectory;
  const trajectoryNote = trajectory === 'improving'  ? 'עם נטייה לשיפור.' :
                         trajectory === 'declining'   ? 'עם נטייה להחמרה.' :
                         trajectory === 'stable'      ? 'עם מצב יציב.' : '';

  return `על בסיס השיחה שלנו, זיהינו ${barrierCount} חסמי נגישות בעלי עצמה ${severityHe} המשפיעים על תפקוד בעבודה. ${trajectoryNote}`.trim();
}

/**
 * Build section 2 — Main workplace barriers.
 * Lists the critical barriers with their functional names and severity.
 *
 * @param {object} intake - Engine 1 output
 * @returns {string[]} Array of Hebrew barrier descriptions
 */
function buildSection2_MainBarriers(intake) {
  return (intake.criticalBarriers ?? []).map(b => {
    const score = b.score ?? 0;
    const levelHe = score >= 4 ? '(עצמה גבוהה)' : score >= 3 ? '(עצמה בינונית)' : '(עצמה מתונה)';
    return `${b.he} ${levelHe}`;
  });
}

/**
 * Build section 3 — What amplifies the barriers.
 * Lists patterns and amplifiers detected during the interview.
 *
 * @param {object} intake   - Engine 1 output
 * @param {object} interp   - Engine 2 output
 * @returns {string[]}
 */
function buildSection3_Amplifiers(intake, interp) {
  const patterns = (intake.patterns ?? []).map(p => p.he);
  const riskNotes = (interp.riskFlags ?? [])
    .filter(f => f.severity === 'high')
    .map(f => f.he);
  return [...patterns, ...riskNotes];
}

/**
 * Build section 4 — Top 3 recommendations for the user.
 * Uses the recommendation pipeline output (user package).
 *
 * @param {object[]} userPackage - user recommendations from pipeline
 * @returns {string[]}
 */
function buildSection4_UserRecommendations(userPackage) {
  return userPackage.slice(0, 3).map(r => r.renderedText?.he ?? '');
}

/**
 * Build section 5 — Top 3 things an employer may need to know/do.
 * Derived from employer package but framed for the user (not sent to employer).
 *
 * @param {object[]} employerPackage - employer recommendations from pipeline
 * @param {string} disclosureLevel
 * @returns {string[]}
 */
function buildSection5_EmployerActions(employerPackage, disclosureLevel) {
  if (disclosureLevel === 'no_disclosure') {
    return ['לא שותפו פרטים עם המעסיק על-פי הגדרות שלך.'];
  }
  return employerPackage.slice(0, 3).map(r => r.renderedText?.he ?? '');
}

/**
 * Build section 6 — Suggested conversation prep / wording.
 * Provides Hebrew phrasing templates for the user to communicate with their employer.
 *
 * @param {object} framing  - Engine 5 output
 * @param {string} disclosureLevel
 * @returns {string[]}
 */
function buildSection6_ConversationPrep(framing, disclosureLevel) {
  const base = [
    'אפשר לפנות ולבקש: "אשמח לשוחח על כמה התאמות שיעזרו לי להיות יעיל יותר בעבודה."',
    'אין חובה להסביר את האבחנה — ניתן לתאר רק את ההשפעה התפקודית.',
  ];

  if (disclosureLevel === 'full_voluntary') {
    base.push('בחרת לשתף את הפרופיל המלא — ניתן לאזכר את הדוח שלנו בשיחה עם מנהל/ית או HR.');
  }

  const objections = framing?.objections ?? [];
  if (objections.length > 0) {
    base.push(`אם נתקלים בהתנגדות: "${objections[0]?.response_he ?? 'ניתן לבקש פגישה עם HR לדיון בנושא.'}"`);
  }

  return base;
}

/**
 * Build section 7 — Resources and organizations.
 * Static list of relevant Israeli support organizations.
 *
 * @returns {string[]}
 */
function buildSection7_Resources() {
  return [
    'נט"ל — מרכז תמיכה בנפגעי טראומה בעבודה: natal.org.il',
    'בטרם — ייעוץ בנושאי זכויות עובדים עם מוגבלות',
    'ועדת שוויון זכויות לאנשים עם מוגבלויות (רשות שוויון)',
    'PTSD פורום ישראל — קהילת תמיכה עצמאית',
  ];
}

/**
 * Build section 8 — What was NOT shared without approval.
 * Transparency section informing the user what was withheld.
 *
 * @param {string} disclosureLevel
 * @param {boolean} employerReportGenerated
 * @returns {string}
 */
function buildSection8_WhatWasNotShared(disclosureLevel, employerReportGenerated) {
  if (!employerReportGenerated || disclosureLevel === 'no_disclosure') {
    return 'לא שותף שום מידע עם גורמים חיצוניים. הדוח הזה שייך לך בלבד.';
  }
  const withheld = [];
  if (disclosureLevel !== 'full_voluntary') {
    withheld.push('פרטים אישיים מזהים');
    withheld.push('אבחנה רפואית או פסיכיאטרית');
    withheld.push('ציטוטים מהשיחה');
  }
  if (['functional_only', 'partial_contextual'].includes(disclosureLevel)) {
    withheld.push('שמות הטריגרים הספציפיים');
  }

  if (withheld.length === 0) {
    return 'שותף הפרופיל המלא בהסכמתך.';
  }
  return `הפרטים הבאים לא שותפו: ${withheld.join(', ')}.`;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * Render a complete user-facing ReportObject.
 *
 * Combines the recommendation pipeline output with section builders to produce
 * a structured 8-section Hebrew report in draft_generated state.
 *
 * @param {object} pipelineResult - Output of runPipeline()
 * @param {object} profile        - UserProfile
 * @param {object} [opts]
 * @param {boolean} [opts.employerReportGenerated] - Whether employer report will be sent
 * @param {object[]} [opts.templateOverrides]      - Injected templates for testing
 * @returns {import('../core/models/report.js').ReportObject}
 */
export function renderUserReport(pipelineResult, profile, opts = {}) {
  const { engines } = pipelineResult;
  const { intake, interpretation, translation, framing } = engines;
  const disclosureLevel = profile?.disclosurePreference ?? 'no_disclosure';

  // Run recommendation pipeline to get packaged recommendations
  const recResult = runRecommendationPipeline(pipelineResult, profile, {
    templateOverrides: opts.templateOverrides,
  });

  const sections = {
    what_we_understood:    buildSection1_WhatWeUnderstood(intake, interpretation),
    main_barriers:         buildSection2_MainBarriers(intake),
    amplifiers:            buildSection3_Amplifiers(intake, interpretation),
    user_recommendations:  buildSection4_UserRecommendations(recResult.packages.user),
    employer_actions:      buildSection5_EmployerActions(recResult.packages.employer, disclosureLevel),
    conversation_prep:     buildSection6_ConversationPrep(framing, disclosureLevel),
    resources:             buildSection7_Resources(),
    what_was_not_shared:   buildSection8_WhatWasNotShared(disclosureLevel, opts.employerReportGenerated ?? false),
  };

  // Determine if human review is required (FPP §5.4)
  const needsReview = recResult.summary.needsHumanReview ||
    recResult.packages.user.some(r => r.reviewStatus === 'pending');

  return createReport({
    caseId: profile?.userId ?? null,
    reportType: 'user',
    state: needsReview ? 'admin_review_required' : 'draft_generated',
    sections,
    disclosureLevel,
    deliveryChannel: 'whatsapp',
    metadata: {
      recommendationSummary: recResult.summary,
      candidateCount: recResult.candidates,
      eligibleCount: recResult.eligible,
    },
  });
}

/**
 * Create a new versioned revision of an existing user report.
 * Revision model (FPP §5.5): reports are never silently overwritten.
 * The original report must have been delivered before a revision is issued.
 *
 * @param {import('../core/models/report.js').ReportObject} originalReport
 * @param {object} newSections    - Updated section content (partial or full)
 * @param {string} revisionReason - One of: 'clarification' | 'correction' | 'sharing_boundary' | 'new_information'
 * @returns {import('../core/models/report.js').ReportObject}
 */
export function createUserReportRevision(originalReport, newSections, revisionReason) {
  const versionParts = (originalReport.version ?? '1.0.0').split('.');
  const nextMinor = parseInt(versionParts[1] ?? '0', 10) + 1;
  const newVersion = `${versionParts[0]}.${nextMinor}.0`;

  return createReport({
    caseId: originalReport.caseId,
    reportType: 'user',
    state: 'admin_review_required', // revisions always require review
    sections: { ...originalReport.sections, ...newSections },
    disclosureLevel: originalReport.disclosureLevel,
    deliveryChannel: originalReport.deliveryChannel,
    version: newVersion,
    previousVersionId: originalReport.id,
    metadata: {
      ...(originalReport.metadata ?? {}),
      revisionReason,
      revisedAt: new Date().toISOString(),
    },
  });
}
