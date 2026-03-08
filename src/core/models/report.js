/**
 * Report — FPP §9.1 + §5
 *
 * Four report types with full release state management:
 *   user           — end-user personal report (8 sections)
 *   employer       — employer-facing plan (filtered by disclosure level)
 *   anonymous_org  — aggregated org signal (no identifying info)
 *   lead           — lecture/engagement opportunity
 */

/**
 * @typedef {'user' | 'employer' | 'anonymous_org' | 'lead'} ReportType
 * @typedef {'draft_generated' | 'admin_review_required' | 'admin_approved' |
 *           'user_delivery_ready' | 'delivered_to_user' | 'user_viewed' |
 *           'user_approved_for_employer' | 'employer_delivery_ready' |
 *           'sent_to_employer' | 'employer_viewed' | 'withheld' | 'archived'} ReleaseState
 *
 * @typedef {Object} ReportObject
 * @property {string} id
 * @property {string} version            - Incremented on every reissue
 * @property {string} caseId             - UserProfile.id
 * @property {ReportType} reportType
 * @property {ReleaseState} state
 * @property {Object} sections           - Type-specific section map
 * @property {string} disclosureLevel    - Snapshot of disclosure level at generation time
 * @property {string} generatedAt        - ISO
 * @property {string} deliveryChannel    - 'whatsapp' | 'email' | 'web'
 * @property {string | null} deliveredAt
 * @property {string | null} adminReviewedAt
 * @property {string | null} userApprovedAt
 * @property {string | null} supersededBy  - ID of newer version, if reissued
 */

export function createReport(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    version: fields.version ?? '1',
    caseId: fields.caseId ?? null,
    reportType: fields.reportType ?? 'user',
    state: fields.state ?? 'draft_generated',
    sections: fields.sections ?? {},
    disclosureLevel: fields.disclosureLevel ?? 'no_disclosure',
    generatedAt: fields.generatedAt ?? now,
    deliveryChannel: fields.deliveryChannel ?? 'whatsapp',
    deliveredAt: fields.deliveredAt ?? null,
    adminReviewedAt: fields.adminReviewedAt ?? null,
    userApprovedAt: fields.userApprovedAt ?? null,
    supersededBy: fields.supersededBy ?? null,
  };
}

/**
 * LeadObject — FPP §5.1D
 * Represents a lecture/engagement opportunity detected from a case.
 */

/**
 * @typedef {'detected' | 'lead_created' | 'ready_for_export' | 'exported' | 'failed' | 'archived'} LeadState
 *
 * @typedef {Object} LeadObject
 * @property {string} id
 * @property {string | null} caseId
 * @property {string | null} orgName
 * @property {string | null} contactPerson
 * @property {string | null} contactChannel
 * @property {string} sourceSignalType     - What triggered lead creation
 * @property {string | null} lectureOpportunityReason
 * @property {string | null} orgType
 * @property {string | null} recommendedLectureAngle
 * @property {string | null} safeContextNotes
 * @property {'pending' | 'given' | 'not_applicable'} consentStatus
 * @property {LeadState} exportState
 * @property {string | null} exportTimestamp
 * @property {string | null} exportTarget   - CRM or system name
 * @property {string} createdAt
 */

export function createLead(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    caseId: fields.caseId ?? null,
    orgName: fields.orgName ?? null,
    contactPerson: fields.contactPerson ?? null,
    contactChannel: fields.contactChannel ?? null,
    sourceSignalType: fields.sourceSignalType ?? 'case_signal',
    lectureOpportunityReason: fields.lectureOpportunityReason ?? null,
    orgType: fields.orgType ?? null,
    recommendedLectureAngle: fields.recommendedLectureAngle ?? null,
    safeContextNotes: fields.safeContextNotes ?? null,
    consentStatus: fields.consentStatus ?? 'pending',
    exportState: fields.exportState ?? 'detected',
    exportTimestamp: fields.exportTimestamp ?? null,
    exportTarget: fields.exportTarget ?? null,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}
