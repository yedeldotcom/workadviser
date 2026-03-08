/**
 * Change Event Detector — FPP §5.7
 *
 * Detects and records significant life/employment events that may invalidate
 * existing recommendations and require case revalidation.
 *
 * Change events trigger one of three revalidation levels:
 *   - full_reassessment    — Major context shift (hired, fired, leave, return, new_role, resigned)
 *   - partial_revalidation — Bounded change (promotion, new_boss, relocated)
 *   - light_refresh        — Minor context shift (team_change, schedule_change, hybrid_change, commute_change)
 *
 * Staleness rules (FPP §5.7):
 *   A case is considered stale and should prompt revalidation when:
 *   1. An unresolved full_reassessment event exists — stale immediately
 *   2. An unresolved partial_revalidation event is > 30 days old
 *   3. An unresolved light_refresh event is > 90 days old
 *   4. > 180 days since last assessment with no events (time-based staleness)
 *   5. disclosurePreference has changed — always triggers partial_revalidation
 */

import { createChangeEvent, REVALIDATION_LEVELS } from '../core/models/changeEvent.js';
import { createAuditLog } from '../core/models/auditLog.js';
import {
  getProfile, saveProfile, appendAuditLog,
  saveChangeEvent, getChangeEvent,
} from '../admin/store.js';

// ─── Staleness thresholds (days) ──────────────────────────────────────────────

/**
 * How many days after a pending event before the case is considered stale.
 * full_reassessment is 0 — stale immediately on event.
 * @type {Record<string, number>}
 */
const STALENESS_DAYS = {
  full_reassessment:    0,
  partial_revalidation: 30,
  light_refresh:        90,
  time_based:           180,
};

// ─── Record ───────────────────────────────────────────────────────────────────

/**
 * Record a change event for a user.
 * Saves the event to the store and links its ID into the user's profile.
 *
 * @param {string} userId
 * @param {import('../core/models/changeEvent.js').ChangeEventType} eventType
 * @param {object} [opts]
 * @param {string} [opts.occurredAt]  - ISO date when event happened (default: now)
 * @param {string} [opts.notes]       - Free-text note
 * @param {string} [opts.recordedBy]  - Admin ID or 'user_self_report' (default: 'system')
 * @returns {{ event: import('../core/models/changeEvent.js').ChangeEvent, log: object }}
 * @throws {Error} If userId is missing, profile not found, or eventType is invalid
 */
export function recordChangeEvent(userId, eventType, opts = {}) {
  if (!userId) throw new Error('userId is required');
  if (!REVALIDATION_LEVELS[eventType]) {
    throw new Error(
      `Unknown eventType: '${eventType}'. Valid: ${Object.keys(REVALIDATION_LEVELS).join(', ')}`
    );
  }

  const profile = getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const event = createChangeEvent({
    userId,
    eventType,
    occurredAt: opts.occurredAt ?? new Date().toISOString(),
    notes: opts.notes ?? null,
  });

  saveChangeEvent(event);

  // Link event ID into profile
  const updatedProfile = {
    ...profile,
    changeEventIds: [...(profile.changeEventIds ?? []), event.id],
    updatedAt: new Date().toISOString(),
  };
  saveProfile(updatedProfile);

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'change_event_recorded',
    changedBy: opts.recordedBy ?? 'system',
    diff: { eventType, revalidationLevel: event.revalidationLevel, occurredAt: event.occurredAt },
    meaningChanged: event.revalidationLevel !== 'light_refresh',
    scope: 'local',
    reason: `${eventType}${opts.notes ? ': ' + opts.notes : ''}`,
  });
  appendAuditLog(log);

  return { event, log };
}

// ─── Staleness assessment ─────────────────────────────────────────────────────

/**
 * @typedef {Object} StalenessResult
 * @property {boolean} isStale              - True if revalidation is recommended
 * @property {string} reason                - Human-readable explanation
 * @property {'full_reassessment' | 'partial_revalidation' | 'light_refresh' | 'none'} recommendedLevel
 * @property {number} daysSinceAssessment   - Days since lastAssessedAt
 * @property {string | null} triggerEventType - Event type that triggered staleness, or null
 */

/**
 * Assess whether a user's case is stale and needs revalidation.
 *
 * Checks in priority order (highest wins):
 *   1. Unresolved full_reassessment event — stale immediately
 *   2. Unresolved partial_revalidation event older than 30 days
 *   3. Unresolved light_refresh event older than 90 days
 *   4. Disclosure preference changed (always partial_revalidation)
 *   5. Time-based: > 180 days since last assessment regardless of events
 *
 * @param {import('../core/models/userProfile.js').UserProfile} profile
 * @param {import('../core/models/changeEvent.js').ChangeEvent[]} changeEvents
 * @param {object} [opts]
 * @param {string} [opts.lastAssessedAt]     - ISO timestamp of last pipeline run
 * @param {string} [opts.previousDisclosure] - Prior disclosure level for change detection
 * @returns {StalenessResult}
 */
export function assessStaleness(profile, changeEvents, opts = {}) {
  const now = new Date();
  const lastAssessedAt = opts.lastAssessedAt ?? profile.createdAt;
  const daysSince = Math.floor((now - new Date(lastAssessedAt)) / 86_400_000);

  // Only consider unresolved events
  const pending = changeEvents.filter(e => e.revalidationRequired);

  // 1. full_reassessment — stale immediately
  const fullEvent = pending.find(e => e.revalidationLevel === 'full_reassessment');
  if (fullEvent) {
    return {
      isStale: true,
      reason: `Major change event recorded: ${fullEvent.eventType}`,
      recommendedLevel: 'full_reassessment',
      daysSinceAssessment: daysSince,
      triggerEventType: fullEvent.eventType,
    };
  }

  // 2. partial_revalidation — stale after 30 days
  const partialEvent = pending.find(e => e.revalidationLevel === 'partial_revalidation');
  if (partialEvent) {
    const daysSinceEvent = Math.floor((now - new Date(partialEvent.recordedAt)) / 86_400_000);
    if (daysSinceEvent >= STALENESS_DAYS.partial_revalidation) {
      return {
        isStale: true,
        reason: `Change event '${partialEvent.eventType}' unresolved for ${daysSinceEvent} days (threshold: ${STALENESS_DAYS.partial_revalidation})`,
        recommendedLevel: 'partial_revalidation',
        daysSinceAssessment: daysSince,
        triggerEventType: partialEvent.eventType,
      };
    }
  }

  // 3. light_refresh — stale after 90 days
  const lightEvent = pending.find(e => e.revalidationLevel === 'light_refresh');
  if (lightEvent) {
    const daysSinceEvent = Math.floor((now - new Date(lightEvent.recordedAt)) / 86_400_000);
    if (daysSinceEvent >= STALENESS_DAYS.light_refresh) {
      return {
        isStale: true,
        reason: `Change event '${lightEvent.eventType}' unresolved for ${daysSinceEvent} days (threshold: ${STALENESS_DAYS.light_refresh})`,
        recommendedLevel: 'light_refresh',
        daysSinceAssessment: daysSince,
        triggerEventType: lightEvent.eventType,
      };
    }
  }

  // 4. Disclosure preference changed
  if (opts.previousDisclosure && opts.previousDisclosure !== profile.disclosurePreference) {
    return {
      isStale: true,
      reason: `Disclosure preference changed: '${opts.previousDisclosure}' → '${profile.disclosurePreference}'`,
      recommendedLevel: 'partial_revalidation',
      daysSinceAssessment: daysSince,
      triggerEventType: null,
    };
  }

  // 5. Time-based — no events but too much time has passed
  if (daysSince >= STALENESS_DAYS.time_based) {
    return {
      isStale: true,
      reason: `Case not reassessed in ${daysSince} days (threshold: ${STALENESS_DAYS.time_based})`,
      recommendedLevel: 'light_refresh',
      daysSinceAssessment: daysSince,
      triggerEventType: null,
    };
  }

  return {
    isStale: false,
    reason: 'Case is current',
    recommendedLevel: 'none',
    daysSinceAssessment: daysSince,
    triggerEventType: null,
  };
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

/**
 * Mark a change event as resolved (revalidation completed for this event).
 * Sets revalidationRequired = false and stamps resolvedAt.
 *
 * @param {string} eventId
 * @param {string} resolvedBy
 * @returns {{ event: object, log: object }}
 * @throws {Error} If event not found
 */
export function resolveChangeEvent(eventId, resolvedBy) {
  const event = getChangeEvent(eventId);
  if (!event) throw new Error(`Change event not found: ${eventId}`);

  const resolved = {
    ...event,
    revalidationRequired: false,
    resolvedAt: new Date().toISOString(),
  };
  saveChangeEvent(resolved);

  const log = createAuditLog({
    entityType: 'change_event',
    entityId: eventId,
    action: 'change_event_resolved',
    changedBy: resolvedBy,
    diff: { resolvedAt: resolved.resolvedAt },
    meaningChanged: false,
    scope: 'local',
    reason: 'Revalidation completed',
  });
  appendAuditLog(log);

  return { event: resolved, log };
}
