/**
 * Admin Queues — FPP §6.1
 *
 * Five queues that surface actionable items for admin operators.
 * All queue functions are pure: they take store snapshots, not store references,
 * so they're easy to test and can run against any data source.
 */

// ─── Queue definitions ────────────────────────────────────────────────────────

/**
 * Queue 1: New users — created but not yet started or onboarded.
 * @param {import('./store.js').User[]} users
 * @param {import('./store.js').InterviewSession[]} sessions
 * @returns {Array}
 */
export function getNewUsersQueue(users, sessions) {
  const userIdWithSession = new Set(sessions.map(s => s.userId));
  return users
    .filter(u => !userIdWithSession.has(u.id))
    .map(u => ({
      userId: u.id,
      channel: u.channel,
      createdAt: u.createdAt,
      partnerSource: u.partnerSource,
      queueReason: 'no_session_started',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Queue 2: Active cases — sessions in progress (onboarding, active, paused, distress_hold).
 * @param {import('./store.js').InterviewSession[]} sessions
 * @param {import('./store.js').User[]} users
 * @returns {Array}
 */
export function getActiveCasesQueue(sessions, users) {
  const userMap = new Map(users.map(u => [u.id, u]));
  const ACTIVE_STATES = new Set(['onboarding', 'active', 'paused', 'distress_hold']);

  return sessions
    .filter(s => ACTIVE_STATES.has(s.state))
    .map(s => ({
      sessionId: s.id,
      userId: s.userId,
      channel: userMap.get(s.userId)?.channel ?? null,
      state: s.state,
      phase: s.phase,
      lastActiveAt: s.lastActiveAt,
      barriersCaptured: s.detectedBarrierIds?.length ?? 0,
      isDistressHold: s.state === 'distress_hold',
      queueReason: s.state === 'distress_hold' ? 'distress_hold' : 'active',
    }))
    .sort((a, b) => {
      // Distress holds first, then by last activity
      if (a.isDistressHold && !b.isDistressHold) return -1;
      if (!a.isDistressHold && b.isDistressHold) return 1;
      return new Date(b.lastActiveAt) - new Date(a.lastActiveAt);
    });
}

/**
 * Queue 3: Review required — reports awaiting admin approval before delivery.
 * @param {import('./store.js').ReportObject[]} reports
 * @param {import('./store.js').User[]} users
 * @returns {Array}
 */
export function getReviewRequiredQueue(reports, users) {
  const userMap = new Map(users.map(u => [u.id, u]));
  const REVIEW_STATES = new Set(['draft_generated', 'admin_review_required']);

  return reports
    .filter(r => REVIEW_STATES.has(r.state))
    .map(r => ({
      reportId: r.id,
      caseId: r.caseId,
      reportType: r.reportType,
      state: r.state,
      disclosureLevel: r.disclosureLevel,
      generatedAt: r.generatedAt,
      channel: userMap.get(r.caseId)?.channel ?? null,
      queueReason: r.state === 'draft_generated' ? 'needs_initial_review' : 'review_requested',
    }))
    .sort((a, b) => new Date(a.generatedAt) - new Date(b.generatedAt)); // oldest first
}

/**
 * Queue 4: Leads ready to export — leads in ready_for_export state.
 * @param {import('./store.js').LeadObject[]} leads
 * @returns {Array}
 */
export function getLeadsReadyQueue(leads) {
  return leads
    .filter(l => l.exportState === 'ready_for_export')
    .map(l => ({
      leadId: l.id,
      caseId: l.caseId,
      orgName: l.orgName,
      orgType: l.orgType,
      lectureOpportunityReason: l.lectureOpportunityReason,
      recommendedLectureAngle: l.recommendedLectureAngle,
      consentStatus: l.consentStatus,
      createdAt: l.createdAt,
      queueReason: 'ready_for_export',
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Queue 5: Knowledge/rule review — placeholder for Step 10 (Gap Visibility).
 * Returns empty array until Step 10 builds this out.
 * @returns {Array}
 */
export function getKnowledgeReviewQueue() {
  return []; // Populated in Step 10
}

// ─── Queue summary ────────────────────────────────────────────────────────────

/**
 * Build a summary of all queue counts for the admin dashboard.
 * @param {Object} storeSnapshot
 * @returns {Object}
 */
export function getQueueSummary({ users, sessions, reports, leads }) {
  return {
    newUsers:        getNewUsersQueue(users, sessions).length,
    activeCases:     getActiveCasesQueue(sessions, users).length,
    reviewRequired:  getReviewRequiredQueue(reports, users).length,
    leadsReady:      getLeadsReadyQueue(leads).length,
    knowledgeReview: 0,
    updatedAt: new Date().toISOString(),
  };
}
