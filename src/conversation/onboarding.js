/**
 * Onboarding — FPP §7.3
 *
 * Structured onboarding flow presented to every new user before the interview.
 * Each step is a WhatsApp message (short, clear, low-overload).
 *
 * The onboarding covers the 7 required elements from FPP §2.5:
 * 1. What this stage is
 * 2. Why questions are asked
 * 3. What the user gets
 * 4. What is optional
 * 5. What may be shared
 * 6. Whether human review may occur
 * 7. Pause/skip/stop instructions
 */

import { getContentConfig } from '../admin/base44Store.js';

// ─── Onboarding message sequence (Hebrew) ────────────────────────────────────

export const ONBOARDING_MESSAGES = [
  {
    id: 'onb-01',
    step: 1,
    type: 'greeting',
    text: `היי, אני WorkAdviser.

אני כאן לעזור להבין מה מקשה בעבודה — ומה אפשר לעשות.

אנחנו בפיילוט *מותאם טראומה*: פרויקט של נט"ל וירון אדל שמלווה אנשים עם טראומה להצליח בעבודה.

בסוף השיחה אפשר לקבל:
• רעיונות מותאמים אישית למצב
• כלים לשיחה עם המעסיק — למי שרוצה

המידע שמור ומאובטח. ואפשר לעצור, לדלג או לקחת הפסקה בכל שלב.

מתחילים?`,
  },
];

// ─── Channel-specific variants ────────────────────────────────────────────────

// Short version for re-onboarding after a long pause
export const RESUME_REMINDER = `חזרת. ממשיכים בדיוק מאיפה שעצרנו.`;

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Whether to show the full onboarding sequence for this session.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {boolean}
 */
export function shouldShowOnboarding(session) {
  return session.state === 'not_started';
}

/**
 * Whether to show a short resume reminder instead of full onboarding.
 * @param {import('../core/models/interviewSession.js').InterviewSession} session
 * @returns {boolean}
 */
export function shouldShowResumeReminder(session) {
  return session.state === 'paused' && session.resumePoint != null;
}

/**
 * Returns the full ordered onboarding message sequence, with admin overrides applied.
 * @returns {Promise<typeof ONBOARDING_MESSAGES>}
 */
export async function getOnboardingScript() {
  const messages = ONBOARDING_MESSAGES.map(m => ({ ...m }));
  try {
    const config = await getContentConfig('onboarding_overrides');
    if (config?.overrides) {
      for (const msg of messages) {
        if (config.overrides[msg.id]?.text) {
          msg.text = config.overrides[msg.id].text;
        }
      }
    }
  } catch {
    // Fall back to defaults if Base44 is unavailable
  }
  return messages;
}

/**
 * Returns the onboarding message at a given step (1-indexed), with overrides applied.
 * @param {number} step
 * @returns {Promise<typeof ONBOARDING_MESSAGES[0] | null>}
 */
export async function getOnboardingStep(step) {
  const messages = await getOnboardingScript();
  return messages.find(m => m.step === step) ?? null;
}

/**
 * Consent acknowledgement patterns.
 * If the user's reply matches one of these, they have consented to proceed.
 */
export const CONSENT_PATTERNS = [
  'כן', 'yes', 'ok', 'אוקי', 'בסדר', 'מוכן', 'מוכנה', 'יאלה', 'בואו', 'נמשיך',
  'אחלה', 'קדימה', 'כמובן', 'בטח', 'וודאי', 'סבבה', 'ברור', 'אין בעיה', 'יאללה',
];

export function isConsentResponse(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return CONSENT_PATTERNS.some(p => normalized.includes(p.toLowerCase()));
}

/**
 * Stop command patterns.
 */
export const STOP_PATTERNS = ['עצור', 'stop', 'לא', 'no', 'ביטול', 'cancel'];

export function isStopResponse(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return STOP_PATTERNS.some(p => normalized.startsWith(p.toLowerCase()));
}

/**
 * Pause command patterns.
 */
export const PAUSE_PATTERNS = ['הפסקה', 'pause', 'אחר כך', 'later', 'שמור'];

export function isPauseResponse(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return PAUSE_PATTERNS.some(p => normalized.includes(p.toLowerCase()));
}

/**
 * Skip command patterns.
 */
export const SKIP_PATTERNS = ['דלג', 'skip', 'הבא', 'next', 'לא רוצה', 'pass'];

export function isSkipResponse(text) {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return SKIP_PATTERNS.some(p => normalized.includes(p.toLowerCase()));
}
