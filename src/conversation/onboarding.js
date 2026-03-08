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

// ─── Onboarding message sequence (Hebrew) ────────────────────────────────────

export const ONBOARDING_MESSAGES = [
  {
    id: 'onb-01',
    step: 1,
    type: 'greeting',
    text: `היי, אני כאן כדי לעזור לך להבין מה מקשה עליך בעבודה ומה יכול לעזור.

נלך שלב-שלב, בצורה קצרה וברורה.
אפשר לענות בטקסט, בהודעה קולית, ולפעמים גם לבחור תשובה מוכנה.
אפשר גם לעצור בכל רגע.`,
  },
  {
    id: 'onb-02',
    step: 2,
    type: 'purpose',
    text: `*מה נעשה יחד?*

אשאל אותך כמה שאלות על עבודה — על מה שמרגיש קשה, מה עוזר, ומה לא.
המטרה היא להבין את המצב שלך ולייצר עבורך המלצות מעשיות.`,
  },
  {
    id: 'onb-03',
    step: 3,
    type: 'output',
    text: `*מה תקבל/י בסוף?*

בסוף השיחה תוכל/י לקבל:
• סיכום אישי עם המלצות עבורך
• אפשרות (לא חובה) ליצור מסמך למעסיק עם הצעות ספציפיות

את/ה תחליט/י מה לשתף ועם מי.`,
  },
  {
    id: 'onb-04',
    step: 4,
    type: 'optional',
    text: `*מה אופציונלי?*

כל שאלה אפשר לדלג עליה.
שיתוף עם המעסיק הוא לגמרי אופציונלי ורק בהסכמה מלאה שלך.
אין חובה לסיים — אפשר לעצור ולחזור מאוחר יותר.`,
  },
  {
    id: 'onb-05',
    step: 5,
    type: 'privacy',
    text: `*מה עלול להישמר?*

• מה שתשתף/י ישמר במערכת באופן מאובטח
• לא נשתף שום מידע בלי אישור שלך
• בחלק מהמקרים, איש צוות עשוי לעבור על התוכן כדי לשפר דיוק ובטיחות`,
  },
  {
    id: 'onb-06',
    step: 6,
    type: 'human_review',
    text: `*סקירה אנושית*

כדי לוודא דיוק ואיכות, בחלק מהמקרים יעבור איש צוות על הסיכום לפני שהוא נשלח.
המערכת הזו לא מחליפה טיפול, אבחון או ייעוץ משפטי.`,
  },
  {
    id: 'onb-07',
    step: 7,
    type: 'controls',
    text: `*פקודות שימושיות:*

• _עצור_ — לסיום השיחה
• _הפסקה_ — לשמור את המקום ולחזור אחר כך
• _דלג_ — לדלג על שאלה ספציפית
• _עזרה_ — להסבר נוסף

מוכן/ה להתחיל? (כן / לא)`,
  },
];

// ─── Channel-specific variants ────────────────────────────────────────────────

// Short version for re-onboarding after a long pause
export const RESUME_REMINDER = `ברוך/ה השב/ה! המשכנו ממש מאיפה שעצרנו.

_תזכורת: אפשר לדלג, לעצור, או לשנות תשובות קודמות בכל עת._

בואו נמשיך...`;

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
 * Returns the full ordered onboarding message sequence.
 * @returns {typeof ONBOARDING_MESSAGES}
 */
export function getOnboardingScript() {
  return [...ONBOARDING_MESSAGES];
}

/**
 * Returns the onboarding message at a given step (1-indexed).
 * @param {number} step
 * @returns {typeof ONBOARDING_MESSAGES[0] | null}
 */
export function getOnboardingStep(step) {
  return ONBOARDING_MESSAGES.find(m => m.step === step) ?? null;
}

/**
 * Consent acknowledgement patterns.
 * If the user's reply matches one of these, they have consented to proceed.
 */
export const CONSENT_PATTERNS = ['כן', 'yes', 'ok', 'אוקי', 'בסדר', 'מוכן', 'מוכנה', 'יאלה', 'בואו', 'נמשיך'];

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
