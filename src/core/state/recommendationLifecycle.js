/**
 * RecommendationLifecycleMachine — FPP §9.2
 *
 * Governs the lifecycle of a RecommendationTemplate as it moves through
 * the knowledge promotion workflow (FPP §3.7).
 *
 * State flow:
 *   draft → active ──┬→ monitored ──┬→ active       (reinstated after monitoring)
 *                    │              ├→ experimental → active | monitored | deprecated
 *                    │              └→ deprecated → archived
 *                    ├→ deprecated → archived
 *                    └→ archived
 *
 * Promotion policy:
 *   - 'draft'        = newly created, not yet reviewed by system_owner
 *   - 'active'       = in regular use; included in case pipeline outputs
 *   - 'monitored'    = flagged for quality review (high conflict or low usefulness)
 *   - 'experimental' = under controlled trial (new source, limited evidence)
 *   - 'deprecated'   = no longer recommended; retained for audit trail
 *   - 'archived'     = fully removed from use (terminal)
 */

export const RECOMMENDATION_STATES = {
  DRAFT:        'draft',
  ACTIVE:       'active',
  MONITORED:    'monitored',
  EXPERIMENTAL: 'experimental',
  DEPRECATED:   'deprecated',
  ARCHIVED:     'archived',
};

/** @type {Record<string, string[]>} */
const TRANSITIONS = {
  draft:        ['active'],
  active:       ['monitored', 'deprecated', 'archived'],
  monitored:    ['active', 'experimental', 'deprecated'],
  experimental: ['active', 'monitored', 'deprecated'],
  deprecated:   ['archived'],
  archived:     [],
};

/**
 * Check whether a recommendation lifecycle transition is permitted.
 * @param {string} from - Current lifecycle state
 * @param {string} to   - Desired next state
 * @returns {boolean}
 */
export function isValidRecommendationTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Transition a RecommendationTemplate to a new lifecycle state.
 * @param {import('../models/recommendation.js').RecommendationTemplate} template
 * @param {string} toState
 * @returns {import('../models/recommendation.js').RecommendationTemplate}
 * @throws {Error} If the transition is not valid for the template's current lifecycleState
 */
export function transitionRecommendation(template, toState) {
  if (!isValidRecommendationTransition(template.lifecycleState, toState)) {
    throw new Error(`Invalid recommendation lifecycle transition: ${template.lifecycleState} → ${toState}`);
  }
  return { ...template, lifecycleState: toState };
}
