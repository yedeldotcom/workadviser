/**
 * Recommendation Pipeline — FPP §4.4, §4.5
 *
 * Formal 7-step selection pipeline:
 *   1. Case profiling         — extract all case dimensions
 *   2. Candidate retrieval    — pull eligible templates from knowledge base
 *   3. Eligibility gating     — 7 hard gates (barrier, context, actor, disclosure, feasibility, safety, freshness)
 *   4. Multi-dim scoring      — 8 dimensions weighted by case context
 *   5. Deduplication          — remove near-duplicate family entries from top set
 *   6. Packaging              — build audience-specific RecommendationPackages
 *   7. Review assignment      — assign ReviewStatus based on confidence thresholds
 *
 * Can run against the live knowledge base OR against an injected template set
 * (for testing without file I/O).
 */

import { SCENARIO_DATABASE } from '../../engines/translation/workplace_scenarios.js';
import { createRenderedRecommendation } from '../models/recommendation.js';
import { meetsDisclosureLevel } from './disclosureFilter.js';

// ─── Type definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} CaseProfile
 * All case dimensions extracted in Step 1 and used throughout the pipeline.
 * @property {string[]} barrierIds        - Active barrier IDs (from criticalBarriers)
 * @property {Record<string, number>} barrierScores - Barrier ID → Likert score (1–5)
 * @property {string} overallSeverity     - 'low' | 'moderate' | 'high' | 'critical'
 * @property {Record<string, number>} clusterScores - Cluster → mean score
 * @property {string[]} triggerIds        - Active trigger IDs
 * @property {string[]} amplifierIds      - Active amplifier IDs
 * @property {string[]} riskFlags         - Active risk flag IDs (e.g. 'distress_risk')
 * @property {string | null} trajectory   - 'improving' | 'stable' | 'declining' | null
 * @property {string[]} investmentPriorities - Ranked domain IDs
 * @property {string} disclosureLevel     - One of DISCLOSURE_LEVELS
 * @property {string} employmentStage     - One of EMPLOYMENT_STAGES
 * @property {string | null} workplaceType
 * @property {string | null} caseId       - Set by runRecommendationPipeline
 * @property {object | null} pendingFollowUp
 * @property {object[]} changeEvents
 */

/**
 * @typedef {Object} CandidateTemplate
 * A template-like object derived from SCENARIO_DATABASE or injected for testing.
 * @property {string} id
 * @property {string} familyId           - Groups near-duplicate templates for dedup
 * @property {string[]} barrierTags      - Barrier IDs this template addresses
 * @property {string[]} stageTags        - Employment stages where this applies
 * @property {string[]} workplaceTypeTags - Workplace types (empty = all types)
 * @property {string[]} actorTags        - Who implements this ('employer' | 'hr' | 'direct_manager')
 * @property {string[]} disclosureSuitability - Disclosure levels at which this is shareable
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {string} lifecycleState     - From RecommendationLifecycleMachine
 * @property {string} domain             - Workplace domain (e.g. 'management', 'physical_env')
 * @property {string} action_he          - Hebrew accommodation text
 * @property {string | null} action_en   - English accommodation text
 * @property {string} cost               - 'zero' | 'low' | 'medium' | 'high'
 * @property {string} friction           - Friction type this addresses (e.g. 'sensory_overload')
 * @property {object} tracking           - Lifecycle tracking counters
 * @property {string[]} knowledgeSourceIds
 */

/**
 * @typedef {Object} RecommendationResult
 * Full output of runRecommendationPipeline().
 * @property {CaseProfile} caseProfile
 * @property {number} candidates         - Total templates retrieved in Step 2
 * @property {number} eligible           - Templates that passed all gates in Step 3
 * @property {Array<{ templateId: string, failedGate: string }>} gateLog
 * @property {Array<{ template: CandidateTemplate, score: number }>} selected - After dedup
 * @property {{ user: object[], employer: object[], hr: object[] }} packages
 * @property {{ totalSelected: number, autoApproved: number, pendingReview: number, needsHumanReview: boolean }} summary
 */

// ─── Employment stages (FPP §2.2) ────────────────────────────────────────────

export const EMPLOYMENT_STAGES = [
  'job_seeking',
  'pre_placement',
  'onboarding',
  'active_employment',
  'at_risk',
  'leave',
  'return',
];

// ─── Step 1: Case profiling ───────────────────────────────────────────────────

/**
 * Extract all case dimensions required for gating and scoring.
 *
 * @param {object} pipelineResult - Output of runPipeline()
 * @param {object} profile        - UserProfile
 * @returns {CaseProfile}
 */
export function buildCaseProfile(pipelineResult, profile) {
  const { engines, summary } = pipelineResult;
  const intake = engines.intake;
  const interp  = engines.interpretation;

  return {
    barrierIds:       (intake.criticalBarriers ?? []).map(b => b.id),
    barrierScores:    intake.barrierScores ?? {},
    overallSeverity:  intake.overallSeverity,
    clusterScores:    intake.clusterScores ?? {},
    triggerIds:       [], // populated by sessionManager.completeSession when available
    amplifierIds:     [],
    riskFlags:        (interp.riskFlags ?? []).map(f => f.id),
    trajectory:       interp.trajectory ?? null,
    investmentPriorities: interp.investmentPriorities ?? [],
    disclosureLevel:  profile?.disclosurePreference ?? 'no_disclosure',
    employmentStage:  profile?.employmentContext?.employmentStage ?? 'active_employment',
    workplaceType:    profile?.employmentContext?.workplaceType ?? null,
    pendingFollowUp:  profile?.pendingFollowUp ?? null,
    changeEvents:     profile?.changeEvents ?? [],
  };
}

// ─── Step 2: Candidate retrieval ──────────────────────────────────────────────

/**
 * Pull candidate templates from the scenario database.
 * Returns a flat list of template-like objects derived from SCENARIO_DATABASE.
 *
 * In Step 6+, this will query the formal KnowledgeBase.
 * For now it adapts the existing accommodation arrays.
 *
 * @param {string[]} barrierIds
 * @param {object} [templateOverrides] - Injected templates for testing
 * @returns {CandidateTemplate[]}
 */
export function retrieveCandidates(barrierIds, templateOverrides = null) {
  if (templateOverrides) return templateOverrides;

  const candidates = [];
  let seqId = 1;

  for (const [barrierId, data] of Object.entries(SCENARIO_DATABASE)) {
    // Only retrieve if barrier is active in this case
    if (barrierIds.length > 0 && !barrierIds.includes(barrierId)) continue;

    for (const scenario of (data.scenarios ?? [])) {
      for (const acc of (scenario.accommodations ?? [])) {
        candidates.push({
          id: `TPL-${barrierId.toUpperCase().slice(0, 8)}-${String(seqId).padStart(3, '0')}`,
          familyId: `FAM-${barrierId}`,
          barrierTags: [barrierId],
          stageTags: ['active_employment', 'onboarding', 'job_seeking'],
          workplaceTypeTags: [],
          actorTags: scenario.domain === 'management' ? ['direct_manager', 'hr'] : ['employer', 'hr'],
          disclosureSuitability: ['functional_only', 'partial_contextual', 'full_voluntary'],
          confidenceLevel: acc.cost === 'zero' ? 'high' : acc.cost === 'low' ? 'high' : 'medium',
          lifecycleState: 'active',
          domain: scenario.domain,
          action_he: acc.action_he,
          action_en: acc.action_en ?? null,
          cost: acc.cost,
          friction: scenario.friction,
          tracking: { retrievalCount: 0, inclusionCount: 0, editCount: 0, approvalCount: 0, usefulnessSignals: 0, staleAt: null },
          knowledgeSourceIds: [],
        });
        seqId++;
      }
    }
  }

  return candidates;
}

// ─── Step 3: Eligibility gating ───────────────────────────────────────────────

/**
 * 7 hard gates — a template must pass all to be eligible.
 * Returns { passed: boolean, failedGate: string | null }
 *
 * @param {object} template
 * @param {CaseProfile} caseProfile
 * @returns {{ passed: boolean, failedGate: string | null }}
 */
export function applyEligibilityGates(template, caseProfile) {
  // Gate 1: Barrier fit — template must cover at least one active barrier
  const barrierFit = template.barrierTags.length === 0 ||
    template.barrierTags.some(tag => caseProfile.barrierIds.includes(tag));
  if (!barrierFit) return { passed: false, failedGate: 'barrier_fit' };

  // Gate 2: Stage fit — template must apply to current employment stage
  const stageFit = template.stageTags.length === 0 ||
    template.stageTags.includes(caseProfile.employmentStage);
  if (!stageFit) return { passed: false, failedGate: 'stage_fit' };

  // Gate 3: Workplace type fit — if template restricts workplace type, must match
  const wtFit = template.workplaceTypeTags.length === 0 ||
    !caseProfile.workplaceType ||
    template.workplaceTypeTags.includes(caseProfile.workplaceType);
  if (!wtFit) return { passed: false, failedGate: 'workplace_type_fit' };

  // Gate 4: Disclosure fit — template must be usable at current disclosure level
  const disclosureFit = template.disclosureSuitability.some(level =>
    meetsDisclosureLevel(caseProfile.disclosureLevel, level)
  );
  if (!disclosureFit) return { passed: false, failedGate: 'disclosure_fit' };

  // Gate 5: Feasibility — no hard block on high-cost in critical severity
  // (high-cost items are still eligible, scored down in Step 4)
  // Gate is "always pass" for now; extend with budget constraints when available.
  const feasibilityFit = true;
  if (!feasibilityFit) return { passed: false, failedGate: 'feasibility_fit' };

  // Gate 6: Safety fit — no trigger-exposing content for distress cases
  const safetyFit = !(
    caseProfile.riskFlags.includes('distress_risk') &&
    template.friction === 'trigger_exposure'
  );
  if (!safetyFit) return { passed: false, failedGate: 'safety_fit' };

  // Gate 7: Freshness — reject stale templates
  const freshnessFit = !template.tracking.staleAt ||
    new Date(template.tracking.staleAt) > new Date();
  if (!freshnessFit) return { passed: false, failedGate: 'freshness_fit' };

  return { passed: true, failedGate: null };
}

// ─── Step 4: Multi-dimensional scoring ───────────────────────────────────────

/**
 * Score a template across 8 dimensions. Returns 0–100.
 *
 * Dimensions and weights:
 *   barrier_relevance      0.25 — how well barrier score aligns with template's barrier
 *   context_fit            0.15 — employment stage + workplace type alignment
 *   feasibility            0.15 — cost vs. severity (low cost preferred for low severity)
 *   expected_impact        0.15 — based on investment priorities
 *   disclosure_compat      0.10 — how closely template matches current disclosure level
 *   evidence_strength      0.10 — confidence level + knowledge sources
 *   safety_trust_fit       0.05 — extra for high-safety items in distress cases
 *   diversity_contribution 0.05 — preference for covering uncovered families
 *
 * @param {object} template
 * @param {CaseProfile} caseProfile
 * @param {Set<string>} coveredFamilies - Families already in the selected set
 * @returns {number} 0–100
 */
export function scoreTemplate(template, caseProfile, coveredFamilies = new Set()) {
  let score = 0;

  // 1. Barrier relevance (0–25)
  const barrierScore = template.barrierTags.reduce((max, tag) => {
    const s = caseProfile.barrierScores[tag] ?? 0;
    return Math.max(max, s);
  }, 0);
  score += (barrierScore / 5) * 25; // normalize 0–5 → 0–25

  // 2. Context fit (0–15)
  const stageMatch = template.stageTags.includes(caseProfile.employmentStage) ? 1 : 0.5;
  const wtMatch = template.workplaceTypeTags.length === 0 ||
    template.workplaceTypeTags.includes(caseProfile.workplaceType ?? '') ? 1 : 0.7;
  score += stageMatch * wtMatch * 15;

  // 3. Feasibility / cost (0–15)
  const costScore = { zero: 15, low: 12, medium: 7, high: 3 }[template.cost] ?? 5;
  score += costScore;

  // 4. Expected impact (0–15)
  const domain = template.domain;
  const priorityIdx = caseProfile.investmentPriorities.indexOf(domain);
  score += priorityIdx === -1 ? 5 : Math.max(15 - priorityIdx * 4, 1);

  // 5. Disclosure compatibility (0–10)
  const exactMatch = template.disclosureSuitability.includes(caseProfile.disclosureLevel);
  score += exactMatch ? 10 : 5;

  // 6. Evidence strength (0–10)
  const confScore = { high: 10, medium: 6, low: 2 }[template.confidenceLevel] ?? 3;
  score += confScore;

  // 7. Safety/trust fit (0–5)
  const isSafe = template.friction !== 'trigger_exposure';
  score += isSafe ? 5 : 0;

  // 8. Diversity contribution (0–5)
  const isNewFamily = !coveredFamilies.has(template.familyId);
  score += isNewFamily ? 5 : 0;

  return Math.min(Math.round(score), 100);
}

// ─── Step 5: Deduplication ────────────────────────────────────────────────────

/**
 * Remove near-duplicate family entries from a ranked list.
 * Keeps the highest-scoring template per family, up to maxPerFamily from same barrier.
 *
 * @param {Array<{ template: object, score: number }>} ranked
 * @param {{ maxTotal?: number, maxPerFamily?: number }} opts
 * @returns {Array<{ template: object, score: number }>}
 */
export function deduplicateRecommendations(ranked, opts = {}) {
  const { maxTotal = 10, maxPerFamily = 2 } = opts;
  const familyCounts = {};
  const result = [];

  for (const item of ranked) {
    const fam = item.template.familyId;
    familyCounts[fam] = (familyCounts[fam] ?? 0) + 1;
    if (familyCounts[fam] <= maxPerFamily) {
      result.push(item);
      if (result.length >= maxTotal) break;
    }
  }

  return result;
}

// ─── Step 6: Packaging ───────────────────────────────────────────────────────

/**
 * Build audience-specific RecommendationPackages from the deduplicated set.
 *
 * @param {Array<{ template: object, score: number }>} selected
 * @param {CaseProfile} caseProfile
 * @returns {{ user: RenderedRecommendation[], employer: RenderedRecommendation[], hr: RenderedRecommendation[] }}
 */
export function packageRecommendations(selected, caseProfile) {
  const caseId = caseProfile.caseId ?? 'unknown';

  const userRecs = selected.map(({ template, score }) =>
    createRenderedRecommendation({
      templateId: template.id,
      caseId,
      audience: 'user',
      disclosureLevel: 'full_voluntary',
      renderedText: {
        he: template.action_he,
        en: template.action_en ?? null,
      },
      timeHorizon: inferTimeHorizon(template),
      actor: 'user',
      reviewStatus: assignReviewStatus(score, template.confidenceLevel),
      score,
    })
  );

  const employerAllowed = meetsDisclosureLevel(caseProfile.disclosureLevel, 'functional_only');
  const employerRecs = employerAllowed
    ? selected
        .filter(({ template }) => template.actorTags.some(t => ['employer', 'hr', 'direct_manager'].includes(t)))
        .map(({ template, score }) =>
          createRenderedRecommendation({
            templateId: template.id,
            caseId,
            audience: 'employer',
            disclosureLevel: caseProfile.disclosureLevel,
            renderedText: {
              he: template.action_he,
              en: template.action_en ?? null,
            },
            timeHorizon: inferTimeHorizon(template),
            actor: template.actorTags.find(t => ['direct_manager', 'hr', 'employer'].includes(t)) ?? 'employer',
            reviewStatus: assignReviewStatus(score, template.confidenceLevel),
            score,
          })
        )
    : [];

  return { user: userRecs, employer: employerRecs, hr: [] };
}

// ─── Step 7: Review assignment ────────────────────────────────────────────────

/**
 * Assign ReviewStatus based on score and confidence.
 * - high confidence + score ≥ 70: auto-approved
 * - medium confidence or score 50–69: pending
 * - low confidence or score < 50: rejected (excluded from top set)
 *
 * @param {number} score
 * @param {string} confidenceLevel
 * @returns {string}
 */
export function assignReviewStatus(score, confidenceLevel) {
  if (confidenceLevel === 'high' && score >= 70) return 'approved';
  if (confidenceLevel === 'low' || score < 50)   return 'rejected';
  return 'pending';
}

// ─── Main pipeline entry ──────────────────────────────────────────────────────

/**
 * Run the full 7-step recommendation selection pipeline.
 *
 * @param {object} pipelineResult   - Output of runPipeline()
 * @param {object} profile          - UserProfile
 * @param {object} [opts]
 * @param {{ maxTotal?: number, maxPerFamily?: number }} [opts.dedup]
 * @param {object[]} [opts.templateOverrides] - Injected templates for testing
 * @returns {RecommendationResult}
 */
export function runRecommendationPipeline(pipelineResult, profile, opts = {}) {
  // Step 1: Profile
  const caseProfile = buildCaseProfile(pipelineResult, profile);
  caseProfile.caseId = profile?.userId ?? null;

  // Step 2: Retrieve
  const candidates = retrieveCandidates(caseProfile.barrierIds, opts.templateOverrides ?? null);

  // Step 3: Gate
  const eligible = [];
  const gateLog = [];
  for (const template of candidates) {
    const { passed, failedGate } = applyEligibilityGates(template, caseProfile);
    if (passed) {
      eligible.push(template);
    } else {
      gateLog.push({ templateId: template.id, failedGate });
    }
  }

  // Step 4: Score
  const coveredFamilies = new Set();
  const scored = eligible.map(template => {
    const score = scoreTemplate(template, caseProfile, coveredFamilies);
    return { template, score };
  }).sort((a, b) => b.score - a.score);

  // Step 5: Dedup
  const deduped = deduplicateRecommendations(scored, opts.dedup);
  // Update coveredFamilies after dedup for diversity tracking
  deduped.forEach(({ template }) => coveredFamilies.add(template.familyId));

  // Step 6: Package
  const packages = packageRecommendations(deduped, caseProfile);

  // Step 7: Filter out rejected items from top-level packages
  const filterApproved = recs => recs.filter(r => r.reviewStatus !== 'rejected');

  return {
    caseProfile,
    candidates: candidates.length,
    eligible: eligible.length,
    gateLog,
    selected: deduped,
    packages: {
      user:     filterApproved(packages.user),
      employer: filterApproved(packages.employer),
      hr:       filterApproved(packages.hr),
    },
    summary: {
      totalSelected: deduped.length,
      autoApproved: deduped.filter(({ template, score }) => assignReviewStatus(score, template.confidenceLevel) === 'approved').length,
      pendingReview: deduped.filter(({ template, score }) => assignReviewStatus(score, template.confidenceLevel) === 'pending').length,
      needsHumanReview: deduped.some(({ template, score }) => assignReviewStatus(score, template.confidenceLevel) === 'pending'),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferTimeHorizon(template) {
  if (template.cost === 'zero' || template.cost === 'low') return 'immediate';
  if (template.cost === 'medium') return 'near_term';
  return 'longer_term';
}
