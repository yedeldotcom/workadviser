/**
 * Base44 Store — persistent backend replacing the in-memory store.
 *
 * Implements the same interface as store.js but all functions are async.
 * Data is stored in Base44 entities and survives server restarts.
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

// ─── In-process fallback cache ─────────────────────────────────────────────────
// Used when Base44 filter queries fail (e.g. misconfigured schema or network issues).
// Keeps user/session lookup working within the lifetime of a single server process.
const _userByPhone  = new Map(); // phoneNumber → User
const _sessionById  = new Map(); // sessionId  → InterviewSession
const _sessionsByUserId = new Map(); // userId → sessionId[]

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
    console.log(`[base44Store] upsert ok — ${exists ? 'updated' : 'created'} id=${id}, phoneNumber=${newData.phoneNumber ?? '–'}, state=${newData.state ?? '–'}`);
    return result;
  } catch (err) {
    console.error(`[base44Store] upsert failed — ${exists ? 'update' : 'create'} id=${id}:`, err?.message ?? err);
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

export async function saveUser(user) {
  // Base44 User entity requires email and full_name; derive placeholders from phone number.
  const phone = user.phoneNumber ?? user.id;
  const data = {
    ...user,
    email:     user.email     ?? `wa_${phone.replace(/[^a-z0-9]/gi, '_')}@workadviser.local`,
    full_name: user.full_name ?? phone,
  };
  const saved = await upsert(db.User, user.id, data);
  if (user.phoneNumber) _userByPhone.set(user.phoneNumber, user);
  return saved;
}

export async function getUser(userId) {
  return safeGet(db.User, userId);
}

export async function getAllUsers() {
  return safeList(db.User);
}

/**
 * Lookup user by WhatsApp phone number (E.164 format).
 * Falls back to in-process cache when DB filter query fails.
 */
export async function getUserByPhone(phoneNumber) {
  const results = await safeFilter(db.User, { phoneNumber }, null, 1, 0);
  if (results.length > 0) {
    _userByPhone.set(phoneNumber, results[0]);
    return results[0];
  }
  return _userByPhone.get(phoneNumber) ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function saveProfile(profile) {
  return upsert(db.UserProfile, profile.userId, profile);
}

export async function getProfile(userId) {
  // Profile uses userId as its primary lookup key (not a separate id)
  const results = await safeFilter(db.UserProfile, { userId }, null, 1, 0);
  return results[0] ?? null;
}

export async function getAllProfiles() {
  return safeList(db.UserProfile);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session) {
  _sessionById.set(session.id, session);
  const ids = _sessionsByUserId.get(session.userId) ?? [];
  if (!ids.includes(session.id)) {
    _sessionsByUserId.set(session.userId, [...ids, session.id]);
  }
  return upsert(db.InterviewSession, session.id, session);
}

export async function getSession(sessionId) {
  return safeGet(db.InterviewSession, sessionId);
}

export async function getAllSessions() {
  return safeList(db.InterviewSession);
}

export async function getSessionsForUser(userId) {
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
  return upsert(db.Message, message.id, message);
}

export async function getMessage(messageId) {
  return safeGet(db.Message, messageId);
}

export async function getMessagesForSession(sessionId) {
  return safeFilter(db.Message, { sessionId });
}

// ─── Signals ──────────────────────────────────────────────────────────────────

export async function saveSignal(signal) {
  return upsert(db.NormalizedSignal, signal.id, signal);
}

export async function getSignal(signalId) {
  return safeGet(db.NormalizedSignal, signalId);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function saveReport(report) {
  return upsert(db.Report, report.id, report);
}

export async function getReport(reportId) {
  return safeGet(db.Report, reportId);
}

export async function getAllReports() {
  return safeList(db.Report);
}

export async function getReportsForCase(caseId) {
  return safeFilter(db.Report, { caseId });
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function saveLead(lead) {
  return upsert(db.Lead, lead.id, lead);
}

export async function getLead(leadId) {
  return safeGet(db.Lead, leadId);
}

export async function getAllLeads() {
  return safeList(db.Lead);
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function saveApproval(approval) {
  return upsert(db.Approval, approval.id, approval);
}

export async function getApproval(approvalId) {
  return safeGet(db.Approval, approvalId);
}

export async function getApprovalsForReport(reportId) {
  return safeFilter(db.Approval, { reportId });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

/** Audit log entries are immutable — always create, never update. */
export async function appendAuditLog(entry) {
  return db.AuditLog.create(entry);
}

export async function getAllAuditLogs() {
  return safeList(db.AuditLog);
}

export async function getAuditLogForEntity(entityType, entityId) {
  return safeFilter(db.AuditLog, { entityType, entityId });
}

// ─── Pipeline Results ─────────────────────────────────────────────────────────

export async function savePipelineResult(sessionId, result) {
  const record = { sessionId, result };
  const existing = await safeFilter(db.PipelineResult, { sessionId }, null, 1, 0);
  if (existing[0]) {
    return db.PipelineResult.update(existing[0].id, record);
  }
  return db.PipelineResult.create(record);
}

export async function getPipelineResult(sessionId) {
  const results = await safeFilter(db.PipelineResult, { sessionId }, null, 1, 0);
  return results[0]?.result ?? null;
}

// ─── Change Events ────────────────────────────────────────────────────────────

export async function saveChangeEvent(event) {
  return upsert(db.ChangeEvent, event.id, event);
}

export async function getChangeEvent(eventId) {
  return safeGet(db.ChangeEvent, eventId);
}

export async function getAllChangeEvents() {
  return safeList(db.ChangeEvent);
}

export async function getChangeEventsForUser(userId) {
  return safeFilter(db.ChangeEvent, { userId });
}

// ─── Follow-Up Check-ins ──────────────────────────────────────────────────────

export async function saveFollowUpCheckin(checkin) {
  return upsert(db.FollowUpCheckin, checkin.id, checkin);
}

export async function getFollowUpCheckin(id) {
  return safeGet(db.FollowUpCheckin, id);
}

export async function getAllFollowUpCheckins() {
  return safeList(db.FollowUpCheckin);
}

export async function getCheckinsForUser(userId) {
  return safeFilter(db.FollowUpCheckin, { userId });
}

// ─── Knowledge Items ──────────────────────────────────────────────────────────

export async function saveKnowledgeItem(item) {
  return upsert(db.KnowledgeItem, item.id, item);
}

export async function getKnowledgeItem(id) {
  return safeGet(db.KnowledgeItem, id);
}

export async function getAllKnowledgeItems() {
  return safeList(db.KnowledgeItem);
}

// ─── Recommendation Templates ─────────────────────────────────────────────────

export async function saveRecommendationTemplate(tmpl) {
  return upsert(db.RecommendationTemplate, tmpl.id, tmpl);
}

export async function getRecommendationTemplate(id) {
  return safeGet(db.RecommendationTemplate, id);
}

export async function getAllRecommendationTemplates() {
  return safeList(db.RecommendationTemplate);
}

// ─── Recommendation Feedback ──────────────────────────────────────────────────

export async function saveFeedback(fb) {
  return upsert(db.RecommendationFeedback, fb.id, fb);
}

export async function getFeedback(id) {
  return safeGet(db.RecommendationFeedback, id);
}

export async function getAllFeedback() {
  return safeList(db.RecommendationFeedback);
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Reset all entities — for tests only.
 * Deletes every record from every entity in Base44.
 * Safe to use because Base44 test environments are isolated.
 */
export async function resetStore() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetStore() can only be called in NODE_ENV=test');
  }

  const entities = [
    db.User, db.UserProfile, db.InterviewSession, db.Message, db.NormalizedSignal,
    db.Report, db.Lead, db.Approval, db.AuditLog, db.PipelineResult, db.ChangeEvent,
    db.FollowUpCheckin, db.KnowledgeItem, db.RecommendationTemplate, db.RecommendationFeedback,
  ];

  await Promise.all(entities.map(async entity => {
    const all = await entity.list();
    await Promise.all(all.map(item => entity.delete(item.id)));
  }));
}

// ─── Health check ─────────────────────────────────────────────────────────────

/** Returns entity counts for the health check endpoint. */
export async function getStoreCounts() {
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
