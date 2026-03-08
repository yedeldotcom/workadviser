/**
 * RuleObject — FPP §9.1
 *
 * Represents a configurable rule that governs system behavior.
 * Rules are versioned and logged; changes require admin action.
 */

/**
 * @typedef {'global' | 'knowledge' | 'logic' | 'campaign' | 'case_level'} RuleType
 *
 * @typedef {Object} RuleChangeLog
 * @property {string} changedBy
 * @property {string} changedAt
 * @property {string} reason
 * @property {*} previousValue
 *
 * @typedef {Object} RuleObject
 * @property {string} id
 * @property {RuleType} ruleType
 * @property {string} scope             - e.g. 'all_cases' | 'barrier:fatigue' | 'stage:early'
 * @property {string} description
 * @property {*} definition             - The rule's value/logic
 * @property {string} createdBy
 * @property {string} updatedAt
 * @property {RuleChangeLog[]} changeLog
 */

export function createRuleObject(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    ruleType: fields.ruleType ?? 'global',
    scope: fields.scope ?? 'all_cases',
    description: fields.description ?? '',
    definition: fields.definition ?? null,
    createdBy: fields.createdBy ?? 'system',
    updatedAt: fields.updatedAt ?? now,
    changeLog: fields.changeLog ?? [],
  };
}
