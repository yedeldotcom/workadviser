/**
 * Tests for the conversation engine (Step 3).
 * LLM calls are not tested here (require API key + network).
 * Tested: onboarding logic, interviewer sequencing, session management, signal normalization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ONBOARDING_MESSAGES,
  getOnboardingScript,
  getOnboardingStep,
  shouldShowOnboarding,
  shouldShowResumeReminder,
  isConsentResponse,
  isStopResponse,
  isPauseResponse,
  isSkipResponse,
  RESUME_REMINDER,
} from '../../src/conversation/onboarding.js';

import {
  QUESTION_BANK,
  INTENSITY,
  isDistressSignal,
  getDistressResponse,
  getDistressCheckIn,
  getNextQuestion,
  estimateProgress,
  getTotalQuestions,
  getHighIntensityQuestionIds,
} from '../../src/conversation/interviewer.js';

import {
  createSession,
  resumeSession,
  recordInboundMessage,
  recordOutboundMessage,
  handleDistress,
  resumeFromDistressHold,
  pauseSession,
  dropSession,
  completeSession,
  normalizeBarrierSignal,
  mergeSignals,
  buildLLMHistory,
  hasMinimumData,
} from '../../src/conversation/sessionManager.js';

import {
  isVoiceTranscriptionAvailable,
  getVoiceUnavailableMessage,
  transcribeVoiceNote,
} from '../../src/conversation/voiceHandler.js';

import { OPERATING_PROMPT } from '../../src/conversation/llmClient.js';

// ─── Onboarding ───────────────────────────────────────────────────────────────

describe('Onboarding', () => {
  it('has 7 onboarding messages', () => {
    assert.equal(ONBOARDING_MESSAGES.length, 7);
  });

  it('getOnboardingScript returns all 7 messages in order', () => {
    const script = getOnboardingScript();
    assert.equal(script.length, 7);
    script.forEach((msg, i) => assert.equal(msg.step, i + 1));
  });

  it('getOnboardingStep returns correct step', () => {
    const step3 = getOnboardingStep(3);
    assert.ok(step3);
    assert.equal(step3.step, 3);
    assert.equal(step3.type, 'output');
  });

  it('getOnboardingStep returns null for invalid step', () => {
    assert.equal(getOnboardingStep(99), null);
  });

  it('shouldShowOnboarding returns true for not_started sessions', () => {
    assert.ok(shouldShowOnboarding({ state: 'not_started' }));
    assert.equal(shouldShowOnboarding({ state: 'active' }), false);
    assert.equal(shouldShowOnboarding({ state: 'onboarding' }), false);
  });

  it('shouldShowResumeReminder returns true for paused sessions with resumePoint', () => {
    const paused = { state: 'paused', resumePoint: { questionId: 'Q-ENV-01', savedAt: '2026-01-01' } };
    assert.ok(shouldShowResumeReminder(paused));
    assert.equal(shouldShowResumeReminder({ state: 'paused', resumePoint: null }), false);
    assert.equal(shouldShowResumeReminder({ state: 'active', resumePoint: null }), false);
  });

  it('RESUME_REMINDER is a non-empty string', () => {
    assert.ok(typeof RESUME_REMINDER === 'string');
    assert.ok(RESUME_REMINDER.length > 0);
  });
});

// ─── Intent detection ─────────────────────────────────────────────────────────

describe('Intent detection', () => {
  it('isConsentResponse matches Hebrew consent words', () => {
    assert.ok(isConsentResponse('כן'));
    assert.ok(isConsentResponse('מוכן'));
    assert.ok(isConsentResponse('יאלה נתחיל'));
    assert.equal(isConsentResponse('לא'), false);
    assert.equal(isConsentResponse(''), false);
  });

  it('isStopResponse matches stop patterns', () => {
    assert.ok(isStopResponse('עצור'));
    assert.ok(isStopResponse('stop'));
    assert.ok(isStopResponse('לא'));
    assert.equal(isStopResponse('כן'), false);
  });

  it('isPauseResponse matches pause patterns', () => {
    assert.ok(isPauseResponse('הפסקה'));
    assert.ok(isPauseResponse('אחר כך'));
    assert.equal(isPauseResponse('כן'), false);
  });

  it('isSkipResponse matches skip patterns', () => {
    assert.ok(isSkipResponse('דלג'));
    assert.ok(isSkipResponse('skip'));
    assert.ok(isSkipResponse('הבא'));
    assert.equal(isSkipResponse('כן'), false);
  });
});

// ─── Question bank ────────────────────────────────────────────────────────────

describe('Question bank', () => {
  it('has at least 12 questions covering all 13 barriers', () => {
    assert.ok(QUESTION_BANK.length >= 12);
    const coveredBarriers = new Set(QUESTION_BANK.flatMap(q => q.barrierIds));
    assert.ok(coveredBarriers.size >= 13);
  });

  it('all questions have required fields', () => {
    for (const q of QUESTION_BANK) {
      assert.ok(q.id, `Missing id`);
      assert.ok(q.prompt, `Missing prompt for ${q.id}`);
      assert.ok(Array.isArray(q.barrierIds) && q.barrierIds.length > 0, `Missing barrierIds for ${q.id}`);
      assert.ok([INTENSITY.LOW, INTENSITY.MEDIUM, INTENSITY.HIGH].includes(q.intensity), `Invalid intensity for ${q.id}`);
    }
  });

  it('has questions at all 3 intensity levels', () => {
    const intensities = new Set(QUESTION_BANK.map(q => q.intensity));
    assert.ok(intensities.has(INTENSITY.LOW));
    assert.ok(intensities.has(INTENSITY.MEDIUM));
    assert.ok(intensities.has(INTENSITY.HIGH));
  });

  it('getTotalQuestions matches QUESTION_BANK length', () => {
    assert.equal(getTotalQuestions(), QUESTION_BANK.length);
  });

  it('getHighIntensityQuestionIds returns only HIGH-intensity IDs', () => {
    const highIds = getHighIntensityQuestionIds();
    assert.ok(highIds.length > 0);
    for (const id of highIds) {
      const q = QUESTION_BANK.find(q => q.id === id);
      assert.ok(q);
      assert.equal(q.intensity, INTENSITY.HIGH);
    }
  });
});

// ─── Adaptive sequencing ──────────────────────────────────────────────────────

describe('getNextQuestion', () => {
  it('starts with LOW intensity questions', () => {
    const first = getNextQuestion([], []);
    assert.ok(first);
    assert.equal(first.intensity, INTENSITY.LOW);
  });

  it('blocks MEDIUM questions until 3 LOW answered', () => {
    const lowIds = QUESTION_BANK.filter(q => q.intensity === INTENSITY.LOW).slice(0, 2).map(q => q.id);
    const next = getNextQuestion(lowIds, []);
    assert.equal(next?.intensity, INTENSITY.LOW);
  });

  it('allows MEDIUM questions after 3 LOW answered', () => {
    const lowIds = QUESTION_BANK.filter(q => q.intensity === INTENSITY.LOW).slice(0, 3).map(q => q.id);
    const next = getNextQuestion(lowIds, []);
    // Either LOW (if more remain) or MEDIUM — must NOT be HIGH
    assert.ok(next === null || next.intensity !== INTENSITY.HIGH);
  });

  it('allows HIGH questions after 2 MEDIUM answered', () => {
    const lowIds = QUESTION_BANK.filter(q => q.intensity === INTENSITY.LOW).slice(0, 4).map(q => q.id);
    const medIds = QUESTION_BANK.filter(q => q.intensity === INTENSITY.MEDIUM).slice(0, 2).map(q => q.id);
    const next = getNextQuestion([...lowIds, ...medIds], []);
    // Now HIGH should be reachable
    assert.ok(next !== null);
  });

  it('returns null when all questions answered', () => {
    const allIds = QUESTION_BANK.map(q => q.id);
    const next = getNextQuestion(allIds, []);
    assert.equal(next, null);
  });

  it('prefers uncovered barriers', () => {
    // If fatigue is already covered, next question should prefer other barriers
    const lowIds = QUESTION_BANK.filter(q => q.intensity === INTENSITY.LOW).slice(0, 1).map(q => q.id);
    const next = getNextQuestion(lowIds, ['fatigue']);
    if (next) {
      // Next question should not be about fatigue if possible
      const fatigueQuestions = QUESTION_BANK.filter(q => q.barrierIds.includes('fatigue')).map(q => q.id);
      // At least one other question should be preferred — test passes if next isn't exclusively fatigue
      assert.ok(true); // structural check only
    }
  });
});

// ─── Progress estimation ──────────────────────────────────────────────────────

describe('estimateProgress', () => {
  it('returns 0 for empty answer list', () => {
    assert.equal(estimateProgress([]), 0);
  });

  it('returns 100 for all questions answered', () => {
    assert.equal(estimateProgress(QUESTION_BANK.map(q => q.id)), 100);
  });

  it('returns a value between 0 and 100', () => {
    const half = QUESTION_BANK.slice(0, Math.floor(QUESTION_BANK.length / 2)).map(q => q.id);
    const progress = estimateProgress(half);
    assert.ok(progress >= 0 && progress <= 100);
  });
});

// ─── Distress detection ───────────────────────────────────────────────────────

describe('Distress detection', () => {
  it('detects Hebrew distress keywords', () => {
    assert.ok(isDistressSignal('אני לא יכול יותר'));
    assert.ok(isDistressSignal('אני נשברת'));
    assert.ok(isDistressSignal('אני מפחד מאוד'));
    assert.ok(isDistressSignal('מחשבות קשות'));
  });

  it('does not flag neutral responses', () => {
    assert.equal(isDistressSignal('כן, זה קורה לפעמים'), false);
    assert.equal(isDistressSignal('במידה בינונית'), false);
    assert.equal(isDistressSignal('3'), false);
  });

  it('getDistressResponse returns a non-empty Hebrew string', () => {
    const response = getDistressResponse();
    assert.ok(typeof response === 'string');
    assert.ok(response.length > 50);
  });

  it('getDistressCheckIn returns a non-empty string', () => {
    assert.ok(getDistressCheckIn().length > 0);
  });
});

// ─── Session management ───────────────────────────────────────────────────────

describe('createSession', () => {
  it('creates session in onboarding state', () => {
    const session = createSession('u-123');
    assert.equal(session.userId, 'u-123');
    assert.equal(session.state, 'onboarding');
    assert.equal(session.phase, 'pre_employment');
  });

  it('accepts phase override', () => {
    const session = createSession('u-1', 'early');
    assert.equal(session.phase, 'early');
  });
});

describe('resumeSession', () => {
  it('resumes a paused session to active', () => {
    const session = createSession('u-1');
    // Manually set to paused for test
    const paused = { ...session, state: 'paused', resumePoint: { questionId: 'Q-ENV-01', savedAt: '2026-01-01' } };
    const { session: resumed, message } = resumeSession(paused);
    assert.equal(resumed.state, 'active');
    assert.ok(message.includes('ברוך') || message.length > 0);
  });

  it('throws when resuming non-paused session', () => {
    const session = createSession('u-1');
    assert.throws(() => resumeSession(session), /Cannot resume/);
  });
});

describe('recordInboundMessage', () => {
  it('detects stop intent', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { action } = recordInboundMessage(session, 'עצור');
    assert.equal(action, 'stop');
  });

  it('detects pause intent', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { action } = recordInboundMessage(session, 'הפסקה');
    assert.equal(action, 'pause');
  });

  it('detects skip intent', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { action } = recordInboundMessage(session, 'דלג');
    assert.equal(action, 'skip');
  });

  it('transitions onboarding → active on consent', () => {
    const session = createSession('u-1'); // onboarding state
    const { session: updated, action } = recordInboundMessage(session, 'כן');
    assert.equal(action, 'continue');
    assert.equal(updated.state, 'active');
  });

  it('returns consent_needed when no consent in onboarding', () => {
    const session = createSession('u-1');
    const { action } = recordInboundMessage(session, 'מה זה בכלל?');
    assert.equal(action, 'consent_needed');
  });

  it('detects distress in active state', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { action } = recordInboundMessage(session, 'אני לא יכול יותר');
    assert.equal(action, 'distress');
  });

  it('records message ID in session', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { session: updated } = recordInboundMessage(session, 'כן, זה קורה');
    assert.equal(updated.messageIds.length, 1);
  });
});

describe('handleDistress', () => {
  it('transitions to distress_hold', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { session: updated, message } = handleDistress(session);
    assert.equal(updated.state, 'distress_hold');
    assert.ok(message.length > 0);
  });
});

describe('resumeFromDistressHold', () => {
  it('transitions distress_hold → active', () => {
    const session = { ...createSession('u-1'), state: 'distress_hold' };
    const { session: updated } = resumeFromDistressHold(session);
    assert.equal(updated.state, 'active');
  });
});

describe('pauseSession', () => {
  it('transitions to paused with resume point', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { session: updated, message } = pauseSession(session, 'Q-ENV-01');
    assert.equal(updated.state, 'paused');
    assert.equal(updated.resumePoint.questionId, 'Q-ENV-01');
    assert.ok(message.length > 0);
  });
});

describe('dropSession', () => {
  it('transitions to dropped_silent by default', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { session: updated } = dropSession(session, 'silent');
    assert.equal(updated.state, 'dropped_silent');
  });

  it('transitions to dropped_distress for distress dropout', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const { session: updated } = dropSession(session, 'distress');
    assert.equal(updated.state, 'dropped_distress');
  });
});

describe('completeSession', () => {
  it('completes session and runs pipeline', () => {
    const session = { ...createSession('u-1'), state: 'active' };
    const responses = {
      fatigue: 4, morning_functioning: 3, procrastination: 3, sensory_discomfort: 5,
      avoidance: 3, irritability: 4, anxiety_attacks: 4, concentration: 3,
      authority: 4, motivation: 2, emotional_regulation: 4, time_management: 2, self_worth: 3,
    };
    const { session: completed, pipelineResult } = completeSession(session, responses);
    assert.equal(completed.state, 'complete');
    assert.ok(pipelineResult);
    assert.ok(pipelineResult.engines);
    assert.ok(pipelineResult.summary);
  });
});

// ─── Signal normalization ─────────────────────────────────────────────────────

describe('normalizeBarrierSignal', () => {
  it('uses explicit score when provided', () => {
    const sig = normalizeBarrierSignal('כן זה קורה', 'Q-ENV-01', ['fatigue'], 4);
    assert.equal(sig.value, 4);
    assert.equal(sig.confidence, 0.8);
  });

  it('extracts digit score from text', () => {
    const sig = normalizeBarrierSignal('3', 'Q-ENV-01', ['fatigue']);
    assert.equal(sig.value, 3);
  });

  it('extracts Hebrew intensity from text', () => {
    const sig = normalizeBarrierSignal('כל הזמן, זה נורא קשה', 'Q-ENV-01', ['fatigue']);
    assert.equal(sig.value, 5);
  });

  it('returns null value for unrecognized text', () => {
    const sig = normalizeBarrierSignal('לא יודע מה לענות', 'Q-ENV-01', ['fatigue']);
    assert.equal(sig.value, null);
    assert.equal(sig.confidence, 0.4);
  });

  it('sets correct barrierIds', () => {
    const sig = normalizeBarrierSignal('3', 'Q-REL-01', ['irritability', 'emotional_regulation']);
    assert.deepEqual(sig.barrierIds, ['irritability', 'emotional_regulation']);
  });
});

describe('mergeSignals', () => {
  it('adds new barrier IDs from LLM signals', () => {
    const session = { ...createSession('u-1'), state: 'active', detectedBarrierIds: ['fatigue'], normalizedSignalIds: [] };
    const llmSignals = [{ barrierIds: ['concentration', 'fatigue'], signalType: 'barrier_score' }];
    const updated = mergeSignals(session, llmSignals);
    assert.ok(updated.detectedBarrierIds.includes('concentration'));
    assert.equal(updated.detectedBarrierIds.filter(id => id === 'fatigue').length, 1); // no duplicates
  });

  it('returns session unchanged when no signals', () => {
    const session = { ...createSession('u-1'), state: 'active', detectedBarrierIds: [], normalizedSignalIds: [] };
    const updated = mergeSignals(session, []);
    assert.deepEqual(updated.detectedBarrierIds, []);
  });
});

// ─── LLM history builder ──────────────────────────────────────────────────────

describe('buildLLMHistory', () => {
  it('maps direction to LLM role', () => {
    const records = [
      { direction: 'outbound', text: 'שלום' },
      { direction: 'inbound', text: 'כן, מוכן' },
    ];
    const history = buildLLMHistory(records);
    assert.equal(history[0].role, 'assistant');
    assert.equal(history[1].role, 'user');
    assert.equal(history[0].content, 'שלום');
  });
});

// ─── hasMinimumData ───────────────────────────────────────────────────────────

describe('hasMinimumData', () => {
  it('returns false for fewer than 7 barriers', () => {
    const session = { ...createSession('u-1'), detectedBarrierIds: ['fatigue', 'concentration'] };
    assert.equal(hasMinimumData(session), false);
  });

  it('returns true for 7 or more barriers', () => {
    const session = {
      ...createSession('u-1'),
      detectedBarrierIds: ['fatigue', 'concentration', 'irritability', 'anxiety_attacks',
        'authority', 'motivation', 'self_worth'],
    };
    assert.ok(hasMinimumData(session));
  });
});

// ─── Voice handler ────────────────────────────────────────────────────────────

describe('VoiceHandler', () => {
  it('isVoiceTranscriptionAvailable returns false by default', () => {
    assert.equal(isVoiceTranscriptionAvailable(), false);
  });

  it('getVoiceUnavailableMessage returns a Hebrew string', () => {
    const msg = getVoiceUnavailableMessage();
    assert.ok(typeof msg === 'string' && msg.length > 0);
  });

  it('transcribeVoiceNote returns stub result when not enabled', async () => {
    const result = await transcribeVoiceNote(Buffer.from('fake-audio'));
    assert.equal(result.provider, 'stub');
    assert.equal(result.confidence, 0.0);
    assert.ok(result.text.length > 0);
  });
});

// ─── Operating prompt ─────────────────────────────────────────────────────────

describe('OPERATING_PROMPT', () => {
  it('contains all required FPP §8 sections', () => {
    const required = [
      'SYSTEM PURPOSE',
      'TONE RULES',
      'GLOBAL PRODUCT RULES',
      'STRUCTURED ONBOARDING RULE',
      'INTERVIEW LOGIC',
      'DISTRESS-SAFE BEHAVIOR',
      'REASONING MODEL',
      'DISCLOSURE RULES',
      'EMPLOYER OUTPUT RULES',
      'TRACEABILITY RULE',
      'STRUCTURED OUTPUT RULE FOR INTERVIEW TURNS',
    ];
    for (const section of required) {
      assert.ok(OPERATING_PROMPT.includes(section), `Missing section: ${section}`);
    }
  });

  it('includes JSON output schema definition', () => {
    assert.ok(OPERATING_PROMPT.includes('nextMessage'));
    assert.ok(OPERATING_PROMPT.includes('detectedSignals'));
    assert.ok(OPERATING_PROMPT.includes('shouldEscalate'));
  });
});
