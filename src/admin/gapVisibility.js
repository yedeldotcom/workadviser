/**
 * Gap Visibility — FPP §3.6
 *
 * Identifies weak zones, under-evidenced areas, and coverage gaps in the
 * knowledge base across the five coverage dimensions:
 *   barrier × stage × actor × workplace_type × intervention_type
 *
 * Gap types:
 *   knowledge    — dimension combination has no knowledge items at all
 *   logic        — knowledge exists but no recommendation template covers it
 *   rule         — template exists but confidence is low / no active rule
 *   workflow     — high admin edit rate suggests ambiguous workflow guidance
 *
 * Outputs:
 *   weakZones()                — dimension cells with zero coverage
 *   highOutputLowEvidence()    — templates with many inclusions but low confidence / few sources
 *   repeatedAdminCorrections() — templates with high edit rate relative to approvals
 *   highConflictAreas()        — templates with many rejections
 *   suggestNewSourceTypes()    — what kind of new knowledge source would fill the biggest gaps
 *
 * All functions are pure and take explicit data arguments (no global state reads).
 * Call-site passes templates, knowledge items, and audit logs from the store.
 */

import { BARRIERS } from '../engines/intake/barriers.js';

// ─── Coverage dimensions ──────────────────────────────────────────────────────

export const EMPLOYMENT_STAGES = [
  'active_employment',
  'job_seeking',
  'on_leave',
  'return_from_leave',
  'new_job_transition',
  'post_termination',
];

export const ACTOR_TYPES = ['hr', 'direct_manager', 'team', 'employer', 'self'];

export const WORKPLACE_TYPES = ['office', 'remote', 'hybrid', 'field'];

export const INTERVENTION_TYPES = [
  'schedule',
  'environment',
  'communication',
  'support',
  'process',
  'boundary',
];

// ─── Weak zones ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} WeakZone
 * @property {string} barrier
 * @property {string} stage
 * @property {string} actor
 * @property {string} workplaceType
 * @property {string} gapType          - 'knowledge' | 'logic' | 'rule'
 * @property {number} templateCount    - Templates that cover this cell
 * @property {number} activeTemplates  - Lifecycle 'active' templates covering this cell
 */

/**
 * Find dimension cells that have no or very thin coverage.
 *
 * A cell is (barrier, stage, workplaceType).
 * We check whether any template covers the cell (via barrierTags, stageTags, workplaceTypeTags).
 * 'any' in a tag list means the template covers all values on that dimension.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {import('../core/models/knowledgeItem.js').KnowledgeItem[]} knowledgeItems
 * @returns {WeakZone[]}
 */
export function weakZones(templates, knowledgeItems) {
  const zones = [];
  const activeTemplates = templates.filter(t => t.lifecycleState === 'active');

  for (const barrier of BARRIERS) {
    for (const stage of EMPLOYMENT_STAGES) {
      for (const wpType of WORKPLACE_TYPES) {
        // Templates that explicitly cover this cell (or use 'any')
        const covering = activeTemplates.filter(t =>
          _tagCovers(t.barrierTags, barrier.id) &&
          _tagCovers(t.stageTags, stage) &&
          _tagCovers(t.workplaceTypeTags, wpType)
        );

        // Knowledge items covering this barrier+stage
        const ki = knowledgeItems.filter(k =>
          k.lifecycleState === 'active' &&
          _tagCovers(k.barrierTags, barrier.id) &&
          _tagCovers(k.stageTags, stage)
        );

        if (covering.length === 0) {
          zones.push({
            barrier: barrier.id,
            stage,
            workplaceType: wpType,
            gapType: ki.length === 0 ? 'knowledge' : 'logic',
            templateCount: covering.length,
            activeTemplates: covering.length,
          });
        } else if (covering.every(t => t.confidenceLevel === 'low')) {
          zones.push({
            barrier: barrier.id,
            stage,
            workplaceType: wpType,
            gapType: 'rule',
            templateCount: covering.length,
            activeTemplates: covering.length,
          });
        }
      }
    }
  }

  return zones;
}

// ─── High output / low evidence ───────────────────────────────────────────────

/**
 * @typedef {Object} LowEvidenceTemplate
 * @property {string} templateId
 * @property {number} inclusionCount
 * @property {number} approvalCount
 * @property {number} knowledgeSourceCount
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {string} evidenceRisk  - 'high' | 'medium'
 */

/**
 * Templates that are frequently included but have thin evidence:
 * low confidenceLevel OR fewer than MIN_SOURCES knowledge sources.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {number} [minInclusions=3]   - Threshold for "high output"
 * @param {number} [minSources=2]      - Minimum knowledge sources expected
 * @returns {LowEvidenceTemplate[]}
 */
export function highOutputLowEvidence(templates, minInclusions = 3, minSources = 2) {
  return templates
    .filter(t => t.tracking.inclusionCount >= minInclusions)
    .filter(t => t.confidenceLevel === 'low' || t.knowledgeSourceIds.length < minSources)
    .map(t => ({
      templateId: t.id,
      inclusionCount: t.tracking.inclusionCount,
      approvalCount: t.tracking.approvalCount,
      knowledgeSourceCount: t.knowledgeSourceIds.length,
      confidenceLevel: t.confidenceLevel,
      evidenceRisk: t.confidenceLevel === 'low' ? 'high' : 'medium',
    }))
    .sort((a, b) => b.inclusionCount - a.inclusionCount);
}

// ─── Repeated admin corrections ───────────────────────────────────────────────

/**
 * @typedef {Object} HighCorrectionTemplate
 * @property {string} templateId
 * @property {number} editCount
 * @property {number} approvalCount
 * @property {number} editRate        - editCount / approvalCount (or Infinity if 0 approvals)
 * @property {string} severity        - 'critical' | 'high' | 'medium'
 */

/**
 * Templates where admins frequently edit the text before approving.
 * High edit rate suggests the template text is ambiguous or misaligned with workflow.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {number} [editRateThreshold=0.5]  - editCount/approvalCount above which it's flagged
 * @param {number} [minApprovals=2]         - Minimum approvals to have valid denominator
 * @returns {HighCorrectionTemplate[]}
 */
export function repeatedAdminCorrections(templates, editRateThreshold = 0.5, minApprovals = 2) {
  return templates
    .filter(t => t.tracking.approvalCount >= minApprovals)
    .map(t => {
      const editRate = t.tracking.editCount / t.tracking.approvalCount;
      return { templateId: t.id, editCount: t.tracking.editCount, approvalCount: t.tracking.approvalCount, editRate };
    })
    .filter(({ editRate }) => editRate >= editRateThreshold)
    .map(r => ({
      ...r,
      severity: r.editRate >= 1.0 ? 'critical' : r.editRate >= 0.75 ? 'high' : 'medium',
    }))
    .sort((a, b) => b.editRate - a.editRate);
}

// ─── High conflict areas ──────────────────────────────────────────────────────

/**
 * @typedef {Object} ConflictZone
 * @property {string} templateId
 * @property {number} approvalCount
 * @property {number} rejectionCount
 * @property {number} rejectionRate
 * @property {string[]} barrierTags
 * @property {string[]} stageTags
 */

/**
 * Templates with high rejection rates — areas of high admin/output conflict.
 * Derived from approvalCount (from tracking) and rejectionCount (from audit log).
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {object[]} auditLogs              - All audit log entries
 * @param {number} [rejectionRateThreshold=0.3]
 * @returns {ConflictZone[]}
 */
export function highConflictAreas(templates, auditLogs, rejectionRateThreshold = 0.3) {
  // Count rejections per templateId from audit log
  const rejections = new Map();
  for (const log of auditLogs) {
    if (log.action === 'report_rejected' && log.diff?.templateId) {
      const id = log.diff.templateId;
      rejections.set(id, (rejections.get(id) ?? 0) + 1);
    }
  }

  return templates
    .filter(t => {
      const total = t.tracking.approvalCount + (rejections.get(t.id) ?? 0);
      return total >= 2;
    })
    .map(t => {
      const rejectionCount = rejections.get(t.id) ?? 0;
      const total = t.tracking.approvalCount + rejectionCount;
      return {
        templateId: t.id,
        approvalCount: t.tracking.approvalCount,
        rejectionCount,
        rejectionRate: rejectionCount / total,
        barrierTags: t.barrierTags,
        stageTags: t.stageTags,
      };
    })
    .filter(z => z.rejectionRate >= rejectionRateThreshold)
    .sort((a, b) => b.rejectionRate - a.rejectionRate);
}

// ─── Source type suggestions ──────────────────────────────────────────────────

/**
 * @typedef {Object} SourceSuggestion
 * @property {'empirical_research' | 'expert_protocol' | 'case_pattern' | 'legal_regulatory' | 'practitioner_guide'} sourceType
 * @property {string} rationale
 * @property {string[]} affectedBarriers
 * @property {string[]} affectedStages
 * @property {number} priority           - 1 = highest
 */

/**
 * Based on weak zone analysis, suggest what type of new knowledge source would
 * fill the most critical gaps.
 *
 * Gap type → source type mapping:
 *   knowledge → empirical_research or case_pattern (needs base definitions)
 *   logic     → practitioner_guide (has knowledge, needs applied patterns)
 *   rule      → expert_protocol or legal_regulatory (has templates but low confidence)
 *
 * @param {WeakZone[]} zones
 * @returns {SourceSuggestion[]}
 */
export function suggestNewSourceTypes(zones) {
  const knowledgeZones  = zones.filter(z => z.gapType === 'knowledge');
  const logicZones      = zones.filter(z => z.gapType === 'logic');
  const ruleZones       = zones.filter(z => z.gapType === 'rule');

  const suggestions = [];

  if (knowledgeZones.length > 0) {
    const barriers = [...new Set(knowledgeZones.map(z => z.barrier))];
    const stages   = [...new Set(knowledgeZones.map(z => z.stage))];
    suggestions.push({
      sourceType: 'empirical_research',
      rationale: `${knowledgeZones.length} dimension cells have no knowledge coverage at all. Empirical research would provide baseline definitions and evidence.`,
      affectedBarriers: barriers,
      affectedStages: stages,
      priority: 1,
    });
    if (barriers.length >= 3) {
      suggestions.push({
        sourceType: 'case_pattern',
        rationale: `${barriers.length} barriers have knowledge gaps. Anonymised case patterns would accelerate coverage while research is gathered.`,
        affectedBarriers: barriers,
        affectedStages: stages,
        priority: 2,
      });
    }
  }

  if (logicZones.length > 0) {
    const barriers = [...new Set(logicZones.map(z => z.barrier))];
    const stages   = [...new Set(logicZones.map(z => z.stage))];
    suggestions.push({
      sourceType: 'practitioner_guide',
      rationale: `${logicZones.length} cells have knowledge items but no recommendation templates. Practitioner guides would bridge theory to actionable output.`,
      affectedBarriers: barriers,
      affectedStages: stages,
      priority: knowledgeZones.length > 0 ? 3 : 1,
    });
  }

  if (ruleZones.length > 0) {
    const barriers = [...new Set(ruleZones.map(z => z.barrier))];
    const stages   = [...new Set(ruleZones.map(z => z.stage))];
    suggestions.push({
      sourceType: 'expert_protocol',
      rationale: `${ruleZones.length} cells have templates but all are low-confidence. Expert protocols or validated clinical guidelines would raise confidence levels.`,
      affectedBarriers: barriers,
      affectedStages: stages,
      priority: suggestions.length + 1,
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

// ─── Coverage summary ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} CoverageSummary
 * @property {number} totalCells          - barrier × stage × workplaceType
 * @property {number} coveredCells
 * @property {number} coveragePercent
 * @property {number} knowledgeGaps
 * @property {number} logicGaps
 * @property {number} ruleGaps
 * @property {{ barrier: string, zoneCount: number }[]} worstBarriers
 * @property {{ stage: string, zoneCount: number }[]} worstStages
 */

/**
 * Aggregate gap analysis into a coverage summary for dashboards / health checks.
 *
 * @param {WeakZone[]} zones
 * @returns {CoverageSummary}
 */
export function coverageSummary(zones) {
  const totalCells = BARRIERS.length * EMPLOYMENT_STAGES.length * WORKPLACE_TYPES.length;
  const coveredCells = totalCells - zones.length;

  // Count by gap type
  const knowledgeGaps = zones.filter(z => z.gapType === 'knowledge').length;
  const logicGaps     = zones.filter(z => z.gapType === 'logic').length;
  const ruleGaps      = zones.filter(z => z.gapType === 'rule').length;

  // Worst barriers (most uncovered cells)
  const byBarrier = new Map();
  for (const z of zones) byBarrier.set(z.barrier, (byBarrier.get(z.barrier) ?? 0) + 1);
  const worstBarriers = [...byBarrier.entries()]
    .map(([barrier, zoneCount]) => ({ barrier, zoneCount }))
    .sort((a, b) => b.zoneCount - a.zoneCount)
    .slice(0, 5);

  // Worst stages
  const byStage = new Map();
  for (const z of zones) byStage.set(z.stage, (byStage.get(z.stage) ?? 0) + 1);
  const worstStages = [...byStage.entries()]
    .map(([stage, zoneCount]) => ({ stage, zoneCount }))
    .sort((a, b) => b.zoneCount - a.zoneCount)
    .slice(0, 5);

  return {
    totalCells,
    coveredCells,
    coveragePercent: Math.round((coveredCells / totalCells) * 100),
    knowledgeGaps,
    logicGaps,
    ruleGaps,
    worstBarriers,
    worstStages,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if tags array covers value.
 * 'any' is a wildcard that matches everything.
 * An empty array covers nothing.
 *
 * @param {string[]} tags
 * @param {string} value
 * @returns {boolean}
 */
function _tagCovers(tags, value) {
  if (!tags || tags.length === 0) return false;
  return tags.includes('any') || tags.includes(value);
}
