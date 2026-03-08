/**
 * InterviewStateMachine — FPP §9.2
 *
 * Governs the lifecycle of an InterviewSession.
 *
 * State diagram:
 *   not_started → onboarding → active ──┬→ paused → active (resume)
 *                                        ├→ distress_hold → active (resume)
 *                                        ├→ complete               (terminal)
 *                                        ├→ dropped_silent          (terminal)
 *                                        ├→ dropped_distress        (terminal)
 *                                        └→ dropped_trust           (terminal)
 *
 * Dropout types (FPP §2.5):
 *   - dropped_silent:   user stopped responding (no explicit signal)
 *   - dropped_distress: session ended due to distress escalation
 *   - dropped_trust:    user explicitly stopped due to trust/consent concerns
 */

export const INTERVIEW_STATES = {
  NOT_STARTED:      'not_started',
  ONBOARDING:       'onboarding',
  ACTIVE:           'active',
  PAUSED:           'paused',
  DISTRESS_HOLD:    'distress_hold',
  COMPLETE:         'complete',
  DROPPED_SILENT:   'dropped_silent',
  DROPPED_DISTRESS: 'dropped_distress',
  DROPPED_TRUST:    'dropped_trust',
};

/**
 * Valid state transitions.
 * Keys are source states; values are arrays of allowed destination states.
 * Any transition not listed here will be rejected by transitionInterview().
 * @type {Record<string, string[]>}
 */
const TRANSITIONS = {
  not_started:      ['onboarding'],
  onboarding:       ['active', 'dropped_trust'],
  active:           ['paused', 'distress_hold', 'complete', 'dropped_silent', 'dropped_distress', 'dropped_trust'],
  paused:           ['active', 'dropped_silent', 'dropped_trust'],
  distress_hold:    ['active', 'dropped_distress'],
  complete:         [],  // terminal
  dropped_silent:   [],  // terminal
  dropped_distress: [],  // terminal
  dropped_trust:    [],  // terminal
};

/**
 * Check whether a state transition is permitted.
 * @param {string} from - Current interview state
 * @param {string} to   - Desired next state
 * @returns {boolean}
 */
export function isValidTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Transition an InterviewSession to a new state.
 * @param {import('../models/interviewSession.js').InterviewSession} session
 * @param {string} toState
 * @param {{ dropoutType?: string, resumePoint?: object }} [opts]
 * @returns {import('../models/interviewSession.js').InterviewSession}
 */
export function transitionInterview(session, toState, opts = {}) {
  if (!isValidTransition(session.state, toState)) {
    throw new Error(`Invalid interview transition: ${session.state} → ${toState}`);
  }

  const now = new Date().toISOString();
  const updated = { ...session, state: toState, lastActiveAt: now };

  if (toState === 'complete') updated.completedAt = now;

  if (opts.dropoutType) updated.dropoutType = opts.dropoutType;
  if (opts.resumePoint) updated.resumePoint = opts.resumePoint;

  // Clear resume point when resuming
  if (toState === 'active' && session.state === 'paused') {
    updated.resumePoint = null;
  }

  return updated;
}
