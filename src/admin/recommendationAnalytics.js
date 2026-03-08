/**
 * Recommendation Analytics — FPP §4.9
 *
 * Tracks feedback and computes usage analytics for recommendation templates.
 *
 * Feedback types:
 *   delivery_feedback    — did the recommendation reach the user/employer correctly?
 *   usefulness_feedback  — did the user find it helpful?
 *   employer_action      — did the employer act on the recommendation?
 *   admin_quality        — admin judgment on quality before/after approval
 *
 * Analytics:
 *   retrievalFrequency()   — how often each template is retrieved from the pipeline
 *   inclusionFrequency()   — how often retrieved templates are included in final reports
 *   approvalRate()         — fraction that pass admin review without rejection
 *   staleRate()            — fraction flagged as stale by staleness heuristics
 *   templateSummary()      — per-template roll-up of all four metrics
 *
 * Knowledge promotion workflow (FPP §3.7):
 *   case_only → candidate_pattern → validated → rule_update_candidate
 *   - De-identify before promotion
 *   - Log source cases, promoter, scope
 *   promoteKnowledgeItem() — advance one step, recording audit trail
 *   deIdentifyForPromotion() — strip PII from a knowledge excerpt before promotion
 */

import { createAuditLog } from '../core/models/auditLog.js';
import { appendAuditLog, saveKnowledgeItem, getKnowledgeItem } from './base44Store.js';

// ─── Feedback recording ───────────────────────────────────────────────────────

/**
 * @typedef {'delivery_feedback' | 'usefulness_feedback' | 'employer_action' | 'admin_quality'} FeedbackType
 * @typedef {'positive' | 'negative' | 'neutral'} FeedbackPolarity
 *
 * @typedef {Object} RecommendationFeedback
 * @property {string} id
 * @property {string} templateId
 * @property {string} caseId
 * @property {FeedbackType} feedbackType
 * @property {FeedbackPolarity} polarity
 * @property {string | null} notes
 * @property {string} recordedBy
 * @property {string} recordedAt
 */

/**
 * Create a feedback object. Does NOT persist — callers save via store.
 * @param {Partial<RecommendationFeedback>} fields
 * @returns {RecommendationFeedback}
 */
export function createFeedback(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    templateId: fields.templateId ?? null,
    caseId: fields.caseId ?? null,
    feedbackType: fields.feedbackType ?? 'usefulness_feedback',
    polarity: fields.polarity ?? 'neutral',
    notes: fields.notes ?? null,
    recordedBy: fields.recordedBy ?? 'system',
    recordedAt: fields.recordedAt ?? new Date().toISOString(),
  };
}

// ─── Analytics computations ───────────────────────────────────────────────────

/**
 * @typedef {Object} FrequencyEntry
 * @property {string} templateId
 * @property {number} count
 * @property {number} rate             - count / totalCases
 */

/**
 * Retrieval frequency — how often each template is retrieved per case session.
 * A template is "retrieved" when it is a candidate from the pipeline,
 * regardless of whether it was included in the final report.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {number} totalCases          - Total number of assessed cases (denominator)
 * @returns {FrequencyEntry[]}
 */
export function retrievalFrequency(templates, totalCases) {
  if (totalCases <= 0) return templates.map(t => ({ templateId: t.id, count: t.tracking.retrievalCount, rate: 0 }));
  return templates
    .map(t => ({
      templateId: t.id,
      count: t.tracking.retrievalCount,
      rate: Math.round((t.tracking.retrievalCount / totalCases) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Inclusion frequency — how often retrieved templates appear in final delivered reports.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {number} totalCases
 * @returns {FrequencyEntry[]}
 */
export function inclusionFrequency(templates, totalCases) {
  if (totalCases <= 0) return templates.map(t => ({ templateId: t.id, count: t.tracking.inclusionCount, rate: 0 }));
  return templates
    .map(t => ({
      templateId: t.id,
      count: t.tracking.inclusionCount,
      rate: Math.round((t.tracking.inclusionCount / totalCases) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @typedef {Object} ApprovalRateEntry
 * @property {string} templateId
 * @property {number} approvalCount
 * @property {number} editCount
 * @property {number} approvalRate     - approvalCount / (approvalCount + editCount) where edit = corrected approval
 * @property {number} editRate         - editCount / approvalCount
 */

/**
 * Approval rate — fraction of included recommendations that pass admin review
 * without requiring edits before approval.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @returns {ApprovalRateEntry[]}
 */
export function approvalRate(templates) {
  return templates.map(t => {
    const total = t.tracking.approvalCount + t.tracking.editCount;
    return {
      templateId: t.id,
      approvalCount: t.tracking.approvalCount,
      editCount: t.tracking.editCount,
      approvalRate: total > 0 ? Math.round((t.tracking.approvalCount / total) * 1000) / 1000 : null,
      editRate: t.tracking.approvalCount > 0
        ? Math.round((t.tracking.editCount / t.tracking.approvalCount) * 1000) / 1000
        : null,
    };
  }).sort((a, b) => (b.approvalRate ?? 0) - (a.approvalRate ?? 0));
}

/**
 * @typedef {Object} StaleRateEntry
 * @property {string} templateId
 * @property {boolean} isStale
 * @property {string | null} staleAt
 * @property {number} inclusionCount
 */

/**
 * Stale rate — templates that have been flagged as stale
 * (staleAt is set, meaning they haven't been updated while use continues).
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @returns {{ staleCount: number, staleRate: number, entries: StaleRateEntry[] }}
 */
export function staleRate(templates) {
  const entries = templates.map(t => ({
    templateId: t.id,
    isStale: t.tracking.staleAt !== null,
    staleAt: t.tracking.staleAt,
    inclusionCount: t.tracking.inclusionCount,
  }));

  const staleCount = entries.filter(e => e.isStale).length;
  return {
    staleCount,
    staleRate: templates.length > 0
      ? Math.round((staleCount / templates.length) * 1000) / 1000
      : 0,
    entries: entries.sort((a, b) => (b.isStale ? 1 : 0) - (a.isStale ? 1 : 0)),
  };
}

/**
 * @typedef {Object} TemplateSummary
 * @property {string} templateId
 * @property {string} lifecycleState
 * @property {'high' | 'medium' | 'low'} confidenceLevel
 * @property {number} retrievalCount
 * @property {number} inclusionCount
 * @property {number} approvalCount
 * @property {number} editCount
 * @property {number} usefulnessSignals
 * @property {number | null} retrievalRate
 * @property {number | null} inclusionRate
 * @property {number | null} approvalRate
 * @property {number | null} editRate
 * @property {boolean} isStale
 * @property {number} knowledgeSourceCount
 */

/**
 * Full per-template analytics summary.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate[]} templates
 * @param {number} totalCases
 * @returns {TemplateSummary[]}
 */
export function templateSummary(templates, totalCases) {
  const safe = totalCases > 0 ? totalCases : null;
  return templates.map(t => {
    const { retrievalCount, inclusionCount, approvalCount, editCount, usefulnessSignals, staleAt } = t.tracking;
    const totalReviewed = approvalCount + editCount;
    return {
      templateId: t.id,
      lifecycleState: t.lifecycleState,
      confidenceLevel: t.confidenceLevel,
      retrievalCount,
      inclusionCount,
      approvalCount,
      editCount,
      usefulnessSignals,
      retrievalRate: safe ? Math.round((retrievalCount / safe) * 1000) / 1000 : null,
      inclusionRate: safe ? Math.round((inclusionCount / safe) * 1000) / 1000 : null,
      approvalRate: totalReviewed > 0 ? Math.round((approvalCount / totalReviewed) * 1000) / 1000 : null,
      editRate: approvalCount > 0 ? Math.round((editCount / approvalCount) * 1000) / 1000 : null,
      isStale: staleAt !== null,
      knowledgeSourceCount: t.knowledgeSourceIds?.length ?? 0,
    };
  });
}

// ─── Knowledge promotion workflow (FPP §3.7) ─────────────────────────────────

/**
 * Promotion state order.
 * @type {string[]}
 */
const PROMOTION_ORDER = ['case_only', 'candidate_pattern', 'validated', 'rule_update_candidate'];

/**
 * @typedef {'global' | 'campaign' | 'segment'} PromotionScope
 *
 * @typedef {Object} PromotionRecord
 * @property {string} itemId
 * @property {string} fromState
 * @property {string} toState
 * @property {string} promotedBy
 * @property {PromotionScope} scope
 * @property {string[]} sourceCaseIds
 * @property {string} promotedAt
 * @property {string | null} notes
 */

/**
 * Advance a knowledge item one step along the promotion chain.
 *
 * Promotion chain: case_only → candidate_pattern → validated → rule_update_candidate
 *
 * - De-identification is the caller's responsibility before calling this function.
 * - Source case IDs must be provided to maintain traceability.
 * - Writes an audit log entry with full diff.
 *
 * @param {import('../core/models/knowledgeItem.js').KnowledgeItem} item
 * @param {object} opts
 * @param {string} opts.promotedBy
 * @param {PromotionScope} opts.scope
 * @param {string[]} opts.sourceCaseIds
 * @param {string} [opts.notes]
 * @returns {{ item: object, record: PromotionRecord, log: object }}
 * @throws {Error} If item is already at the top of the chain
 */
export async function promoteKnowledgeItem(item, opts) {
  const currentIndex = PROMOTION_ORDER.indexOf(item.promotionState);
  if (currentIndex === -1) throw new Error(`Unknown promotionState: '${item.promotionState}'`);
  if (currentIndex === PROMOTION_ORDER.length - 1) {
    throw new Error(`Item '${item.id}' is already at maximum promotion state: '${item.promotionState}'`);
  }

  const fromState = item.promotionState;
  const toState   = PROMOTION_ORDER[currentIndex + 1];

  const promoted = {
    ...item,
    promotionState: toState,
  };
  await saveKnowledgeItem(promoted);

  const record = {
    itemId: item.id,
    fromState,
    toState,
    promotedBy: opts.promotedBy,
    scope: opts.scope,
    sourceCaseIds: opts.sourceCaseIds,
    promotedAt: new Date().toISOString(),
    notes: opts.notes ?? null,
  };

  const log = createAuditLog({
    entityType: 'knowledge_item',
    entityId: item.id,
    action: 'knowledge_item_promoted',
    changedBy: opts.promotedBy,
    diff: { fromState, toState, scope: opts.scope, sourceCaseIds: opts.sourceCaseIds },
    meaningChanged: true,
    scope: opts.scope === 'global' ? 'global' : 'local',
    reason: `Promoted from ${fromState} → ${toState}${opts.notes ? ': ' + opts.notes : ''}`,
  });
  await appendAuditLog(log);

  return { item: promoted, record, log };
}

/**
 * De-identify a knowledge item excerpt before knowledge promotion.
 * Strips name-like patterns, case IDs, and personal identifiers from content strings.
 *
 * This is a conservative rule-based approach. Human review is still required.
 *
 * Strips:
 *   - Explicit user/case ID strings (e.g. "case-001", "user-abc123")
 *   - Names that look like personal identifiers (patterns like "שם: X", "Name: X")
 *   - Phone numbers, email addresses
 *   - Dates that appear to identify specific incidents
 *
 * @param {string} text
 * @returns {{ cleaned: string, flagged: boolean, warnings: string[] }}
 */
export function deIdentifyForPromotion(text) {
  const warnings = [];
  let cleaned = text;

  // Case/user IDs (e.g. user-001, case-abc-123)
  if (/\b(user|case|client|מקרה)-[\w-]+/i.test(cleaned)) {
    cleaned = cleaned.replace(/\b(user|case|client|מקרה)-[\w-]+/gi, '[ID_REDACTED]');
    warnings.push('Case/user ID patterns detected and redacted');
  }

  // Email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleaned)) {
    cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    warnings.push('Email address detected and redacted');
  }

  // Phone numbers (Israeli and international patterns)
  // Matches: +972-XX-XXX-XXXX, 0XX-XXX-XXXX, 05X-XXXXXXX, etc.
  if (/(\+972|0)\d{1,2}[\s-]?\d{3}[\s-]?\d{4}/.test(cleaned)) {
    cleaned = cleaned.replace(/(\+972|0)\d{1,2}[\s-]?\d{3}[\s-]?\d{4}/g, '[PHONE_REDACTED]');
    warnings.push('Phone number detected and redacted');
  }

  // Hebrew name label patterns (e.g. "שם: דוד", "שם פרטי: ...")
  if (/שם(\s+פרטי)?:\s*\S+/u.test(cleaned)) {
    cleaned = cleaned.replace(/שם(\s+פרטי)?:\s*\S+/gu, 'שם: [REDACTED]');
    warnings.push('Hebrew name label pattern detected and redacted');
  }

  // English name label patterns
  if (/\bName:\s*\S+/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bName:\s*\S+/gi, 'Name: [REDACTED]');
    warnings.push('English name label pattern detected and redacted');
  }

  // Specific dates that look like incident dates (dd/mm/yyyy or yyyy-mm-dd)
  const dateMatches = cleaned.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g);
  if (dateMatches && dateMatches.length > 0) {
    warnings.push(`${dateMatches.length} specific date(s) present — review manually for incident identification risk`);
  }

  return {
    cleaned,
    flagged: warnings.length > 0,
    warnings,
  };
}

/**
 * Increment a tracking counter on a template (mutates tracking; caller saves the template).
 * Useful for updating retrievalCount, inclusionCount, etc. from the pipeline.
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate} template
 * @param {'retrievalCount' | 'inclusionCount' | 'editCount' | 'approvalCount' | 'usefulnessSignals'} counter
 * @param {number} [by=1]
 * @returns {import('../core/models/recommendation.js').RecommendationTemplate}
 */
export function incrementTracking(template, counter, by = 1) {
  return {
    ...template,
    tracking: {
      ...template.tracking,
      [counter]: (template.tracking[counter] ?? 0) + by,
    },
  };
}

/**
 * Mark a template as stale (no longer current given recent changes in knowledge or rules).
 *
 * @param {import('../core/models/recommendation.js').RecommendationTemplate} template
 * @returns {import('../core/models/recommendation.js').RecommendationTemplate}
 */
export function markTemplateStale(template) {
  return {
    ...template,
    tracking: {
      ...template.tracking,
      staleAt: new Date().toISOString(),
    },
  };
}
