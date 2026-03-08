/**
 * Recommendation — FPP §9.1
 *
 * Three-level recommendation model:
 *   RecommendationFamily   — broad category (e.g. "Schedule flexibility")
 *   RecommendationTemplate — specific actionable template with tags and lifecycle
 *   RenderedRecommendation — audience-specific rendered output for one case
 *   TracingChain           — explicit signal→barrier→pattern→recommendation chain (FPP §9.6)
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
 * @property {string} id
 * @property {string} version
 * @property {string} templateId
 * @property {string} caseId
 * @property {string[]} barrierIds   - Barrier IDs addressed by this recommendation
 * @property {string[]} sourceIds    - Knowledge source IDs backing this recommendation
 * @property {string} audience       - 'user' | 'employer' | 'hr' | 'direct_manager'
 * @property {DisclosureSuitability} disclosureLevel
 * @property {{ he: string, en: string }} renderedText
 * @property {TimeHorizon} timeHorizon
 * @property {string} actor          - Who should implement this
 * @property {ReviewStatus} reviewStatus
 *
 * @typedef {Object} TracingChain
 * Consolidates the full reasoning chain for one selected recommendation (FPP §9.6 Non-Negotiable 2).
 * Enables any output to be traced back through: output → pattern → interpretation → signal → input.
 * @property {string} id                    - Unique chain ID (stable for the pipeline run)
 * @property {string | null} recommendationId - ID of the RenderedRecommendation (user audience)
 * @property {string} templateId            - The template that produced this recommendation
 * @property {string} templateVersion       - Version of the template
 * @property {string[]} barrierIds          - Barriers this recommendation addresses
 * @property {string[]} patternIds          - Intake patterns that implicate these barriers
 * @property {string[]} detectedSignalIds   - NormalizedSignal IDs (populated by sessionManager)
 * @property {string[]} knowledgeSourceIds  - Knowledge sources backing the template
 * @property {number} score                 - Computed selection score (0–100)
 * @property {string[]} gatesPassed         - Eligibility gates this template cleared
 * @property {string} caseId               - Case this chain belongs to
 * @property {string} createdAt            - ISO timestamp of chain creation
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

/**
 * Return a fresh TemplateTracking object with all counters at zero.
 * Merged into createRecommendationTemplate() so new templates start with a clean slate.
 * @returns {TemplateTracking}
 */
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
    id: fields.id ?? crypto.randomUUID(),
    version: fields.version ?? '1.0',
    templateId: fields.templateId ?? null,
    caseId: fields.caseId ?? null,
    barrierIds: fields.barrierIds ?? [],
    sourceIds: fields.sourceIds ?? [],
    audience: fields.audience ?? 'hr',
    disclosureLevel: fields.disclosureLevel ?? 'functional_only',
    renderedText: fields.renderedText ?? { he: '', en: '' },
    timeHorizon: fields.timeHorizon ?? 'near_term',
    actor: fields.actor ?? 'hr',
    reviewStatus: fields.reviewStatus ?? 'pending',
  };
}

const ALL_GATES = [
  'barrier_fit', 'stage_fit', 'workplace_type_fit',
  'disclosure_fit', 'feasibility_fit', 'safety_fit', 'freshness_fit',
];

export function createTracingChain(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    recommendationId: fields.recommendationId ?? null,
    templateId: fields.templateId ?? null,
    templateVersion: fields.templateVersion ?? '1.0',
    barrierIds: fields.barrierIds ?? [],
    patternIds: fields.patternIds ?? [],
    detectedSignalIds: fields.detectedSignalIds ?? [],
    knowledgeSourceIds: fields.knowledgeSourceIds ?? [],
    score: fields.score ?? 0,
    gatesPassed: fields.gatesPassed ?? ALL_GATES,
    caseId: fields.caseId ?? null,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}
