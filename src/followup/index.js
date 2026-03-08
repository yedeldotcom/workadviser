/**
 * Follow-Up Layer — public API (FPP §5.7)
 *
 * Two sub-modules:
 *   changeEventDetector — records life/employment change events, assesses staleness
 *   scheduler           — schedules WhatsApp check-ins based on events and cadence
 */
export {
  recordChangeEvent,
  assessStaleness,
  resolveChangeEvent,
} from './changeEventDetector.js';

export {
  scheduleInitialFollowUp,
  schedulePeriodicCheckin,
  scheduleEventTriggeredCheckin,
  scheduleRevalidation,
  markCheckinSent,
  markCheckinResponded,
  expirePendingCheckins,
  getDueCheckins,
  runScheduler,
} from './scheduler.js';
