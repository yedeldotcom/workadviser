/**
 * Recommendation — FPP §9.1
 *
 * Three-level recommendation model:
 *   RecommendationFamily   — broad category (e.g. "Schedule flexibility")
 *   RecommendationTemplate — specific actionable template with tags and lifecycle
 *   RenderedRecommendation — audience-specific rendered output for one case
 */

/**
 * @typedef {'no_disclosure' | 'functional_only' | 'partial_contextual' | 'full_voluntary'} DisclosureSuitability
 * @typedef {'draft' | 'active' | 'monitored' | 'experimental' | 'deprecated' | 'archived'} TemplateLifecycle
 * @typedef {'pending' | 'approved' | 'edited_approved' | 'rejected'} ReviewStatus
 * @typedef {'immediate' | 'near_term' | 'longer_term'} TimeHorizon
 *
 * @typedef {Object} RecommendationFamily
 * @property {string} id
 * @property {string} version
 * @property {string} text_he
 * @property {string} text_en
 * @property {string} category   - e.g. 'schedule', 'environment', 'communication', 'support'
 *
 * @typedef {Object} TemplateTracking
 * @property {number} retrievalCount
 * @property {number} inclusionCount
 * @property {number} editCount
 * @property {number} approvalCount
 * @property {number} usefulnessSignals
 * @property {string | null} staleAt
 *
 * @typedef {Object} RecommendationTemplate
 * @property {string} id
 * @property {string} version
 * @property {string} familyId
 * @property {string[]} barrierTags
 * @property {string[]} stageTags
 * @property {string[]} workplaceTypeTags
 * @property {string[]} actorTags
 * @property {DisclosureSuitability[]} disclosureSuitability
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {TemplateLifecycle} lifecycleState
 * @property {TemplateTracking} tracking
 * @property {string[]} knowledgeSourceIds
 * @property {string} text_he
 * @property {string} text_en
 *
 * @typedef {Object} RenderedRecommendation
 * @property {string} templateId
 * @property {string} caseId
 * @property {string} audience      - 'user' | 'employer' | 'hr' | 'direct_manager'
 * @property {DisclosureSuitability} disclosureLevel
 * @property {{ he: string, en: string }} renderedText
 * @property {TimeHorizon} timeHorizon
 * @property {string} actor         - Who should implement this
 * @property {ReviewStatus} reviewStatus
 */

export function createRecommendationFamily(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    version: fields.version ?? '1.0.0',
    text_he: fields.text_he ?? '',
    text_en: fields.text_en ?? '',
    category: fields.category ?? 'general',
  };
}

function defaultTracking() {
  return {
    retrievalCount: 0,
    inclusionCount: 0,
    editCount: 0,
    approvalCount: 0,
    usefulnessSignals: 0,
    staleAt: null,
  };
}

export function createRecommendationTemplate(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    version: fields.version ?? '1.0.0',
    familyId: fields.familyId ?? null,
    text_he: fields.text_he ?? '',
    text_en: fields.text_en ?? '',
    barrierTags: fields.barrierTags ?? [],
    stageTags: fields.stageTags ?? [],
    workplaceTypeTags: fields.workplaceTypeTags ?? ['any'],
    actorTags: fields.actorTags ?? ['hr'],
    disclosureSuitability: fields.disclosureSuitability ?? ['functional_only'],
    confidenceLevel: fields.confidenceLevel ?? 'medium',
    lifecycleState: fields.lifecycleState ?? 'active',
    tracking: { ...defaultTracking(), ...fields.tracking },
    knowledgeSourceIds: fields.knowledgeSourceIds ?? [],
  };
}

export function createRenderedRecommendation(fields = {}) {
  return {
    templateId: fields.templateId ?? null,
    caseId: fields.caseId ?? null,
    audience: fields.audience ?? 'hr',
    disclosureLevel: fields.disclosureLevel ?? 'functional_only',
    renderedText: fields.renderedText ?? { he: '', en: '' },
    timeHorizon: fields.timeHorizon ?? 'near_term',
    actor: fields.actor ?? 'hr',
    reviewStatus: fields.reviewStatus ?? 'pending',
  };
}
