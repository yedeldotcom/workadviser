/**
 * Barrier — FPP §9.1
 *
 * Formal barrier object extending the 13-item taxonomy in barriers.js.
 * Adds versioning, knowledge source traceability, and lifecycle state.
 */

/**
 * @typedef {'active' | 'deprecated' | 'experimental'} LifecycleState
 * @typedef {'case_only' | 'candidate' | 'validated' | 'rule_candidate'} PromotionState
 *
 * @typedef {Object} Barrier
 * @property {string} id                    - barrier_id (e.g. 'fatigue')
 * @property {string} version               - semver string
 * @property {string} text_he               - Hebrew label
 * @property {string} text_en               - English label
 * @property {string} cluster               - Cluster ID from barriers.js CLUSTERS
 * @property {string[]} knowledgeSourceIds  - KU IDs that define this barrier
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {LifecycleState} lifecycleState
 * @property {PromotionState} promotionState
 */

// Import the canonical barrier definitions from the intake engine
import { BARRIERS } from '../../engines/intake/index.js';

/**
 * Build formal Barrier objects from the canonical barriers.js list.
 * @returns {Barrier[]}
 */
export function buildBarrierRegistry() {
  return BARRIERS.map(b => ({
    id: b.id,
    version: '1.0.0',
    text_he: b.he,
    text_en: b.en,
    cluster: b.cluster,
    knowledgeSourceIds: [`KU-BARRIER-${String(b.index ?? 0).padStart(3, '0')}`],
    confidenceLevel: 'high',
    lifecycleState: 'active',
    promotionState: 'validated',
  }));
}

export function createBarrier(fields = {}) {
  return {
    id: fields.id ?? null,
    version: fields.version ?? '1.0.0',
    text_he: fields.text_he ?? '',
    text_en: fields.text_en ?? '',
    cluster: fields.cluster ?? null,
    knowledgeSourceIds: fields.knowledgeSourceIds ?? [],
    confidenceLevel: fields.confidenceLevel ?? 'medium',
    lifecycleState: fields.lifecycleState ?? 'active',
    promotionState: fields.promotionState ?? 'candidate',
  };
}
