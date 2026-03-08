/**
 * Lead Report / Object Builder — FPP §5.1D
 *
 * Detects and builds LeadObjects for lecture/consultation opportunities.
 * A lead is generated when a case indicates an org-level need that goes beyond
 * the individual user — typically high severity + employer context signals.
 *
 * Lead detection criteria:
 *   - Overall severity is 'high' or 'critical', AND
 *   - At least one employer-relevant pattern detected (authority, sensory, stigma), OR
 *   - User mentioned org-level issues in interview (amplifiers like AMP-007, AMP-008)
 *
 * Lead fields (FPP §5.1D):
 *   - organization name + contact (if known)
 *   - source signal type (why lead was created)
 *   - reason lecture opportunity detected
 *   - org type / sector
 *   - recommended lecture angle
 *   - safe context notes
 *   - consent/sharing status
 *   - export state (LeadHandoffStateMachine)
 *
 * Safety rule: lead export only captures minimum-necessary org-level data.
 * No individual case data is ever included in lead export (FPP §6.5).
 */

import { createLead } from '../core/models/report.js';

// ─── Detection logic ──────────────────────────────────────────────────────────

/**
 * Lecture angle selection matrix.
 * Maps dominant barrier clusters to recommended lecture angles.
 * @type {Record<string, string>}
 */
const LECTURE_ANGLE_MAP = {
  physiological:  'sensory_accommodation_and_environment',
  relational:     'trauma_informed_management',
  cognitive:      'flexible_performance_and_workload',
  social:         'psychological_safety_and_stigma',
  behavioral:     'flexible_scheduling_and_autonomy',
};

/**
 * Detect whether a case qualifies for lead creation.
 * Returns true if the case indicates an org-level accessibility need.
 *
 * @param {object} pipelineResult - Output of runPipeline()
 * @returns {boolean}
 */
export function shouldCreateLead(pipelineResult) {
  const { engines, summary } = pipelineResult;
  const severity = summary?.overallSeverity ?? engines.intake?.overallSeverity;

  if (!['high', 'critical'].includes(severity)) return false;

  // Check for employer-relevant patterns
  const patterns = engines.intake?.patterns ?? [];
  const hasOrgPattern = patterns.some(p =>
    ['hypervigilance', 'authority_sensitivity', 'stigma_exposure', 'isolation'].includes(p.id)
  );

  return hasOrgPattern;
}

/**
 * Infer the recommended lecture angle from the dominant barrier cluster.
 *
 * @param {object} intake - Engine 1 output
 * @returns {string}
 */
function inferLectureAngle(intake) {
  const clusterScores = intake.clusterScores ?? {};
  const dominant = Object.entries(clusterScores)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  return LECTURE_ANGLE_MAP[dominant] ?? 'workplace_accessibility_ptsd_general';
}

/**
 * Build safe context notes for the lead.
 * Contains only org-level observations — no individual case data.
 *
 * @param {object} pipelineResult
 * @returns {string}
 */
function buildSafeContextNotes(pipelineResult) {
  const { engines } = pipelineResult;
  const dominantBarrierClusters = Object.entries(engines.intake?.clusterScores ?? {})
    .filter(([, score]) => score >= 3)
    .map(([cluster]) => cluster);

  if (dominantBarrierClusters.length === 0) {
    return 'General trauma-related workplace accessibility patterns detected.';
  }
  return `Dominant barrier clusters: ${dominantBarrierClusters.join(', ')}. High-severity case indicates org-level accessibility gaps.`;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Build a LeadObject for an identified lecture/consultation opportunity.
 *
 * The lead starts in 'detected' export state and must be manually reviewed
 * and marked 'lead_created' before export (FPP §6.5).
 *
 * @param {object} pipelineResult - Output of runPipeline()
 * @param {object | null} profile - UserProfile
 * @param {object} [opts]
 * @param {string} [opts.orgName]           - Known org name (if any)
 * @param {string} [opts.orgType]           - 'private' | 'public' | 'ngo' | 'military' | 'unknown'
 * @param {string} [opts.contactPerson]     - Contact name if known
 * @param {string} [opts.contactChannel]    - 'email' | 'phone' | 'linkedin' | 'unknown'
 * @param {string} [opts.consentStatus]     - 'pending' | 'granted' | 'denied'
 * @returns {import('../core/models/report.js').LeadObject}
 */
export function buildLeadObject(pipelineResult, profile, opts = {}) {
  const { engines } = pipelineResult;
  const lectureAngle = inferLectureAngle(engines.intake);
  const contextNotes = buildSafeContextNotes(pipelineResult);

  // Determine why this lead was created
  const patterns = engines.intake?.patterns ?? [];
  const triggerPatterns = patterns.map(p => p.id).join(', ') || 'severity_threshold';
  const reason = `High-severity case with patterns: ${triggerPatterns}. Org-level intervention likely to benefit multiple employees.`;

  return createLead({
    caseId: profile?.userId ?? null,
    orgName: opts.orgName ?? null,
    orgType: opts.orgType ?? 'unknown',
    contactPerson: opts.contactPerson ?? null,
    contactChannel: opts.contactChannel ?? 'unknown',
    sourceSignalType: 'case_severity_pattern',
    lectureOpportunityReason: reason,
    recommendedLectureAngle: lectureAngle,
    safeContextNotes: contextNotes,
    consentStatus: opts.consentStatus ?? 'pending',
    exportState: 'detected',
  });
}

/**
 * Attempt to detect and build a lead from a pipeline result.
 * Returns the lead object if lead criteria are met, or null if not.
 *
 * Use this as the single entry point — it combines detection + building.
 *
 * @param {object} pipelineResult
 * @param {object | null} profile
 * @param {object} [opts] - Same options as buildLeadObject
 * @returns {import('../core/models/report.js').LeadObject | null}
 */
export function detectAndBuildLead(pipelineResult, profile, opts = {}) {
  if (!shouldCreateLead(pipelineResult)) return null;
  return buildLeadObject(pipelineResult, profile, opts);
}
