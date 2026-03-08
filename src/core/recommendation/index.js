/**
 * Recommendation — public API (FPP §4.4, §4.5)
 *
 * Two modules, one entry point:
 *   disclosureFilter.js — standalone disclosure gate (employer output safety)
 *   pipeline.js         — 7-step recommendation selection pipeline
 *
 * Import from here rather than from sub-modules directly.
 */
export { filterForEmployer, meetsDisclosureLevel, DISCLOSURE_LEVELS, FIELD_RULES } from './disclosureFilter.js';
export {
  buildCaseProfile,
  retrieveCandidates,
  applyEligibilityGates,
  scoreTemplate,
  deduplicateRecommendations,
  packageRecommendations,
  assignReviewStatus,
  runRecommendationPipeline,
  EMPLOYMENT_STAGES,
} from './pipeline.js';
