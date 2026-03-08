/**
 * Admin Store — in-memory case registry
 *
 * Provides a simple Map-based store for all case data.
 * Designed to be swapped out for a real persistence layer (Postgres, Redis, etc.)
 * without changing the interface used by queues, caseView, and actions.
 *
 * Stored objects are plain JS — no ORM required.
 */

// ─── Store ────────────────────────────────────────────────────────────────────

const _users             = new Map(); // userId → User
const _profiles          = new Map(); // userId → UserProfile
const _sessions          = new Map(); // sessionId → InterviewSession
const _messages          = new Map(); // messageId → Message
const _signals           = new Map(); // signalId → NormalizedSignal
const _reports           = new Map(); // reportId → ReportObject
const _leads             = new Map(); // leadId → LeadObject
const _approvals         = new Map(); // approvalId → ApprovalObject
const _auditLog          = new Map(); // logId → AuditLog
const _pipelineResults       = new Map(); // sessionId → pipelineResult
const _changeEvents          = new Map(); // eventId → ChangeEvent
const _followUpCheckins      = new Map(); // checkinId → FollowUpCheckin
const _knowledgeItems          = new Map(); // itemId → KnowledgeItem
const _recommendationTemplates = new Map(); // templateId → RecommendationTemplate
const _feedback                = new Map(); // feedbackId → RecommendationFeedback
const _phoneIndex              = new Map(); // phoneNumber → userId (lookup index)

// ─── Write ────────────────────────────────────────────────────────────────────
// Each save* function upserts by primary key and returns the saved object.
// appendAuditLog uses entry.id as key (audit entries are immutable once written).

export function saveUser(user) {
  _users.set(user.id, user);
  if (user.phoneNumber) _phoneIndex.set(user.phoneNumber, user.id);
  return user;
}
export function saveProfile(profile)         { _profiles.set(profile.userId, profile); return profile; }
export function saveSession(session)         { _sessions.set(session.id, session); return session; }
export function saveMessage(message)         { _messages.set(message.id, message); return message; }
export function saveSignal(signal)           { _signals.set(signal.id, signal); return signal; }
export function saveReport(report)           { _reports.set(report.id, report); return report; }
export function saveLead(lead)               { _leads.set(lead.id, lead); return lead; }
export function saveApproval(approval)       { _approvals.set(approval.id, approval); return approval; }
export function appendAuditLog(entry)        { _auditLog.set(entry.id, entry); return entry; }
/** @param {string} sessionId @param {object} result */
export function savePipelineResult(sessionId, result) { _pipelineResults.set(sessionId, result); return result; }
export function saveChangeEvent(event)             { _changeEvents.set(event.id, event); return event; }
export function saveFollowUpCheckin(c)             { _followUpCheckins.set(c.id, c); return c; }
export function saveKnowledgeItem(item)            { _knowledgeItems.set(item.id, item); return item; }
export function saveRecommendationTemplate(tmpl)   { _recommendationTemplates.set(tmpl.id, tmpl); return tmpl; }
export function saveFeedback(fb)                   { _feedback.set(fb.id, fb); return fb; }

// ─── Read ─────────────────────────────────────────────────────────────────────
// Each get* function returns the entity or null (never throws for missing IDs).

export function getUser(userId)              { return _users.get(userId) ?? null; }
/** Lookup user by WhatsApp phone number (E.164 format). Returns null if not found. */
export function getUserByPhone(phoneNumber)  { const id = _phoneIndex.get(phoneNumber); return id ? (_users.get(id) ?? null) : null; }
export function getProfile(userId)           { return _profiles.get(userId) ?? null; }
export function getSession(sessionId)        { return _sessions.get(sessionId) ?? null; }
export function getMessage(messageId)        { return _messages.get(messageId) ?? null; }
export function getSignal(signalId)          { return _signals.get(signalId) ?? null; }
export function getReport(reportId)          { return _reports.get(reportId) ?? null; }
export function getLead(leadId)              { return _leads.get(leadId) ?? null; }
export function getApproval(approvalId)      { return _approvals.get(approvalId) ?? null; }
/** @param {string} sessionId @returns {object | null} */
export function getPipelineResult(sessionId) { return _pipelineResults.get(sessionId) ?? null; }
export function getChangeEvent(eventId)              { return _changeEvents.get(eventId) ?? null; }
export function getFollowUpCheckin(id)               { return _followUpCheckins.get(id) ?? null; }
export function getKnowledgeItem(id)                 { return _knowledgeItems.get(id) ?? null; }
export function getRecommendationTemplate(id)        { return _recommendationTemplates.get(id) ?? null; }
export function getFeedback(id)                      { return _feedback.get(id) ?? null; }

// ─── List ─────────────────────────────────────────────────────────────────────
// Each getAll* function returns a snapshot array (safe to mutate).

export function getAllUsers()          { return [..._users.values()]; }
export function getAllProfiles()       { return [..._profiles.values()]; }
export function getAllSessions()       { return [..._sessions.values()]; }
export function getAllReports()        { return [..._reports.values()]; }
export function getAllLeads()          { return [..._leads.values()]; }
export function getAllAuditLogs()      { return [..._auditLog.values()]; }
export function getAllChangeEvents()            { return [..._changeEvents.values()]; }
export function getAllFollowUpCheckins()        { return [..._followUpCheckins.values()]; }
export function getAllKnowledgeItems()          { return [..._knowledgeItems.values()]; }
export function getAllRecommendationTemplates() { return [..._recommendationTemplates.values()]; }
export function getAllFeedback()                { return [..._feedback.values()]; }

/** Sessions for a specific user */
export function getSessionsForUser(userId) {
  return getAllSessions().filter(s => s.userId === userId);
}

/** Reports for a specific case (UserProfile.id) */
export function getReportsForCase(caseId) {
  return getAllReports().filter(r => r.caseId === caseId);
}

/** All approvals for a report */
export function getApprovalsForReport(reportId) {
  return [..._approvals.values()].filter(a => a.reportId === reportId);
}

/** Audit log for a specific entity */
export function getAuditLogForEntity(entityType, entityId) {
  return getAllAuditLogs().filter(l => l.entityType === entityType && l.entityId === entityId);
}

/** All change events for a specific user */
export function getChangeEventsForUser(userId) {
  return getAllChangeEvents().filter(e => e.userId === userId);
}

/** All check-ins for a specific user */
export function getCheckinsForUser(userId) {
  return getAllFollowUpCheckins().filter(c => c.userId === userId);
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Reset all stores — use in tests only */
export function resetStore() {
  _users.clear();
  _profiles.clear();
  _sessions.clear();
  _messages.clear();
  _signals.clear();
  _reports.clear();
  _leads.clear();
  _approvals.clear();
  _auditLog.clear();
  _pipelineResults.clear();
  _changeEvents.clear();
  _followUpCheckins.clear();
  _knowledgeItems.clear();
  _recommendationTemplates.clear();
  _feedback.clear();
  _phoneIndex.clear();
}

/** Store statistics — useful for health check endpoint */
export function getStoreCounts() {
  return {
    users:     _users.size,
    sessions:  _sessions.size,
    reports:   _reports.size,
    leads:     _leads.size,
    auditLogs: _auditLog.size,
  };
}
