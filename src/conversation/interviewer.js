/**
 * Interviewer — FPP §2.3B, §2.5
 *
 * Adaptive question bank for the barrier interview.
 *
 * Rules:
 * - Start with low-intensity questions (environment, logistics)
 * - Progress to medium-intensity (emotional regulation, motivation)
 * - End with high-intensity questions (authority, self-worth, anxiety attacks)
 * - After each high-intensity question, offer a distress check-in
 * - User can pause/skip/stop at any point
 *
 * The LLM (llmClient.js) generates the actual conversational response.
 * This module provides the question structure and sequencing logic.
 */

import { BARRIER_IDS } from '../engines/intake/index.js';
import { getContentConfig } from '../admin/base44Store.js';

// ─── Intensity levels ──────────────────────────────────────────────────────────

export const INTENSITY = {
  LOW:    1,
  MEDIUM: 2,
  HIGH:   3,
};

// ─── Question bank ────────────────────────────────────────────────────────────
//
// Each question maps to one or more barrier IDs.
// The 'prompt' is the Hebrew question sent to the user.
// The 'scoringHint' guides signal normalization from the user's response.

export const QUESTION_BANK = [
  // ─ LOW intensity — environment & logistics ─
  {
    id: 'Q-ENV-01',
    barrierIds: [BARRIER_IDS.SENSORY_DISCOMFORT],
    intensity: INTENSITY.LOW,
    cluster: 'environmental',
    prompt: 'איך הסביבה הפיזית בעבודה משפיעה עליך? (רעשים, תאורה, צפיפות, פתיחות החלל)',
    followUp: 'יש מקומות או שעות שבהן זה יותר קשה?',
    scoringHint: 'Higher distress about noise/light/crowds → higher score',
  },
  {
    id: 'Q-ENV-02',
    barrierIds: [BARRIER_IDS.MORNING_FUNCTIONING],
    intensity: INTENSITY.LOW,
    cluster: 'physical_functional',
    prompt: 'איך הבקרים מסתדרים עבורך? קל לך להגיע בזמן ולהתחיל לעבוד?',
    followUp: 'כמה פעמים בשבוע זה מרגיש קשה?',
    scoringHint: 'Difficulty getting up/starting work → morning_functioning score',
  },
  {
    id: 'Q-ENV-03',
    barrierIds: [BARRIER_IDS.FATIGUE],
    intensity: INTENSITY.LOW,
    cluster: 'physical_functional',
    prompt: 'עייפות — כמה זה משפיע על יכולת העבודה שלך ביום-יום?',
    followUp: 'האם יש חלק מסוים ביום שהעייפות הכי חזקה בו?',
    scoringHint: 'Persistent fatigue affecting work → fatigue score',
  },
  {
    id: 'Q-SCHED-01',
    barrierIds: [BARRIER_IDS.AVOIDANCE],
    intensity: INTENSITY.LOW,
    cluster: 'avoidance_social',
    prompt: 'יש ימים שקשה לצאת מהבית לעבודה? איך זה מרגיש?',
    followUp: 'כמה ימים בחודש האחרון זה קרה בערך?',
    scoringHint: 'Difficulty leaving home/showing up → avoidance score',
  },

  // ─ MEDIUM intensity — regulation & structure ─
  {
    id: 'Q-SELF-01',
    barrierIds: [BARRIER_IDS.PROCRASTINATION],
    intensity: INTENSITY.MEDIUM,
    cluster: 'self_regulation',
    prompt: 'דחיינות או קושי להתארגן — זה משהו שמופיע בעבודה?',
    followUp: 'מה בדרך כלל קשה — להתחיל משימות, לסיים אותן, או לתעדף?',
    scoringHint: 'Difficulty starting/organizing/prioritizing → procrastination score',
  },
  {
    id: 'Q-SELF-02',
    barrierIds: [BARRIER_IDS.TIME_MANAGEMENT],
    intensity: INTENSITY.MEDIUM,
    cluster: 'self_regulation',
    prompt: 'ניהול זמן בעבודה — כמה זה אתגר עבורך? (לוחות זמנים, עמידה בדדליינים)',
    followUp: 'יש סוג ספציפי של משימות שיותר קשה לנהל?',
    scoringHint: 'Difficulty with time/deadline management → time_management score',
  },
  {
    id: 'Q-MOT-01',
    barrierIds: [BARRIER_IDS.MOTIVATION],
    intensity: INTENSITY.MEDIUM,
    cluster: 'self_regulation',
    prompt: 'מוטיבציה — איך זה עם החשק והמניע לעבוד בתקופה האחרונה?',
    followUp: 'זה תמידי, או יש ימים שזה מרגיש שונה?',
    scoringHint: 'Low drive/interest in work → motivation score',
  },
  {
    id: 'Q-CONC-01',
    barrierIds: [BARRIER_IDS.CONCENTRATION],
    intensity: INTENSITY.MEDIUM,
    cluster: 'cognitive',
    prompt: 'ריכוז בעבודה — כמה קשה לך להתרכז ולהישאר ממוקד/ת?',
    followUp: 'מה בדרך כלל מפזר — רעש חיצוני, מחשבות, או משהו אחר?',
    scoringHint: 'Difficulty sustaining focus → concentration score',
  },

  // ─ HIGH intensity — relational, emotional, acute ─
  {
    id: 'Q-REL-01',
    barrierIds: [BARRIER_IDS.IRRITABILITY],
    intensity: INTENSITY.HIGH,
    cluster: 'relational',
    prompt: 'רגזנות או תגובות חזקות בעבודה — זה משהו שקורה לך?',
    followUp: 'מה בדרך כלל מוציא אותך מהאיזון במצב עבודה?',
    scoringHint: 'Strong/frequent irritable reactions → irritability score',
    distressCheckIn: true,
  },
  {
    id: 'Q-REL-02',
    barrierIds: [BARRIER_IDS.AUTHORITY],
    intensity: INTENSITY.HIGH,
    cluster: 'relational',
    prompt: 'יחסים עם דמויות סמכות (מנהל/ת, ממונה) — כמה זה מאתגר עבורך?',
    followUp: 'מה בדרך כלל קשה — שיחות אישיות, ביקורת, הנחיות?',
    scoringHint: 'Difficulty with managers/authority figures → authority score',
    distressCheckIn: true,
  },
  {
    id: 'Q-EMO-01',
    barrierIds: [BARRIER_IDS.EMOTIONAL_REGULATION],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    prompt: 'ויסות רגשי בעבודה — האם קשה לך לנהל את הרגשות בסביבה מקצועית?',
    followUp: 'מה קורה כשקשה — נסיגה, פריקה, או משהו אחר?',
    scoringHint: 'Difficulty managing emotions at work → emotional_regulation score',
    distressCheckIn: true,
  },
  {
    id: 'Q-ANX-01',
    barrierIds: [BARRIER_IDS.ANXIETY_ATTACKS],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    prompt: 'התקפי חרדה — האם זה משהו שקורה לך, גם בסביבת עבודה?',
    followUp: 'אם כן — יש מצבים שמפעילים את זה יותר?',
    scoringHint: 'Occurrence of anxiety attacks, especially at work → anxiety_attacks score',
    distressCheckIn: true,
  },
  {
    id: 'Q-SELF-03',
    barrierIds: [BARRIER_IDS.SELF_WORTH],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    prompt: 'ערך עצמי בהקשר של עבודה — איך אתה/את מרגיש/ה לגבי עצמך בתפקיד?',
    followUp: 'יש מצבים שבהם הספק העצמי מחריף?',
    scoringHint: 'Low self-worth related to work role → self_worth score',
    distressCheckIn: true,
  },
];

// ─── Effective question bank (with admin overrides) ──────────────────────────

/**
 * Returns the question bank with admin overrides, custom order, and disabled
 * questions filtered out.
 * @returns {Promise<typeof QUESTION_BANK>}
 */
export async function getEffectiveQuestionBank() {
  let questions = QUESTION_BANK.map(q => ({ ...q }));
  try {
    const [overrides, orderConfig, disabledConfig] = await Promise.all([
      getContentConfig('question_overrides'),
      getContentConfig('question_order'),
      getContentConfig('question_disabled'),
    ]);

    // Apply text overrides
    if (overrides?.overrides) {
      for (const q of questions) {
        const ov = overrides.overrides[q.id];
        if (ov) {
          if (ov.prompt)   q.prompt   = ov.prompt;
          if (ov.followUp) q.followUp = ov.followUp;
        }
      }
    }

    // Apply custom order
    if (orderConfig?.order && Array.isArray(orderConfig.order)) {
      const orderMap = new Map(orderConfig.order.map((id, i) => [id, i]));
      questions.sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
        return ai - bi;
      });
    }

    // Filter out disabled questions
    if (disabledConfig?.disabled && Array.isArray(disabledConfig.disabled)) {
      const disabledSet = new Set(disabledConfig.disabled);
      questions = questions.filter(q => !disabledSet.has(q.id));
    }
  } catch {
    // Fall back to defaults if Base44 is unavailable
  }
  return questions;
}

// ─── Distress detection ───────────────────────────────────────────────────────

const DISTRESS_KEYWORDS_HE = [
  'לא יכול', 'לא יכולה', 'נשבר', 'נשברת', 'עצוב', 'עצובה',
  'בוכה', 'בוכה', 'בכי', 'מפחד', 'מפחדת', 'מתמוטט', 'מתמוטטת',
  'לא מסוגל', 'לא מסוגלת', 'עזרה', 'אני מרגיש רע', 'אני מרגישה רע',
  'מחשבות קשות', 'כואב', 'כואבת', 'נפלתי', 'שבור', 'שבורה',
];

/**
 * Heuristic distress signal detection.
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function isDistressSignal(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DISTRESS_KEYWORDS_HE.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Distress containment response — stops escalation, shifts to safety.
 * @returns {string} Hebrew containment message
 */
export function getDistressResponse() {
  return `אני שומע/ת שהדברים האלה קשים. תודה שחלקת/שחלקת איתי.

נעצור כאן לרגע. לא צריך/ה לענות על שום דבר עכשיו.

אם אתה/את רוצה להמשיך מאוחר יותר — כל מה שנאמר כבר נשמר.
אם אתה/את במצוקה עכשיו, כדאי לפנות למישהו שאתה/את סומך/ת עליו, או להתקשר לקו חירום רגשי.

אפשר לחזור כשנכון לך. אני כאן. 💙`;
}

/**
 * Distress check-in message (asked after high-intensity questions).
 * @returns {string}
 */
export function getDistressCheckIn() {
  return 'רגע קטן — האם אתה/את מרגיש/ה בסדר להמשיך? (כן / אני צריך/ה להפסיק)';
}

// ─── Adaptive sequencing ──────────────────────────────────────────────────────

/**
 * Get the next question to ask, given barriers already answered.
 *
 * Strategy:
 * 1. Always start with LOW intensity questions
 * 2. After at least 3 LOW answers, allow MEDIUM intensity
 * 3. After at least 2 MEDIUM answers, allow HIGH intensity
 * 4. Never repeat a question already answered
 * 5. Prioritize questions for barriers not yet scored
 *
 * @param {string[]} answeredQuestionIds
 * @param {string[]} answeredBarrierIds
 * @returns {Promise<typeof QUESTION_BANK[0] | null>} Next question, or null if interview is complete
 */
export async function getNextQuestion(answeredQuestionIds = [], answeredBarrierIds = []) {
  const effectiveBank = await getEffectiveQuestionBank();
  const answered = new Set(answeredQuestionIds);
  const covered = new Set(answeredBarrierIds);

  const lowAnswered   = effectiveBank.filter(q => q.intensity === INTENSITY.LOW    && answered.has(q.id)).length;
  const mediumAnswered = effectiveBank.filter(q => q.intensity === INTENSITY.MEDIUM && answered.has(q.id)).length;

  const allowMedium = lowAnswered >= 3;
  const allowHigh   = mediumAnswered >= 2;

  // Find candidates: unanswered + allowed intensity + uncovered barrier (preferred)
  const candidates = effectiveBank.filter(q => {
    if (answered.has(q.id)) return false;
    if (q.intensity === INTENSITY.MEDIUM && !allowMedium) return false;
    if (q.intensity === INTENSITY.HIGH   && !allowHigh)   return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Prefer questions that cover uncovered barriers
  const prioritized = candidates.filter(q => q.barrierIds.some(id => !covered.has(id)));
  const pool = prioritized.length > 0 ? prioritized : candidates;

  // Return the lowest-intensity candidate first
  return pool.sort((a, b) => a.intensity - b.intensity)[0];
}

/**
 * Return the total number of questions in the effective bank.
 */
export async function getTotalQuestions() {
  const effectiveBank = await getEffectiveQuestionBank();
  return effectiveBank.length;
}

/**
 * Return all questions that need a distress check-in after them.
 */
export async function getHighIntensityQuestionIds() {
  const effectiveBank = await getEffectiveQuestionBank();
  return effectiveBank.filter(q => q.distressCheckIn).map(q => q.id);
}

/**
 * Estimate interview completion percentage.
 * @param {string[]} answeredQuestionIds
 * @returns {Promise<number>} 0–100
 */
export async function estimateProgress(answeredQuestionIds) {
  const effectiveBank = await getEffectiveQuestionBank();
  return Math.round((answeredQuestionIds.length / effectiveBank.length) * 100);
}
