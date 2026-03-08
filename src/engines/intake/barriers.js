/**
 * Engine 1: Intake & Detection — Barriers Questionnaire
 *
 * 13-item Likert scale (1-5) based on Natal's employment barriers assessment.
 * Detects what is hard for the person in work integration.
 */

export const BARRIER_IDS = {
  FATIGUE: 'fatigue',
  MORNING_FUNCTIONING: 'morning_functioning',
  PROCRASTINATION: 'procrastination',
  SENSORY_DISCOMFORT: 'sensory_discomfort',
  AVOIDANCE: 'avoidance',
  IRRITABILITY: 'irritability',
  ANXIETY_ATTACKS: 'anxiety_attacks',
  CONCENTRATION: 'concentration',
  AUTHORITY: 'authority',
  MOTIVATION: 'motivation',
  EMOTIONAL_REGULATION: 'emotional_regulation',
  TIME_MANAGEMENT: 'time_management',
  SELF_WORTH: 'self_worth',
};

export const BARRIERS = [
  {
    id: BARRIER_IDS.FATIGUE,
    he: 'עייפות',
    en: 'Fatigue',
    cluster: 'physiological',
  },
  {
    id: BARRIER_IDS.MORNING_FUNCTIONING,
    he: 'יכולת להיות פעיל.ה בבקרים',
    en: 'Ability to be active in mornings',
    cluster: 'physiological',
  },
  {
    id: BARRIER_IDS.PROCRASTINATION,
    he: 'דחיינות או קושי בהתארגנות וניהול עצמי',
    en: 'Procrastination / difficulty with self-organization',
    cluster: 'executive_function',
  },
  {
    id: BARRIER_IDS.SENSORY_DISCOMFORT,
    he: 'אי-נוחות בסביבת העבודה (יותר מידי רעשים, צפיפות, תאורה וכדומה)',
    en: 'Sensory discomfort in work environment (noise, crowding, lighting)',
    cluster: 'sensory',
  },
  {
    id: BARRIER_IDS.AVOIDANCE,
    he: 'מיעוט ביציאה מהבית (או הימנעות אחרת)',
    en: 'Reduced leaving home / avoidance',
    cluster: 'avoidance',
  },
  {
    id: BARRIER_IDS.IRRITABILITY,
    he: 'רגזנות יתר (פתיל קצר)',
    en: 'Irritability (short fuse)',
    cluster: 'arousal',
  },
  {
    id: BARRIER_IDS.ANXIETY_ATTACKS,
    he: 'התקפי חרדה',
    en: 'Anxiety attacks',
    cluster: 'arousal',
  },
  {
    id: BARRIER_IDS.CONCENTRATION,
    he: 'קשיי ריכוז',
    en: 'Concentration difficulties',
    cluster: 'executive_function',
  },
  {
    id: BARRIER_IDS.AUTHORITY,
    he: 'התמודדות עם גורם סמכות',
    en: 'Dealing with authority figures',
    cluster: 'interpersonal',
  },
  {
    id: BARRIER_IDS.MOTIVATION,
    he: 'היעדר מוטיבציה',
    en: 'Lack of motivation',
    cluster: 'emotional',
  },
  {
    id: BARRIER_IDS.EMOTIONAL_REGULATION,
    he: 'ויסות רגשי בעבודה',
    en: 'Emotional regulation at work',
    cluster: 'emotional',
  },
  {
    id: BARRIER_IDS.TIME_MANAGEMENT,
    he: 'ניהול זמן וניהול עצמי בעבודה',
    en: 'Time and self-management at work',
    cluster: 'executive_function',
  },
  {
    id: BARRIER_IDS.SELF_WORTH,
    he: 'הערך העצמי שלי',
    en: 'Self-worth',
    cluster: 'emotional',
  },
];

export const CLUSTERS = {
  physiological: {
    he: 'פיזיולוגי',
    en: 'Physiological',
    barriers: ['fatigue', 'morning_functioning'],
  },
  executive_function: {
    he: 'תפקודים ניהוליים',
    en: 'Executive Function',
    barriers: ['procrastination', 'concentration', 'time_management'],
  },
  sensory: {
    he: 'חושי',
    en: 'Sensory',
    barriers: ['sensory_discomfort'],
  },
  avoidance: {
    he: 'הימנעות',
    en: 'Avoidance',
    barriers: ['avoidance'],
  },
  arousal: {
    he: 'עוררות יתר',
    en: 'Hyperarousal',
    barriers: ['irritability', 'anxiety_attacks'],
  },
  interpersonal: {
    he: 'בינאישי',
    en: 'Interpersonal',
    barriers: ['authority'],
  },
  emotional: {
    he: 'רגשי',
    en: 'Emotional',
    barriers: ['motivation', 'emotional_regulation', 'self_worth'],
  },
};

export const SEVERITY_LEVELS = {
  1: { he: 'בכלל לא מפריע', en: 'Not at all' },
  2: { he: 'מפריע מעט', en: 'Slightly' },
  3: { he: 'מפריע במידה מסוימת', en: 'Moderately' },
  4: { he: 'מפריע במידה רבה', en: 'Significantly' },
  5: { he: 'מפריע במידה רבה מאוד', en: 'Severely' },
};
