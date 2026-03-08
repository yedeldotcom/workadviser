/**
 * ChangeEvent — FPP §9.1
 *
 * A significant life/employment event that may invalidate existing recommendations
 * and require case revalidation.
 */

/**
 * @typedef {'hired' | 'new_role' | 'promotion' | 'new_boss' | 'team_change' |
 *           'schedule_change' | 'hybrid_change' | 'leave' | 'return' |
 *           'fired' | 'resigned' | 'relocated' | 'commute_change'} ChangeEventType
 *
 * @typedef {'light_refresh' | 'partial_revalidation' | 'full_reassessment'} RevalidationLevel
 *
 * @typedef {Object} ChangeEvent
 * @property {string} id
 * @property {string} userId
 * @property {ChangeEventType} eventType
 * @property {string} occurredAt          - ISO (user-reported date)
 * @property {string} recordedAt          - ISO (when we recorded it)
 * @property {boolean} revalidationRequired
 * @property {RevalidationLevel} revalidationLevel
 * @property {string | null} notes
 */

/**
 * Maps each change event type to its required revalidation level (FPP §5.7).
 *
 * - full_reassessment: Major context change — restart barrier scoring (hired, leave, fired, etc.)
 * - partial_revalidation: Significant but bounded change — re-score affected barriers (promotion, relocation)
 * - light_refresh: Minor context shift — check staleness on top recommendations (team_change, schedule_change)
 *
 * @type {Record<string, RevalidationLevel>}
 */
const REVALIDATION_LEVELS = {
  hired:           'full_reassessment',
  new_role:        'full_reassessment',
  promotion:       'partial_revalidation',
  new_boss:        'partial_revalidation',
  team_change:     'light_refresh',
  schedule_change: 'light_refresh',
  hybrid_change:   'light_refresh',
  leave:           'full_reassessment',
  return:          'full_reassessment',
  fired:           'full_reassessment',
  resigned:        'full_reassessment',
  relocated:       'partial_revalidation',
  commute_change:  'light_refresh',
};

/**
 * Create a ChangeEvent object with defaults.
 * revalidationLevel is auto-derived from eventType unless explicitly overridden.
 * @param {Partial<ChangeEvent>} fields
 * @returns {ChangeEvent}
 */
export function createChangeEvent(fields = {}) {
  const now = new Date().toISOString();
  const eventType = fields.eventType ?? 'schedule_change';
  return {
    id: fields.id ?? crypto.randomUUID(),
    userId: fields.userId ?? null,
    eventType,
    occurredAt: fields.occurredAt ?? now,
    recordedAt: fields.recordedAt ?? now,
    revalidationRequired: fields.revalidationRequired ?? true,
    revalidationLevel: fields.revalidationLevel ?? REVALIDATION_LEVELS[eventType] ?? 'light_refresh',
    notes: fields.notes ?? null,
  };
}

export { REVALIDATION_LEVELS };
