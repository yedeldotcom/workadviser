import { RecommendationTemplate } from '@prisma/client';
import { CaseProfile } from './case-profiler';

export interface ScoredTemplate {
  template: RecommendationTemplate;
  scores: DimensionScores;
  compositeScore: number;
}

export interface DimensionScores {
  barrierRelevance: number;
  triggerRelevance: number;
  contextFit: number;
  feasibility: number;
  expectedImpact: number;
  disclosureCompatibility: number;
  evidenceStrength: number;
  severityAlignment: number;
  diversityContribution: number;
}

const WEIGHTS: Record<keyof DimensionScores, number> = {
  barrierRelevance: 0.22,
  triggerRelevance: 0.08,
  contextFit: 0.15,
  feasibility: 0.13,
  expectedImpact: 0.13,
  disclosureCompatibility: 0.10,
  evidenceStrength: 0.07,
  severityAlignment: 0.07,
  diversityContribution: 0.05,
};

/**
 * Maps trigger categories to related barrier categories.
 * When a user has a trigger, templates addressing related barriers
 * get a scoring boost.
 */
const TRIGGER_BARRIER_MAP: Record<string, string[]> = {
  sudden_change: ['uncertainty', 'autonomy'],
  loud_noise: ['sensory_environment', 'concentration'],
  confrontation: ['communication', 'trust'],
  criticism: ['performance_pressure', 'trust', 'communication'],
  deadline_pressure: ['overload', 'performance_pressure', 'schedule'],
  loss_of_control: ['autonomy', 'uncertainty'],
  isolation: ['social', 'trust'],
  crowding: ['sensory_environment', 'social'],
};

export function scoreTemplate(
  template: RecommendationTemplate,
  profile: CaseProfile,
  existingFamilies: Set<string>
): ScoredTemplate {
  const scores: DimensionScores = {
    barrierRelevance: scoreBarrierRelevance(template, profile),
    triggerRelevance: scoreTriggerRelevance(template, profile),
    contextFit: scoreContextFit(template, profile),
    feasibility: scoreFeasibility(template, profile),
    expectedImpact: scoreExpectedImpact(template),
    disclosureCompatibility: scoreDisclosureCompatibility(template, profile),
    evidenceStrength: scoreEvidenceStrength(template),
    severityAlignment: scoreSeverityAlignment(template, profile),
    diversityContribution: scoreDiversityContribution(template, existingFamilies),
  };

  const compositeScore = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + scores[key as keyof DimensionScores] * weight,
    0
  );

  return { template, scores, compositeScore };
}

/**
 * Fixed: uses match ratio relative to template's barrier tags, not profile's.
 * A template matching 2 of its 2 barrier tags = 1.0 regardless of how many
 * barriers the user has. Users with more barriers shouldn't be penalized.
 */
function scoreBarrierRelevance(
  template: RecommendationTemplate,
  profile: CaseProfile
): number {
  if (template.barrierTags.length === 0) return 0.3;
  const matchCount = template.barrierTags.filter((tag) =>
    profile.barrierCategories.includes(tag)
  ).length;
  // Ratio of matched tags to template's required tags
  return matchCount / template.barrierTags.length;
}

/**
 * New: scores how well a template addresses the user's detected triggers.
 * Uses TRIGGER_BARRIER_MAP to find which barriers are related to triggers,
 * then checks if the template addresses those barriers.
 */
function scoreTriggerRelevance(
  template: RecommendationTemplate,
  profile: CaseProfile
): number {
  if (profile.triggerCategories.length === 0) return 0.5;
  if (template.barrierTags.length === 0) return 0.3;

  // Collect all barrier categories related to the user's triggers
  const triggerRelatedBarriers = new Set<string>();
  for (const trigger of profile.triggerCategories) {
    const related = TRIGGER_BARRIER_MAP[trigger];
    if (related) {
      for (const b of related) triggerRelatedBarriers.add(b);
    }
  }

  if (triggerRelatedBarriers.size === 0) return 0.3;

  // How many of the template's barrier tags match trigger-related barriers?
  const matchCount = template.barrierTags.filter((tag) =>
    triggerRelatedBarriers.has(tag)
  ).length;

  return matchCount > 0 ? Math.min(1, 0.5 + matchCount * 0.25) : 0.1;
}

function scoreContextFit(
  template: RecommendationTemplate,
  profile: CaseProfile
): number {
  let score = 0.5;
  if (template.employmentStageTags.length > 0) {
    score = template.employmentStageTags.includes(profile.employmentStage as never) ? 1.0 : 0.2;
  }
  if (template.workplaceTypeTags.length > 0 && profile.workplaceType) {
    const match = template.workplaceTypeTags.includes(profile.workplaceType as never);
    score = (score + (match ? 1.0 : 0.3)) / 2;
  }
  return score;
}

function scoreFeasibility(
  template: RecommendationTemplate,
  _profile: CaseProfile
): number {
  const timeScores: Record<string, number> = {
    immediate: 0.9,
    near_term: 0.7,
    longer_term: 0.5,
  };
  return timeScores[template.timeHorizon] ?? 0.5;
}

function scoreExpectedImpact(template: RecommendationTemplate): number {
  const confidenceScores: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.4,
    escalate: 0.3,
  };
  return confidenceScores[template.confidenceLevel] ?? 0.5;
}

function scoreDisclosureCompatibility(
  template: RecommendationTemplate,
  profile: CaseProfile
): number {
  if (template.disclosureSuitability.length === 0) return 0.5;
  if (template.disclosureSuitability.includes(profile.disclosureLevel as never)) return 1.0;
  // Partial credit: template not ideal but not completely incompatible
  // e.g., template designed for 'full_voluntary' may still have value at 'partial_contextual'
  return 0.15;
}

function scoreEvidenceStrength(template: RecommendationTemplate): number {
  const lifecycle = template.lifecycleState;
  const scores: Record<string, number> = {
    active: 0.9,
    monitored: 0.7,
    experimental: 0.4,
    draft: 0.2,
    deprecated: 0.1,
    archived: 0.0,
  };
  return scores[lifecycle] ?? 0.5;
}

/**
 * New: replaces the constant 0.8 safetyTrustFit.
 * Scores how well the template matches the severity of the user's barriers.
 * High-confidence/high-severity barriers should get more impactful recommendations.
 */
function scoreSeverityAlignment(
  template: RecommendationTemplate,
  profile: CaseProfile
): number {
  if (profile.barriers.length === 0) return 0.5;

  // Calculate average confidence of matched barriers
  const matchedBarriers = profile.barriers.filter((b) =>
    template.barrierTags.includes(b.category)
  );

  if (matchedBarriers.length === 0) return 0.4;

  const confidenceMap: Record<string, number> = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    escalate: 1.0,
  };

  const avgConfidence = matchedBarriers.reduce(
    (sum, b) => sum + (confidenceMap[b.confidence] ?? 0.5),
    0
  ) / matchedBarriers.length;

  // Immediate/near_term templates pair well with high-severity barriers
  const horizonBoost = template.timeHorizon === 'immediate' ? 0.1 : 0;

  return Math.min(1, avgConfidence + horizonBoost);
}

function scoreDiversityContribution(
  template: RecommendationTemplate,
  existingFamilies: Set<string>
): number {
  return existingFamilies.has(template.familyId) ? 0.2 : 1.0;
}

export function scoreAndRank(
  templates: RecommendationTemplate[],
  profile: CaseProfile
): ScoredTemplate[] {
  const existingFamilies = new Set<string>();
  const scored: ScoredTemplate[] = [];

  // Sort by preliminary score first, then rescore with diversity
  const preliminary = templates.map((t) =>
    scoreTemplate(t, profile, new Set())
  );
  preliminary.sort((a, b) => b.compositeScore - a.compositeScore);

  for (const item of preliminary) {
    const rescored = scoreTemplate(item.template, profile, existingFamilies);
    scored.push(rescored);
    existingFamilies.add(item.template.familyId);
  }

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  return scored;
}
