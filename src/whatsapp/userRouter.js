/**
 * WhatsApp User Router — FPP §7
 *
 * Handles the per-message routing logic:
 *   1. Find or create User from phone number
 *   2. Find or create InterviewSession for that user
 *   3. Route inbound message to the correct handler based on session state
 *   4. Return outbound message(s) to send back
 *
 * Session state routing:
 *   not_started / onboarding → advance onboarding steps, detect consent
 *   active                   → run interview turn (LLM)
 *   paused                   → send resume reminder and resume
 *   distress_hold            → send containment; do not escalate
 *   complete                 → confirm complete; offer follow-up
 *   dropped_*                → offer restart
 *
 * This module is pure routing logic — it does not send messages.
 * Callers (webhook.js) call sendMessage() with the returned text(s).
 */

import { createUser } from '../core/models/user.js';
import { createUserProfile } from '../core/models/userProfile.js';
import {
  saveUser, saveProfile, saveSession, saveMessage, getSessionsForUser,
  getUserByPhone,
} from '../admin/store.js';
import {
  createSession,
  resumeSession,
  recordInboundMessage,
  recordOutboundMessage,
  handleDistress,
  pauseSession,
  dropSession,
  completeSession,
  getNextInterviewQuestion,
  hasMinimumData,
  mergeSignals,
  buildLLMHistory,
} from '../conversation/sessionManager.js';
import { getOnboardingScript, getOnboardingStep } from '../conversation/onboarding.js';
import { runInterviewTurn } from '../conversation/llmClient.js';

// ─── User/session bootstrapping ────────────────────────────────────────────────

/**
 * Find an existing user by phone number, or create a new one.
 * Also creates a UserProfile if the user is new.
 *
 * @param {string} phoneNumber  - E.164 format (e.g. '+972501234567')
 * @param {object} [opts]
 * @param {string} [opts.partnerSource]  - Referring partner org ID
 * @returns {{ user: import('../core/models/user.js').User, isNew: boolean }}
 */
export async function findOrCreateUser(phoneNumber, opts = {}) {
  const existing = await getUserByPhone(phoneNumber);
  if (existing) return { user: existing, isNew: false };

  const user = createUser({
    channel: 'whatsapp',
    phoneNumber,
    partnerSource: opts.partnerSource ?? null,
  });
  await saveUser(user);

  const profile = createUserProfile({ userId: user.id });
  await saveProfile(profile);

  return { user, isNew: true };
}

/**
 * Find the most recent active/onboarding/paused session for a user,
 * or create a new one if none exists (or only completed/dropped sessions exist).
 *
 * @param {string} userId
 * @returns {{ session: object, isNew: boolean }}
 */
export async function findOrCreateSession(userId) {
  const sessions = await getSessionsForUser(userId);

  // Prefer sessions that are still in-progress
  const IN_PROGRESS = ['onboarding', 'active', 'paused', 'distress_hold'];
  const live = sessions
    .filter(s => IN_PROGRESS.includes(s.state))
    .sort((a, b) => new Date(b.lastActiveAt ?? b.createdAt) - new Date(a.lastActiveAt ?? a.createdAt));

  if (live.length > 0) return { session: live[0], isNew: false };

  // Create a fresh session
  const session = createSession(userId);
  await saveSession(session);
  return { session, isNew: true };
}

// ─── Message routing ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} RouteResult
 * @property {string[]} outboundTexts   - Messages to send back (in order)
 * @property {object} session           - Updated session (caller should saveSession)
 * @property {'continue'|'pause'|'stop'|'distress'|'complete'|'error'} outcome
 */

/**
 * Route an inbound WhatsApp message through the session state machine.
 *
 * Returns outbound text(s) and the updated session — caller saves and sends.
 *
 * @param {object} session - Current InterviewSession
 * @param {string} text    - Inbound message text
 * @param {object} [context] - Extra context for LLM turn
 * @returns {Promise<RouteResult>}
 */
export async function routeMessage(session, text, context = {}) {
  // Record inbound
  const { session: s1, message: inMsg, action } = recordInboundMessage(session, text);

  if (action === 'stop') {
    const { session: dropped } = dropSession(s1, 'intentional');
    const { session: s2, message: outMsg } = recordOutboundMessage(
      dropped, 'בסדר, עצרנו. אם תרצה/י לחזור בעתיד, פשוט שלח/י הודעה.'
    );
    await saveSession(s2);
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'stop' };
  }

  if (action === 'pause') {
    const { session: paused, message: pauseMsg } = pauseSession(s1);
    const { session: s2, message: outMsg } = recordOutboundMessage(paused, pauseMsg);
    await saveSession(s2);
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'pause' };
  }

  if (action === 'distress') {
    const { session: held, message: distressMsg } = handleDistress(s1);
    const { session: s2, message: outMsg } = recordOutboundMessage(held, distressMsg);
    await saveSession(s2);
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'distress' };
  }

  // State-specific routing
  switch (s1.state) {
    case 'onboarding':
      return _handleOnboarding(s1, action, context);

    case 'active':
      return _handleActiveInterview(s1, text, context);

    case 'paused':
      return _handlePaused(s1, context);

    case 'distress_hold':
      return _handleDistressHold(s1, text);

    case 'complete':
      return _handleComplete(s1);

    default:
      // dropped or unknown — offer restart
      return _handleDropped(s1);
  }
}

// ─── State handlers ───────────────────────────────────────────────────────────

/**
 * Advance through onboarding steps.
 * The user must consent (כן / yes / מוכן/ה) after the last step to begin the interview.
 */
async function _handleOnboarding(session, action, context) {
  const script = getOnboardingScript();
  const step = (session.onboardingStep ?? 0) + 1;

  if (step <= script.length) {
    const msg = script[step - 1].text;
    const updatedSession = { ...session, onboardingStep: step };
    const { session: s2, message: outMsg } = recordOutboundMessage(updatedSession, msg);
    await saveSession(s2);
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
  }

  // All onboarding steps shown — waiting for consent
  if (action === 'consent_needed') {
    const nudge = 'אשמח לקבל "כן" כדי להתחיל. או "עצור" אם שינית את דעתך.';
    const { session: s2, message: outMsg } = recordOutboundMessage(session, nudge);
    await saveSession(s2);
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
  }

  // Consent given — send first interview question via LLM
  return _handleActiveInterview(session, '', { ...context, resuming: false });
}

/**
 * Run a live interview turn using the LLM.
 * Falls back to a scripted question if the LLM call fails.
 */
async function _handleActiveInterview(session, text, context) {
  // Check if we have enough data to complete
  if (hasMinimumData(session) && text === '') {
    return _handleCompletion(session);
  }

  // Build history for LLM (simplified — real history comes from message store)
  const history = buildLLMHistory([]); // Empty for now; full history requires message store lookup
  if (text) history.push({ role: 'user', content: text });

  let llmResult;
  try {
    llmResult = await runInterviewTurn(history, {
      phase: session.phase,
      answeredBarrierIds: session.detectedBarrierIds,
      workplaceType: context.workplaceType,
      orgSize: context.orgSize,
      resuming: context.resuming ?? false,
    });
  } catch {
    // Fallback: use scripted question bank
    const answeredIds = session.detectedBarrierIds.map(id => `q-${id}`);
    const nextQ = getNextInterviewQuestion(session, answeredIds);
    const fallbackText = nextQ?.text_he ?? 'איך הולך לך בעבודה? אפשר לספר קצת?';
    llmResult = { nextMessage: fallbackText, detectedSignals: [], confidenceLevel: 'low', shouldEscalate: false, questionId: null };
  }

  // Merge LLM-detected signals into session
  const updatedSession = mergeSignals(session, llmResult.detectedSignals);

  const { session: s2, message: outMsg } = recordOutboundMessage(
    updatedSession, llmResult.nextMessage, llmResult.questionId
  );
  saveSession(s2);

  const outcome = llmResult.shouldEscalate ? 'distress' : 'continue';
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome };
}

/**
 * Handle a paused session — send resume reminder and resume.
 */
async function _handlePaused(session, context) {
  const { session: resumed, message: resumeMsg } = resumeSession(session);
  const { session: s2, message: outMsg } = recordOutboundMessage(resumed, resumeMsg);
  // Then send first question
  saveSession(s2);
  const next = await _handleActiveInterview(s2, '', context);
  return {
    outboundTexts: [outMsg.rawContent, ...next.outboundTexts],
    session: next.session,
    outcome: next.outcome,
  };
}

/**
 * Handle a distress hold — check if user is okay before resuming.
 */
async function _handleDistressHold(session, text) {
  // Simple containment — not resuming automatically
  const msg = 'אנחנו כאן. לא צריך/ה לענות כרגע. אפשר לכתוב "המשך" כשמוכן/ה, או "עצור" לסיום.';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  saveSession(s2);
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'distress' };
}

/**
 * Handle a completed session — offer summary or follow-up.
 */
async function _handleComplete(session) {
  const msg = 'השיחה שלנו הסתיימה. הדוח שלך נמצא בהכנה ויישלח בקרוב. אם משהו השתנה, ניתן לכתוב "התחל מחדש".';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  saveSession(s2);
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'complete' };
}

/**
 * Handle dropped sessions — invite restart.
 */
async function _handleDropped(session) {
  const msg = 'אם תרצה/י להתחיל מחדש, פשוט כתוב/י "התחל".';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  saveSession(s2);
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'stop' };
}

/**
 * Trigger session completion + pipeline.
 */
async function _handleCompletion(session) {
  const { session: completed, pipelineResult } = completeSession(session, {});
  const msg = 'תודה שענית על כל השאלות. הדוח שלך בהכנה ויישלח עם תיאום אנושי.';
  const { session: s2, message: outMsg } = recordOutboundMessage(completed, msg);
  saveSession(s2);
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'complete' };
}
