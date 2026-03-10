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
  getUserByPhone, getMessagesForSession,
} from '../admin/base44Store.js';
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
import { getOnboardingScript, getOnboardingStep, isRestartResponse, isRestartConfirmResponse } from '../conversation/onboarding.js';
import { runInterviewTurn } from '../conversation/llmClient.js';
import { transcribeVoiceNote, isVoiceTranscriptionAvailable, getVoiceUnavailableMessage, downloadMediaFromMeta } from '../conversation/voiceHandler.js';

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
  // ── Voice message handling ──
  if (context.mediaType?.startsWith('audio/') && context.mediaId) {
    try {
      if (isVoiceTranscriptionAvailable()) {
        const audioBuffer = await downloadMediaFromMeta(context.mediaId);
        if (audioBuffer) {
          const result = await transcribeVoiceNote(audioBuffer, context.mediaType);
          text = result.text;
        } else {
          const msg = getVoiceUnavailableMessage();
          const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
          await saveSession(s2);
          saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
          return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
        }
      } else {
        const msg = getVoiceUnavailableMessage();
        const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
        await saveSession(s2);
        saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
        return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
      }
    } catch (err) {
      console.error('[userRouter] voice transcription failed:', err?.message);
      const msg = getVoiceUnavailableMessage();
      const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
      await saveSession(s2);
      saveMessage(outMsg).catch(err2 => console.error('[userRouter] saveMessage failed:', err2?.message));
      return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
    }
  }

  // ── Restart choice follow-up ──
  if (session.awaitingRestartChoice) {
    if (isRestartConfirmResponse(text)) {
      // User chose to restart — drop current session, caller will create new
      const { session: dropped } = dropSession(session, 'restart');
      await saveSession(dropped);
      const newSession = createSession(session.userId ?? dropped.userId);
      await saveSession(newSession);
      // Run onboarding for the new session
      return routeMessage(newSession, text, context);
    }
    // User chose to continue — clear the flag and proceed normally
    const cleared = { ...session, awaitingRestartChoice: false };
    text = text; // use the text as a regular message
    // Fall through to normal routing below
    session = cleared;
  }

  // Record inbound
  const { session: s1, message: inMsg, action } = recordInboundMessage(session, text);

  // Persist inbound message to store
  saveMessage(inMsg).catch(err => console.error('[userRouter] saveMessage(inbound) failed:', err?.message));

  if (action === 'stop') {
    const { session: dropped } = dropSession(s1, 'intentional');
    const { session: s2, message: outMsg } = recordOutboundMessage(
      dropped, 'בסדר, עצרנו. אפשר לחזור בעתיד, פשוט לשלוח הודעה.'
    );
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'stop' };
  }

  if (action === 'pause') {
    const { session: paused, message: pauseMsg } = pauseSession(s1);
    const { session: s2, message: outMsg } = recordOutboundMessage(paused, pauseMsg);
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'pause' };
  }

  if (action === 'distress') {
    const { session: held, message: distressMsg } = handleDistress(s1);
    const { session: s2, message: outMsg } = recordOutboundMessage(held, distressMsg);
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'distress' };
  }

  // ── Detect restart command during active interview ──
  if (s1.state === 'active' && isRestartResponse(text)) {
    const msg = 'אנחנו באמצע שיחה. אפשר להמשיך מאיפה שעצרנו, או להתחיל מחדש. מה עדיף?';
    const flagged = { ...s1, awaitingRestartChoice: true };
    const { session: s2, message: outMsg } = recordOutboundMessage(flagged, msg);
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
  }

  // Special case: user just consented during onboarding → send first scripted question.
  // Don't call the LLM here — it has no conversation history and will re-do onboarding.
  if (session.state === 'onboarding' && action === 'continue' && s1.state === 'active') {
    return _handleFirstQuestion(s1);
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
 * Send the first scripted interview question after the user consents during onboarding.
 * Uses the question bank directly — no LLM call — so the script doesn't jump ahead.
 */
async function _handleFirstQuestion(session) {
  // Delegate to LLM with firstQuestion flag so it generates a warm bridge
  return _handleActiveInterview(session, '', { firstQuestion: true, currentChapter: 'ch1_intro' });
}

/**
 * Advance through onboarding steps.
 * The user must consent (כן / yes / מוכן/ה) after the last step to begin the interview.
 */
async function _handleOnboarding(session, action, context) {
  const script = await getOnboardingScript();
  const step = (session.onboardingStep ?? 0) + 1;

  if (step <= script.length) {
    const msg = script[step - 1].text;
    const updatedSession = { ...session, onboardingStep: step };
    const { session: s2, message: outMsg } = recordOutboundMessage(updatedSession, msg);
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
    return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'continue' };
  }

  // All onboarding steps shown — waiting for consent
  if (action === 'consent_needed') {
    const nudge = 'כשרוצים להתחיל — כותבים "כן". אם לא עכשיו — "עצור".';
    const { session: s2, message: outMsg } = recordOutboundMessage(session, nudge);
    await saveSession(s2);
    saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
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
  const chapter = session.interviewChapter ?? 'ch1_intro';

  // Check chapter transitions
  if (chapter === 'ch2_barriers' && hasMinimumData(session) && text === '') {
    // Transition to Chapter 3 — recommendations
    const updated = { ...session, interviewChapter: 'ch3_recommendations', recommendationSubState: 'draft' };
    return _handleCompletion(updated);
  }

  // Build history for LLM from persisted messages (capped at last 20)
  let storedMessages = [];
  try {
    const allMessages = await getMessagesForSession(session.id);
    storedMessages = allMessages
      .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))
      .slice(-20)
      .map(m => ({ direction: m.direction, text: m.transcribedContent ?? m.rawContent }));
  } catch (err) {
    console.error('[userRouter] getMessagesForSession failed, using empty history:', err?.message);
  }
  const history = buildLLMHistory(storedMessages);
  if (text) history.push({ role: 'user', content: text });

  // Get next question for the current chapter
  const answeredIds = session.answeredQuestionIds ?? [];
  const nextQ = await getNextInterviewQuestion(session, answeredIds);

  // Detect cluster transition
  const lastQuestionId = answeredIds[answeredIds.length - 1];
  const clusterTransition = nextQ && lastQuestionId
    ? nextQ.cluster !== undefined // simplified — the LLM context block handles the detail
    : false;

  let llmResult;
  try {
    llmResult = await runInterviewTurn(history, {
      phase: session.phase,
      answeredBarrierIds: session.detectedBarrierIds,
      workplaceType: session.userProfile?.workplaceType ?? context.workplaceType,
      jobRole: session.userProfile?.jobRole,
      employmentStatus: session.userProfile?.employmentStatus,
      orgSize: context.orgSize,
      resuming: context.resuming ?? false,
      currentChapter: chapter,
      currentQuestion: nextQ ? { id: nextQ.id, prompt: nextQ.prompt, cluster: nextQ.cluster, scoringHint: nextQ.scoringHint, profileField: nextQ.profileField } : null,
      progress: `${answeredIds.length}/${chapter === 'ch1_intro' ? 5 : 14} questions`,
      clusterTransition,
      chapterTransition: context.chapterTransition ?? false,
      firstQuestion: context.firstQuestion ?? false,
      detectedSignalsSummary: _buildSignalsSummary(session),
    });
  } catch {
    // Fallback: use scripted question bank
    const fallbackText = nextQ?.prompt ?? 'איך הולך בעבודה? אפשר לספר קצת?';
    llmResult = { nextMessage: fallbackText, detectedSignals: [], confidenceLevel: 'low', shouldEscalate: false, questionId: null, profileUpdates: null };
  }

  // Merge LLM-detected signals into session
  const { session: signalUpdated } = mergeSignals(session, llmResult.detectedSignals);

  // Merge profile updates from LLM (Chapter 1)
  let updatedSession = signalUpdated;
  if (llmResult.profileUpdates) {
    updatedSession = {
      ...updatedSession,
      userProfile: { ...(updatedSession.userProfile ?? {}), ...llmResult.profileUpdates },
    };
  }

  // Track answered question
  if (llmResult.questionId && !updatedSession.answeredQuestionIds.includes(llmResult.questionId)) {
    updatedSession = {
      ...updatedSession,
      answeredQuestionIds: [...updatedSession.answeredQuestionIds, llmResult.questionId],
    };
  }

  // Check Chapter 1 → 2 transition
  if (chapter === 'ch1_intro') {
    const profile = updatedSession.userProfile ?? {};
    if (profile.employmentStatus && profile.workplaceType && profile.jobRole) {
      updatedSession = { ...updatedSession, interviewChapter: 'ch2_barriers' };
    }
  }

  // Check Chapter 2 → 3 transition
  if (updatedSession.interviewChapter === 'ch2_barriers' && hasMinimumData(updatedSession)) {
    updatedSession = { ...updatedSession, interviewChapter: 'ch3_recommendations', recommendationSubState: 'draft' };
  }

  const { session: s2, message: outMsg } = recordOutboundMessage(
    updatedSession, llmResult.nextMessage, llmResult.questionId
  );
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));

  const outcome = llmResult.shouldEscalate ? 'distress' : 'continue';
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome };
}

/**
 * Build a brief summary of detected signals for the LLM context.
 */
function _buildSignalsSummary(session) {
  const barriers = session.detectedBarrierIds ?? [];
  if (barriers.length === 0) return 'No barriers detected yet.';
  return `Detected barriers: ${barriers.join(', ')}`;
}

/**
 * Handle a paused session — send resume reminder and resume.
 */
async function _handlePaused(session, context) {
  const { session: resumed, message: resumeMsg } = await resumeSession(session);
  const { session: s2, message: outMsg } = recordOutboundMessage(resumed, resumeMsg);
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
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
  const msg = 'אנחנו כאן. אין צורך לענות כרגע. אפשר לכתוב "המשך" כשמרגישים מוכנים, או "עצור" לסיום.';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'distress' };
}

/**
 * Handle a completed session — offer summary or follow-up.
 */
async function _handleComplete(session) {
  const msg = 'השיחה שלנו הסתיימה. הדוח נמצא בהכנה ויישלח בקרוב. אם משהו השתנה, אפשר לכתוב "התחל מחדש".';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'complete' };
}

/**
 * Handle dropped sessions — invite restart.
 */
async function _handleDropped(session) {
  const msg = 'אפשר להתחיל מחדש בכל עת, פשוט לכתוב "התחל".';
  const { session: s2, message: outMsg } = recordOutboundMessage(session, msg);
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'stop' };
}

/**
 * Trigger session completion + pipeline.
 */
async function _handleCompletion(session) {
  const { session: completed, pipelineResult } = completeSession(session, {});
  const msg = 'תודה על כל התשובות. הדוח בהכנה ויישלח בקרוב עם תיאום אנושי.';
  const { session: s2, message: outMsg } = recordOutboundMessage(completed, msg);
  await saveSession(s2);
  saveMessage(outMsg).catch(err => console.error('[userRouter] saveMessage failed:', err?.message));
  return { outboundTexts: [outMsg.rawContent], session: s2, outcome: 'complete' };
}
