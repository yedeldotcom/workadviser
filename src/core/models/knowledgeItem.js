/**
 * KnowledgeItem + KnowledgeSource — FPP §9.1 + §3.2
 *
 * Formal representation of a knowledge unit (one of 12 types from FPP §3.2).
 * KnowledgeSource tracks the origin document/file.
 */

/**
 * @typedef {'barrier_definition' | 'signal' | 'context_modifier' | 'trigger' |
 *           'workplace_amplifier' | 'workplace_manifestation' | 'recommendation_family' |
 *           'recommendation_template' | 'implementation_action' | 'communication_framing' |
 *           'boundary_caution' | 'sales_signal'} KnowledgeUnitType
 *
 * @typedef {'classification' | 'interpretation' | 'applied_pattern' |
 *           'implementation' | 'communication'} SourceRole
 *
 * @typedef {'case_only' | 'candidate' | 'validated' | 'rule_candidate'} PromotionState
 * @typedef {'draft' | 'active' | 'deprecated' | 'archived'} KnowledgeLifecycle
 *
 * @typedef {Object} KnowledgeSource
 * @property {string} id
 * @property {SourceRole} role
 * @property {string} filename
 * @property {string} extractedAt
 * @property {string} version
 *
 * @typedef {Object} KnowledgeItem
 * @property {string} id                  - e.g. 'KU-BARRIER-001'
 * @property {KnowledgeUnitType} type
 * @property {{ he: string, en: string }} content
 * @property {string[]} sourceIds         - KnowledgeSource IDs
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {KnowledgeLifecycle} lifecycleState
 * @property {string[]} barrierTags
 * @property {string[]} stageTags
 * @property {string[]} workplaceTypeTags
 * @property {PromotionState} promotionState
 * @property {Object} metadata            - Type-specific additional fields
 */

export function createKnowledgeSource(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    role: fields.role ?? 'applied_pattern',
    filename: fields.filename ?? '',
    extractedAt: fields.extractedAt ?? new Date().toISOString(),
    version: fields.version ?? '1.0',
  };
}

export function createKnowledgeItem(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    type: fields.type ?? 'barrier_definition',
    content: {
      he: fields.content?.he ?? '',
      en: fields.content?.en ?? '',
    },
    sourceIds: fields.sourceIds ?? [],
    confidenceLevel: fields.confidenceLevel ?? 'medium',
    lifecycleState: fields.lifecycleState ?? 'active',
    barrierTags: fields.barrierTags ?? [],
    stageTags: fields.stageTags ?? [],
    workplaceTypeTags: fields.workplaceTypeTags ?? [],
    promotionState: fields.promotionState ?? 'case_only',
    metadata: fields.metadata ?? {},
  };
}

/**
 * Canonical knowledge source registry.
 * Corresponds to the 5 raw Hebrew source documents extracted in Step 0.5.
 * Stable IDs: SRC-001 through SRC-005.
 * Used by KnowledgeItem.sourceIds[] to trace knowledge back to original documents.
 *
 * @type {KnowledgeSource[]}
 */
export const KNOWLEDGE_SOURCES = [
  createKnowledgeSource({ id: 'SRC-001', role: 'classification', filename: 'barriers_questionnaire.docx', extractedAt: '2026-03-08T00:00:00.000Z', version: '1.0' }),
  createKnowledgeSource({ id: 'SRC-002', role: 'interpretation', filename: 'barriers_background.docx',    extractedAt: '2026-03-08T00:00:00.000Z', version: '1.0' }),
  createKnowledgeSource({ id: 'SRC-003', role: 'applied_pattern', filename: 'interview_challenges.xlsx',  extractedAt: '2026-03-08T00:00:00.000Z', version: '1.0' }),
  createKnowledgeSource({ id: 'SRC-004', role: 'implementation', filename: 'org_procedures.docx',         extractedAt: '2026-03-08T00:00:00.000Z', version: '1.0' }),
  createKnowledgeSource({ id: 'SRC-005', role: 'communication', filename: 'ptsd_at_work.pdf',             extractedAt: '2026-03-08T00:00:00.000Z', version: '1.0' }),
];
