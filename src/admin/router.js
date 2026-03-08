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
  getUser, getLead, getStoreCounts,
} from './store.js';
import {
  confirmLead,
  markLeadReadyForExport,
  exportLead,
  archiveLead,
} from '../export/leadExporter.js';

const router = Router();

// Apply identity middleware to all admin routes
router.use(attachAdminIdentity);

// ─── Health ───────────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', role: req.adminRole, store: getStoreCounts() });
});

// ─── Queue endpoints ──────────────────────────────────────────────────────────

router.get('/queues/summary', requireCapability('view_all_cases'), (req, res) => {
  const snapshot = {
    users: getAllUsers(),
    sessions: getAllSessions(),
    reports: getAllReports(),
    leads: getAllLeads(),
  };
  res.json(getQueueSummary(snapshot));
});

router.get('/queues/new-users', requireCapability('view_all_cases'), (req, res) => {
  res.json(getNewUsersQueue(getAllUsers(), getAllSessions()));
});

router.get('/queues/active-cases', requireCapability('view_all_cases'), (req, res) => {
  res.json(getActiveCasesQueue(getAllSessions(), getAllUsers()));
});

router.get('/queues/review-required', requireCapability('view_all_cases'), (req, res) => {
  res.json(getReviewRequiredQueue(getAllReports(), getAllUsers()));
});

router.get('/queues/leads-ready', requireCapability('export_lead'), (req, res) => {
  res.json(getLeadsReadyQueue(getAllLeads()));
});

// ─── Case view ────────────────────────────────────────────────────────────────

router.get('/cases/:caseId',
  requireCaseAccess(getUser),
  (req, res) => {
    const opts = {
      includeRawMessages: can(req.adminRole, 'view_raw_messages'),
      includeVoiceNotes:  can(req.adminRole, 'view_voice_notes'),
    };
    const workspace = buildCaseWorkspace(req.params.caseId, opts);
    if (!workspace) return res.status(404).json({ error: 'Case not found' });
    res.json(workspace);
  }
);

// ─── Case actions ─────────────────────────────────────────────────────────────

router.post('/cases/:caseId/approve-report',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  (req, res) => {
    const { reportId, notes, editSummary } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });

    try {
      const result = approveReport(reportId, req.adminRole, notes ?? null, editSummary ?? null);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/reject-report',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  (req, res) => {
    const { reportId, reason } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });
    if (!reason)   return res.status(400).json({ error: 'reason is required for rejection' });

    try {
      const result = rejectReport(reportId, req.adminRole, reason);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/edit-recommendation',
  requireCaseAccess(getUser),
  requireCapability('edit_recommendation'),
  (req, res) => {
    const { reportId, recommendationId, newText_he, meaningChanged, reason, scope } = req.body ?? {};
    if (!reportId || !recommendationId || !newText_he) {
      return res.status(400).json({ error: 'reportId, recommendationId, and newText_he are required' });
    }

    try {
      const result = editRecommendation(
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
  (req, res) => {
    const { note } = req.body ?? {};
    if (!note) return res.status(400).json({ error: 'note is required' });

    try {
      const result = addCaseNote(req.params.caseId, note, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/mark-followup',
  requireCaseAccess(getUser),
  requireCapability('mark_followup'),
  (req, res) => {
    const { reason, dueAt } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    try {
      const result = markFollowUp(req.params.caseId, { reason, dueAt }, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/cases/:caseId/mark-delivery-ready',
  requireCaseAccess(getUser),
  requireCapability('approve_report'),
  (req, res) => {
    const { reportId } = req.body ?? {};
    if (!reportId) return res.status(400).json({ error: 'reportId is required' });

    try {
      const result = markReportReadyForDelivery(reportId, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

// ─── Lead export endpoints (FPP §6.5) ────────────────────────────────────────

router.get('/leads/:leadId',
  requireCapability('export_lead'),
  (req, res) => {
    const lead = getLead(req.params.leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  }
);

router.post('/leads/:leadId/confirm',
  requireCapability('export_lead'),
  (req, res) => {
    try {
      const result = confirmLead(req.params.leadId, req.adminRole);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

router.post('/leads/:leadId/ready-for-export',
  requireCapability('export_lead'),
  (req, res) => {
    const { consentBasis } = req.body ?? {};
    try {
      const result = markLeadReadyForExport(req.params.leadId, req.adminRole, { consentBasis });
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
  (req, res) => {
    const { reason } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: 'reason is required' });
    try {
      const result = archiveLead(req.params.leadId, req.adminRole, reason);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: err.message });
    }
  }
);

export default router;
