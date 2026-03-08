/**
 * ApprovalObject — FPP §9.1
 *
 * Records a human review or user approval action on a report.
 */

/**
 * @typedef {'admin_approval' | 'user_approval'} ApprovalType
 *
 * @typedef {Object} ApprovalObject
 * @property {string} id
 * @property {string} reportId
 * @property {ApprovalType} type
 * @property {'approved' | 'rejected'} decision
 * @property {string} approvedBy          - Admin user ID or 'user'
 * @property {string} approvedAt          - ISO
 * @property {string | null} notes
 * @property {string | null} editSummary  - Human-readable summary of edits made before approval
 */

export function createApprovalObject(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    reportId: fields.reportId ?? null,
    type: fields.type ?? 'admin_approval',
    decision: fields.decision ?? 'approved',
    approvedBy: fields.approvedBy ?? null,
    approvedAt: fields.approvedAt ?? new Date().toISOString(),
    notes: fields.notes ?? null,
    editSummary: fields.editSummary ?? null,
  };
}
