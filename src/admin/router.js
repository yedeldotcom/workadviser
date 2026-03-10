/**
 * Admin Router — FPP §6.1
 *
 * All admin API endpoints. Mounted at /admin in server.js.
 *
 * Queue endpoints:
 *   GET  /admin/queues/summary
 *   GET  /admin/queues/new-users
 *   GET  /admin/queues/active-cases
 *   GET  /admin/queues/review-required
 *   GET  /admin/queues/leads-ready
 *
 * Case endpoints:
 *   GET  /admin/cases/:caseId
 *
 * Case action endpoints:
 *   POST /admin/cases/:caseId/approve-report
 *   POST /admin/cases/:caseId/reject-report
 *   POST /admin/cases/:caseId/edit-recommendation
 *   POST /admin/cases/:caseId/add-note
 *   POST /admin/cases/:caseId/mark-followup
 *   POST /admin/cases/:caseId/mark-delivery-ready
 *
 * Lead export endpoints (FPP §6.5):
 *   POST /admin/leads/:leadId/confirm
 *   POST /admin/leads/:leadId/ready-for-export
 *   POST /admin/leads/:leadId/export
 *   POST /admin/leads/:leadId/archive
 *   GET  /admin/leads/:leadId
 *
 * Follow-up endpoints (FPP §5.7):
 *   POST /admin/cases/:caseId/change-event
 *   POST /admin/cases/:caseId/change-event/:eventId/resolve
 *   GET  /admin/cases/:caseId/staleness
 *   POST /admin/cases/:caseId/schedule-followup
 *   GET  /admin/cases/:caseId/due-checkins
 *
 * Content editor endpoints:
 *   GET   /admin/content/onboarding
 *   PUT   /admin/content/onboarding/:id
 *   GET   /admin/content/questions
 *   PUT   /admin/content/questions/:id
 *   POST  /admin/content/questions/reorder
 *   PATCH /admin/content/questions/:id/toggle
 *
 * Chapter flow endpoints:
 *   GET   /admin/content/chapters           - Get chapter config (definitions, prompts, transitions)
 *   PUT   /admin/content/chapters           - Update chapter config
 *   GET   /admin/sessions/chapter-progress  - Get chapter progress for all active sessions
 *
 * System:
 *   GET  /admin/health
 */

import { Router } from 'express';
import {
  attachAdminIdentity,
  requireCapability,
  requireCaseAccess,
  can,
} from './permissions.js';
import {
  getNewUsersQueue,
  getActiveCasesQueue,
  getReviewRequiredQueue,
  getLeadsReadyQueue,
  getQueueSummary,
} from './queues.js';
import { buildCaseWorkspace } from './caseView.js';
import {
  approveReport,
  rejectReport,
  editRecommendation,
  addCaseNote,
  markFollowUp,
  markReportReadyForDelivery,
} from './actions.js';
import {
  getAllUsers, getAllSessions, getAllReports, getAllLeads,
  getUser, getLead, getProfile, getStoreCounts, getChangeEventsForUser,
  getAllRecommendationTemplates, getAllKnowledgeItems, getAllAuditLogs,
} from './base44Store.js';
import {
  confirmLead,
  markLeadReadyForExport,
  exportLead,
  archiveLead,
} from '../export/leadExporter.js';
import {
  recordChangeEvent,
  assessStaleness,
  resolveChangeEvent,
  scheduleInitialFollowUp,
  schedulePeriodicCheckin,
  scheduleEventTriggeredCheckin,
  getDueCheckins,
  runScheduler,
} from '../followup/index.js';
import {
  weakZones, highOutputLowEvidence, repeatedAdminCorrections,
  highConflictAreas, suggestNewSourceTypes, coverageSummary,
} from './gapVisibility.js';
import {
  retrievalFrequency, inclusionFrequency, approvalRate, staleRate,
  templateSummary, promoteKnowledgeItem, createFeedback,
} from './recommendationAnalytics.js';
import { saveFeedback, saveKnowledgeItem, getKnowledgeItem, getContentConfig, saveContentConfig, ensureQuestionBankSeeded, ensureOnboardingSeeded } from './base44Store.js';
import { ONBOARDING_MESSAGES } from '../conversation/onboarding.js';
import { QUESTION_BANK } from '../conversation/interviewer.js';

const router = Router();

// ─── Login (public — no auth required) ───────────────────────────────────────

/**
 * POST /admin/login
 * Three auth modes (checked in order):
 *   1. ADMIN_PASSWORD env var set → password-only auth, returns system_owner token
 *   2. No BASE44_APP_ID → dev mode, returns stub token from role body field
 *   3. BASE44_APP_ID set → delegates to Base44 auth
 */
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body ?? {};

  // Mode 1: simple password auth — set ADMIN_PASSWORD in Railway env vars
  if (process.env.ADMIN_PASSWORD) {
    if (!password) return res.status(400).json({ error: 'password is required' });
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ token: `admin-token:system_owner`, role: 'system_owner' });
  }

  // Mode 2: dev mode — no Base44 configured
  if (!process.env.BASE44_APP_ID) {
    if (!role) return res.status(400).json({ error: 'role is required in dev mode' });
    return res.json({ token: `dev-stub:${role}`, role, dev: true });
  }

  // Mode 3: Base44 auth
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { base44 } = await import('./base44Client.js');
    await base44.auth.loginViaEmailPassword(email, password);
    const token = base44.auth.getToken?.() ?? base44.auth.token;
    const me = await base44.auth.me();
    res.json({ token, role: me?.adminRole ?? me?.role ?? null });
  } catch (err) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Apply identity middleware to all admin routes below this point
router.use(attachAdminIdentity);

// ─── Health ───────────────────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', role: req.adminRole, store: await getStoreCounts() });
});

// ─── Queue endpoints ──────────────────────────────────────────────────────────

router.get('/queues/summary', requireCapability('view_all_cases'), async (req, res) => {
  const [users, sessions, reports, leads] = await Promise.all([
    getAllUsers(), getAllSessions(), getAllReports(), getAllLeads(),
  ]);
  res.json(getQueueSummary({ users, sessions, reports, leads }));
});

router.get('/queues/new-users', requireCapability('view_all_cases'), async (req, res) => {
  const [users, sessions] = await Promise.all([getAllUsers(), getAllSessions()]);
  res.json(getNewUsersQueue(users, sessions));
});

router.get('/queues/active-cases', requireCapability('view_all_cases'), async (req, res) => {
  const [sessions, users] = await Promise.all([getAllSessions(), getAllUsers()]);
  res.json(getActiveCasesQueue(sessions, users));
});

router.get('/queues/review-required', requireCapability('view_all_cases'), async (req, res) => {
  const [reports, users] = await Promise.all([getAllReports(), getAllUsers()]);
  res.json(getReviewRequiredQueue(reports, users));
});

router.get('/queues/leads-ready', requireCapability('export_lead'), async (req, res) => {
  res.json(getLeadsReadyQueue(await getAllLeads()));
});

// ─── Case view ────────────────────────────────────────────────────────────────

router.get('/cases/:caseId',
  requireCaseAccess(getUser),
  async (req, res) => {
    const opts = {
      includeRawMessages: can(req.adminRole, 'view_raw_messages'),
      includeVoiceNotes:  can(req.adminRole, 'view_voice_notes'),
    };
    const workspace = await buildCaseWorkspace(req.params.caseId, opts);
    if (!workspace) return res.status(404).json({ error: 'Case not found' });
    res.json(workspace);
  }
);

// ─── Case actions ─────────────────────────────────────────────────────────────

router.post('/cases/:caseId/approve-report',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  async (req, res) => {
    const { reportId, notes, editSummary } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });

    try {
      const result = await approveReport(reportId, req.adminRole, notes ?? null, editSummary ?? null);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/reject-report',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  async (req, res) => {
    const { reportId, reason } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });
    if (!reason)   return res.status(400).json({ error: 'reason is required for rejection' });

    try {
      const result = await rejectReport(reportId, req.adminRole, reason);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/edit-recommendation',
  requireCaseAccess(getUser),
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { reportId, recommendationId, newText_he, meaningChanged, reason, scope } = req.body ?? {};
    if (!reportId || !recommendationId || !newText_he) {
      return res.status(400).json({ error: 'reportId, recommendationId, and newText_he are required' });
    }

    try {
      const result = await editRecommendation(
        reportId, recommendationId, newText_he,
        req.adminRole,
        { meaningChanged: Boolean(meaningChanged), reason, scope: scope ?? 'local' }
      );
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/add-note',
  requireCaseAccess(getUser),
  requireCapability('add_note'),
  async (req, res) => {
    const { note } = req.body ?? {};
    if (!note) return res.status(400).json({ error: 'note is required' });

    try {
      const result = await addCaseNote(req.params.caseId, note, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/mark-followup',
  requireCaseAccess(getUser),
  requireCapability('mark_followup'),
  async (req, res) => {
    const { reason, dueAt } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    try {
      const result = await markFollowUp(req.params.caseId, { reason, dueAt }, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/mark-delivery-ready',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  async (req, res) => {
    const { reportId } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });

    try {
      const result = await markReportReadyForDelivery(reportId, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

// ─── Lead export endpoints (FPP §6.5) ────────────────────────────────────────

router.get('/leads/:leadId',
  requireCapability('export_lead'),
  async (req, res) => {
    const lead = await getLead(req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  }
);

router.post('/leads/:leadId/confirm',
  requireCapability('export_lead'),
  async (req, res) => {
    try {
      const result = await confirmLead(req.params.leadId, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/leads/:leadId/ready-for-export',
  requireCapability('export_lead'),
  async (req, res) => {
    const { consentBasis } = req.body ?? {};
    try {
      const result = await markLeadReadyForExport(req.params.leadId, req.adminRole, { consentBasis });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/leads/:leadId/export',
  requireCapability('export_lead'),
  async (req, res) => {
    const { target, webhookUrl, consentBasis } = req.body ?? {};
    try {
      const result = await exportLead(req.params.leadId, req.adminRole, {
        target: target ?? 'internal',
        webhookUrl,
        consentBasis,
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/leads/:leadId/archive',
  requireCapability('export_lead'),
  async (req, res) => {
    const { reason } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: 'reason is required' });
    try {
      const result = await archiveLead(req.params.leadId, req.adminRole, reason);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

// ─── Follow-up endpoints (FPP §5.7) ──────────────────────────────────────────

router.post('/cases/:caseId/change-event',
  requireCaseAccess(getUser),
  requireCapability('add_note'),
  async (req, res) => {
    const { eventType, occurredAt, notes } = req.body ?? {};
    if (!eventType) return res.status(400).json({ error: 'eventType is required' });
    try {
      const result = await recordChangeEvent(req.params.caseId, eventType, {
        occurredAt,
        notes,
        recordedBy: req.adminRole,
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/change-event/:eventId/resolve',
  requireCaseAccess(getUser),
  requireCapability('add_note'),
  async (req, res) => {
    try {
      const result = await resolveChangeEvent(req.params.eventId, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.get('/cases/:caseId/staleness',
  requireCaseAccess(getUser),
  async (req, res) => {
    const { lastAssessedAt, previousDisclosure } = req.query;
    const [profile, changeEvents] = await Promise.all([
      getProfile(req.params.caseId),
      getChangeEventsForUser(req.params.caseId),
    ]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const staleness = assessStaleness(profile, changeEvents, { lastAssessedAt, previousDisclosure });
    res.json({ userId: req.params.caseId, changeEventCount: changeEvents.length, staleness });
  }
);

router.post('/cases/:caseId/schedule-followup',
  requireCaseAccess(getUser),
  requireCapability('mark_followup'),
  async (req, res) => {
    const { type, eventType, eventId, fromDate } = req.body ?? {};
    try {
      let result;
      if (type === 'initial') {
        result = await scheduleInitialFollowUp(req.params.caseId, { scheduledBy: req.adminRole });
      } else if (type === 'event' && eventType && eventId) {
        result = await scheduleEventTriggeredCheckin(req.params.caseId, eventType, eventId, { scheduledBy: req.adminRole });
      } else {
        result = await schedulePeriodicCheckin(req.params.caseId, { fromDate, scheduledBy: req.adminRole });
      }
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.get('/cases/:caseId/due-checkins',
  requireCaseAccess(getUser),
  async (req, res) => {
    res.json(await getDueCheckins(req.params.caseId));
  }
);

// ─── Gap Visibility endpoints (FPP §3.6) ─────────────────────────────────────

router.get('/analytics/gaps',
  requireCapability('view_queue'),
  async (req, res) => {
    const [templates, items] = await Promise.all([getAllRecommendationTemplates(), getAllKnowledgeItems()]);
    const zones     = weakZones(templates, items);
    const summary   = coverageSummary(zones);
    const suggestions = suggestNewSourceTypes(zones);
    res.json({ summary, zones, suggestions });
  }
);

router.get('/analytics/gaps/corrections',
  requireCapability('view_queue'),
  async (req, res) => {
    const [templates, auditLogs] = await Promise.all([getAllRecommendationTemplates(), getAllAuditLogs()]);
    res.json({
      highOutputLowEvidence: highOutputLowEvidence(templates),
      repeatedAdminCorrections: repeatedAdminCorrections(templates),
      highConflictAreas: highConflictAreas(templates, auditLogs),
    });
  }
);

// ─── Recommendation Analytics endpoints (FPP §4.9) ───────────────────────────

router.get('/analytics/recommendations',
  requireCapability('view_queue'),
  async (req, res) => {
    const [templates, sessions] = await Promise.all([getAllRecommendationTemplates(), getAllSessions()]);
    const totalCases = sessions.length;
    res.json({
      retrievalFrequency: retrievalFrequency(templates, totalCases),
      inclusionFrequency: inclusionFrequency(templates, totalCases),
      approvalRate: approvalRate(templates),
      staleRate: staleRate(templates),
    });
  }
);

router.get('/analytics/recommendations/summary',
  requireCapability('view_queue'),
  async (req, res) => {
    const [templates, sessions] = await Promise.all([getAllRecommendationTemplates(), getAllSessions()]);
    res.json(templateSummary(templates, sessions.length));
  }
);

router.post('/analytics/recommendations/:templateId/feedback',
  requireCapability('view_queue'),
  async (req, res) => {
    const { feedbackType, polarity, notes, caseId } = req.body ?? {};
    if (!feedbackType || !polarity) {
      return res.status(400).json({ error: 'feedbackType and polarity are required' });
    }
    const fb = createFeedback({
      templateId: req.params.templateId,
      caseId: caseId ?? null,
      feedbackType,
      polarity,
      notes: notes ?? null,
      recordedBy: req.adminRole,
    });
    await saveFeedback(fb);
    res.json(fb);
  }
);

// ─── Knowledge promotion (FPP §3.7) ──────────────────────────────────────────

router.post('/knowledge/:itemId/promote',
  requireCapability('promote_knowledge'),
  async (req, res) => {
    const { scope, sourceCaseIds, notes } = req.body ?? {};
    if (!scope || !Array.isArray(sourceCaseIds) || sourceCaseIds.length === 0) {
      return res.status(400).json({ error: 'scope and sourceCaseIds[] are required' });
    }
    const item = await getKnowledgeItem(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Knowledge item not found' });
    try {
      const result = promoteKnowledgeItem(item, {
        promotedBy: req.adminRole,
        scope,
        sourceCaseIds,
        notes: notes ?? null,
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

// ─── Content editor endpoints ─────────────────────────────────────────────────

// — Onboarding messages (Base44 is source of truth) —

router.get('/content/onboarding',
  requireCapability('view_all_cases'),
  async (req, res) => {
    let config = await getContentConfig('onboarding_messages');
    if (!config?.messages?.length) {
      config = await ensureOnboardingSeeded(ONBOARDING_MESSAGES);
    }
    res.json(config.messages);
  }
);

router.put('/content/onboarding/:id',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { id } = req.params;
    const { text } = req.body ?? {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required and must be a string' });
    }

    let config = await getContentConfig('onboarding_messages');
    if (!config?.messages?.length) {
      config = await ensureOnboardingSeeded(ONBOARDING_MESSAGES);
    }
    const messages = config.messages.map(m => ({ ...m }));
    const msg = messages.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: `Onboarding message "${id}" not found` });
    }
    msg.text = text;
    await saveContentConfig('onboarding_messages', { messages });
    res.json({ id, text });
  }
);

// — Question bank —

// — Question bank (Base44 is source of truth) —

/**
 * Helper: get the canonical question bank from Base44, seeding if needed.
 */
async function _getCanonicalQuestionBank() {
  let config = await getContentConfig('question_bank');
  if (!config?.questions?.length) {
    config = await ensureQuestionBankSeeded(QUESTION_BANK);
  }
  return config.questions;
}

router.get('/content/questions',
  requireCapability('view_all_cases'),
  async (req, res) => {
    const questions = await _getCanonicalQuestionBank();
    res.json(questions);
  }
);

router.put('/content/questions/:id',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { id } = req.params;
    const { prompt, followUp } = req.body ?? {};

    if (!prompt && !followUp) {
      return res.status(400).json({ error: 'At least one of prompt or followUp is required' });
    }

    const questions = (await _getCanonicalQuestionBank()).map(q => ({ ...q }));
    const q = questions.find(q => q.id === id);
    if (!q) {
      return res.status(404).json({ error: `Question "${id}" not found` });
    }
    if (prompt)   q.prompt   = prompt;
    if (followUp) q.followUp = followUp;
    await saveContentConfig('question_bank', { questions });
    res.json({ id, prompt: q.prompt, followUp: q.followUp });
  }
);

router.post('/content/questions/reorder',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { order } = req.body ?? {};

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order must be a non-empty array of question IDs' });
    }

    const questions = await _getCanonicalQuestionBank();
    const orderMap = new Map(order.map((id, i) => [id, i]));
    const reordered = [...questions].sort((a, b) => {
      const ai = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
      const bi = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
      return ai - bi;
    });
    await saveContentConfig('question_bank', { questions: reordered });
    res.json({ order });
  }
);

router.patch('/content/questions/:id/toggle',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body ?? {};

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const questions = (await _getCanonicalQuestionBank()).map(q => ({ ...q }));
    const q = questions.find(q => q.id === id);
    if (!q) {
      return res.status(404).json({ error: `Question "${id}" not found` });
    }
    q.enabled = enabled;
    await saveContentConfig('question_bank', { questions });
    res.json({ id, enabled });
  }
);

router.post('/content/questions/seed',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const questions = QUESTION_BANK.map(q => ({ ...q, enabled: true }));
    await saveContentConfig('question_bank', { questions });
    res.json({ seeded: questions.length, questions });
  }
);

// ─── Chapter flow endpoints ──────────────────────────────────────────────────

/**
 * Default chapter configuration — editable by admin.
 */
const DEFAULT_CHAPTER_CONFIG = {
  chapters: [
    {
      id: 'ch1_intro',
      name_he: 'תיאום ציפיות — מי אני ומה אני עושה',
      name_en: 'Getting to Know You',
      transitionRule: 'Requires employmentStatus + workplaceType + jobRole',
    },
    {
      id: 'ch2_barriers',
      name_he: 'הבנת חסמים ואתגרים',
      name_en: 'Understanding Barriers',
      transitionRule: 'Requires minimum 7 of 13 barriers scored',
    },
    {
      id: 'ch3_recommendations',
      name_he: 'המלצות וסיכום',
      name_en: 'Recommendations & Closing',
      transitionRule: 'User explicitly approves the final report',
    },
  ],
};

router.get('/content/chapters',
  requireCapability('view_all_cases'),
  async (req, res) => {
    const config = await getContentConfig('chapter_config');
    res.json(config ?? DEFAULT_CHAPTER_CONFIG);
  }
);

router.put('/content/chapters',
  requireCapability('edit_recommendation'),
  async (req, res) => {
    const { chapters } = req.body ?? {};
    if (!chapters || !Array.isArray(chapters)) {
      return res.status(400).json({ error: 'chapters array is required' });
    }
    await saveContentConfig('chapter_config', { chapters });
    res.json({ chapters });
  }
);

router.get('/sessions/chapter-progress',
  requireCapability('view_all_cases'),
  async (req, res) => {
    const sessions = await getAllSessions();
    const activeSessions = sessions.filter(s =>
      ['onboarding', 'active', 'paused', 'distress_hold'].includes(s.state)
    );
    const progress = activeSessions.map(s => ({
      sessionId: s.id,
      userId: s.userId,
      state: s.state,
      interviewChapter: s.interviewChapter ?? 'ch1_intro',
      recommendationSubState: s.recommendationSubState ?? null,
      answeredQuestions: (s.answeredQuestionIds ?? []).length,
      detectedBarriers: (s.detectedBarrierIds ?? []).length,
      userProfile: s.userProfile ?? {},
      lastActiveAt: s.lastActiveAt,
    }));
    res.json(progress);
  }
);

export default router;
