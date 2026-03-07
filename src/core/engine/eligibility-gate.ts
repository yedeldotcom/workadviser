import { RecommendationTemplate } from '@prisma/client';
import { CaseProfile } from './case-profiler';

export interface EligibilityResult {
  template: RecommendationTemplate;
  eligible: boolean;
  failedCriteria: string[];
}

export function checkEligibility(
  template: RecommendationTemplate,
  profile: CaseProfile
): EligibilityResult {
  const failedCriteria: string[] = [];

  // 1. Barrier fit
  if (template.barrierTags.length > 0) {
    const hasMatch = template.barrierTags.some((tag) =>
      profile.barrierCategories.includes(tag)
    );
    if (!hasMatch) failedCriteria.push('barrier_fit');
  }

  // 2. Context fit (employment stage)
  if (template.employmentStageTags.length > 0) {
    if (!template.employmentStageTags.includes(profile.employmentStage as never)) {
      failedCriteria.push('context_fit');
    }
  }

  // 3. Actor fit — no strict gating, but log if no actor match
  // (actor tags are informational for packaging, not exclusionary)

  // 4. Disclosure fit
  if (template.disclosureSuitability.length > 0) {
    if (!template.disclosureSuitability.includes(profile.disclosureLevel as never)) {
      failedCriteria.push('disclosure_fit');
    }
  }

  // 5. Feasibility fit (workplace type)
  if (template.workplaceTypeTags.length > 0 && profile.workplaceType) {
    if (!template.workplaceTypeTags.includes(profile.workplaceType as never)) {
      failedCriteria.push('feasibility_fit');
    }
  }

  // 6. Safety/boundary fit — templates with lifecycle deprecated/archived are excluded upstream
  if (template.lifecycleState === 'deprecated' || template.lifecycleState === 'archived') {
    failedCriteria.push('safety_boundary_fit');
  }

  // 7. Freshness fit — basic version check, can be enhanced
  // For now, all active templates pass freshness

  return {
    template,
    eligible: failedCriteria.length === 0,
    failedCriteria,
  };
}

export function filterEligible(
  templates: RecommendationTemplate[],
  profile: CaseProfile
): { eligible: EligibilityResult[]; ineligible: EligibilityResult[] } {
  const results = templates.map((t) => checkEligibility(t, profile));
  return {
    eligible: results.filter((r) => r.eligible),
    ineligible: results.filter((r) => !r.eligible),
  };
}
