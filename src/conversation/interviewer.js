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
import { ensureQuestionBankSeeded } from '../admin/base44Store.js';

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
  // ─ INTRO — Chapter 1: getting to know the user ─
  {
    id: 'Q-INTRO-00',
    barrierIds: [],
    intensity: INTENSITY.LOW,
    cluster: 'intro',
    chapter: 'ch1_intro',
    prompt: 'קודם כל, מה המצב התעסוקתי כרגע? עובדים, מחפשים עבודה, בחל"ת, במילואים?',
    followUp: null,
    scoringHint: 'Extract employment status: employed, job_seeking, leave, military_reserve',
    profileField: 'employmentStatus',
  },
  {
    id: 'Q-INTRO-01',
    barrierIds: [],
    intensity: INTENSITY.LOW,
    cluster: 'intro',
    chapter: 'ch1_intro',
    prompt: 'ספרו לי קצת — מה עושים בעבודה?',
    followUp: 'מה התפקיד העיקרי?',
    scoringHint: 'Extract job role and responsibilities',
    profileField: 'jobRole',
  },
  {
    id: 'Q-INTRO-02',
    barrierIds: [],
    intensity: INTENSITY.LOW,
    cluster: 'intro',
    chapter: 'ch1_intro',
    prompt: 'איפה מקום העבודה? משרד, מפעל, שטח, מהבית, משולב?',
    followUp: null,
    scoringHint: 'Extract workplace type: office, open_office, factory, field, remote, hybrid',
    profileField: 'workplaceType',
  },
  {
    id: 'Q-INTRO-03',
    barrierIds: [],
    intensity: INTENSITY.LOW,
    cluster: 'intro',
    chapter: 'ch1_intro',
    prompt: 'כמה זמן בתפקיד הנוכחי?',
    followUp: null,
    scoringHint: 'Extract time in role',
    profileField: 'timeInRole',
  },
  {
    id: 'Q-INTRO-04',
    barrierIds: [],
    intensity: INTENSITY.LOW,
    cluster: 'intro',
    chapter: 'ch1_intro',
    prompt: 'יש צוות סביב, או שעובדים יותר עצמאית?',
    followUp: null,
    scoringHint: 'Extract team size / work style',
    profileField: 'teamSize',
  },

  // ─ LOW intensity — environment & logistics (Chapter 2: barriers) ─
  {
    id: 'Q-ENV-01',
    barrierIds: [BARRIER_IDS.SENSORY_DISCOMFORT],
    intensity: INTENSITY.LOW,
    cluster: 'environmental',
    chapter: 'ch2_barriers',
    prompt: 'איך הסביבה הפיזית בעבודה משפיעה? (רעשים, תאורה, צפיפות, פתיחות החלל)',
    followUp: 'יש מקומות או שעות שבהם זה יותר קשה?',
    scoringHint: 'Higher distress about noise/light/crowds → higher score',
  },
  {
    id: 'Q-ENV-02',
    barrierIds: [BARRIER_IDS.MORNING_FUNCTIONING],
    intensity: INTENSITY.LOW,
    cluster: 'physical_functional',
    chapter: 'ch2_barriers',
    prompt: 'איך הבקרים מסתדרים? קל להגיע בזמן ולהתחיל לעבוד?',
    followUp: 'כמה פעמים בשבוע זה מרגיש קשה?',
    scoringHint: 'Difficulty getting up/starting work → morning_functioning score',
  },
  {
    id: 'Q-ENV-03',
    barrierIds: [BARRIER_IDS.FATIGUE],
    intensity: INTENSITY.LOW,
    cluster: 'physical_functional',
    chapter: 'ch2_barriers',
    prompt: 'עייפות — כמה זה משפיע על יכולת העבודה ביום-יום?',
    followUp: 'יש חלק מסוים ביום שהעייפות הכי חזקה בו?',
    scoringHint: 'Persistent fatigue affecting work → fatigue score',
  },
  {
    id: 'Q-SCHED-01',
    barrierIds: [BARRIER_IDS.AVOIDANCE],
    intensity: INTENSITY.LOW,
    cluster: 'avoidance_social',
    chapter: 'ch2_barriers',
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
    chapter: 'ch2_barriers',
    prompt: 'דחיינות או קושי להתארגן — זה משהו שמופיע בעבודה?',
    followUp: 'מה בדרך כלל קשה — להתחיל משימות, לסיים אותן, או לתעדף?',
    scoringHint: 'Difficulty starting/organizing/prioritizing → procrastination score',
  },
  {
    id: 'Q-SELF-02',
    barrierIds: [BARRIER_IDS.TIME_MANAGEMENT],
    intensity: INTENSITY.MEDIUM,
    cluster: 'self_regulation',
    chapter: 'ch2_barriers',
    prompt: 'ניהול זמן בעבודה — כמה זה אתגר? (לוחות זמנים, עמידה בדדליינים)',
    followUp: 'יש סוג ספציפי של משימות שיותר קשה לנהל?',
    scoringHint: 'Difficulty with time/deadline management → time_management score',
  },
  {
    id: 'Q-MOT-01',
    barrierIds: [BARRIER_IDS.MOTIVATION],
    intensity: INTENSITY.MEDIUM,
    cluster: 'self_regulation',
    chapter: 'ch2_barriers',
    prompt: 'מוטיבציה — איך זה עם החשק והמניע לעבוד בתקופה האחרונה?',
    followUp: 'זה תמידי, או יש ימים שזה מרגיש שונה?',
    scoringHint: 'Low drive/interest in work → motivation score',
  },
  {
    id: 'Q-CONC-01',
    barrierIds: [BARRIER_IDS.CONCENTRATION],
    intensity: INTENSITY.MEDIUM,
    cluster: 'cognitive',
    chapter: 'ch2_barriers',
    prompt: 'ריכוז בעבודה — כמה קשה להתרכז ולהישאר ממוקדים?',
    followUp: 'מה בדרך כלל מפזר — רעש חיצוני, מחשבות, או משהו אחר?',
    scoringHint: 'Difficulty sustaining focus → concentration score',
  },

  // ─ HIGH intensity — relational, emotional, acute ─
  {
    id: 'Q-REL-01',
    barrierIds: [BARRIER_IDS.IRRITABILITY],
    intensity: INTENSITY.HIGH,
    cluster: 'relational',
    chapter: 'ch2_barriers',
    prompt: 'רגזנות או תגובות חזקות בעבודה — זה משהו שקורה?',
    followUp: 'מה בדרך כלל מוציא מהאיזון במצב עבודה?',
    scoringHint: 'Strong/frequent irritable reactions → irritability score',
    distressCheckIn: true,
  },
  {
    id: 'Q-REL-02',
    barrierIds: [BARRIER_IDS.AUTHORITY],
    intensity: INTENSITY.HIGH,
    cluster: 'relational',
    chapter: 'ch2_barriers',
    prompt: 'יחסים עם דמויות סמכות (ממונים, מנהלים) — כמה זה מאתגר?',
    followUp: 'מה בדרך כלל קשה — שיחות אישיות, ביקורת, הנחיות?',
    scoringHint: 'Difficulty with managers/authority figures → authority score',
    distressCheckIn: true,
  },
  {
    id: 'Q-EMO-01',
    barrierIds: [BARRIER_IDS.EMOTIONAL_REGULATION],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    chapter: 'ch2_barriers',
    prompt: 'ויסות רגשי בעבודה — כמה קשה לנהל את הרגשות בסביבה מקצועית?',
    followUp: 'מה קורה כשקשה — נסיגה, פריקה, או משהו אחר?',
    scoringHint: 'Difficulty managing emotions at work → emotional_regulation score',
    distressCheckIn: true,
  },
  {
    id: 'Q-ANX-01',
    barrierIds: [BARRIER_IDS.ANXIETY_ATTACKS],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    chapter: 'ch2_barriers',
    prompt: 'התקפי חרדה — זה משהו שקורה, גם בסביבת עבודה?',
    followUp: 'אם כן — יש מצבים שמפעילים את זה יותר?',
    scoringHint: 'Occurrence of anxiety attacks, especially at work → anxiety_attacks score',
    distressCheckIn: true,
  },
  {
    id: 'Q-SELF-03',
    barrierIds: [BARRIER_IDS.SELF_WORTH],
    intensity: INTENSITY.HIGH,
    cluster: 'psychological',
    chapter: 'ch2_barriers',
    prompt: 'ערך עצמי בהקשר של עבודה — מה ההרגשה לגבי עצמכם בתפקיד?',
    followUp: 'יש מצבים שבהם הספק העצמי מחריף?',
    scoringHint: 'Low self-worth related to work role → self_worth score',
    distressCheckIn: true,
  },
];

// ─── Effective question bank (Base44 is source of truth) ─────────────────────

/**
 * Returns the canonical question bank from Base44.
 * On first access, seeds Base44 from the hardcoded QUESTION_BANK.
 * After that, Base44 is the single source of truth.
 * @returns {Promise<typeof QUESTION_BANK>}
 */
export async function getEffectiveQuestionBank() {
  try {
    // Always go through ensureQuestionBankSeeded so version checks run
    const result = await ensureQuestionBankSeeded(QUESTION_BANK);
    return (result?.questions ?? QUESTION_BANK).filter(q => q.enabled !== false);
  } catch {
    // Final fallback: use hardcoded bank directly
    return QUESTION_BANK.map(q => ({ ...q }));
  }
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
  return `אני שומעת שהדברים האלה קשים. תודה ששיתפתם אותי.

נעצור כאן לרגע. אין צורך לענות על שום דבר עכשיו.

אם רוצים להמשיך מאוחר יותר — כל מה שנאמר כבר נשמר.
אם יש מצוקה עכשיו, כדאי לפנות למישהו קרוב, או להתקשר לקו חירום רגשי.

אפשר לחזור כשמרגישים מוכנים. אני כאן. 💙`;
}

/**
 * Distress check-in message (asked after high-intensity questions).
 * @returns {string}
 */
export function getDistressCheckIn() {
  return 'רגע קטן — מרגישים בסדר להמשיך? (כן / צריכים להפסיק)';
}

// ─── Adaptive sequencing ──────────────────────────────────────────────────────

/**
 * Get the next question to ask, given barriers already answered.
 *
 * Strategy:
 * 1. Filter by chapter (intro questions for ch1, barrier questions for ch2)
 * 2. Always start with LOW intensity questions
 * 3. After at least 3 LOW barrier answers, allow MEDIUM intensity
 * 4. After at least 2 MEDIUM answers, allow HIGH intensity
 * 5. Never repeat a question already answered
 * 6. Prioritize questions for barriers not yet scored
 * 7. If mentionedTopics provided, prefer questions matching those barrier IDs (natural follow-ups)
 *
 * @param {string[]} answeredQuestionIds
 * @param {string[]} answeredBarrierIds
 * @param {{ chapter?: string, mentionedTopics?: string[] }} [opts]
 * @returns {Promise<typeof QUESTION_BANK[0] | null>} Next question, or null if chapter is complete
 */
export async function getNextQuestion(answeredQuestionIds = [], answeredBarrierIds = [], opts = {}) {
  const { chapter, mentionedTopics = [] } = opts;
  const effectiveBank = await getEffectiveQuestionBank();
  const answered = new Set(answeredQuestionIds);
  const covered = new Set(answeredBarrierIds);

  // Filter by chapter if specified
  const chapterBank = chapter
    ? effectiveBank.filter(q => (q.chapter ?? 'ch2_barriers') === chapter)
    : effectiveBank;

  // Intensity gating only applies to barrier questions (ch2)
  const barrierQuestions = effectiveBank.filter(q => (q.chapter ?? 'ch2_barriers') === 'ch2_barriers');
  const lowAnswered   = barrierQuestions.filter(q => q.intensity === INTENSITY.LOW    && answered.has(q.id)).length;
  const mediumAnswered = barrierQuestions.filter(q => q.intensity === INTENSITY.MEDIUM && answered.has(q.id)).length;

  const allowMedium = lowAnswered >= 3;
  const allowHigh   = mediumAnswered >= 2;

  // Find candidates: unanswered + allowed intensity
  const candidates = chapterBank.filter(q => {
    if (answered.has(q.id)) return false;
    // Intensity gating only for barrier questions
    if ((q.chapter ?? 'ch2_barriers') === 'ch2_barriers') {
      if (q.intensity === INTENSITY.MEDIUM && !allowMedium) return false;
      if (q.intensity === INTENSITY.HIGH   && !allowHigh)   return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // For barrier questions: prefer questions that cover uncovered barriers
  const prioritized = candidates.filter(q =>
    q.barrierIds.length === 0 || q.barrierIds.some(id => !covered.has(id))
  );
  let pool = prioritized.length > 0 ? prioritized : candidates;

  // If user mentioned topics organically, prefer questions that match those barrier IDs
  if (mentionedTopics.length > 0) {
    const mentioned = new Set(mentionedTopics);
    const topicMatches = pool.filter(q => q.barrierIds.some(id => mentioned.has(id)));
    if (topicMatches.length > 0) {
      pool = topicMatches;
    }
  }

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
