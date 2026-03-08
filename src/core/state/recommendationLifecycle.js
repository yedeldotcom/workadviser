/**
 * RecommendationLifecycleMachine — FPP §9.2
 *
 * Governs the lifecycle of a RecommendationTemplate.
 */

export const RECOMMENDATION_STATES = {
  DRAFT:        'draft',
  ACTIVE:       'active',
  MONITORED:    'monitored',
  EXPERIMENTAL: 'experimental',
  DEPRECATED:   'deprecated',
  ARCHIVED:     'archived',
};

const TRANSITIONS = {
  draft:        ['active'],
  active:       ['monitored', 'deprecated', 'archived'],
  monitored:    ['active', 'experimental', 'deprecated'],
  experimental: ['active', 'monitored', 'deprecated'],
  deprecated:   ['archived'],
  archived:     [],
};

export function isValidRecommendationTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * @param {import('../models/recommendation.js').RecommendationTemplate} template
 * @param {string} toState
 */
export function transitionRecommendation(template, toState) {
  if (!isValidRecommendationTransition(template.lifecycleState, toState)) {
    throw new Error(`Invalid recommendation lifecycle transition: ${template.lifecycleState} → ${toState}`);
  }
  return { ...template, lifecycleState: toState };
}
