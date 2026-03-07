/**
 * Engine 3: Translation Layer
 *
 * Maps abstract barriers → concrete workplace situations → accommodation options.
 * Built from interview data (אתגרי נגישות כפי שעלו מראיונות)
 * and the "How post-traumatics feel at work" presentation.
 *
 * Structure: barrier_id → workplace scenarios → friction types → accommodations
 */

export const WORKPLACE_DOMAINS = {
  recruitment: { he: 'תהליך הגיוס', en: 'Recruitment process' },
  onboarding: { he: 'קליטה', en: 'Onboarding' },
  daily_work: { he: 'עבודה יומיומית', en: 'Daily work' },
  management: { he: 'ניהול', en: 'Management interaction' },
  social: { he: 'חברתי', en: 'Social interaction' },
  physical_env: { he: 'סביבה פיזית', en: 'Physical environment' },
  schedule: { he: 'לוח זמנים', en: 'Schedule & time' },
};

export const ACCOMMODATION_COST = {
  zero: { he: 'ללא עלות', en: 'No cost', level: 0 },
  low: { he: 'עלות נמוכה', en: 'Low cost', level: 1 },
  medium: { he: 'עלות בינונית', en: 'Medium cost', level: 2 },
  high: { he: 'עלות גבוהה', en: 'High cost', level: 3 },
};

/**
 * Complete scenario database.
 * Each barrier maps to concrete workplace situations, with quotes from interviews
 * and specific accommodation options ranked by cost and complexity.
 */
export const SCENARIO_DATABASE = {
  sensory_discomfort: {
    scenarios: [
      {
        domain: 'physical_env',
        situation_he: 'חדר ישיבות עם קירות שקופים, צמוד לשירותים, סביבה רעשנית',
        situation_en: 'Meeting room with glass walls, adjacent to restrooms, noisy environment',
        quote: 'ענבל: "החדר ישיבות עם קירות שקופים, צמוד לשירותים, צביעה רעשנית מאוד"',
        friction: 'sensory_overload',
        accommodations: [
          { action_he: 'אפשרות לשבת ליד הקיר/פינה בפגישות', action_en: 'Option to sit near wall/corner in meetings', cost: 'zero', complexity: 'low' },
          { action_he: 'שימוש באוזניות מבטלות רעש', action_en: 'Noise-cancelling headphones provided', cost: 'low', complexity: 'low' },
          { action_he: 'הקצאת חדר שקט לעבודה מרוכזת', action_en: 'Dedicated quiet room for focused work', cost: 'medium', complexity: 'medium' },
          { action_he: 'התאמת תאורה (הפחתת פלורסנט, תאורה עקיפה)', action_en: 'Lighting adjustment (reduce fluorescent, indirect lighting)', cost: 'medium', complexity: 'medium' },
        ],
      },
      {
        domain: 'daily_work',
        situation_he: 'אינטראקציות רבות, ריח של אוכל ובושם, רעשי דיבורים',
        situation_en: 'Multiple interactions, food and perfume smells, conversation noise',
        quote: 'אנונימי: "מבחינתי, קודם כל הרעש, מעל הכל"',
        friction: 'sensory_overload',
        accommodations: [
          { action_he: 'הגדרת "שעות שקטות" במשרד', action_en: 'Designated "quiet hours" in office', cost: 'zero', complexity: 'low' },
          { action_he: 'מדיניות ללא בישום חזק בסביבת העבודה', action_en: 'No strong fragrance policy in workspace', cost: 'zero', complexity: 'low' },
          { action_he: 'עבודה מרחוק ביום עמוס (ימי ישיבות)', action_en: 'Remote work option on heavy meeting days', cost: 'zero', complexity: 'medium' },
        ],
      },
      {
        domain: 'social',
        situation_he: 'שאלות פולשניות על חוויות טראומטיות',
        situation_en: 'Intrusive questions about traumatic experiences',
        quote: 'אנונימית: "התחיל לשאול אותי על הנובה, מה עברתי שם, משום מקום"',
        friction: 'trigger_exposure',
        accommodations: [
          { action_he: 'הכשרת עובדים על תקשורת רגישה', action_en: 'Staff training on sensitive communication', cost: 'low', complexity: 'medium' },
          { action_he: 'הנחיות ארגוניות נגד שאלות אישיות חודרניות', action_en: 'Organizational guidelines against intrusive personal questions', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  authority: {
    scenarios: [
      {
        domain: 'management',
        situation_he: 'מנהל מרים קול, יוצר דחיפות מלאכותית, נותן "פקודות עבור"',
        situation_en: 'Manager raises voice, creates artificial urgency, gives orders without context',
        quote: 'אנונימית: "הוא פתאום הרים את הקול, כמו תמיד, והפעם הגוף התחיל לרעוד"',
        friction: 'authority_trigger',
        accommodations: [
          { action_he: 'הכשרת מנהלים לניהול מיודע טראומה', action_en: 'Trauma-informed management training', cost: 'medium', complexity: 'medium' },
          { action_he: 'מדיניות "בלי צעקות" ארגונית', action_en: 'Organizational "no yelling" policy', cost: 'zero', complexity: 'low' },
          { action_he: 'הסבר הקשר ומטרה לכל משימה שניתנת', action_en: 'Context and purpose explanation for every assigned task', cost: 'zero', complexity: 'low' },
          { action_he: 'שיתוף העובד בהחלטות הרלוונטיות אליו', action_en: 'Including worker in decisions relevant to them', cost: 'zero', complexity: 'medium' },
        ],
      },
      {
        domain: 'management',
        situation_he: 'הערות מזלזלות על המצב הנפשי',
        situation_en: 'Dismissive comments about mental health condition',
        quote: 'ירון: "הפוסט טראומה שלך לא תיכנס למשרד"',
        friction: 'stigma',
        accommodations: [
          { action_he: 'מדיניות ארגונית של zero tolerance להערות מזלזלות', action_en: 'Zero tolerance policy for dismissive comments about mental health', cost: 'zero', complexity: 'medium' },
          { action_he: 'הרצאות מודעות לצוות על פוסט טראומה', action_en: 'PTSD awareness presentations for teams', cost: 'low', complexity: 'medium' },
        ],
      },
      {
        domain: 'management',
        situation_he: 'מנהלת אומרת שלקח לה זמן "ללמוד לעבוד" עם העובד',
        situation_en: 'Manager says it took her long to "learn how to work" with the employee',
        quote: 'אנונימי: "היא אמרה לי לקח לי הרבה זמן ללמוד איך לעבוד איתך."',
        friction: 'implicit_othering',
        accommodations: [
          { action_he: 'תיאום ציפיות דו-כיווני מתחילת העבודה', action_en: 'Two-way expectation alignment from day one', cost: 'zero', complexity: 'medium' },
          { action_he: 'פגישות 1:1 שבועיות קבועות למשוב', action_en: 'Regular weekly 1:1 meetings for feedback', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  avoidance: {
    scenarios: [
      {
        domain: 'schedule',
        situation_he: 'קושי ביציאה מהבית, הימנעות ממקומות צפופים',
        situation_en: 'Difficulty leaving home, avoiding crowded places',
        friction: 'attendance',
        accommodations: [
          { action_he: 'עבודה היברידית עם ימי נוכחות גמישים', action_en: 'Hybrid work with flexible in-office days', cost: 'zero', complexity: 'low' },
          { action_he: 'כניסה הדרגתית - להתחיל מיום אחד בשבוע במשרד', action_en: 'Gradual exposure - start with 1 office day per week', cost: 'zero', complexity: 'medium' },
          { action_he: 'שעות כניסה גמישות (להימנע משעות שיא בתחבורה)', action_en: 'Flexible arrival times (avoid rush hour commute)', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  fatigue: {
    scenarios: [
      {
        domain: 'schedule',
        situation_he: 'עייפות כרונית שמשפיעה על יכולת תפקוד',
        situation_en: 'Chronic fatigue affecting functional capacity',
        friction: 'reduced_capacity',
        accommodations: [
          { action_he: 'אפשרות להפסקות קצרות לאורך היום', action_en: 'Short break options throughout the day', cost: 'zero', complexity: 'low' },
          { action_he: 'תכנון משימות מורכבות לשעות השיא של העובד', action_en: 'Schedule complex tasks during worker\'s peak hours', cost: 'zero', complexity: 'low' },
          { action_he: 'משרה חלקית או שעות מופחתות', action_en: 'Part-time or reduced hours option', cost: 'medium', complexity: 'medium' },
        ],
      },
    ],
  },

  morning_functioning: {
    scenarios: [
      {
        domain: 'schedule',
        situation_he: 'קושי חמור בתפקוד בשעות הבוקר',
        situation_en: 'Severe difficulty functioning in morning hours',
        friction: 'attendance',
        accommodations: [
          { action_he: 'שעת התחלה מאוחרת (10:00 ומעלה)', action_en: 'Late start time (10:00+)', cost: 'zero', complexity: 'low' },
          { action_he: 'משימות קלות בבוקר, מורכבות אחרי הצהריים', action_en: 'Light tasks in morning, complex tasks in afternoon', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  procrastination: {
    scenarios: [
      {
        domain: 'daily_work',
        situation_he: 'קושי ביוזמה והתחלת משימות',
        situation_en: 'Difficulty initiating and starting tasks',
        friction: 'task_paralysis',
        accommodations: [
          { action_he: 'פירוק משימות גדולות למשימות קטנות עם מועדים', action_en: 'Breaking large tasks into small tasks with deadlines', cost: 'zero', complexity: 'low' },
          { action_he: 'צ\'ק-אין יומי קצר עם המנהל על סדר יום', action_en: 'Short daily check-in with manager on agenda', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  irritability: {
    scenarios: [
      {
        domain: 'social',
        situation_he: 'תגובות מוגזמות לסיטואציות יומיומיות',
        situation_en: 'Overreactions to everyday situations',
        friction: 'interpersonal_conflict',
        accommodations: [
          { action_he: 'הסכם "זמן מנוחה" - אפשרות לפרישה זמנית ללא שאלות', action_en: '"Time-out" agreement - option to temporarily withdraw without questions', cost: 'zero', complexity: 'low' },
          { action_he: 'הפחתת עבודה בצוותים גדולים', action_en: 'Reduce large team interactions', cost: 'zero', complexity: 'medium' },
        ],
      },
    ],
  },

  anxiety_attacks: {
    scenarios: [
      {
        domain: 'daily_work',
        situation_he: 'התקפי חרדה במהלך יום העבודה',
        situation_en: 'Anxiety attacks during workday',
        friction: 'acute_episode',
        accommodations: [
          { action_he: 'מרחב מפלט - חדר שקט נגיש בכל עת', action_en: 'Safe retreat space - quiet room accessible at all times', cost: 'low', complexity: 'low' },
          { action_he: 'איש קשר מוגדר למקרה של משבר (לא בהכרח מנהל)', action_en: 'Designated contact person for crisis (not necessarily manager)', cost: 'zero', complexity: 'medium' },
          { action_he: 'פרוטוקול "יציאה בטוחה" ידוע מראש', action_en: 'Pre-established "safe exit" protocol', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  concentration: {
    scenarios: [
      {
        domain: 'daily_work',
        situation_he: 'קושי להתרכז במשימות ארוכות',
        situation_en: 'Difficulty concentrating on long tasks',
        friction: 'reduced_output',
        accommodations: [
          { action_he: 'חלוקת יום העבודה לבלוקים של 45 דקות עם הפסקות', action_en: 'Divide workday into 45-minute blocks with breaks', cost: 'zero', complexity: 'low' },
          { action_he: 'הנחיות כתובות וברורות לכל משימה', action_en: 'Written, clear instructions for every task', cost: 'zero', complexity: 'low' },
          { action_he: 'צמצום מולטיטסקינג - משימה אחת בכל פעם', action_en: 'Reduce multitasking - one task at a time', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  motivation: {
    scenarios: [
      {
        domain: 'management',
        situation_he: 'היעדר מוטיבציה ותחושת חוסר משמעות',
        situation_en: 'Lack of motivation and sense of meaninglessness',
        friction: 'disengagement',
        accommodations: [
          { action_he: 'חיבור המשימות לתמונה הגדולה של הארגון', action_en: 'Connecting tasks to organizational big picture', cost: 'zero', complexity: 'low' },
          { action_he: 'הגדרת יעדים קטנים וחגיגת הישגים', action_en: 'Setting small goals and celebrating achievements', cost: 'zero', complexity: 'low' },
          { action_he: 'מתן אוטונומיה בבחירת אופן ביצוע המשימות', action_en: 'Autonomy in choosing how to execute tasks', cost: 'zero', complexity: 'medium' },
        ],
      },
    ],
  },

  emotional_regulation: {
    scenarios: [
      {
        domain: 'daily_work',
        situation_he: 'קושי בוויסות רגשי - תגובות עזות או קיפאון',
        situation_en: 'Emotional dysregulation - intense reactions or freezing',
        friction: 'emotional_episode',
        accommodations: [
          { action_he: 'נורמליזציה של הפסקות רגשיות ("אני צריך רגע")', action_en: 'Normalizing emotional breaks ("I need a moment")', cost: 'zero', complexity: 'low' },
          { action_he: 'הכשרת המנהל הישיר לזיהוי סימנים ותגובה רגישה', action_en: 'Training direct manager to recognize signs and respond sensitively', cost: 'low', complexity: 'medium' },
        ],
      },
    ],
  },

  time_management: {
    scenarios: [
      {
        domain: 'daily_work',
        situation_he: 'קושי בניהול זמן ותיעדוף משימות',
        situation_en: 'Difficulty with time management and task prioritization',
        friction: 'missed_deadlines',
        accommodations: [
          { action_he: 'שיתוף לוח זמנים שקוף עם המנהל', action_en: 'Shared transparent schedule with manager', cost: 'zero', complexity: 'low' },
          { action_he: 'תכנון שבועי קבוע עם המנהל (15 דקות)', action_en: 'Fixed weekly planning session with manager (15 min)', cost: 'zero', complexity: 'low' },
        ],
      },
    ],
  },

  self_worth: {
    scenarios: [
      {
        domain: 'management',
        situation_he: 'ערך עצמי נמוך המשפיע על ביטחון מקצועי',
        situation_en: 'Low self-worth affecting professional confidence',
        friction: 'underperformance',
        accommodations: [
          { action_he: 'משוב חיובי ספציפי ותכוף (לא רק שנתי)', action_en: 'Frequent specific positive feedback (not just annual)', cost: 'zero', complexity: 'low' },
          { action_he: 'הגדרת תחומי אחריות ברורים עם מדדי הצלחה מוגדרים', action_en: 'Clear responsibility areas with defined success metrics', cost: 'zero', complexity: 'medium' },
          { action_he: 'תכנית פיתוח אישי - להראות השקעה בעתיד העובד', action_en: 'Personal development plan - showing investment in worker\'s future', cost: 'low', complexity: 'medium' },
        ],
      },
    ],
  },
};

/**
 * Translate an interpreted profile into concrete workplace recommendations.
 * @param {InterpretationReport} interpretation - from Engine 2
 * @returns {TranslationReport}
 */
export function translateToWorkplace(interpretation) {
  const { profile } = interpretation;
  const recommendations = [];

  for (const barrier of profile.criticalBarriers) {
    const scenarioSet = SCENARIO_DATABASE[barrier.id];
    if (!scenarioSet) continue;

    for (const scenario of scenarioSet.scenarios) {
      recommendations.push({
        barrierId: barrier.id,
        barrierScore: barrier.score,
        barrierName: { he: barrier.he, en: barrier.en },
        domain: scenario.domain,
        domainName: WORKPLACE_DOMAINS[scenario.domain],
        situation: { he: scenario.situation_he, en: scenario.situation_en },
        quote: scenario.quote || null,
        friction: scenario.friction,
        accommodations: scenario.accommodations.map(a => ({
          ...a,
          costInfo: ACCOMMODATION_COST[a.cost],
        })),
      });
    }
  }

  // Also include moderate barriers (score 3) with at least their primary scenario
  for (const barrier of profile.barrierScores.filter(b => b.score === 3)) {
    const scenarioSet = SCENARIO_DATABASE[barrier.id];
    if (!scenarioSet || scenarioSet.scenarios.length === 0) continue;

    const primaryScenario = scenarioSet.scenarios[0];
    recommendations.push({
      barrierId: barrier.id,
      barrierScore: barrier.score,
      barrierName: { he: barrier.he, en: barrier.en },
      domain: primaryScenario.domain,
      domainName: WORKPLACE_DOMAINS[primaryScenario.domain],
      situation: { he: primaryScenario.situation_he, en: primaryScenario.situation_en },
      quote: primaryScenario.quote || null,
      friction: primaryScenario.friction,
      accommodations: primaryScenario.accommodations.map(a => ({
        ...a,
        costInfo: ACCOMMODATION_COST[a.cost],
      })),
    });
  }

  // Sort by barrier severity, then by cost (cheapest first within each barrier)
  recommendations.sort((a, b) => b.barrierScore - a.barrierScore);

  // Summary stats
  const totalAccommodations = recommendations.reduce((sum, r) => sum + r.accommodations.length, 0);
  const zeroCostCount = recommendations.reduce((sum, r) =>
    sum + r.accommodations.filter(a => a.cost === 'zero').length, 0);

  return {
    recommendations,
    summary: {
      totalRecommendations: recommendations.length,
      totalAccommodations,
      zeroCostAccommodations: zeroCostCount,
      zeroCostPercentage: Math.round((zeroCostCount / totalAccommodations) * 100),
      domainsAffected: [...new Set(recommendations.map(r => r.domain))],
    },
    interpretation,
    timestamp: new Date().toISOString(),
  };
}
