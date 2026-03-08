/**
 * Follow-Up Scheduler — FPP §5.7
 *
 * Manages cadence-based check-in scheduling for active cases.
 * Follow-ups are triggered by two mechanisms:
 *
 *   1. Cadence-based — time since last contact, configurable per employment stage
 *   2. Event-based   — a ChangeEvent with revalidationRequired = true exists
 *
 * Check-in types:
 *   - 'initial_followup'  — 2 weeks after report delivery
 *   - 'periodic_checkin'  — recurring (30/60/90 days depending on stage)
 *   - 'event_triggered'   — triggered by a ChangeEvent
 *   - 'revalidation'      — triggered by staleness assessment
 *
 * Check-in states: pending → sent → responded → expired → cancelled
 *
 * WhatsApp message templates are in Hebrew, per FPP §7.
 * The scheduler does NOT send messages — it schedules them.
 * Actual delivery is the responsibility of the WhatsApp layer.
 */

import { createAuditLog } from '../core/models/auditLog.js';
import {
  getProfile, saveProfile, appendAuditLog,
  saveFollowUpCheckin, getFollowUpCheckin, getCheckinsForUser,
} from '../admin/base44Store.js';
import { assessStaleness } from './changeEventDetector.js';

// ─── Cadence configuration ────────────────────────────────────────────────────

/**
 * Days between periodic check-ins per employment stage.
 * @type {Record<string, number>}
 */
const CHECKIN_CADENCE_DAYS = {
  active_employment:    30,
  job_seeking:          14,
  on_leave:             60,
  return_from_leave:    21,
  new_job_transition:   14,
  post_termination:     30,
  default:              30,
};

/** Initial follow-up delay in days (after first report delivery). */
const INITIAL_FOLLOWUP_DAYS = 14;

// ─── Hebrew message templates ─────────────────────────────────────────────────

/**
 * WhatsApp follow-up message templates (Hebrew).
 * Each returns a ready-to-send string for the given context.
 */
const TEMPLATES = {
  /**
   * Initial follow-up — 2 weeks after report delivery.
   * @param {string | null} firstName
   * @returns {string}
   */
  initial_followup(firstName) {
    const name = firstName ? `${firstName}` : 'שלום';
    return `${name}, רציתי לבדוק איך הולך לך מאז שקיבלת את הדוח שלנו. יש שינויים בסביבת העבודה? משהו שרצית לשאול? אנחנו כאן. 🤝`;
  },

  /**
   * Periodic check-in — recurring contact.
   * @param {string | null} firstName
   * @returns {string}
   */
  periodic_checkin(firstName) {
    const name = firstName ? `${firstName}` : 'שלום';
    return `${name}, עבר זמן מה מאז שדיברנו. רצינו לבדוק — האם המצב בעבודה השתנה? יש משהו חדש שכדאי לדעת? `;
  },

  /**
   * Event-triggered follow-up — based on a recorded change event.
   * @param {string | null} firstName
   * @param {string} eventType
   * @returns {string}
   */
  event_triggered(firstName, eventType) {
    const name = firstName ? `${firstName}` : 'שלום';
    const eventLabels = {
      hired:           'התחלת עבודה חדשה',
      new_role:        'מעבר לתפקיד חדש',
      promotion:       'קידום',
      new_boss:        'מנהל/ת חדש/ה',
      team_change:     'שינוי בצוות',
      schedule_change: 'שינוי בשעות',
      hybrid_change:   'שינוי בסדר יום היברידי',
      leave:           'יציאה לחופשה',
      return:          'חזרה לעבודה',
      fired:           'סיום עבודה',
      resigned:        'התפטרות',
      relocated:       'שינוי מקום עבודה',
      commute_change:  'שינוי בנסיעה לעבודה',
    };
    const label = eventLabels[eventType] ?? 'שינוי בחיים';
    return `${name}, שמנו לב שדיווחת על ${label}. שינויים כאלו יכולים להשפיע על הצרכים שלך בעבודה. רצינו לשאול — איך עובר עליך? יש משהו שנוכל לעזור בו? `;
  },

  /**
   * Revalidation request — asking user to update their profile.
   * @param {string | null} firstName
   * @returns {string}
   */
  revalidation(firstName) {
    const name = firstName ? `${firstName}` : 'שלום';
    return `${name}, עברה תקופה מאז שמילאת את השאלון שלנו. הצרכים בעבודה יכולים להשתנות עם הזמן. אם תרצה/י, נוכל לרענן את הניתוח ולוודא שההמלצות שלנו עדיין מתאימות לך. האם זה מתאים?`;
  },
};

// ─── Check-in factory ─────────────────────────────────────────────────────────

/**
 * @typedef {'initial_followup' | 'periodic_checkin' | 'event_triggered' | 'revalidation'} CheckinType
 * @typedef {'pending' | 'sent' | 'responded' | 'expired' | 'cancelled'} CheckinState
 *
 * @typedef {Object} FollowUpCheckin
 * @property {string} id
 * @property {string} userId
 * @property {CheckinType} type
 * @property {CheckinState} state
 * @property {string} scheduledFor        - ISO date when check-in should be sent
 * @property {string | null} sentAt
 * @property {string | null} respondedAt
 * @property {string | null} message      - Hebrew message text (rendered at schedule time)
 * @property {string | null} triggerEventType - If event_triggered
 * @property {string | null} triggerEventId
 * @property {string} createdAt
 */

/**
 * Create a new FollowUpCheckin object.
 * @param {Partial<FollowUpCheckin>} fields
 * @returns {FollowUpCheckin}
 */
function createCheckin(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    userId: fields.userId ?? null,
    type: fields.type ?? 'periodic_checkin',
    state: fields.state ?? 'pending',
    scheduledFor: fields.scheduledFor ?? now,
    sentAt: fields.sentAt ?? null,
    respondedAt: fields.respondedAt ?? null,
    message: fields.message ?? null,
    triggerEventType: fields.triggerEventType ?? null,
    triggerEventId: fields.triggerEventId ?? null,
    createdAt: fields.createdAt ?? now,
  };
}

// ─── Scheduler functions ──────────────────────────────────────────────────────

/**
 * Schedule the initial follow-up check-in for a user after first report delivery.
 * Should be called once when a user report is first delivered.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.deliveredAt]  - ISO timestamp of delivery (default: now)
 * @param {string} [opts.scheduledBy]
 * @returns {{ checkin: FollowUpCheckin, log: object }}
 */
export async function scheduleInitialFollowUp(userId, opts = {}) {
  const profile = await getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const deliveredAt = new Date(opts.deliveredAt ?? new Date());
  const scheduledFor = new Date(deliveredAt);
  scheduledFor.setDate(scheduledFor.getDate() + INITIAL_FOLLOWUP_DAYS);

  const firstName = profile.identityBasics?.firstName ?? null;
  const message = TEMPLATES.initial_followup(firstName);

  const checkin = createCheckin({
    userId,
    type: 'initial_followup',
    scheduledFor: scheduledFor.toISOString(),
    message,
  });

  await saveFollowUpCheckin(checkin);

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'followup_scheduled',
    changedBy: opts.scheduledBy ?? 'system',
    diff: { type: 'initial_followup', scheduledFor: checkin.scheduledFor },
    meaningChanged: false,
    scope: 'local',
    reason: `Initial follow-up scheduled ${INITIAL_FOLLOWUP_DAYS} days after delivery`,
  });
  await appendAuditLog(log).catch(console.error);

  return { checkin, log };
}

/**
 * Schedule a periodic check-in based on the user's employment stage cadence.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.fromDate]     - ISO date to calculate from (default: now)
 * @param {string} [opts.scheduledBy]
 * @returns {{ checkin: FollowUpCheckin, log: object }}
 */
export async function schedulePeriodicCheckin(userId, opts = {}) {
  const profile = await getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const stage = profile.employmentContext?.employmentStage ?? 'default';
  const cadenceDays = CHECKIN_CADENCE_DAYS[stage] ?? CHECKIN_CADENCE_DAYS.default;

  const fromDate = new Date(opts.fromDate ?? new Date());
  const scheduledFor = new Date(fromDate);
  scheduledFor.setDate(scheduledFor.getDate() + cadenceDays);

  const firstName = profile.identityBasics?.firstName ?? null;
  const message = TEMPLATES.periodic_checkin(firstName);

  const checkin = createCheckin({
    userId,
    type: 'periodic_checkin',
    scheduledFor: scheduledFor.toISOString(),
    message,
  });

  await saveFollowUpCheckin(checkin);

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'followup_scheduled',
    changedBy: opts.scheduledBy ?? 'system',
    diff: { type: 'periodic_checkin', cadenceDays, stage, scheduledFor: checkin.scheduledFor },
    meaningChanged: false,
    scope: 'local',
    reason: `Periodic check-in scheduled (stage: ${stage}, cadence: ${cadenceDays} days)`,
  });
  await appendAuditLog(log).catch(console.error);

  return { checkin, log };
}

/**
 * Schedule an event-triggered check-in based on a recorded ChangeEvent.
 * Sent soon (3 days) after the event is recorded to acknowledge the change.
 *
 * @param {string} userId
 * @param {string} eventType
 * @param {string} eventId
 * @param {object} [opts]
 * @param {string} [opts.scheduledBy]
 * @returns {{ checkin: FollowUpCheckin, log: object }}
 */
export async function scheduleEventTriggeredCheckin(userId, eventType, eventId, opts = {}) {
  const profile = await getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 3); // 3 days after event

  const firstName = profile.identityBasics?.firstName ?? null;
  const message = TEMPLATES.event_triggered(firstName, eventType);

  const checkin = createCheckin({
    userId,
    type: 'event_triggered',
    scheduledFor: scheduledFor.toISOString(),
    message,
    triggerEventType: eventType,
    triggerEventId: eventId,
  });

  await saveFollowUpCheckin(checkin);

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'followup_scheduled',
    changedBy: opts.scheduledBy ?? 'system',
    diff: { type: 'event_triggered', eventType, eventId, scheduledFor: checkin.scheduledFor },
    meaningChanged: false,
    scope: 'local',
    reason: `Event-triggered check-in scheduled for: ${eventType}`,
  });
  await appendAuditLog(log).catch(console.error);

  return { checkin, log };
}

/**
 * Schedule a revalidation check-in when staleness is detected.
 * Asks the user if they want to refresh their assessment.
 *
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.scheduledBy]
 * @returns {{ checkin: FollowUpCheckin, log: object }}
 */
export async function scheduleRevalidation(userId, opts = {}) {
  const profile = await getProfile(userId);
  if (!profile) throw new Error(`Profile not found for user: ${userId}`);

  const firstName = profile.identityBasics?.firstName ?? null;
  const message = TEMPLATES.revalidation(firstName);

  const checkin = createCheckin({
    userId,
    type: 'revalidation',
    scheduledFor: new Date().toISOString(), // Send as soon as possible
    message,
  });

  await saveFollowUpCheckin(checkin);

  const log = createAuditLog({
    entityType: 'user',
    entityId: userId,
    action: 'followup_scheduled',
    changedBy: opts.scheduledBy ?? 'system',
    diff: { type: 'revalidation' },
    meaningChanged: false,
    scope: 'local',
    reason: 'Revalidation check-in scheduled due to staleness',
  });
  await appendAuditLog(log).catch(console.error);

  return { checkin, log };
}

// ─── Check-in state transitions ───────────────────────────────────────────────

/**
 * Mark a check-in as sent (delivery confirmed by WhatsApp layer).
 * @param {string} checkinId
 * @returns {FollowUpCheckin}
 */
export async function markCheckinSent(checkinId) {
  const checkin = await getFollowUpCheckin(checkinId);
  if (!checkin) throw new Error(`Check-in not found: ${checkinId}`);
  const updated = { ...checkin, state: 'sent', sentAt: new Date().toISOString() };
  await saveFollowUpCheckin(updated);
  return updated;
}

/**
 * Mark a check-in as responded (user replied).
 * @param {string} checkinId
 * @returns {FollowUpCheckin}
 */
export async function markCheckinResponded(checkinId) {
  const checkin = await getFollowUpCheckin(checkinId);
  if (!checkin) throw new Error(`Check-in not found: ${checkinId}`);
  const updated = { ...checkin, state: 'responded', respondedAt: new Date().toISOString() };
  await saveFollowUpCheckin(updated);
  return updated;
}

/**
 * Expire check-ins that have passed their scheduled date without being sent.
 * Returns the list of expired check-in IDs.
 *
 * @param {string} userId
 * @returns {string[]} Expired check-in IDs
 */
export async function expirePendingCheckins(userId) {
  const now = new Date();
  const all = await getCheckinsForUser(userId);
  const checkins = all.filter(c => c.state === 'pending' && new Date(c.scheduledFor) < now);

  return Promise.all(checkins.map(async c => {
    const expired = { ...c, state: 'expired' };
    await saveFollowUpCheckin(expired);
    return c.id;
  }));
}

// ─── Due check-ins query ──────────────────────────────────────────────────────

/**
 * Get all pending check-ins for a user that are due (scheduledFor ≤ now).
 *
 * @param {string} userId
 * @returns {FollowUpCheckin[]}
 */
export async function getDueCheckins(userId) {
  const now = new Date();
  const all = await getCheckinsForUser(userId);
  return all.filter(c => c.state === 'pending' && new Date(c.scheduledFor) <= now);
}

// ─── Smart scheduling — detect staleness and schedule appropriately ────────────

/**
 * Run the full follow-up scheduling logic for a user.
 * Assesses staleness, detects pending events, and schedules the right check-in.
 *
 * Returns null if no check-in is needed right now.
 *
 * @param {string} userId
 * @param {import('./changeEventDetector.js').ChangeEvent[]} changeEvents
 * @param {object} [opts]
 * @param {string} [opts.lastAssessedAt]
 * @param {string} [opts.previousDisclosure]
 * @returns {{ checkin: FollowUpCheckin, log: object } | null}
 */
export async function runScheduler(userId, changeEvents, opts = {}) {
  const profile = await getProfile(userId);
  if (!profile) return null;

  // Check if there's already a pending check-in
  const allCheckins = await getCheckinsForUser(userId);
  const pendingCheckins = allCheckins.filter(c => c.state === 'pending');
  if (pendingCheckins.length > 0) return null; // Already scheduled

  const staleness = assessStaleness(profile, changeEvents, opts);

  if (!staleness.isStale) return null;

  // Choose the right check-in type based on trigger
  if (staleness.triggerEventType) {
    const pendingEvent = changeEvents.find(
      e => e.eventType === staleness.triggerEventType && e.revalidationRequired
    );
    if (pendingEvent) {
      return await scheduleEventTriggeredCheckin(userId, staleness.triggerEventType, pendingEvent.id);
    }
  }

  return await scheduleRevalidation(userId);
}

