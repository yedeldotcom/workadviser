/**
 * InterviewSession — FPP §9.1
 *
 * One interview/interaction session with a user.
 * Managed by InterviewStateMachine (src/core/state/interviewState.js).
 */

/**
 * @typedef {'not_started' | 'onboarding' | 'active' | 'paused' |
 *           'distress_hold' | 'complete' |
 *           'dropped_silent' | 'dropped_distress' | 'dropped_trust'} InterviewStateValue
 *
 * @typedef {'intentional' | 'silent' | 'distress' | 'trust'} DropoutType
 *
 * @typedef {Object} InterviewSession
 * @property {string} id
 * @property {string} userId
 * @property {InterviewStateValue} state
 * @property {string} phase               - Coaching phase (pre_employment | early | established | retention_risk | return)
 * @property {string} startedAt           - ISO
 * @property {string | null} lastActiveAt - ISO
 * @property {string | null} completedAt  - ISO
 * @property {string[]} messageIds
 * @property {string[]} normalizedSignalIds
 * @property {string[]} detectedBarrierIds
 * @property {string[]} detectedTriggerIds
 * @property {string[]} detectedAmplifierIds
 * @property {Object | null} consentSnapshot   - Snapshot of consent at session start
 * @property {DropoutType | null} dropoutType
 * @property {{ questionId: string, savedAt: string } | null} resumePoint
 */

export function createInterviewSession(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    userId: fields.userId ?? null,
    state: fields.state ?? 'not_started',
    phase: fields.phase ?? 'pre_employment',
    startedAt: fields.startedAt ?? now,
    lastActiveAt: fields.lastActiveAt ?? now,
    completedAt: fields.completedAt ?? null,
    messageIds: fields.messageIds ?? [],
    normalizedSignalIds: fields.normalizedSignalIds ?? [],
    detectedBarrierIds: fields.detectedBarrierIds ?? [],
    detectedTriggerIds: fields.detectedTriggerIds ?? [],
    detectedAmplifierIds: fields.detectedAmplifierIds ?? [],
    consentSnapshot: fields.consentSnapshot ?? null,
    dropoutType: fields.dropoutType ?? null,
    resumePoint: fields.resumePoint ?? null,
  };
}
