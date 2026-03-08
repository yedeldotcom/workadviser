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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generic upsert: if the entity has an id that already exists, update it.
 * Otherwise create it. Returns the saved entity.
 */
async function upsert(entity, id, newData) {
  try {
    await entity.get(id);
    return entity.update(id, newData);
  } catch {
    return entity.create(newData);
  }
}

/**
 * Safe get: returns null instead of throwing if entity not found.
 */
async function safeGet(entity, id) {
  try {
    return await entity.get(id);
  } catch {
    return null;
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function saveUser(user) {
  const saved = await upsert(db.User, user.id, user);
  return saved;
}

export async function getUser(userId) {
  return safeGet(db.User, userId);
}

export async function getAllUsers() {
  return db.User.list();
}

/**
 * Lookup user by WhatsApp phone number (E.164 format).
 * Replaces the in-memory _phoneIndex Map with a query.
 */
export async function getUserByPhone(phoneNumber) {
  const results = await db.User.filter({ phoneNumber }, null, 1, 0);
  return results[0] ?? null;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function saveProfile(profile) {
  return upsert(db.UserProfile, profile.userId, profile);
}

export async function getProfile(userId) {
  // Profile uses userId as its primary lookup key (not a separate id)
  const results = await db.UserProfile.filter({ userId }, null, 1, 0);
  return results[0] ?? null;
}

export async function getAllProfiles() {
  return db.UserProfile.list();
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session) {
  return upsert(db.InterviewSession, session.id, session);
}

export async function getSession(sessionId) {
  return safeGet(db.InterviewSession, sessionId);
}

export async function getAllSessions() {
  return db.InterviewSession.list();
}

export async function getSessionsForUser(userId) {
  return db.InterviewSession.filter({ userId });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessage(message) {
  return upsert(db.Message, message.id, message);
}

export async function getMessage(messageId) {
  return safeGet(db.Message, messageId);
}

export async function getMessagesForSession(sessionId) {
  return db.Message.filter({ sessionId });
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
  return db.Report.list();
}

export async function getReportsForCase(caseId) {
  return db.Report.filter({ caseId });
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function saveLead(lead) {
  return upsert(db.Lead, lead.id, lead);
}

export async function getLead(leadId) {
  return safeGet(db.Lead, leadId);
}

export async function getAllLeads() {
  return db.Lead.list();
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function saveApproval(approval) {
  return upsert(db.Approval, approval.id, approval);
}

export async function getApproval(approvalId) {
  return safeGet(db.Approval, approvalId);
}

export async function getApprovalsForReport(reportId) {
  return db.Approval.filter({ reportId });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

/** Audit log entries are immutable — always create, never update. */
export async function appendAuditLog(entry) {
  return db.AuditLog.create(entry);
}

export async function getAllAuditLogs() {
  return db.AuditLog.list();
}

export async function getAuditLogForEntity(entityType, entityId) {
  return db.AuditLog.filter({ entityType, entityId });
}

// ─── Pipeline Results ─────────────────────────────────────────────────────────

export async function savePipelineResult(sessionId, result) {
  const record = { sessionId, result };
  const existing = await db.PipelineResult.filter({ sessionId }, null, 1, 0);
  if (existing[0]) {
    return db.PipelineResult.update(existing[0].id, record);
  }
  return db.PipelineResult.create(record);
}

export async function getPipelineResult(sessionId) {
  const results = await db.PipelineResult.filter({ sessionId }, null, 1, 0);
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
  return db.ChangeEvent.list();
}

export async function getChangeEventsForUser(userId) {
  return db.ChangeEvent.filter({ userId });
}

// ─── Follow-Up Check-ins ──────────────────────────────────────────────────────

export async function saveFollowUpCheckin(checkin) {
  return upsert(db.FollowUpCheckin, checkin.id, checkin);
}

export async function getFollowUpCheckin(id) {
  return safeGet(db.FollowUpCheckin, id);
}

export async function getAllFollowUpCheckins() {
  return db.FollowUpCheckin.list();
}

export async function getCheckinsForUser(userId) {
  return db.FollowUpCheckin.filter({ userId });
}

// ─── Knowledge Items ──────────────────────────────────────────────────────────

export async function saveKnowledgeItem(item) {
  return upsert(db.KnowledgeItem, item.id, item);
}

export async function getKnowledgeItem(id) {
  return safeGet(db.KnowledgeItem, id);
}

export async function getAllKnowledgeItems() {
  return db.KnowledgeItem.list();
}

// ─── Recommendation Templates ─────────────────────────────────────────────────

export async function saveRecommendationTemplate(tmpl) {
  return upsert(db.RecommendationTemplate, tmpl.id, tmpl);
}

export async function getRecommendationTemplate(id) {
  return safeGet(db.RecommendationTemplate, id);
}

export async function getAllRecommendationTemplates() {
  return db.RecommendationTemplate.list();
}

// ─── Recommendation Feedback ──────────────────────────────────────────────────

export async function saveFeedback(fb) {
  return upsert(db.RecommendationFeedback, fb.id, fb);
}

export async function getFeedback(id) {
  return safeGet(db.RecommendationFeedback, id);
}

export async function getAllFeedback() {
  return db.RecommendationFeedback.list();
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
    db.User.list(),
    db.InterviewSession.list(),
    db.Report.list(),
    db.Lead.list(),
    db.AuditLog.list(),
  ]);
  return {
    users:     users.length,
    sessions:  sessions.length,
    reports:   reports.length,
    leads:     leads.length,
    auditLogs: auditLogs.length,
  };
}
