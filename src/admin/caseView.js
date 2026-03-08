/**
 * CaseView — FPP §6.1
 *
 * Builds the full case workspace for admin review.
 * One function: buildCaseWorkspace(userId, store) → complete case object.
 *
 * The workspace includes:
 * - User info (de-scoped per role upstream)
 * - Interview sessions + message history
 * - Normalized signals
 * - Logic map (Engine 1–5 outputs)
 * - Reports with states
 * - Approvals
 * - Audit trail
 */

import {
  getUser,
  getProfile,
  getSessionsForUser,
  getMessage,
  getSignal,
  getReportsForCase,
  getApprovalsForReport,
  getAuditLogForEntity,
  getPipelineResult,
} from './store.js';

// ─── Workspace builder ────────────────────────────────────────────────────────

/**
 * Build the full case workspace for a given user (= case).
 *
 * @param {string} userId
 * @param {{ includeRawMessages?: boolean, includeVoiceNotes?: boolean }} [opts]
 *   Role-gated: pass opts based on the admin's capabilities.
 * @returns {CaseWorkspace | null}
 */
export function buildCaseWorkspace(userId, opts = {}) {
  const user = getUser(userId);
  if (!user) return null;

  const profile   = getProfile(userId);
  const sessions  = getSessionsForUser(userId);
  const reports   = getReportsForCase(userId);

  // Enrich sessions with messages and signals
  const enrichedSessions = sessions.map(session => {
    const messages = opts.includeRawMessages
      ? session.messageIds.map(id => getMessage(id)).filter(Boolean)
      : session.messageIds.map(id => {
          const m = getMessage(id);
          return m ? { id: m.id, direction: m.direction, inputType: m.inputType, timestamp: m.timestamp, questionId: m.questionId } : null;
        }).filter(Boolean);

    const signals = session.normalizedSignalIds
      .map(id => getSignal(id))
      .filter(Boolean);

    const pipelineResult = getPipelineResult(session.id);

    return {
      sessionId:   session.id,
      state:       session.state,
      phase:       session.phase,
      startedAt:   session.startedAt,
      lastActiveAt: session.lastActiveAt,
      completedAt: session.completedAt,
      dropoutType: session.dropoutType,
      detectedBarrierIds: session.detectedBarrierIds,
      detectedTriggerIds: session.detectedTriggerIds,
      detectedAmplifierIds: session.detectedAmplifierIds,
      resumePoint: session.resumePoint,
      messages,
      signals,
      pipelineResult: pipelineResult ? buildLogicMap(pipelineResult) : null,
    };
  });

  // Enrich reports with approvals
  const enrichedReports = reports.map(report => ({
    ...report,
    approvals: getApprovalsForReport(report.id),
    auditTrail: getAuditLogForEntity('report', report.id),
  }));

  // Case-level audit trail
  const caseAuditTrail = [
    ...getAuditLogForEntity('user', userId),
    ...sessions.flatMap(s => getAuditLogForEntity('session', s.id)),
    ...reports.flatMap(r => getAuditLogForEntity('report', r.id)),
  ].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

  return {
    caseId:   userId,
    user:     sanitizeUser(user),
    profile:  profile ? sanitizeProfile(profile) : null,
    sessions: enrichedSessions,
    reports:  enrichedReports,
    auditTrail: caseAuditTrail,
    summary: buildCaseSummary(user, profile, sessions, reports),
  };
}

// ─── Logic map ────────────────────────────────────────────────────────────────

/**
 * Build an inspectable logic map from a pipeline result.
 * Follows the FPP §4.1 traceability chain:
 *   Input → Detection → Interpretation → Applied Pattern → Output
 */
export function buildLogicMap(pipelineResult) {
  const { engines, summary } = pipelineResult;
  const { intake, interpretation, translation, implementation } = engines;

  return {
    input: {
      barrierScores: intake.barrierScores ?? {},
      meanScore: intake.meanScore,
      overallSeverity: intake.overallSeverity,
    },
    detection: {
      criticalBarriers: intake.criticalBarriers?.map(b => ({
        id: b.id,
        he: b.he,
        en: b.en,
        score: b.score,
      })) ?? [],
      patternsDetected: intake.patterns?.map(p => ({ id: p.id, he: p.he, en: p.en })) ?? [],
      clusterScores: intake.clusterScores ?? {},
    },
    interpretation: {
      riskFlags: interpretation.riskFlags?.map(f => ({
        id: f.id,
        severity: f.severity,
        he: f.he,
        action_he: f.action_he,
      })) ?? [],
      investmentPriorities: interpretation.investmentPriorities ?? [],
      trajectory: interpretation.trajectory ?? null,
    },
    appliedPatterns: {
      totalAccommodations: translation.summary?.totalAccommodations ?? 0,
      zeroCostPercentage: translation.summary?.zeroCostPercentage ?? 0,
      topRecommendations: translation.recommendations?.slice(0, 5).map(r => ({
        barrierId: r.barrierId,
        barrierName: r.barrierName,
        barrierScore: r.barrierScore,
        domain: r.domain,
        accommodations: r.accommodations?.slice(0, 2).map(a => ({
          action_he: a.action_he,
          cost: a.cost,
          timeframe: a.timeframe,
        })) ?? [],
      })) ?? [],
    },
    output: {
      procedureModules: implementation.applicableModules?.slice(0, 5).map(m => ({
        id: m.id,
        he: m.he,
        for_role: m.for_role,
      })) ?? [],
      summary,
    },
  };
}

// ─── Case summary ──────────────────────────────────────────────────────────────

/**
 * Build a compact status summary for the admin case list view.
 * Contains only pre-computed aggregates — no raw message or signal data.
 *
 * @param {object} user
 * @param {object | null} profile
 * @param {object[]} sessions
 * @param {object[]} reports
 * @returns {{ userId: string, channel: string, consentState: string, pendingReports: number, ... }}
 */
function buildCaseSummary(user, profile, sessions, reports) {
  const latestSession = sessions.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))[0] ?? null;
  const pendingReports = reports.filter(r => ['draft_generated', 'admin_review_required'].includes(r.state));
  const deliveredReports = reports.filter(r => ['delivered_to_user', 'sent_to_employer', 'archived'].includes(r.state));

  return {
    userId: user.id,
    channel: user.channel,
    consentState: user.consentState,
    disclosurePreference: profile?.disclosurePreference ?? 'no_disclosure',
    employmentStage: profile?.employmentContext?.employmentStage ?? null,
    currentSessionState: latestSession?.state ?? 'no_session',
    barriersCaptured: latestSession?.detectedBarrierIds?.length ?? 0,
    totalSessions: sessions.length,
    pendingReports: pendingReports.length,
    deliveredReports: deliveredReports.length,
    supportSafetyState: profile?.supportSafetyState?.state ?? 'nominal',
    lastActivity: latestSession?.lastActiveAt ?? user.createdAt,
  };
}

// ─── Sanitizers ───────────────────────────────────────────────────────────────

/**
 * Sanitize a User record for non-system_owner admin roles.
 * Omits: phoneNumber (system_owner only), any PII beyond what is listed below.
 * @param {object} user
 * @returns {{ id: string, channel: string, consentState: string, partnerSource: string | null, createdAt: string }}
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    channel: user.channel,
    consentState: user.consentState,
    partnerSource: user.partnerSource,
    createdAt: user.createdAt,
    // phoneNumber intentionally omitted — present only in system_owner view
  };
}

/**
 * Sanitize a UserProfile for the case workspace.
 * Omits raw interview history, admin review history, and other internal arrays.
 * Retains fields needed for the admin case page summary display.
 * @param {object} profile
 * @returns {object}
 */
function sanitizeProfile(profile) {
  return {
    disclosurePreference: profile.disclosurePreference,
    identityBasics: {
      preferredName: profile.identityBasics?.preferredName ?? null,
      ageGroup: profile.identityBasics?.ageGroup ?? null,
    },
    employmentContext: profile.employmentContext,
    supportSafetyState: profile.supportSafetyState,
    knowledgeContributionStatus: profile.knowledgeContributionStatus,
    updatedAt: profile.updatedAt,
  };
}
