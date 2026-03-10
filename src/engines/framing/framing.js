/**
 * Engine 5: Framing & Persuasion Layer
 *
 * Generates employer-facing communication based on the two presentation decks:
 * 1. "From the battlefield to the desk" (הרצאה למעסיקים)
 * 2. "How post-traumatics feel at work" (איך פוסט טראומטים מרגישים בעבודה)
 *
 * Key framing from presentations:
 * - Trauma changes the brain (neurological framing, not character)
 * - Three workplace challenges: sensory overload, uncertainty & control, insensitive management
 * - "You can't avoid triggers, but you CAN make the workplace trauma-adapted"
 * - Natal's 7-pillar model for employer support
 */

export const AUDIENCE_TYPES = {
  c_level: { he: 'הנהלה בכירה', en: 'C-Level / Senior Management' },
  hr: { he: 'משאבי אנוש', en: 'HR Professionals' },
  direct_manager: { he: 'מנהל ישיר', en: 'Direct Managers' },
  team: { he: 'חברי צוות', en: 'Team Members' },
};

/**
 * Core messaging framework from the presentations.
 */
export const CORE_MESSAGES = {
  brain_not_character: {
    he: 'טראומה משנה את המוח. זו לא בעיה של אופי - זו בעיה של מוח שנמצא במצב הישרדותי.',
    en: 'Trauma changes the brain. This is not a character issue — it is a brain stuck in survival mode.',
    audience: ['c_level', 'hr', 'direct_manager', 'team'],
    purpose: 'destigmatize',
  },
  prefrontal_impact: {
    he: 'הקורטקס הפרה-פרונטלי — שאחראי על מיומנויות ניהוליות, קבלת החלטות וויסות רגשי — נפגע מטראומה.',
    en: 'The prefrontal cortex — responsible for executive skills, decision-making, and emotional regulation — is impacted by trauma.',
    audience: ['hr', 'direct_manager'],
    purpose: 'educate',
  },
  three_challenges: {
    he: 'שלושה אתגרים מרכזיים: עומס חושי, חוסר ודאות ושליטה, וניהול לא רגיש.',
    en: 'Three core challenges: sensory overload, uncertainty and loss of control, and insensitive management.',
    audience: ['c_level', 'hr', 'direct_manager'],
    purpose: 'frame_problem',
  },
  cant_avoid_can_adapt: {
    he: 'אי אפשר להימנע מטריגרים — אפשר להפוך את מקום העבודה למותאם טראומה.',
    en: "You can't avoid triggers — but you CAN make the workplace trauma-adapted.",
    audience: ['c_level', 'hr', 'direct_manager'],
    purpose: 'solution_frame',
  },
  elevator_analogy: {
    he: 'כמו מעלית בבניין — נגישות רגשית משפרת את איכות העבודה לכולם, לא רק למתמודדי טראומה.',
    en: 'Like an elevator in a building — emotional accessibility improves work quality for everyone, not just trauma survivors.',
    audience: ['c_level', 'hr'],
    purpose: 'broaden_appeal',
  },
};

/**
 * Employer objection handling — anticipates resistance and provides calibrated responses.
 */
export const OBJECTION_RESPONSES = {
  too_expensive: {
    objection_he: 'זה יקר מדי ליישום',
    objection_en: "It's too expensive to implement",
    response_he: 'רוב ההתאמות הן בעלות אפסית — שינוי שפה ניהולית, גמישות בשעות, שקיפות במידע. העלות של אי-יישום גבוהה הרבה יותר: נשירת עובדים, ימי מחלה, ירידה בתפוקה.',
    response_en: 'Most accommodations are zero-cost — changing management language, flexible hours, information transparency. The cost of NOT implementing is far higher: employee turnover, sick days, reduced output.',
    data_point: 'zeroCostPercentage',
  },
  not_our_responsibility: {
    objection_he: 'זה לא תחום האחריות שלנו — יש לזה טיפול מקצועי',
    objection_en: "That's not our responsibility — there's professional treatment for that",
    response_he: 'טיפול מקצועי מטפל בטראומה. אתם מטפלים בסביבת העבודה. שניהם חיוניים. אתם לא צריכים להיות מטפלים — אתם צריכים להיות מנהלים רגישים.',
    response_en: "Professional treatment addresses the trauma. You address the work environment. Both are essential. You don't need to be therapists — you need to be sensitive managers.",
  },
  treat_everyone_equally: {
    objection_he: 'אנחנו מתייחסים לכולם באופן שווה',
    objection_en: 'We treat everyone equally',
    response_he: 'שוויון הוא לא לתת לכולם אותו דבר — זה לתת לכולם את מה שהם צריכים כדי להצליח. בדיוק כמו שמעלית לא מפלה — היא מאפשרת.',
    response_en: "Equality isn't giving everyone the same thing — it's giving everyone what they need to succeed. Just like an elevator doesn't discriminate — it enables.",
  },
  will_others_complain: {
    objection_he: 'עובדים אחרים יתלוננו על העדפה',
    objection_en: 'Other employees will complain about preferential treatment',
    response_he: 'נגישות רגשית מיטיבה עם כולם. שעות גמישות, ניהול שקוף, פידבק מובנה, סביבה שקטה — כל העובדים נהנים מזה. זה לא ויתור — זה שדרוג.',
    response_en: 'Emotional accessibility benefits everyone. Flexible hours, transparent management, structured feedback, quiet spaces — all employees benefit. This isn\'t a concession — it\'s an upgrade.',
  },
};

/**
 * Natal's 7-pillar support model for employers (from the presentation).
 */
export const NATAL_PILLARS = [
  { he: 'הכשרות למנהלים ומש"א — סביבת עבודה מיודעת טראומה', en: 'Manager & HR training — trauma-informed workplace' },
  { he: 'ליווי פרטני למנהל ומש"א', en: 'Individual coaching for managers and HR' },
  { he: 'ליווי מקצועי למנהלים — שיח רגיש, תפקוד ושימור עובדים', en: 'Professional coaching — sensitive dialogue, performance, retention' },
  { he: 'סדנאות חוסן לארגון — התמודדות עם עומס, שחיקה ודחק', en: 'Organizational resilience workshops — stress, burnout, ongoing pressure' },
  { he: 'מענים משלימים לעובדים ולמשפחותיהם', en: 'Complementary support for employees and families' },
  { he: 'תוכנית נאמני חוסן — הכשרה וליווי קבוצת עובדים מתנדבים', en: 'Resilience champions program — training volunteer employee group' },
  { he: 'אימון תעסוקתי לעובדים — חזרה לתפקוד, יציבות והתמדה', en: 'Employment coaching — return to function, stability, persistence' },
];

/**
 * Generate framed communication for a specific audience based on the implementation plan.
 * @param {object} plan - ImplementationPlan from Engine 4
 * @param {string} [audience='hr'] - Key from AUDIENCE_TYPES ('c_level'|'hr'|'direct_manager'|'team')
 * @returns {{
 *   audience: object,
 *   coreMessages: Array,
 *   narrative: object,
 *   objectionResponses: Array,
 *   audienceModules: Array,
 *   natalPillars: Array,
 *   plan: object,
 *   timestamp: string
 * }}
 */
export function generateFraming(plan, audience = 'hr') {
  const { translation } = plan;
  const { interpretation } = translation;
  const { profile } = interpretation;

  // Select relevant core messages for this audience
  const relevantMessages = Object.entries(CORE_MESSAGES)
    .filter(([, msg]) => msg.audience.includes(audience))
    .map(([id, msg]) => ({ id, ...msg }));

  // Select relevant objection responses
  const relevantObjections = Object.entries(OBJECTION_RESPONSES).map(([id, obj]) => {
    const enriched = { id, ...obj };
    // Enrich with actual data if available
    if (obj.data_point === 'zeroCostPercentage' && translation.summary) {
      enriched.data_value = `${translation.summary.zeroCostPercentage}% of recommended accommodations are zero-cost.`;
    }
    return enriched;
  });

  // Build narrative structure: "Here's what happens → Here's why → Here's what works → Here's what you do Monday morning"
  const narrative = buildNarrative(plan, audience, profile);

  // Select relevant procedure modules for this audience
  const audienceModules = plan.applicableModules.filter(m => m.for_role.includes(audience));

  return {
    audience: AUDIENCE_TYPES[audience],
    coreMessages: relevantMessages,
    narrative,
    objectionResponses: relevantObjections,
    audienceModules,
    natalPillars: NATAL_PILLARS,
    plan,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a 4-section narrative for employer-facing communication.
 * Sections: what_happens → heres_why → what_works → monday_morning.
 * @param {object} plan - ImplementationPlan from Engine 4
 * @param {string} audience - Key from AUDIENCE_TYPES
 * @param {object} profile - IntakeProfile from Engine 1
 * @returns {{ what_happens: object, heres_why: object, what_works: object, monday_morning: object }}
 */
function buildNarrative(plan, audience, profile) {
  const sections = {};

  // Section 1: "Here's what happens" — the problem
  sections.what_happens = {
    he: `עובד עם פרופיל חסמים ${profile.overallSeverity.he} מתמודד עם ${profile.criticalBarriers.length} חסמים משמעותיים. ` +
      (profile.patterns.length > 0
        ? `זוהו דפוסים: ${profile.patterns.map(p => p.he).join(', ')}.`
        : ''),
    en: `An employee with ${profile.overallSeverity.en} faces ${profile.criticalBarriers.length} significant barriers. ` +
      (profile.patterns.length > 0
        ? `Detected patterns: ${profile.patterns.map(p => p.en).join(', ')}.`
        : ''),
  };

  // Section 2: "Here's why" — the context
  sections.heres_why = {
    he: 'טראומה משנה את המוח — את הקורטקס הפרה-פרונטלי שאחראי על ריכוז, ויסות רגשי וקבלת החלטות. זה לא חולשה, זו פגיעה נוירולוגית שמשפיעה על תפקוד.',
    en: "Trauma changes the brain — the prefrontal cortex responsible for concentration, emotional regulation, and decision-making. This isn't weakness, it's a neurological impact affecting function.",
  };

  // Section 3: "Here's what works" — the accommodations
  const topModules = plan.applicableModules.slice(0, 3);
  sections.what_works = {
    he: `ההתאמות המומלצות: ${topModules.map(m => m.he).join(', ')}. ` +
      `סה"כ ${plan.totalActions} פעולות, רובן ללא עלות.`,
    en: `Recommended accommodations: ${topModules.map(m => m.en).join(', ')}. ` +
      `Total ${plan.totalActions} actions, most at zero cost.`,
  };

  // Section 4: "Here's what you do Monday morning" — immediate actions
  const immediateActions = plan.applicableModules
    .filter(m => m.readiness === 'basic')
    .flatMap(m => m.actions.slice(0, 1));
  sections.monday_morning = {
    he: `צעדים מיידיים: ${immediateActions.map(a => a.he).join('; ')}.`,
    en: `Immediate steps: ${immediateActions.map(a => a.en).join('; ')}.`,
  };

  return sections;
}
