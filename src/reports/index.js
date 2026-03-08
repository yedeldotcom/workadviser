/**
 * Reports — public API (FPP §5)
 *
 * Four output types, each a separate renderer:
 *   userReport.js       — end-user facing 8-section Hebrew report (FPP §5.1A)
 *   employerReport.js   — employer-facing 8-section guidance (FPP §5.1B)
 *   anonymousReport.js  — anonymous org-level signal (FPP §5.1C)
 *   leadReport.js       — lecture/consultation lead object (FPP §5.1D)
 *
 * Human review rules (FPP §5.4):
 *   - employer + anonymous org reports: ALWAYS admin_review_required
 *   - user reports: admin_review_required when needsHumanReview flag set
 *   - leads: always 'detected' state; must be manually escalated to 'lead_created'
 *
 * Release states: managed by ReleaseStateMachine in src/core/state/releaseState.js
 * Revisions: use createUserReportRevision() — never silently overwrite (FPP §5.5)
 */
export { renderUserReport, createUserReportRevision } from './userReport.js';
export { renderEmployerReport } from './employerReport.js';
export { renderAnonymousOrgReport } from './anonymousReport.js';
export { shouldCreateLead, buildLeadObject, detectAndBuildLead } from './leadReport.js';
