/**
 * AuditLog — FPP §9.1
 *
 * Immutable log entry for every significant system action.
 * Never deleted; accumulated indefinitely.
 */

/**
 * @typedef {'local' | 'reusable'} AuditScope
 *
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} entityType      - 'report' | 'recommendation' | 'knowledgeItem' | 'user' | 'lead'
 * @property {string} entityId
 * @property {string} action          - e.g. 'created' | 'edited' | 'approved' | 'exported' | 'promoted'
 * @property {string} changedBy       - Admin ID or 'system'
 * @property {string} changedAt       - ISO
 * @property {Object | null} diff     - Before/after snapshot (optional)
 * @property {boolean} meaningChanged - Did the semantic meaning of output change?
 * @property {AuditScope} scope       - 'local' = affects one case; 'reusable' = affects shared knowledge
 * @property {string | null} reason   - Human-readable reason for the change
 */

export function createAuditLog(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    entityType: fields.entityType ?? 'report',
    entityId: fields.entityId ?? null,
    action: fields.action ?? 'created',
    changedBy: fields.changedBy ?? 'system',
    changedAt: fields.changedAt ?? new Date().toISOString(),
    diff: fields.diff ?? null,
    meaningChanged: fields.meaningChanged ?? false,
    scope: fields.scope ?? 'local',
    reason: fields.reason ?? null,
  };
}
