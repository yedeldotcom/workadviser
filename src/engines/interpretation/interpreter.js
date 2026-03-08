/**
 * Engine 2: Interpretation Layer
 *
 * Takes an IntakeProfile from Engine 1 and produces clinical/functional
 * interpretation based on Natal's research findings:
 *
 * - Positive correlation between barrier scores and distress measures
 *   (anxiety, depression, PTSD symptoms, functional difficulties)
 * - Inverse correlation with recovery assessment and professional self-efficacy
 * - Barrier assessment is sensitive to situational changes across time
 * - Avoidance as barrier decreases during coaching follow-up
 * - Early employment stages show increased trigger exposure → emotional
 *   regulation difficulties and fatigue rise, even as overall functioning improves
 */

/**
 * Trajectory expectations per cluster — based on the background document's
 * longitudinal findings about how barriers change over time in employment coaching.
 */
const TRAJECTORY = {
  physiological: {
    early: 'rise',
    mid: 'plateau',
    late: 'gradual_decline',
    note_en: 'Fatigue and morning difficulty often INCREASE in early employment stages due to trigger exposure, even as overall functioning improves.',
    note_he: 'עייפות וקושי בבקרים נוטים לעלות בשלבים הראשונים של ההשתלבות בעבודה עקב חשיפה לטריגרים, גם כשהתפקוד הכללי משתפר.',
  },
  executive_function: {
    early: 'high',
    mid: 'gradual_decline',
    late: 'stable_low',
    note_en: 'Executive function barriers improve steadily with structured support and routine establishment.',
    note_he: 'חסמי תפקוד ניהולי משתפרים בהדרגה עם תמיכה מובנית וביסוס שגרה.',
  },
  sensory: {
    early: 'high',
    mid: 'stable',
    late: 'stable',
    note_en: 'Sensory sensitivity tends to remain stable — accommodation is the primary intervention, not time.',
    note_he: 'רגישות חושית נוטה להישאר יציבה — התאמות סביבתיות הן ההתערבות העיקרית, לא הזמן.',
  },
  avoidance: {
    early: 'high',
    mid: 'decline',
    late: 'significant_decline',
    note_en: 'Avoidance as a barrier DECREASES over coaching follow-up — one of the strongest improvement signals.',
    note_he: 'הימנעות כחסם יורדת במעקב אחרי אימון — אחד מסימני השיפור החזקים ביותר.',
  },
  arousal: {
    early: 'rise',
    mid: 'plateau',
    late: 'gradual_decline',
    note_en: 'Hyperarousal may increase during initial workplace re-integration due to new trigger exposure.',
    note_he: 'עוררות יתר עשויה לעלות בתחילת ההשתלבות מחדש בעבודה בגלל חשיפה לטריגרים חדשים.',
  },
  interpersonal: {
    early: 'high',
    mid: 'gradual_decline',
    late: 'stable_improved',
    note_en: 'Authority-related barriers improve with trust-building over time, but require consistent manager behavior.',
    note_he: 'חסמים הקשורים לסמכות משתפרים עם בניית אמון לאורך זמן, אך דורשים התנהגות מנהל עקבית.',
  },
  emotional: {
    early: 'rise',
    mid: 'plateau',
    late: 'gradual_decline',
    note_en: 'Emotional regulation difficulties and reduced self-worth RISE in early employment but improve as coping skills develop.',
    note_he: 'קשיי ויסות רגשי וערך עצמי נמוך עולים בתחילת התעסוקה אך משתפרים עם התפתחות כישורי התמודדות.',
  },
};

/**
 * Clinical correlation context from Natal's research.
 */
const CLINICAL_CORRELATIONS = {
  anxiety: {
    he: 'חרדה',
    en: 'Anxiety',
    correlation: 'positive',
    note: 'Higher barrier scores correlate with higher anxiety measures at all time points.',
  },
  depression: {
    he: 'דיכאון',
    en: 'Depression',
    correlation: 'positive',
    note: 'Higher barrier scores correlate with higher depression measures.',
  },
  ptsd_symptoms: {
    he: 'תסמינים פוסט-טראומטיים',
    en: 'PTSD symptoms',
    correlation: 'positive',
    note: 'Higher barrier scores correlate with more PTSD symptoms.',
  },
  functional_difficulties: {
    he: 'קשיי תפקוד',
    en: 'Functional difficulties',
    correlation: 'positive',
    note: 'Higher barrier scores correlate with greater functional difficulties.',
  },
  recovery_assessment: {
    he: 'הערכת החלמה',
    en: 'Recovery assessment',
    correlation: 'negative',
    note: 'Higher barrier scores correlate with LOWER recovery self-assessment.',
  },
  professional_self_efficacy: {
    he: 'מסוגלות מקצועית',
    en: 'Professional self-efficacy',
    correlation: 'negative',
    note: 'Higher barrier scores correlate with LOWER professional self-efficacy.',
  },
};

/**
 * Interpret an intake profile into clinical/functional meaning.
 * @param {IntakeProfile} profile - from Engine 1 scorer
 * @param {string} phase - 'pre_employment' | 'early' | 'mid' | 'follow_up'
 * @returns {InterpretationReport}
 */
export function interpretProfile(profile, phase = 'pre_employment') {
  const clusterInterpretations = {};

  for (const [clusterId, clusterData] of Object.entries(profile.clusterScores)) {
    const trajectory = TRAJECTORY[clusterId];
    const phaseExpectation = trajectory ? trajectory[mapPhaseToTrajectoryKey(phase)] : null;

    clusterInterpretations[clusterId] = {
      ...clusterData,
      trajectory,
      currentPhaseExpectation: phaseExpectation,
      interpretation: interpretCluster(clusterId, clusterData.mean, phase),
    };
  }

  // Risk flags
  const riskFlags = assessRiskFlags(profile, phase);

  // Key narrative for this person
  const narrative = generateNarrative(profile, phase);

  // Investment priorities — which clusters to focus accommodation on
  const investmentPriorities = prioritizeInvestment(profile, phase);

  return {
    profile,
    phase,
    clusterInterpretations,
    riskFlags,
    narrative,
    investmentPriorities,
    clinicalContext: CLINICAL_CORRELATIONS,
    timestamp: new Date().toISOString(),
  };
}

function mapPhaseToTrajectoryKey(phase) {
  const map = {
    pre_employment: 'early',
    early: 'early',
    mid: 'mid',
    follow_up: 'late',
  };
  return map[phase] || 'early';
}

function interpretCluster(clusterId, mean, phase) {
  const severity = mean >= 4 ? 'high' : mean >= 3 ? 'moderate' : mean >= 2 ? 'mild' : 'low';
  const trajectory = TRAJECTORY[clusterId];

  if (severity === 'low') {
    return {
      level: 'low',
      en: `${clusterId} barriers are low. No specific accommodation needed for this cluster.`,
      he: `חסמי ${trajectory?.note_he?.split('.')[0] || clusterId} נמוכים. אין צורך בהתאמה ספציפית.`,
    };
  }

  const phaseKey = mapPhaseToTrajectoryKey(phase);
  const expectedDirection = trajectory?.[phaseKey];

  let phaseContext = '';
  if (expectedDirection === 'rise' && severity !== 'high') {
    phaseContext = ' Note: this cluster typically rises in this phase — monitor for increase.';
  } else if (expectedDirection === 'rise' && severity === 'high') {
    phaseContext = ' This elevation is expected for this phase but still requires active accommodation.';
  } else if (expectedDirection === 'decline' || expectedDirection === 'significant_decline') {
    phaseContext = severity === 'high'
      ? ' This cluster usually improves in this phase — if it remains high, investigate environmental factors.'
      : ' Expected to continue improving with continued support.';
  }

  return {
    level: severity,
    en: `${clusterId} barriers are ${severity} (mean: ${mean}).${phaseContext}`,
    he: trajectory?.note_he || '',
  };
}

function assessRiskFlags(profile, phase) {
  const flags = [];

  // Dropout risk: high avoidance + high fatigue + low motivation
  if (profile.clusterScores.avoidance?.mean >= 4 &&
      profile.clusterScores.physiological?.mean >= 3.5 &&
      profile.clusterScores.emotional?.mean >= 3.5) {
    flags.push({
      id: 'dropout_risk',
      severity: 'high',
      en: 'High dropout risk: avoidance + physiological load + emotional barriers combine into withdrawal pattern.',
      he: 'סיכון גבוה לנשירה: הימנעות + עומס פיזיולוגי + חסמים רגשיים מתכנסים לדפוס נסיגה.',
      action_en: 'Prioritize gradual exposure schedule, flexible hours, and frequent check-ins.',
      action_he: 'יש לתעדף לוח זמנים של חשיפה הדרגתית, שעות גמישות ובדיקות מצב תכופות.',
    });
  }

  // Crisis risk: high anxiety + high arousal + sensory
  if (profile.clusterScores.arousal?.mean >= 4 &&
      profile.clusterScores.sensory?.mean >= 4) {
    flags.push({
      id: 'crisis_risk',
      severity: 'high',
      en: 'Crisis risk: high arousal combined with sensory sensitivity may trigger acute episodes in workplace.',
      he: 'סיכון למשבר: עוררות גבוהה בשילוב רגישות חושית עלולה לעורר אירועים חריפים במקום העבודה.',
      action_en: 'Ensure designated quiet retreat space, prepare manager with de-escalation protocol.',
      action_he: 'יש לוודא מרחב מפלט שקט ייעודי, להכין את המנהל עם פרוטוקול הרגעה.',
    });
  }

  // Stagnation flag (for mid/follow-up phases): avoidance should be declining
  if ((phase === 'mid' || phase === 'follow_up') &&
      profile.clusterScores.avoidance?.mean >= 3.5) {
    flags.push({
      id: 'stagnation_warning',
      severity: 'moderate',
      en: 'Avoidance should typically decrease by this phase. Sustained high avoidance suggests environmental or relational barriers preventing progress.',
      he: 'הימנעות אמורה לרדת בשלב זה. הימנעות גבוהה מתמשכת מצביעה על חסמים סביבתיים או יחסיים המונעים התקדמות.',
      action_en: 'Review workplace environment and manager relationship. Consider workplace adjustment or mediation.',
      action_he: 'יש לבחון את סביבת העבודה ואת הקשר עם המנהל. לשקול התאמות או גישור.',
    });
  }

  return flags;
}

function generateNarrative(profile, phase) {
  const highClusters = Object.entries(profile.clusterScores)
    .filter(([, data]) => data.mean >= 3.5)
    .sort((a, b) => b[1].mean - a[1].mean);

  if (highClusters.length === 0) {
    return {
      en: 'Barrier profile is generally low. Person is likely ready for standard employment with minimal accommodation.',
      he: 'פרופיל החסמים נמוך באופן כללי. האדם ככל הנראה מוכן לתעסוקה סטנדרטית עם התאמות מינימליות.',
    };
  }

  const topClusterNames = highClusters.map(([id]) => TRAJECTORY[id]?.note_en?.split('.')[0] || id);
  const en = `Primary challenges: ${topClusterNames.join('; ')}. ` +
    `Overall barrier load is ${profile.overallSeverity.en}. ` +
    (profile.patterns.length > 0
      ? `Detected patterns: ${profile.patterns.map(p => p.en).join(', ')}.`
      : 'No specific co-occurrence patterns detected.');

  const topClusterNamesHe = highClusters.map(([id]) => profile.clusterScores[id].he);
  const he = `אתגרים מרכזיים: ${topClusterNamesHe.join(', ')}. ` +
    `עומס חסמים כללי: ${profile.overallSeverity.he}. ` +
    (profile.patterns.length > 0
      ? `דפוסים שזוהו: ${profile.patterns.map(p => p.he).join(', ')}.`
      : 'לא זוהו דפוסים ספציפיים של שילוב חסמים.');

  return { en, he };
}

function prioritizeInvestment(profile, phase) {
  const priorities = [];

  for (const [clusterId, data] of Object.entries(profile.clusterScores)) {
    const trajectory = TRAJECTORY[clusterId];
    if (!trajectory) continue;

    const phaseKey = mapPhaseToTrajectoryKey(phase);
    const expected = trajectory[phaseKey];

    // High severity + stable trajectory = invest in accommodation (environment change)
    // High severity + declining trajectory = invest in support (will improve with help)
    // High severity + rising trajectory = invest in monitoring (expected, track closely)
    let investmentType;
    if (data.mean < 3) {
      investmentType = 'maintain';
    } else if (expected === 'stable' || expected === 'high') {
      investmentType = 'accommodate'; // environment must change
    } else if (expected === 'rise') {
      investmentType = 'monitor'; // expected rise, track closely
    } else {
      investmentType = 'support'; // declining expected, reinforce with help
    }

    priorities.push({
      clusterId,
      clusterName: data.en,
      mean: data.mean,
      investmentType,
      priority: data.mean >= 4 ? 'high' : data.mean >= 3 ? 'medium' : 'low',
    });
  }

  return priorities.sort((a, b) => b.mean - a.mean);
}
