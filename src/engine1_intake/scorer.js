/**
 * Engine 1: Scoring and profile generation from questionnaire responses.
 *
 * Score range: 13–65. Mean of all items. Higher = more barriers.
 * Adds cluster-level scoring and severity classification.
 */

import { BARRIERS, CLUSTERS, BARRIER_IDS } from './barriers.js';

/**
 * Validate raw questionnaire responses.
 * @param {Object<string, number>} responses - barrier_id → score (1-5)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateResponses(responses) {
  const errors = [];
  const expectedIds = BARRIERS.map(b => b.id);

  for (const id of expectedIds) {
    if (!(id in responses)) {
      errors.push(`Missing response for barrier: ${id}`);
    } else if (!Number.isInteger(responses[id]) || responses[id] < 1 || responses[id] > 5) {
      errors.push(`Invalid score for ${id}: ${responses[id]} (must be 1-5)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Compute the intake profile from raw responses.
 * @param {Object<string, number>} responses - barrier_id → score (1-5)
 * @returns {IntakeProfile}
 */
export function scoreResponses(responses) {
  const { valid, errors } = validateResponses(responses);
  if (!valid) {
    throw new Error(`Invalid responses: ${errors.join('; ')}`);
  }

  // Total score and mean
  const scores = BARRIERS.map(b => responses[b.id]);
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const meanScore = totalScore / BARRIERS.length;

  // Per-barrier detail
  const barrierScores = BARRIERS.map(b => ({
    ...b,
    score: responses[b.id],
    severity: classifySeverity(responses[b.id]),
  }));

  // Cluster-level aggregation
  const clusterScores = {};
  for (const [clusterId, cluster] of Object.entries(CLUSTERS)) {
    const clusterBarrierScores = cluster.barriers.map(bid => responses[bid]);
    const clusterMean = clusterBarrierScores.reduce((s, v) => s + v, 0) / clusterBarrierScores.length;
    clusterScores[clusterId] = {
      ...cluster,
      mean: Math.round(clusterMean * 100) / 100,
      severity: classifySeverity(Math.round(clusterMean)),
      barriers: clusterBarrierScores.map((score, i) => ({
        id: cluster.barriers[i],
        score,
      })),
    };
  }

  // Top barriers (score >= 4)
  const criticalBarriers = barrierScores
    .filter(b => b.score >= 4)
    .sort((a, b) => b.score - a.score);

  // Detect known co-occurrence patterns
  const patterns = detectPatterns(responses);

  // Overall severity band
  const overallSeverity = classifyOverallSeverity(meanScore);

  return {
    totalScore,
    meanScore: Math.round(meanScore * 100) / 100,
    overallSeverity,
    barrierScores,
    clusterScores,
    criticalBarriers,
    patterns,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Classify a single barrier score into severity level.
 */
function classifySeverity(score) {
  if (score <= 1.5) return 'none';
  if (score <= 2.5) return 'mild';
  if (score <= 3.5) return 'moderate';
  if (score <= 4.5) return 'significant';
  return 'severe';
}

/**
 * Classify overall mean score into severity band.
 * Based on Natal research: range 13-65, mean scoring.
 */
function classifyOverallSeverity(meanScore) {
  if (meanScore <= 1.5) return { level: 'low', he: 'נמוך', en: 'Low barrier load' };
  if (meanScore <= 2.5) return { level: 'mild', he: 'קל', en: 'Mild barrier load' };
  if (meanScore <= 3.0) return { level: 'moderate', he: 'בינוני', en: 'Moderate barrier load' };
  if (meanScore <= 3.75) return { level: 'elevated', he: 'מוגבר', en: 'Elevated barrier load' };
  return { level: 'high', he: 'גבוה', en: 'High barrier load' };
}

/**
 * Detect clinically meaningful co-occurrence patterns.
 * Based on the background document's findings about barrier combinations.
 */
function detectPatterns(responses) {
  const patterns = [];

  // Pattern: High arousal + sensory = hypervigilance profile
  if (responses[BARRIER_IDS.IRRITABILITY] >= 4 &&
      responses[BARRIER_IDS.SENSORY_DISCOMFORT] >= 4) {
    patterns.push({
      id: 'hypervigilance',
      he: 'פרופיל ערנות-יתר',
      en: 'Hypervigilance profile',
      description_en: 'High irritability combined with sensory sensitivity suggests hypervigilance. Workplace needs low-stimulus environment and predictable management.',
      description_he: 'רגזנות גבוהה בשילוב רגישות חושית מצביעה על ערנות-יתר. מקום העבודה צריך להיות דל-גירויים עם ניהול צפוי.',
      barriers: [BARRIER_IDS.IRRITABILITY, BARRIER_IDS.SENSORY_DISCOMFORT],
    });
  }

  // Pattern: Avoidance + low motivation + fatigue = withdrawal profile
  if (responses[BARRIER_IDS.AVOIDANCE] >= 4 &&
      responses[BARRIER_IDS.MOTIVATION] >= 3 &&
      responses[BARRIER_IDS.FATIGUE] >= 3) {
    patterns.push({
      id: 'withdrawal',
      he: 'פרופיל נסיגה',
      en: 'Withdrawal profile',
      description_en: 'Avoidance combined with low motivation and fatigue suggests withdrawal pattern. Gradual exposure and flexible scheduling recommended.',
      description_he: 'הימנעות בשילוב חוסר מוטיבציה ועייפות מצביעה על דפוס נסיגה. מומלצת חשיפה הדרגתית ולו״ז גמיש.',
      barriers: [BARRIER_IDS.AVOIDANCE, BARRIER_IDS.MOTIVATION, BARRIER_IDS.FATIGUE],
    });
  }

  // Pattern: Authority + emotional regulation + self-worth = trust-rupture profile
  if (responses[BARRIER_IDS.AUTHORITY] >= 3 &&
      responses[BARRIER_IDS.EMOTIONAL_REGULATION] >= 3 &&
      responses[BARRIER_IDS.SELF_WORTH] >= 3) {
    patterns.push({
      id: 'trust_rupture',
      he: 'פרופיל פגיעה באמון',
      en: 'Trust-rupture profile',
      description_en: 'Difficulty with authority + emotional dysregulation + low self-worth suggests trust-rupture. Requires transparent management and consistent positive feedback.',
      description_he: 'קושי עם סמכות + קשיי ויסות רגשי + ערך עצמי נמוך מצביעים על פגיעה באמון. דורש ניהול שקוף ומשוב חיובי עקבי.',
      barriers: [BARRIER_IDS.AUTHORITY, BARRIER_IDS.EMOTIONAL_REGULATION, BARRIER_IDS.SELF_WORTH],
    });
  }

  // Pattern: Executive function cluster high = cognitive overload profile
  const execMean = (responses[BARRIER_IDS.PROCRASTINATION] +
    responses[BARRIER_IDS.CONCENTRATION] +
    responses[BARRIER_IDS.TIME_MANAGEMENT]) / 3;
  if (execMean >= 3.5) {
    patterns.push({
      id: 'cognitive_overload',
      he: 'פרופיל עומס קוגניטיבי',
      en: 'Cognitive overload profile',
      description_en: 'High executive function barriers across procrastination, concentration, and time management. Needs structured tasks, clear priorities, and reduced cognitive load.',
      description_he: 'חסמים גבוהים בתפקודים ניהוליים - דחיינות, ריכוז וניהול זמן. דורש משימות מובנות, סדרי עדיפויות ברורים והפחתת עומס קוגניטיבי.',
      barriers: [BARRIER_IDS.PROCRASTINATION, BARRIER_IDS.CONCENTRATION, BARRIER_IDS.TIME_MANAGEMENT],
    });
  }

  // Pattern: Anxiety + sensory + authority = acute workplace distress
  if (responses[BARRIER_IDS.ANXIETY_ATTACKS] >= 4 &&
      responses[BARRIER_IDS.SENSORY_DISCOMFORT] >= 3 &&
      responses[BARRIER_IDS.AUTHORITY] >= 3) {
    patterns.push({
      id: 'acute_workplace_distress',
      he: 'מצוקה חריפה במקום העבודה',
      en: 'Acute workplace distress',
      description_en: 'Anxiety attacks combined with sensory sensitivity and authority difficulty indicates acute distress risk. Priority: safe retreat space and trauma-informed direct manager.',
      description_he: 'התקפי חרדה בשילוב רגישות חושית וקושי עם סמכות מצביעים על סיכון למצוקה חריפה. עדיפות: מרחב מפלט בטוח ומנהל ישיר מיודע טראומה.',
      barriers: [BARRIER_IDS.ANXIETY_ATTACKS, BARRIER_IDS.SENSORY_DISCOMFORT, BARRIER_IDS.AUTHORITY],
    });
  }

  return patterns;
}
