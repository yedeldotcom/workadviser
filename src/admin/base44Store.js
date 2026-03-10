/**
 * Base44 Store — persistent backend replacing the in-memory store.
 *
 * Implements the same interface as store.js but all functions are async.
 * Data is stored in Base44 entities and survives server restarts.
 *
 * When BASE44_APP_ID is not set (test environments, local dev without credentials),
 * all functions automatically delegate to the in-memory store.js implementation.
 * This means tests never need to mock Base44 calls.
 *
 * Entity mapping:
 *   User                  ← _users
 *   UserProfile           ← _profiles
 *   InterviewSession      ← _sessions
 *   Message               ← _messages
 *   NormalizedSignal      ← _signals
 *   Report                ← _reports
 *   Lead                  ← _leads
 *   Approval              ← _approvals
 *   AuditLog              ← _auditLog
 *   PipelineResult        ← _pipelineResults
 *   ChangeEvent           ← _changeEvents
 *   FollowUpCheckin       ← _followUpCheckins
 *   KnowledgeItem         ← _knowledgeItems
 *   RecommendationTemplate ← _recommendationTemplates
 *   RecommendationFeedback ← _feedback
 *   (no entity)           ← _phoneIndex (replaced by User.filter query)
 *
 * All entities must be created in the Base44 dashboard before use.
 */

import { db } from './base44Client.js';
import * as mem from './store.js';

// When BASE44_APP_ID is absent, use in-memory store (for tests and local dev).
const USE_IN_MEMORY = !process.env.BASE44_APP_ID;

// ─── In-process fallback cache ─────────────────────────────────────────────────
// Used when Base44 filter queries fail (e.g. misconfigured schema or network issues).
// Keeps user/session lookup working within the lifetime of a single server process.
const _userByPhone  = new Map(); // phoneNumber → User
const _sessionById  = new Map(); // sessionId  → InterviewSession
const _sessionsByUserId = new Map(); // userId → sessionId[]

// In-memory content config store (used when USE_IN_MEMORY is true).
const _contentConfig = new Map(); // configKey → config object

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generic upsert: if the entity has an id that already exists, update it.
 * Otherwise create it. Returns the saved entity.
 */
async function upsert(entity, id, newData) {
  let exists = false;
  try {
    await entity.get(id);
    exists = true;
  } catch {
    // Not found — will create
  }

  try {
    const result = exists
      ? await entity.update(id, newData)
      : await entity.create(newData);
    const eName = entity.$name ?? '?';
    console.log(`[base44Store] upsert ok — ${exists ? 'updated' : 'created'} ${eName} id=${id}, phoneNumber=${newData.phoneNumber ?? '–'}, state=${newData.state ?? '–'}`);
    return result;
  } catch (err) {
    const eName = entity.$name ?? '?';
    console.error(`[base44Store] upsert failed — ${exists ? 'update' : 'create'} ${eName} id=${id}:`, err?.message ?? err);
    throw err;
  }
}

/**
 * Safe get: returns null instead of throwing if entity not found.
 */
async function safeGet(entity, id) {
  try {
    return await entity.get(id);
  } catch (err) {
    console.error(`[base44Store] get failed:`, err?.message ?? err);
    return null;
  }
}

/**
 * Safe list: returns [] instead of throwing if Base44 API fails.
 * Logs the error so it appears in Railway deploy logs.
 * @param {{ list: Function }} entity - Base44 entity handler (from db proxy)
 * @returns {Promise<Array>}
 */
async function safeList(entity) {
  try {
    return await entity.list();
  } catch (err) {
    console.error(`[base44Store] list failed:`, err?.message ?? err);
    return [];
  }
}

/**
 * Safe filter: always returns an array.
 * Normalises common Base44 envelope shapes: plain array, {data:[...]}, {items:[...]}, {results:[...]}.
 * Logs both the raw response and any errors so Railway logs show exactly what comes back.
 * @param {{ filter: Function }} entity - Base44 entity handler (from db proxy)
 * @param {...any} args - Arguments forwarded to entity.filter() (query, sort, limit, skip)
 * @returns {Promise<Array>}
 */
async function safeFilter(entity, ...args) {
  try {
    const raw = await entity.filter(...args);
    // Normalise to array
    let arr;
    if (Array.isArray(raw))          arr = raw;
    else if (Array.isArray(raw?.data))    arr = raw.data;
    else if (Array.isArray(raw?.items))   arr = raw.items;
    else if (Array.isArray(raw?.results)) arr = raw.results;
    else                              arr = [];
    console.log(`[base44Store] filter ok — returned ${arr.length} record(s), raw type: ${Array.isArray(raw) ? 'array' : typeof raw}`);
    return arr;
  } catch (err) {
    console.error(`[base44Store] filter failed:`, err?.message ?? err);
    return [];
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Base44 User is a platform entity: only email and full_name are top-level.
 * All custom fields (phoneNumber, channel, etc.) must go inside the `data` envelope.
 * Direct REST updates to User are blocked by the platform; we only create.
 */
export async function saveUser(user) {
  if (USE_IN_MEMORY) return mem.saveUser(user);
  const phone = user.phoneNumber ?? user.id;
  const payload = {
    id:        user.id,
    email:     user.email     ?? `wa_${phone.replace(/[^a-z0-9]/gi, '_')}@workadviser.local`,
    full_name: user.full_name ?? phone,
    data: {
      phoneNumber:   user.phoneNumber   ?? null,
      channel:       user.channel       ?? 'whatsapp',
      consentState:  user.consentState  ?? 'pending',
      partnerSource: user.partnerSource ?? null,
    },
  };
  try {
    await db.User.create(payload);
    console.log(`[base44Store] User created id=${user.id} phoneNumber=${user.phoneNumber ?? '–'}`);
  } catch (err) {
    // 409 / duplicate = user already exists; that's fine for our create-only pattern
    if (err?.status === 409 || /already exists|duplicate/i.test(err?.message ?? '')) {
      console.log(`[base44Store] User already exists id=${user.id} — skipping create`);
    } else {
      console.error(`[base44Store] User create failed id=${user.id}:`, err?.message ?? err);
      // Don't re-throw — in-memory cache below will keep the session alive
    }
  }
  if (user.phoneNumber) _userByPhone.set(user.phoneNumber, user);
}

/**
 * Flatten a raw Base44 User record (with nested `data`) into a plain user object.
 */
function normalizeUser(raw) {
  return { ...raw.data, id: raw.id, email: raw.email, full_name: raw.full_name };
}

export async function getUser(userId) {
  if (USE_IN_MEMORY) return mem.getUser(userId);
  const raw = await safeGet(db.User, userId);
  return raw ? normalizeUser(raw) : null;
}

export async function getAllUsers() {
  if (USE_IN_MEMORY) return mem.getAllUsers();
  const raws = await safeList(db.User);
  return raws.map(normalizeUser);
}

/**
 * Lookup user by WhatsApp phone number (E.164 format).
 * Checks in-process cache first (populated on create).
 * On cache miss, lists all User records and scans data.phoneNumber (pilot-scale only).
 */
export async function getUserByPhone(phoneNumber) {
  if (USE_IN_MEMORY) return mem.getUserByPhone(phoneNumber);
  if (_userByPhone.has(phoneNumber)) return _userByPhone.get(phoneNumber);

  // Rebuild cache from DB (handles server restarts)
  const raws = await safeList(db.User);
  for (const raw of raws) {
    const p = raw.data?.phoneNumber;
    if (p) _userByPhone.set(p, normalizeUser(raw));
  }
  console.log(`[base44Store] getUserByPhone rebuilt cache from ${raws.length} DB record(s)`);
  return _userByPhone.get(phoneNumber) ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function saveProfile(profile) {
  if (USE_IN_MEMORY) return mem.saveProfile(profile);
  return upsert(db.UserProfile, profile.userId, profile);
}

export async function getProfile(userId) {
  if (USE_IN_MEMORY) return mem.getProfile(userId);
  // Profile uses userId as its primary lookup key (not a separate id)
  const results = await safeFilter(db.UserProfile, { userId }, null, 1, 0);
  return results[0] ?? null;
}

export async function getAllProfiles() {
  if (USE_IN_MEMORY) return mem.getAllProfiles();
  return safeList(db.UserProfile);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session) {
  if (USE_IN_MEMORY) return mem.saveSession(session);
  _sessionById.set(session.id, session);
  const ids = _sessionsByUserId.get(session.userId) ?? [];
  if (!ids.includes(session.id)) {
    _sessionsByUserId.set(session.userId, [...ids, session.id]);
  }
  return upsert(db.InterviewSession, session.id, session);
}

export async function getSession(sessionId) {
  if (USE_IN_MEMORY) return mem.getSession(sessionId);
  return safeGet(db.InterviewSession, sessionId);
}

export async function getAllSessions() {
  if (USE_IN_MEMORY) return mem.getAllSessions();
  return safeList(db.InterviewSession);
}

export async function getSessionsForUser(userId) {
  if (USE_IN_MEMORY) return mem.getSessionsForUser(userId);
  const dbResults = await safeFilter(db.InterviewSession, { userId });
  if (dbResults.length > 0) {
    dbResults.forEach(s => {
      _sessionById.set(s.id, s);
      const ids = _sessionsByUserId.get(s.userId) ?? [];
      if (!ids.includes(s.id)) _sessionsByUserId.set(s.userId, [...ids, s.id]);
    });
    return dbResults;
  }
  // Fallback: reconstruct from in-process cache
  const cachedIds = _sessionsByUserId.get(userId) ?? [];
  return cachedIds.map(id => _sessionById.get(id)).filter(Boolean);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessage(message) {
  if (USE_IN_MEMORY) return mem.saveMessage(message);
  return upsert(db.Message, message.id, message);
}

export async function getMessage(messageId) {
  if (USE_IN_MEMORY) return mem.getMessage(messageId);
  return safeGet(db.Message, messageId);
}

export async function getMessagesForSession(sessionId) {
  if (USE_IN_MEMORY) return mem.getAllMessages().filter(m => m.sessionId === sessionId);
  return safeFilter(db.Message, { sessionId });
}

// ─── Signals ──────────────────────────────────────────────────────────────────

export async function saveSignal(signal) {
  if (USE_IN_MEMORY) return mem.saveSignal(signal);
  return upsert(db.NormalizedSignal, signal.id, signal);
}

export async function getSignal(signalId) {
  if (USE_IN_MEMORY) return mem.getSignal(signalId);
  return safeGet(db.NormalizedSignal, signalId);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function saveReport(report) {
  if (USE_IN_MEMORY) return mem.saveReport(report);
  return upsert(db.Report, report.id, report);
}

export async function getReport(reportId) {
  if (USE_IN_MEMORY) return mem.getReport(reportId);
  return safeGet(db.Report, reportId);
}

export async function getAllReports() {
  if (USE_IN_MEMORY) return mem.getAllReports();
  return safeList(db.Report);
}

export async function getReportsForCase(caseId) {
  if (USE_IN_MEMORY) return mem.getReportsForCase(caseId);
  return safeFilter(db.Report, { caseId });
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function saveLead(lead) {
  if (USE_IN_MEMORY) return mem.saveLead(lead);
  return upsert(db.Lead, lead.id, lead);
}

export async function getLead(leadId) {
  if (USE_IN_MEMORY) return mem.getLead(leadId);
  return safeGet(db.Lead, leadId);
}

export async function getAllLeads() {
  if (USE_IN_MEMORY) return mem.getAllLeads();
  return safeList(db.Lead);
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function saveApproval(approval) {
  if (USE_IN_MEMORY) return mem.saveApproval(approval);
  return upsert(db.Approval, approval.id, approval);
}

export async function getApproval(approvalId) {
  if (USE_IN_MEMORY) return mem.getApproval(approvalId);
  return safeGet(db.Approval, approvalId);
}

export async function getApprovalsForReport(reportId) {
  if (USE_IN_MEMORY) return mem.getApprovalsForReport(reportId);
  return safeFilter(db.Approval, { reportId });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

/** Audit log entries are immutable — always create, never update. */
/**
 * Append an audit log entry. Silently drops the write when Base44 is unavailable
 * (e.g. test environments) so callers don't need to guard every audit call.
 * @param {object} entry
 * @returns {Promise<object | null>}
 */
export async function appendAuditLog(entry) {
  if (USE_IN_MEMORY) return mem.appendAuditLog(entry);
  try {
    return await db.AuditLog.create(entry);
  } catch (err) {
    console.error(`[base44Store] appendAuditLog failed:`, err?.message ?? err);
    return null;
  }
}

export async function getAllAuditLogs() {
  if (USE_IN_MEMORY) return mem.getAllAuditLogs();
  return safeList(db.AuditLog);
}

export async function getAuditLogForEntity(entityType, entityId) {
  if (USE_IN_MEMORY) return mem.getAuditLogForEntity(entityType, entityId);
  return safeFilter(db.AuditLog, { entityType, entityId });
}

// ─── Pipeline Results ─────────────────────────────────────────────────────────

export async function savePipelineResult(sessionId, result) {
  if (USE_IN_MEMORY) return mem.savePipelineResult(sessionId, result);
  const record = { sessionId, result };
  const existing = await safeFilter(db.PipelineResult, { sessionId }, null, 1, 0);
  if (existing[0]) {
    return db.PipelineResult.update(existing[0].id, record);
  }
  return db.PipelineResult.create(record);
}

export async function getPipelineResult(sessionId) {
  if (USE_IN_MEMORY) return mem.getPipelineResult(sessionId);
  const results = await safeFilter(db.PipelineResult, { sessionId }, null, 1, 0);
  return results[0]?.result ?? null;
}

// ─── Change Events ────────────────────────────────────────────────────────────

export async function saveChangeEvent(event) {
  if (USE_IN_MEMORY) return mem.saveChangeEvent(event);
  return upsert(db.ChangeEvent, event.id, event);
}

export async function getChangeEvent(eventId) {
  if (USE_IN_MEMORY) return mem.getChangeEvent(eventId);
  return safeGet(db.ChangeEvent, eventId);
}

export async function getAllChangeEvents() {
  if (USE_IN_MEMORY) return mem.getAllChangeEvents();
  return safeList(db.ChangeEvent);
}

export async function getChangeEventsForUser(userId) {
  if (USE_IN_MEMORY) return mem.getChangeEventsForUser(userId);
  return safeFilter(db.ChangeEvent, { userId });
}

// ─── Follow-Up Check-ins ──────────────────────────────────────────────────────

export async function saveFollowUpCheckin(checkin) {
  if (USE_IN_MEMORY) return mem.saveFollowUpCheckin(checkin);
  return upsert(db.FollowUpCheckin, checkin.id, checkin);
}

export async function getFollowUpCheckin(id) {
  if (USE_IN_MEMORY) return mem.getFollowUpCheckin(id);
  return safeGet(db.FollowUpCheckin, id);
}

export async function getAllFollowUpCheckins() {
  if (USE_IN_MEMORY) return mem.getAllFollowUpCheckins();
  return safeList(db.FollowUpCheckin);
}

export async function getCheckinsForUser(userId) {
  if (USE_IN_MEMORY) return mem.getCheckinsForUser(userId);
  return safeFilter(db.FollowUpCheckin, { userId });
}

// ─── Knowledge Items ──────────────────────────────────────────────────────────

export async function saveKnowledgeItem(item) {
  if (USE_IN_MEMORY) return mem.saveKnowledgeItem(item);
  return upsert(db.KnowledgeItem, item.id, item);
}

export async function getKnowledgeItem(id) {
  if (USE_IN_MEMORY) return mem.getKnowledgeItem(id);
  return safeGet(db.KnowledgeItem, id);
}

export async function getAllKnowledgeItems() {
  if (USE_IN_MEMORY) return mem.getAllKnowledgeItems();
  return safeList(db.KnowledgeItem);
}

// ─── Recommendation Templates ─────────────────────────────────────────────────

export async function saveRecommendationTemplate(tmpl) {
  if (USE_IN_MEMORY) return mem.saveRecommendationTemplate(tmpl);
  return upsert(db.RecommendationTemplate, tmpl.id, tmpl);
}

export async function getRecommendationTemplate(id) {
  if (USE_IN_MEMORY) return mem.getRecommendationTemplate(id);
  return safeGet(db.RecommendationTemplate, id);
}

export async function getAllRecommendationTemplates() {
  if (USE_IN_MEMORY) return mem.getAllRecommendationTemplates();
  return safeList(db.RecommendationTemplate);
}

// ─── Recommendation Feedback ──────────────────────────────────────────────────

export async function saveFeedback(fb) {
  if (USE_IN_MEMORY) return mem.saveFeedback(fb);
  return upsert(db.RecommendationFeedback, fb.id, fb);
}

export async function getFeedback(id) {
  if (USE_IN_MEMORY) return mem.getFeedback(id);
  return safeGet(db.RecommendationFeedback, id);
}

export async function getAllFeedback() {
  if (USE_IN_MEMORY) return mem.getAllFeedback();
  return safeList(db.RecommendationFeedback);
}

// ─── Content Config (admin content editor overrides) ──────────────────────────

/**
 * Get a content config record by key.
 * @param {string} configKey - e.g. "onboarding_overrides", "question_overrides"
 * @returns {Promise<object|null>}
 */
export async function getContentConfig(configKey) {
  if (USE_IN_MEMORY) return _contentConfig.get(configKey) ?? null;
  const results = await safeFilter(db.ContentConfig, { configKey }, null, 1, 0);
  return results[0] ?? null;
}

/**
 * Save (upsert) a content config record by key.
 * @param {string} configKey
 * @param {object} data - the payload to store alongside the key
 * @returns {Promise<object>}
 */
export async function saveContentConfig(configKey, data) {
  if (USE_IN_MEMORY) {
    const record = { configKey, ...data };
    _contentConfig.set(configKey, record);
    return record;
  }
  const existing = await safeFilter(db.ContentConfig, { configKey }, null, 1, 0);
  if (existing[0]) {
    return db.ContentConfig.update(existing[0].id, { configKey, ...data });
  }
  return db.ContentConfig.create({ configKey, ...data });
}

// ─── Content seeding (source-of-truth helpers) ──────────────────────────────

/**
 * Ensure the canonical question bank exists in Base44.
 * If `question_bank` already has data, return it.
 * Otherwise seed from the hardcoded bank and return.
 * @param {object[]} hardcodedBank - the QUESTION_BANK array from interviewer.js
 * @returns {Promise<{questions: object[]}>}
 */
// Bump this version whenever the hardcoded QUESTION_BANK changes and you want
// Base44 to auto-reseed (overwriting stale data).  Admin edits made after the
// reseed are preserved; only the seed itself is replaced.
const QUESTION_BANK_VERSION = 2;

export async function ensureQuestionBankSeeded(hardcodedBank) {
  if (USE_IN_MEMORY) {
    return { questions: hardcodedBank.map(q => ({ ...q, enabled: true })), version: QUESTION_BANK_VERSION };
  }
  const existing = await getContentConfig('question_bank');

  if (existing?.questions?.length > 0) {
    if ((existing.version ?? 0) < QUESTION_BANK_VERSION) {
      // Stamp version and merge missing questions WITHOUT overwriting admin edits
      console.log(`[base44Store] question_bank version ${existing.version ?? 0} < ${QUESTION_BANK_VERSION}, stamping version`);
      const storedIds = new Set(existing.questions.map(q => q.id));
      const missing = hardcodedBank.filter(q => !storedIds.has(q.id));
      const questions = missing.length > 0
        ? [...existing.questions, ...missing.map(q => ({ ...q, enabled: true }))]
        : existing.questions;
      if (missing.length > 0) {
        console.log(`[base44Store] Merged ${missing.length} new question(s) into question_bank`);
      }
      await saveContentConfig('question_bank', { questions, version: QUESTION_BANK_VERSION });
      return { questions, version: QUESTION_BANK_VERSION };
    }

    // Check for missing questions (code added new ones since last seed)
    const storedIds = new Set(existing.questions.map(q => q.id));
    const missing = hardcodedBank.filter(q => !storedIds.has(q.id));
    if (missing.length > 0) {
      const questions = [...existing.questions, ...missing.map(q => ({ ...q, enabled: true }))];
      await saveContentConfig('question_bank', { questions, version: QUESTION_BANK_VERSION });
      console.log(`[base44Store] Merged ${missing.length} new question(s) into question_bank`);
      return { questions, version: QUESTION_BANK_VERSION };
    }
    return existing;
  }

  // Only seed from hardcoded when no record exists at all
  const questions = hardcodedBank.map(q => ({ ...q, enabled: true }));
  await saveContentConfig('question_bank', { questions, version: QUESTION_BANK_VERSION });
  console.log(`[base44Store] Seeded question_bank with ${questions.length} questions`);
  return { questions, version: QUESTION_BANK_VERSION };
}

/**
 * Ensure the canonical onboarding messages exist in Base44.
 * @param {object[]} hardcodedMessages - the ONBOARDING_MESSAGES array from onboarding.js
 * @returns {Promise<{messages: object[]}>}
 */
const ONBOARDING_VERSION = 2;

export async function ensureOnboardingSeeded(hardcodedMessages) {
  if (USE_IN_MEMORY) {
    return { messages: hardcodedMessages.map(m => ({ ...m })), version: ONBOARDING_VERSION };
  }
  const existing = await getContentConfig('onboarding_messages');

  if (existing?.messages?.length > 0) {
    if ((existing.version ?? 0) < ONBOARDING_VERSION) {
      // Stamp version on existing record WITHOUT overwriting admin edits
      console.log(`[base44Store] onboarding_messages version ${existing.version ?? 0} < ${ONBOARDING_VERSION}, stamping version`);
      await saveContentConfig('onboarding_messages', { messages: existing.messages, version: ONBOARDING_VERSION });
      return { messages: existing.messages, version: ONBOARDING_VERSION };
    }
    return existing;
  }

  // Only seed from hardcoded when no record exists at all
  const messages = hardcodedMessages.map(m => ({ ...m }));
  await saveContentConfig('onboarding_messages', { messages, version: ONBOARDING_VERSION });
  console.log(`[base44Store] Seeded onboarding_messages with ${messages.length} messages`);
  return { messages, version: ONBOARDING_VERSION };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Reset all entities — for tests only.
 * In in-memory mode, clears the in-memory store.
 * In Base44 mode, deletes every record from every entity.
 */
export async function resetStore() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetStore() can only be called in NODE_ENV=test');
  }

  if (USE_IN_MEMORY) {
    mem.resetStore();
    _userByPhone.clear();
    _sessionById.clear();
    _sessionsByUserId.clear();
    _contentConfig.clear();
    return;
  }

  const entities = [
    db.User, db.UserProfile, db.InterviewSession, db.Message, db.NormalizedSignal,
    db.Report, db.Lead, db.Approval, db.AuditLog, db.PipelineResult, db.ChangeEvent,
    db.FollowUpCheckin, db.KnowledgeItem, db.RecommendationTemplate, db.RecommendationFeedback,
    db.ContentConfig,
  ];

  await Promise.all(entities.map(async entity => {
    const all = await entity.list();
    await Promise.all(all.map(item => entity.delete(item.id)));
  }));
}

// ─── Health check ─────────────────────────────────────────────────────────────

/** Returns entity counts for the health check endpoint. */
export async function getStoreCounts() {
  if (USE_IN_MEMORY) return mem.getStoreCounts();
  const [users, sessions, reports, leads, auditLogs] = await Promise.all([
    safeList(db.User),
    safeList(db.InterviewSession),
    safeList(db.Report),
    safeList(db.Lead),
    safeList(db.AuditLog),
  ]);
  return {
    users:     users.length,
    sessions:  sessions.length,
    reports:   reports.length,
    leads:     leads.length,
    auditLogs: auditLogs.length,
  };
}
