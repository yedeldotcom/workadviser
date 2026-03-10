/**
 * Tests — Follow-Up / Change-Event Layer (Step 9)
 * Covers: change event recording, staleness assessment, scheduler, check-in lifecycle.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  recordChangeEvent,
  assessStaleness,
  resolveChangeEvent,
} from '../../src/followup/changeEventDetector.js';
import {
  scheduleInitialFollowUp,
  schedulePeriodicCheckin,
  scheduleEventTriggeredCheckin,
  scheduleRevalidation,
  markCheckinSent,
  markCheckinResponded,
  expirePendingCheckins,
  getDueCheckins,
  runScheduler,
} from '../../src/followup/scheduler.js';
import {
  saveProfile, getProfile, getChangeEventsForUser,
  getCheckinsForUser, getAllAuditLogs, resetStore,
  saveFollowUpCheckin,
} from '../../src/admin/store.js';
import { createUserProfile } from '../../src/core/models/userProfile.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides = {}) {
  const p = createUserProfile({
    userId: 'user-001',
    identityBasics: { firstName: 'שרה', preferredName: null, ageGroup: null, gender: null },
    employmentContext: { employmentStage: 'active_employment', workplaceType: 'office' },
    disclosurePreference: 'partial_contextual',
    ...overrides,
  });
  saveProfile(p);
  return p;
}

/**
 * Build a ChangeEvent-like object with a backdated recordedAt.
 * Used to simulate events that are N days old.
 */
function oldEvent(overrides = {}, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: crypto.randomUUID(),
    userId: 'user-001',
    eventType: 'schedule_change',
    revalidationLevel: 'light_refresh',
    revalidationRequired: true,
    occurredAt: d.toISOString(),
    recordedAt: d.toISOString(),
    notes: null,
    ...overrides,
  };
}

beforeEach(() => resetStore());

// ─── recordChangeEvent ────────────────────────────────────────────────────────

describe('recordChangeEvent', () => {
  test('saves event and returns it with correct revalidationLevel', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'new_boss');
    assert.equal(event.userId, 'user-001');
    assert.equal(event.eventType, 'new_boss');
    assert.equal(event.revalidationLevel, 'partial_revalidation');
    assert.equal(event.revalidationRequired, true);
  });

  test('full_reassessment events: hired, fired, leave, return, resigned, new_role', async () => {
    makeProfile();
    for (const et of ['hired', 'fired', 'leave', 'return', 'resigned', 'new_role']) {
      const { event } = await recordChangeEvent('user-001', et);
      assert.equal(event.revalidationLevel, 'full_reassessment', `${et} should be full_reassessment`);
    }
  });

  test('light_refresh events: schedule_change, hybrid_change, commute_change, team_change', async () => {
    makeProfile();
    for (const et of ['schedule_change', 'hybrid_change', 'commute_change', 'team_change']) {
      const { event } = await recordChangeEvent('user-001', et);
      assert.equal(event.revalidationLevel, 'light_refresh', `${et} should be light_refresh`);
    }
  });

  test('links event ID into profile.changeEventIds', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'promotion');
    const profile = getProfile('user-001');
    assert.ok(profile.changeEventIds.includes(event.id));
  });

  test('stores event in store — retrievable via getChangeEventsForUser', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'team_change');
    const events = getChangeEventsForUser('user-001');
    assert.ok(events.some(e => e.id === event.id));
  });

  test('writes audit log entry', async () => {
    makeProfile();
    const { event, log } = await recordChangeEvent('user-001', 'new_boss', { notes: 'New manager from HQ' });
    assert.equal(log.action, 'change_event_recorded');
    assert.equal(log.entityId, 'user-001');
    assert.ok(log.reason.includes('new_boss'));
  });

  test('throws for unknown eventType', async () => {
    makeProfile();
    await assert.rejects(
      async () => await recordChangeEvent('user-001', 'lottery_win'),
      /Unknown eventType/
    );
  });

  test('throws when profile not found', async () => {
    await assert.rejects(
      async () => await recordChangeEvent('nonexistent', 'hired'),
      /Profile not found/
    );
  });

  test('accepts custom occurredAt and notes', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'relocated', {
      occurredAt: '2025-01-01T00:00:00.000Z',
      notes: 'Moved to Tel Aviv office',
    });
    assert.equal(event.occurredAt, '2025-01-01T00:00:00.000Z');
    assert.equal(event.notes, 'Moved to Tel Aviv office');
  });
});

// ─── resolveChangeEvent ───────────────────────────────────────────────────────

describe('resolveChangeEvent', () => {
  test('marks event revalidationRequired = false', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'promotion');
    const { event: resolved } = await resolveChangeEvent(event.id, 'admin_operator');
    assert.equal(resolved.revalidationRequired, false);
    assert.ok(resolved.resolvedAt);
  });

  test('writes audit log', async () => {
    makeProfile();
    const { event } = await recordChangeEvent('user-001', 'team_change');
    const { log } = await resolveChangeEvent(event.id, 'admin_operator');
    assert.equal(log.action, 'change_event_resolved');
    assert.equal(log.entityId, event.id);
  });

  test('throws for unknown event ID', async () => {
    await assert.rejects(
      async () => await resolveChangeEvent('does-not-exist', 'admin'),
      /Change event not found/
    );
  });
});

// ─── assessStaleness ─────────────────────────────────────────────────────────

describe('assessStaleness', () => {
  test('returns not stale for fresh case with no events', () => {
    const profile = makeProfile();
    const result = assessStaleness(profile, [], {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, false);
    assert.equal(result.recommendedLevel, 'none');
  });

  test('stale immediately for full_reassessment event (hired)', () => {
    const profile = makeProfile();
    const events = [oldEvent({ eventType: 'hired', revalidationLevel: 'full_reassessment' }, 0)];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, true);
    assert.equal(result.recommendedLevel, 'full_reassessment');
    assert.equal(result.triggerEventType, 'hired');
  });

  test('not stale for partial_revalidation event < 30 days old', () => {
    const profile = makeProfile();
    const events = [oldEvent({ eventType: 'promotion', revalidationLevel: 'partial_revalidation' }, 10)];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, false);
  });

  test('stale for partial_revalidation event >= 30 days old', () => {
    const profile = makeProfile();
    const events = [oldEvent({ eventType: 'promotion', revalidationLevel: 'partial_revalidation' }, 31)];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, true);
    assert.equal(result.recommendedLevel, 'partial_revalidation');
    assert.equal(result.triggerEventType, 'promotion');
  });

  test('not stale for light_refresh event < 90 days old', () => {
    const profile = makeProfile();
    const events = [oldEvent({ eventType: 'schedule_change', revalidationLevel: 'light_refresh' }, 45)];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, false);
  });

  test('stale for light_refresh event >= 90 days old', () => {
    const profile = makeProfile();
    const events = [oldEvent({ eventType: 'schedule_change', revalidationLevel: 'light_refresh' }, 91)];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, true);
    assert.equal(result.recommendedLevel, 'light_refresh');
    assert.equal(result.triggerEventType, 'schedule_change');
  });

  test('full_reassessment takes priority over partial_revalidation', () => {
    const profile = makeProfile();
    const events = [
      oldEvent({ eventType: 'promotion', revalidationLevel: 'partial_revalidation' }, 35),
      oldEvent({ eventType: 'fired', revalidationLevel: 'full_reassessment' }, 1),
    ];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.recommendedLevel, 'full_reassessment');
    assert.equal(result.triggerEventType, 'fired');
  });

  test('resolved events (revalidationRequired=false) are not counted', () => {
    const profile = makeProfile();
    const events = [
      oldEvent({ revalidationLevel: 'full_reassessment', revalidationRequired: false }, 0),
    ];
    const result = assessStaleness(profile, events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result.isStale, false);
  });

  test('stale for time-based: > 180 days since last assessment', () => {
    const profile = makeProfile();
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 181);
    const result = assessStaleness(profile, [], {
      lastAssessedAt: longAgo.toISOString(),
    });
    assert.equal(result.isStale, true);
    assert.equal(result.recommendedLevel, 'light_refresh');
    assert.equal(result.triggerEventType, null);
  });

  test('stale for disclosure preference change', () => {
    const profile = makeProfile({ disclosurePreference: 'functional_only' });
    const result = assessStaleness(profile, [], {
      lastAssessedAt: new Date().toISOString(),
      previousDisclosure: 'no_disclosure',
    });
    assert.equal(result.isStale, true);
    assert.equal(result.recommendedLevel, 'partial_revalidation');
    assert.ok(result.reason.includes('Disclosure preference changed'));
  });

  test('daysSinceAssessment is always present', () => {
    const profile = makeProfile();
    const result = assessStaleness(profile, []);
    assert.ok(typeof result.daysSinceAssessment === 'number');
  });
});

// ─── Scheduler ────────────────────────────────────────────────────────────────

describe('scheduleInitialFollowUp', () => {
  test('creates pending check-in ~14 days from delivery', async () => {
    makeProfile();
    const now = new Date();
    const { checkin } = await scheduleInitialFollowUp('user-001', { scheduledBy: 'system' });
    assert.equal(checkin.type, 'initial_followup');
    assert.equal(checkin.state, 'pending');
    const scheduled = new Date(checkin.scheduledFor);
    const diffDays = Math.round((scheduled - now) / 86_400_000);
    assert.ok(diffDays >= 13 && diffDays <= 15, `Expected ~14 days, got ${diffDays}`);
  });

  test('message is a non-empty Hebrew string', async () => {
    makeProfile();
    const { checkin } = await scheduleInitialFollowUp('user-001');
    assert.ok(typeof checkin.message === 'string');
    assert.ok(checkin.message.length > 20);
    // Should contain the user's first name (שרה)
    assert.ok(checkin.message.includes('שרה'));
  });

  test('check-in is saved to store', async () => {
    makeProfile();
    const { checkin } = await scheduleInitialFollowUp('user-001');
    const stored = getCheckinsForUser('user-001');
    assert.ok(stored.some(c => c.id === checkin.id));
  });

  test('audit log is written', async () => {
    makeProfile();
    const { log } = await scheduleInitialFollowUp('user-001');
    assert.equal(log.action, 'followup_scheduled');
    assert.ok(log.diff.type === 'initial_followup');
  });
});

describe('schedulePeriodicCheckin', () => {
  test('cadence matches employment stage (active_employment = 30 days)', async () => {
    makeProfile({ employmentContext: { employmentStage: 'active_employment' } });
    const { checkin } = await schedulePeriodicCheckin('user-001');
    const diffDays = Math.round(
      (new Date(checkin.scheduledFor) - new Date()) / 86_400_000
    );
    assert.ok(diffDays >= 29 && diffDays <= 31, `Expected ~30 days, got ${diffDays}`);
  });

  test('cadence matches job_seeking stage (14 days)', async () => {
    makeProfile({ employmentContext: { employmentStage: 'job_seeking' } });
    const { checkin } = await schedulePeriodicCheckin('user-001');
    const diffDays = Math.round(
      (new Date(checkin.scheduledFor) - new Date()) / 86_400_000
    );
    assert.ok(diffDays >= 13 && diffDays <= 15, `Expected ~14 days, got ${diffDays}`);
  });
});

describe('scheduleEventTriggeredCheckin', () => {
  test('creates event-triggered check-in ~3 days out', async () => {
    makeProfile();
    const { checkin } = await scheduleEventTriggeredCheckin('user-001', 'new_boss', 'evt-001');
    assert.equal(checkin.type, 'event_triggered');
    assert.equal(checkin.triggerEventType, 'new_boss');
    assert.equal(checkin.triggerEventId, 'evt-001');
    const diffDays = Math.round(
      (new Date(checkin.scheduledFor) - new Date()) / 86_400_000
    );
    assert.ok(diffDays >= 2 && diffDays <= 4, `Expected ~3 days, got ${diffDays}`);
  });

  test('message references the event type in Hebrew', async () => {
    makeProfile();
    const { checkin } = await scheduleEventTriggeredCheckin('user-001', 'new_boss', 'evt-001');
    assert.ok(checkin.message.includes('מנהל'));
  });
});

describe('scheduleRevalidation', () => {
  test('scheduled immediately (now)', async () => {
    makeProfile();
    const before = new Date();
    const { checkin } = await scheduleRevalidation('user-001');
    const after = new Date();
    const scheduled = new Date(checkin.scheduledFor);
    assert.ok(scheduled >= before && scheduled <= after);
  });

  test('message asks user if they want to refresh', async () => {
    makeProfile();
    const { checkin } = await scheduleRevalidation('user-001');
    assert.ok(checkin.message.includes('רענן'));
  });
});

// ─── Check-in state transitions ───────────────────────────────────────────────

describe('markCheckinSent / markCheckinResponded', () => {
  test('markCheckinSent transitions to sent and stamps sentAt', async () => {
    makeProfile();
    const { checkin } = await scheduleInitialFollowUp('user-001');
    const updated = await markCheckinSent(checkin.id);
    assert.equal(updated.state, 'sent');
    assert.ok(updated.sentAt);
  });

  test('markCheckinResponded transitions to responded and stamps respondedAt', async () => {
    makeProfile();
    const { checkin } = await scheduleInitialFollowUp('user-001');
    await markCheckinSent(checkin.id);
    const responded = await markCheckinResponded(checkin.id);
    assert.equal(responded.state, 'responded');
    assert.ok(responded.respondedAt);
  });

  test('throws for unknown checkinId', async () => {
    await assert.rejects(async () => await markCheckinSent('bad-id'), /Check-in not found/);
    await assert.rejects(async () => await markCheckinResponded('bad-id'), /Check-in not found/);
  });
});

// ─── getDueCheckins ───────────────────────────────────────────────────────────

describe('getDueCheckins', () => {
  test('returns empty when no check-ins are due', async () => {
    makeProfile();
    await scheduleInitialFollowUp('user-001'); // 14 days out
    assert.deepEqual(await getDueCheckins('user-001'), []);
  });

  test('returns only pending check-ins whose scheduledFor is now or past', async () => {
    makeProfile();
    // Insert a past-due check-in directly
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const dueCheckin = {
      id: crypto.randomUUID(),
      userId: 'user-001',
      type: 'revalidation',
      state: 'pending',
      scheduledFor: pastDate.toISOString(),
      sentAt: null,
      respondedAt: null,
      message: 'Overdue',
      triggerEventType: null,
      triggerEventId: null,
      createdAt: pastDate.toISOString(),
    };
    saveFollowUpCheckin(dueCheckin);

    const due = await getDueCheckins('user-001');
    assert.ok(due.some(c => c.id === dueCheckin.id));
    for (const c of due) {
      assert.equal(c.state, 'pending');
      assert.ok(new Date(c.scheduledFor) <= new Date());
    }
  });
});

// ─── expirePendingCheckins ────────────────────────────────────────────────────

describe('expirePendingCheckins', () => {
  test('returns empty array when all check-ins are in the future', async () => {
    makeProfile();
    await scheduleInitialFollowUp('user-001'); // 14 days out — not expired
    const expired = await expirePendingCheckins('user-001');
    assert.deepEqual(expired, []);
  });

  test('expires check-ins whose scheduledFor is in the past', async () => {
    makeProfile();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const staleCheckin = {
      id: crypto.randomUUID(),
      userId: 'user-001',
      type: 'periodic_checkin',
      state: 'pending',
      scheduledFor: pastDate.toISOString(),
      sentAt: null,
      respondedAt: null,
      message: 'Old check-in',
      triggerEventType: null,
      triggerEventId: null,
      createdAt: pastDate.toISOString(),
    };
    saveFollowUpCheckin(staleCheckin);
    const expired = await expirePendingCheckins('user-001');
    assert.ok(expired.includes(staleCheckin.id));
    const stored = getCheckinsForUser('user-001').find(c => c.id === staleCheckin.id);
    assert.equal(stored.state, 'expired');
  });
});

// ─── runScheduler ─────────────────────────────────────────────────────────────

describe('runScheduler', () => {
  test('returns null for fresh case with no events', async () => {
    const profile = makeProfile();
    const result = await runScheduler('user-001', [], {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result, null);
  });

  test('schedules event-triggered check-in for full_reassessment event', async () => {
    makeProfile();
    const events = [
      oldEvent({ eventType: 'hired', revalidationLevel: 'full_reassessment', id: 'evt-x' }, 0),
    ];
    const result = await runScheduler('user-001', events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.ok(result !== null);
    assert.equal(result.checkin.type, 'event_triggered');
  });

  test('schedules revalidation for time-based staleness', async () => {
    const profile = makeProfile();
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 200);
    const result = await runScheduler('user-001', [], {
      lastAssessedAt: longAgo.toISOString(),
    });
    assert.ok(result !== null);
    assert.equal(result.checkin.type, 'revalidation');
  });

  test('returns null if a pending check-in already exists', async () => {
    makeProfile();
    await scheduleInitialFollowUp('user-001'); // creates a pending check-in
    const events = [oldEvent({ revalidationLevel: 'full_reassessment' }, 0)];
    const result = await runScheduler('user-001', events, {
      lastAssessedAt: new Date().toISOString(),
    });
    assert.equal(result, null); // already pending — skip
  });
});
