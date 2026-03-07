/**
 * Engine 4: Implementation Layer
 *
 * Converts accommodation recommendations into employer-side operational actions.
 * Based on the organizational procedures book (ספר נהלים ארגוני - נגישות רגשית).
 *
 * Three principles of emotional accessibility:
 * 1. Reducing stimulus overload (סביבה מפחיתת עומסים)
 * 2. Creating clarity and control through information (בהירות ושליטה באמצעות מידע)
 * 3. Strengthening emotional and social connection (חיבור רגשי וחברתי)
 */

export const EMOTIONAL_ACCESSIBILITY_PRINCIPLES = {
  reduce_overload: {
    he: 'יצירת סביבה מפחיתת עומסים',
    en: 'Creating a stimulus-reducing environment',
    description_he: 'הפחתת רעשים והסחות דעת, הפרדה בין אזורי עבודה למנוחה, ניהול עומסים קוגניטיביים, תקשורת פשוטה ואחידה.',
    description_en: 'Reducing noise and distractions, separating work and rest areas, managing cognitive loads, simple and consistent communication.',
    subprinciples: [
      { he: 'ניקוי ונטרול גירויים חיצוניים', en: 'Clearing and neutralizing external stimuli' },
      { he: 'ניהול עומסים קוגניטיביים', en: 'Managing cognitive loads' },
    ],
  },
  create_clarity: {
    he: 'יצירת בהירות ושליטה באמצעות מידע',
    en: 'Creating clarity and control through information',
    description_he: 'הנגשת מידע, שקיפות, ניהול תהליכי שינוי בתקשורת פתוחה ומיידית.',
    description_en: 'Making information accessible, transparency, managing change processes with open and immediate communication.',
    subprinciples: [
      { he: 'הנגשת מידע ויצירת שקיפות', en: 'Information accessibility and transparency' },
      { he: 'ניהול תהליכי שינוי', en: 'Change process management' },
    ],
  },
  strengthen_connection: {
    he: 'חיזוק חיבור רגשי וחברתי',
    en: 'Strengthening emotional and social connection',
    description_he: 'תיאום ציפיות דו-כיווני, שיתוף באתגרים ולמידה מכשלונות, יצירת שיח פתוח ובטוח.',
    description_en: 'Two-way expectation alignment, sharing challenges and learning from failures, creating open and safe dialogue.',
    subprinciples: [
      { he: 'תיאום ציפיות דו-כיווני', en: 'Two-way expectation alignment' },
      { he: 'שיתוף באתגרים ולמידה מכשלונות', en: 'Sharing challenges and learning from failures' },
    ],
  },
};

/**
 * Organizational procedure modules that can be assembled per profile.
 * Each module maps to specific accommodation needs and org readiness levels.
 */
export const PROCEDURE_MODULES = {
  // ──── RECRUITMENT ────
  accessible_job_posting: {
    principle: 'create_clarity',
    lifecycle_phase: 'recruitment',
    he: 'פרסום משרה נגיש',
    en: 'Accessible job posting',
    for_role: ['hr'],
    readiness: 'basic',
    actions: [
      { he: 'פירוט מלא של תהליך הגיוס עם תאריכים', en: 'Full detail of recruitment process with dates' },
      { he: 'תיאור ברור של התפקיד, תחומי אחריות, מדדי הצלחה', en: 'Clear job description, responsibilities, success metrics' },
      { he: 'פרסום שכר והטבות מראש', en: 'Publishing salary and benefits upfront' },
      { he: 'ציון מידע על הצוות והמנהל הישיר', en: 'Team and direct manager information included' },
    ],
    triggers: ['avoidance', 'anxiety_attacks', 'self_worth'],
  },

  structured_interview: {
    principle: 'create_clarity',
    lifecycle_phase: 'recruitment',
    he: 'ראיון מובנה ושקוף',
    en: 'Structured transparent interview',
    for_role: ['hr', 'manager'],
    readiness: 'basic',
    actions: [
      { he: 'שליחת תסריט הראיון מראש למועמד', en: 'Sending interview script to candidate in advance' },
      { he: 'הגבלת אורך ראיון (30-45 דק\')', en: 'Limiting interview length (30-45 min)' },
      { he: 'תשובה תוך 3 ימי עסקים בכל שלב', en: 'Response within 3 business days at every stage' },
      { he: 'מתן פידבק ערכי גם למועמדים שלא התקבלו', en: 'Providing valuable feedback to rejected candidates too' },
    ],
    triggers: ['anxiety_attacks', 'authority', 'self_worth'],
  },

  // ──── ONBOARDING ────
  gradual_onboarding: {
    principle: 'reduce_overload',
    lifecycle_phase: 'onboarding',
    he: 'קליטה הדרגתית',
    en: 'Gradual onboarding',
    for_role: ['hr', 'manager'],
    readiness: 'basic',
    actions: [
      { he: 'יצירת קשר שבועי לפני יום ראשון בעבודה', en: 'Weekly contact before first day at work' },
      { he: 'מסמך אונבורדינג מפורט שנשלח מראש', en: 'Detailed onboarding document sent in advance' },
      { he: 'פגישות 1:1 עם חברי צוות בשבועיים הראשונים', en: '1:1 meetings with team members in first two weeks' },
      { he: 'ציפיות מופחתות בחודש הראשון', en: 'Reduced expectations in first month' },
    ],
    triggers: ['avoidance', 'anxiety_attacks', 'sensory_discomfort', 'self_worth'],
  },

  // ──── DAILY MANAGEMENT ────
  trauma_informed_management: {
    principle: 'strengthen_connection',
    lifecycle_phase: 'daily_work',
    he: 'ניהול מיודע טראומה',
    en: 'Trauma-informed management',
    for_role: ['manager'],
    readiness: 'intermediate',
    actions: [
      { he: 'הימנעות מהרמת קול ודחיפות מלאכותית', en: 'Avoiding raised voice and artificial urgency' },
      { he: 'הסבר הקשר ומטרה לכל משימה', en: 'Explaining context and purpose for every task' },
      { he: 'שיתוף העובד בהחלטות', en: 'Including worker in decisions' },
      { he: 'זיהוי סימני מצוקה ותגובה רגישה', en: 'Recognizing distress signs and responding sensitively' },
      { he: 'נורמליזציה של הפסקות רגשיות', en: 'Normalizing emotional breaks' },
    ],
    triggers: ['authority', 'emotional_regulation', 'irritability', 'anxiety_attacks'],
  },

  structured_feedback: {
    principle: 'strengthen_connection',
    lifecycle_phase: 'daily_work',
    he: 'פידבק מובנה ורציף',
    en: 'Structured continuous feedback',
    for_role: ['manager'],
    readiness: 'basic',
    actions: [
      { he: 'שיחות חודשיות על מצב רגשי ומקצועי', en: 'Monthly conversations about emotional and professional state' },
      { he: 'סקירה רבעונית של KPIs', en: 'Quarterly KPI review' },
      { he: 'משוב דו-כיווני - גם העובד נותן משוב למנהל', en: 'Two-way feedback - worker also gives feedback to manager' },
      { he: 'היסמכות על דאטה ודוגמאות ספציפיות', en: 'Data-driven feedback with specific examples' },
      { he: 'פוקוס על פתרונות ועתיד, לא על טעויות עבר', en: 'Focus on solutions and future, not past mistakes' },
    ],
    triggers: ['self_worth', 'motivation', 'authority'],
  },

  sensory_environment: {
    principle: 'reduce_overload',
    lifecycle_phase: 'daily_work',
    he: 'סביבה חושית מותאמת',
    en: 'Adapted sensory environment',
    for_role: ['hr', 'facilities'],
    readiness: 'intermediate',
    actions: [
      { he: 'חדר שקט נגיש לעבודה מרוכזת ולמפלט', en: 'Accessible quiet room for focused work and retreat' },
      { he: 'שעות שקטות מוגדרות', en: 'Designated quiet hours' },
      { he: 'תאורה עקיפה במקום פלורסנט', en: 'Indirect lighting instead of fluorescent' },
      { he: 'מדיניות ללא בישום חזק', en: 'No strong fragrance policy' },
      { he: 'אוזניות מבטלות רעש זמינות', en: 'Noise-cancelling headphones available' },
    ],
    triggers: ['sensory_discomfort', 'anxiety_attacks', 'concentration'],
  },

  flexible_scheduling: {
    principle: 'reduce_overload',
    lifecycle_phase: 'daily_work',
    he: 'לוח זמנים גמיש',
    en: 'Flexible scheduling',
    for_role: ['manager', 'hr'],
    readiness: 'basic',
    actions: [
      { he: 'שעות כניסה גמישות', en: 'Flexible arrival times' },
      { he: 'אפשרות עבודה מרחוק', en: 'Remote work option' },
      { he: 'הפסקות קבועות מובנות ביום העבודה', en: 'Scheduled built-in breaks during workday' },
      { he: 'בוקרי שלישי חופשיים (עד 13:00)', en: 'Tuesday mornings free (until 13:00)' },
    ],
    triggers: ['fatigue', 'morning_functioning', 'avoidance'],
  },

  crisis_protocol: {
    principle: 'reduce_overload',
    lifecycle_phase: 'daily_work',
    he: 'פרוטוקול אירוע מוגנות',
    en: 'Safety event protocol',
    for_role: ['hr', 'manager', 'team'],
    readiness: 'intermediate',
    actions: [
      { he: 'הגדרת אירוע מוגנות ותהליך דיווח ברור', en: 'Defining safety event and clear reporting process' },
      { he: 'מינוי צוות טיפול מיידי', en: 'Appointing immediate response team' },
      { he: 'בירור תוך שבוע לכל היותר', en: 'Investigation within one week maximum' },
      { he: 'הסקת מסקנות ושיתוף הצוות', en: 'Drawing conclusions and sharing with team' },
    ],
    triggers: ['anxiety_attacks', 'emotional_regulation', 'authority'],
  },

  cognitive_load_management: {
    principle: 'reduce_overload',
    lifecycle_phase: 'daily_work',
    he: 'ניהול עומס קוגניטיבי',
    en: 'Cognitive load management',
    for_role: ['manager'],
    readiness: 'basic',
    actions: [
      { he: 'משימה אחת בכל פעם, לא מולטיטאסקינג', en: 'One task at a time, no multitasking' },
      { he: 'הנחיות כתובות וברורות לכל משימה', en: 'Written clear instructions for every task' },
      { he: 'תכנון שבועי קבוע', en: 'Fixed weekly planning' },
      { he: 'צמצום שינויים פתאומיים', en: 'Minimizing sudden changes' },
    ],
    triggers: ['concentration', 'procrastination', 'time_management'],
  },

  transparent_change_management: {
    principle: 'create_clarity',
    lifecycle_phase: 'daily_work',
    he: 'ניהול שינויים שקוף',
    en: 'Transparent change management',
    for_role: ['manager', 'hr'],
    readiness: 'basic',
    actions: [
      { he: 'הודעה מיידית על כל שינוי ארגוני', en: 'Immediate notification of any organizational change' },
      { he: 'הסבר על סיבת השינוי והשלכותיו', en: 'Explanation of why the change and its implications' },
      { he: 'מתן זמן הסתגלות', en: 'Allowing adaptation time' },
      { he: 'שיתוף העובדים בתהליך ככל האפשר', en: 'Involving workers in the process as much as possible' },
    ],
    triggers: ['anxiety_attacks', 'avoidance', 'emotional_regulation'],
  },

  // ──── OFFBOARDING ────
  dignified_exit: {
    principle: 'strengthen_connection',
    lifecycle_phase: 'offboarding',
    he: 'עזיבה מכובדת',
    en: 'Dignified exit process',
    for_role: ['hr', 'manager'],
    readiness: 'basic',
    actions: [
      { he: 'שיחה אישית לפני כל הודעה רשמית', en: 'Personal conversation before any formal notification' },
      { he: 'העברת משימות מסודרת', en: 'Orderly task handover' },
      { he: 'שמירה על הצוות הנותר מבחינה רגשית', en: 'Emotionally protecting remaining team' },
      { he: 'הודעה לעובד על הצעדים הננקטים בכתב', en: 'Notifying worker of steps being taken in writing' },
    ],
    triggers: [],
  },
};

export const READINESS_LEVELS = {
  basic: {
    he: 'בסיסי',
    en: 'Basic',
    description_en: 'Can be implemented immediately with no training or budget. Requires policy decision only.',
    description_he: 'ניתן ליישום מיידי ללא הכשרה או תקציב. דורש החלטה מדיניתית בלבד.',
  },
  intermediate: {
    he: 'בינוני',
    en: 'Intermediate',
    description_en: 'Requires some training and/or moderate budget. Implementable within 1-3 months.',
    description_he: 'דורש הכשרה מסוימת ו/או תקציב מתון. ניתן ליישום תוך 1-3 חודשים.',
  },
  advanced: {
    he: 'מתקדם',
    en: 'Advanced',
    description_en: 'Requires significant organizational change, budget, and ongoing commitment.',
    description_he: 'דורש שינוי ארגוני משמעותי, תקציב ומחויבות מתמשכת.',
  },
};

/**
 * Generate implementation plan from translation recommendations.
 * @param {TranslationReport} translation - from Engine 3
 * @param {string} orgReadiness - 'basic' | 'intermediate' | 'advanced'
 * @returns {ImplementationPlan}
 */
export function generateImplementationPlan(translation, orgReadiness = 'basic') {
  const { recommendations, interpretation } = translation;
  const { profile } = interpretation;

  // Collect all triggered barrier IDs
  const activeBarrierIds = new Set(
    profile.barrierScores
      .filter(b => b.score >= 3)
      .map(b => b.id)
  );

  // Select applicable procedure modules
  const applicableModules = [];
  for (const [moduleId, module] of Object.entries(PROCEDURE_MODULES)) {
    const isTriggered = module.triggers.some(t => activeBarrierIds.has(t)) || module.triggers.length === 0;
    const isWithinReadiness = readinessLevel(module.readiness) <= readinessLevel(orgReadiness);

    if (isTriggered && isWithinReadiness) {
      applicableModules.push({
        id: moduleId,
        ...module,
        relevanceScore: module.triggers.filter(t => activeBarrierIds.has(t)).length,
      });
    }
  }

  // Sort by relevance (most triggers matched first)
  applicableModules.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Group by role
  const byRole = {};
  for (const mod of applicableModules) {
    for (const role of mod.for_role) {
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(mod);
    }
  }

  // Group by lifecycle phase
  const byPhase = {};
  for (const mod of applicableModules) {
    if (!byPhase[mod.lifecycle_phase]) byPhase[mod.lifecycle_phase] = [];
    byPhase[mod.lifecycle_phase].push(mod);
  }

  return {
    orgReadiness,
    applicableModules,
    byRole,
    byPhase,
    principles: EMOTIONAL_ACCESSIBILITY_PRINCIPLES,
    totalActions: applicableModules.reduce((sum, m) => sum + m.actions.length, 0),
    translation,
    timestamp: new Date().toISOString(),
  };
}

function readinessLevel(level) {
  const levels = { basic: 1, intermediate: 2, advanced: 3 };
  return levels[level] || 1;
}
