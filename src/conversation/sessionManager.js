/**
 * SessionManager — FPP §2.3B, §2.5
 *
 * Manages the full interview session lifecycle:
 *   create → onboard → interview turns → distress handling → complete → pipeline
 *
 * Connects:
 * - InterviewSession model (src/core/models/interviewSession.js)
 * - InterviewStateMachine (src/core/state/interviewState.js)
 * - NormalizedSignal model (src/core/models/normalizedSignal.js)
 * - Message model (src/core/models/message.js)
 * - Reasoning pipeline (src/pipeline/index.js)
 */

import { createInterviewSession } from '../core/models/interviewSession.js';
import { createMessage } from '../core/models/message.js';
import { createNormalizedSignal } from '../core/models/normalizedSignal.js';
import { transitionInterview } from '../core/state/interviewState.js';
import { runPipeline } from '../pipeline/index.js';
import {
  isConsentResponse,
  isStopResponse,
  isPauseResponse,
  isSkipResponse,
  RESUME_REMINDER,
} from './onboarding.js';
import {
  isDistressSignal,
  getDistressResponse,
  getDistressCheckIn,
  getNextQuestion,
  estimateProgress,
  QUESTION_BANK,
} from './interviewer.js';

// ─── Session creation ─────────────────────────────────────────────────────────

/**
 * Create a new interview session for a user.
 * @param {string} userId
 * @param {string} [phase='pre_employment']
 * @returns {import('../core/models/interviewSession.js').InterviewSession}
 */
export function createSession(userId, phase = 'pre_employment') {
  const session = createInterviewSession({ userId, phase, state: 'not_started' });
  return transitionInterview(session, 'onboarding');
}

// ─── Session resumption ───────────────────────────────────────────────────────

/**
 * Resume a paused session. Returns the session and the resume reminder message.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {{ session: object, message: string }}
 */
export function resumeSession(session) {
  if (session.state !== 'paused') {
    throw new Error(`Cannot resume session in state: ${session.state}`);
  }
  const resumed = transitionInterview(session, 'active');
  const answeredCount = resumed.detectedBarrierIds?.length ?? 0;
  const progress = estimateProgress(getAnsweredQuestionIds(resumed));

  const contextMessage = `${RESUME_REMINDER}\n\n_התקדמות: ${progress}% מהשאלות ענית/ה._`;
  return { session: resumed, message: contextMessage };
}

// ─── Inbound message handling ─────────────────────────────────────────────────

/**
 * Record an inbound user message and update session state.
 *
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {string} text
 * @param {string | null} [questionId] - The question this message answers
 * @returns {{
 *   session: object,
 *   message: import('../core/models/message.js').Message,
 *   action: 'continue' | 'pause' | 'stop' | 'distress' | 'skip' | 'consent_needed'
 * }}
 */
export function recordInboundMessage(session, text, questionId = null) {
  // Build message object
  const message = createMessage({
    sessionId: session.id,
    direction: 'inbound',
    inputType: 'text',
    rawContent: text,
    transcribedContent: text,
    questionId,
  });

  let updatedSession = {
    ...session,
    messageIds: [...session.messageIds, message.id],
    lastActiveAt: new Date().toISOString(),
  };

  // Detect command intent
  if (isStopResponse(text))   return { session: updatedSession, message, action: 'stop' };
  if (isPauseResponse(text))  return { session: updatedSession, message, action: 'pause' };
  if (isSkipResponse(text))   return { session: updatedSession, message, action: 'skip' };

  // Consent check during onboarding
  if (session.state === 'onboarding') {
    if (!isConsentResponse(text)) {
      return { session: updatedSession, message, action: 'consent_needed' };
    }
    updatedSession = transitionInterview(updatedSession, 'active');
    return { session: updatedSession, message, action: 'continue' };
  }

  // Distress detection during active interview
  if (session.state === 'active' && isDistressSignal(text)) {
    return { session: updatedSession, message, action: 'distress' };
  }

  return { session: updatedSession, message, action: 'continue' };
}

/**
 * Record an outbound system message.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {string} text
 * @param {string | null} [questionId]
 * @returns {{ session: object, message: object }}
 */
export function recordOutboundMessage(session, text, questionId = null) {
  const message = createMessage({
    sessionId: session.id,
    direction: 'outbound',
    inputType: 'text',
    rawContent: text,
    transcribedContent: text,
    questionId,
  });

  const updatedSession = {
    ...session,
    messageIds: [...session.messageIds, message.id],
    lastActiveAt: new Date().toISOString(),
  };

  return { session: updatedSession, message };
}

// ─── Signal normalization ─────────────────────────────────────────────────────

/**
 * Normalize a user answer into a NormalizedSignal.
 *
 * This is a heuristic pre-LLM normalization for structured questionnaire answers.
 * The LLM (llmClient.runInterviewTurn) also produces detectedSignals — both are merged.
 *
 * @param {string} text - User message text
 * @param {string | null} questionId - Source question ID
 * @param {string[]} barrierIds - Barriers this question targets
 * @param {number | null} [explicitScore] - Explicit numeric score (1-5) if detected
 * @returns {import('../core/models/normalizedSignal.js').NormalizedSignal}
 */
export function normalizeBarrierSignal(text, questionId, barrierIds, explicitScore = null) {
  const score = explicitScore ?? guessScoreFromText(text);
  return createNormalizedSignal({
    signalType: 'barrier_score',
    value: score,
    confidence: score !== null ? 0.8 : 0.4,
    barrierIds: barrierIds ?? [],
    questionId,
  });
}

/**
 * Heuristic: extract a 1-5 score from free text if present.
 * @param {string} text
 * @returns {number | null}
 */
function guessScoreFromText(text) {
  // Explicit digits 1-5
  const digitMatch = text.match(/\b([1-5])\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  // Hebrew intensity words
  const lower = text.toLowerCase();
  if (/(בכלל לא|אין בעיה|לגמרי לא)/.test(lower)) return 1;
  if (/(מעט|קצת|לפעמים|לא הרבה)/.test(lower))    return 2;
  if (/(במידה מסוימת|לא תמיד|לפעמים כן)/.test(lower)) return 3;
  if (/(הרבה|לעיתים קרובות|כן בהחלט)/.test(lower))    return 4;
  if (/(מאוד|נורא|תמיד|כל הזמן|קשה מאוד)/.test(lower)) return 5;

  return null;
}

/**
 * Merge LLM-detected signals into the session's signal list.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {Array} llmSignals - detectedSignals from runInterviewTurn
 * @returns {object} Updated session
 */
export function mergeSignals(session, llmSignals) {
  if (!llmSignals?.length) return session;

  const newBarrierIds = llmSignals
    .flatMap(s => s.barrierIds ?? [])
    .filter(id => !session.detectedBarrierIds.includes(id));

  return {
    ...session,
    detectedBarrierIds: [...session.detectedBarrierIds, ...newBarrierIds],
    normalizedSignalIds: [...session.normalizedSignalIds, ...llmSignals.map((_, i) => `sig-${Date.now()}-${i}`)],
  };
}

// ─── Distress handling ────────────────────────────────────────────────────────

/**
 * Handle a distress signal — pause the interview and return containment message.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {{ session: object, message: string }}
 */
export function handleDistress(session) {
  const updated = transitionInterview(session, 'distress_hold', { dropoutType: null });
  return { session: updated, message: getDistressResponse() };
}

/**
 * Resume from distress hold (user indicates they are okay).
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {{ session: object, message: string }}
 */
export function resumeFromDistressHold(session) {
  const resumed = transitionInterview(session, 'active');
  return { session: resumed, message: 'בסדר, בואו נמשיך בקצב שלך. אפשר לדלג על שאלות בכל עת.' };
}

// ─── Pause and stop ───────────────────────────────────────────────────────────

/**
 * Pause the session and save resume point.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {string | null} [currentQuestionId]
 * @returns {{ session: object, message: string }}
 */
export function pauseSession(session, currentQuestionId = null) {
  const updated = transitionInterview(session, 'paused', {
    resumePoint: currentQuestionId
      ? { questionId: currentQuestionId, savedAt: new Date().toISOString() }
      : null,
  });
  return {
    session: updated,
    message: 'שמרתי את המקום. אפשר לחזור בכל עת — נמשיך בדיוק מאיפה שעצרנו.',
  };
}

/**
 * Drop the session (user explicitly stopped or silent dropout).
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {'intentional' | 'silent' | 'distress' | 'trust'} dropoutType
 * @returns {{ session: object }}
 */
export function dropSession(session, dropoutType = 'intentional') {
  const targetState = dropoutType === 'distress' ? 'dropped_distress'
    : dropoutType === 'trust' ? 'dropped_trust'
    : 'dropped_silent';

  const updated = transitionInterview(session, targetState, { dropoutType });
  return { session: updated };
}

// ─── Session completion + pipeline trigger ────────────────────────────────────

/**
 * Complete the interview and run the reasoning pipeline.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {{ [barrierIdOrQuestionId: string]: number }} responses - Collected barrier scores
 * @param {Object} [pipelineOptions]
 *   @param {string} [pipelineOptions.orgReadiness='basic']
 *   @param {string} [pipelineOptions.audience='hr']
 * @returns {{ session: object, pipelineResult: object }}
 */
export function completeSession(session, responses, pipelineOptions = {}) {
  const completed = transitionInterview(session, 'complete');

  const pipelineResult = runPipeline({
    responses,
    phase: session.phase,
    orgReadiness: pipelineOptions.orgReadiness ?? 'basic',
    audience: pipelineOptions.audience ?? 'hr',
  });

  return { session: completed, pipelineResult };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a conversation history array for the LLM from session message records.
 * Each message record here is a simplified {direction, text} object
 * (since full Message objects are stored by ID, not inline in the session).
 *
 * @param {Array<{ direction: string, text: string }>} messageRecords
 * @returns {Array<{ role: 'user'|'assistant', content: string }>}
 */
export function buildLLMHistory(messageRecords) {
  return messageRecords.map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.text,
  }));
}

/**
 * Get next question for the current session state.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @param {string[]} answeredQuestionIds
 * @returns {import('../conversation/interviewer.js').QUESTION_BANK[0] | null}
 */
export function getNextInterviewQuestion(session, answeredQuestionIds = []) {
  return getNextQuestion(answeredQuestionIds, session.detectedBarrierIds);
}

/**
 * Check if the interview has enough data to complete.
 * Minimum: scores for at least 7 of the 13 barriers (FPP pilot threshold).
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {boolean}
 */
export function hasMinimumData(session) {
  return session.detectedBarrierIds.length >= 7;
}

/**
 * Extract answered question IDs from session (derived from messageIds).
 * In full persistence, these would come from the message store.
 * For now, returns the question IDs tracked in the resume point and detected barriers.
 */
function getAnsweredQuestionIds(session) {
  // Heuristic: map detected barrier IDs to their canonical question IDs
  return QUESTION_BANK
    .filter(q => q.barrierIds.some(id => session.detectedBarrierIds.includes(id)))
    .map(q => q.id);
}

/**
 * Get distress check-in message (for after high-intensity questions).
 * @returns {string}
 */
export { getDistressCheckIn };
