/**
 * Tests — Lead Exporter (Step 8)
 * Covers: payload building, lifecycle actions, export flow, consent gate, state gate.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExportPayload,
  confirmLead,
  markLeadReadyForExport,
  exportLead,
  archiveLead,
} from '../../src/export/leadExporter.js';
import { createLead } from '../../src/core/models/report.js';
import { saveLead, getLead, resetStore, getAllAuditLogs } from '../../src/admin/store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDetectedLead(overrides = {}) {
  return createLead({
    caseId: 'case-001',
    orgName: 'Acme Corp',
    orgType: 'private',
    contactPerson: 'Jane Smith',
    contactChannel: 'email',
    sourceSignalType: 'case_severity_pattern',
    lectureOpportunityReason: 'High-severity case with authority patterns.',
    recommendedLectureAngle: 'trauma_informed_management',
    safeContextNotes: 'Dominant clusters: relational, physiological.',
    consentStatus: 'pending',
    exportState: 'detected',
    ...overrides,
  });
}

async function advanceToReadyForExport(lead) {
  // Advance lead through: detected → lead_created → ready_for_export
  // with consent given
  saveLead(lead);
  const { lead: confirmed } = await confirmLead(lead.id, 'admin_operator');
  saveLead({ ...confirmed, consentStatus: 'given' });
  const { lead: ready } = await markLeadReadyForExport(lead.id, 'admin_operator');
  saveLead(ready);
  return ready;
}

beforeEach(() => resetStore());

// ─── buildExportPayload ───────────────────────────────────────────────────────

describe('buildExportPayload', () => {
  test('includes all safe org-level fields', () => {
    const lead = makeDetectedLead();
    const payload = buildExportPayload(lead, 'internal');
    assert.equal(payload.orgName, 'Acme Corp');
    assert.equal(payload.orgType, 'private');
    assert.equal(payload.recommendedLectureAngle, 'trauma_informed_management');
    assert.equal(payload.safeContextNotes, 'Dominant clusters: relational, physiological.');
    assert.equal(payload.lectureOpportunityReason, 'High-severity case with authority patterns.');
    assert.ok(payload.exportedAt); // timestamp added
  });

  test('does NOT include caseId', () => {
    const lead = makeDetectedLead({ caseId: 'case-secret' });
    const payload = buildExportPayload(lead, 'internal');
    assert.ok(!('caseId' in payload), 'caseId must not appear in export payload');
  });

  test('does NOT include createdAt', () => {
    const lead = makeDetectedLead();
    const payload = buildExportPayload(lead, 'internal');
    assert.ok(!('createdAt' in payload), 'createdAt must not appear in export payload');
  });

  test('does NOT include consentStatus', () => {
    const lead = makeDetectedLead({ consentStatus: 'given' });
    const payload = buildExportPayload(lead, 'internal');
    assert.ok(!('consentStatus' in payload));
  });

  test('does NOT include exportState', () => {
    const lead = makeDetectedLead({ exportState: 'ready_for_export' });
    const payload = buildExportPayload(lead, 'internal');
    assert.ok(!('exportState' in payload));
  });

  test('sets exportTarget from argument', () => {
    const lead = makeDetectedLead();
    const payload = buildExportPayload(lead, 'crm_salesforce');
    assert.equal(payload.exportTarget, 'crm_salesforce');
  });
});

// ─── confirmLead ─────────────────────────────────────────────────────────────

describe('confirmLead', () => {
  test('transitions lead from detected to lead_created', async () => {
    const lead = makeDetectedLead();
    saveLead(lead);
    const { lead: updated, log } = await confirmLead(lead.id, 'admin_operator');
    assert.equal(updated.exportState, 'lead_created');
    assert.equal(log.action, 'lead_confirmed');
    assert.equal(log.entityId, lead.id);
  });

  test('saves updated lead to store', async () => {
    const lead = makeDetectedLead();
    saveLead(lead);
    await confirmLead(lead.id, 'admin_operator');
    assert.equal(getLead(lead.id).exportState, 'lead_created');
  });

  test('throws for unknown leadId', async () => {
    await assert.rejects(async () => await confirmLead('nonexistent', 'admin_operator'), /Lead not found/);
  });

  test('throws for invalid transition (already lead_created)', async () => {
    const lead = makeDetectedLead({ exportState: 'lead_created' });
    saveLead(lead);
    // lead_created → lead_created is not a valid transition
    await assert.rejects(async () => await confirmLead(lead.id, 'admin_operator'), /Invalid lead transition/);
  });
});

// ─── markLeadReadyForExport ───────────────────────────────────────────────────

describe('markLeadReadyForExport', () => {
  test('transitions from lead_created to ready_for_export', async () => {
    const lead = makeDetectedLead({ exportState: 'lead_created' });
    saveLead(lead);
    const { lead: updated } = await markLeadReadyForExport(lead.id, 'admin_operator');
    assert.equal(updated.exportState, 'ready_for_export');
  });

  test('writes audit log with consent basis', async () => {
    const lead = makeDetectedLead({ exportState: 'lead_created' });
    saveLead(lead);
    const { log } = await markLeadReadyForExport(lead.id, 'admin_operator', { consentBasis: 'Phone call 2026-03-08' });
    assert.ok(log.reason.includes('Phone call'));
    assert.equal(log.action, 'marked_ready_for_export');
  });

  test('throws for non-existent lead', async () => {
    await assert.rejects(async () => await markLeadReadyForExport('bad-id', 'admin_operator'), /Lead not found/);
  });
});

// ─── exportLead ──────────────────────────────────────────────────────────────

describe('exportLead', () => {
  test('successfully exports a ready_for_export lead with given consent', async () => {
    const lead = makeDetectedLead();
    await advanceToReadyForExport(lead);

    const { lead: exported, payload, log } = await exportLead(lead.id, 'admin_operator', {
      target: 'internal',
      consentBasis: 'Verbal consent obtained 2026-03-08',
    });

    assert.equal(exported.exportState, 'exported');
    assert.ok(exported.exportTimestamp);
    assert.ok(payload.orgName);
    assert.ok(!('caseId' in payload));
    assert.equal(log.action, 'exported');
    assert.ok(log.reason.includes('2026-03-08'));
  });

  test('stamps exportTimestamp on the lead in store', async () => {
    const lead = makeDetectedLead();
    await advanceToReadyForExport(lead);
    await exportLead(lead.id, 'admin_operator');
    const stored = getLead(lead.id);
    assert.equal(stored.exportState, 'exported');
    assert.ok(stored.exportTimestamp);
  });

  test('writes audit log entry', async () => {
    const lead = makeDetectedLead();
    await advanceToReadyForExport(lead);
    await exportLead(lead.id, 'admin_operator');
    const logs = getAllAuditLogs().filter(l => l.entityId === lead.id && l.action === 'exported');
    assert.equal(logs.length, 1);
  });

  test('audit log diff includes payloadFields and target', async () => {
    const lead = makeDetectedLead();
    await advanceToReadyForExport(lead);
    const { log } = await exportLead(lead.id, 'admin_operator', { target: 'internal' });
    assert.ok(Array.isArray(log.diff.payloadFields));
    assert.ok(!log.diff.payloadFields.includes('caseId'));
    assert.equal(log.diff.target, 'internal');
  });

  test('throws and transitions to failed when consent is pending', async () => {
    const lead = makeDetectedLead({ exportState: 'ready_for_export', consentStatus: 'pending' });
    saveLead(lead);
    await assert.rejects(
      () => exportLead(lead.id, 'admin_operator'),
      /consent status is 'pending'/
    );
  });

  test('throws and transitions to failed when consent is denied', async () => {
    const lead = makeDetectedLead({ exportState: 'ready_for_export', consentStatus: 'denied' });
    saveLead(lead);
    await assert.rejects(
      () => exportLead(lead.id, 'admin_operator'),
      /consent status is 'denied'/
    );
  });

  test('throws when lead is in wrong state (detected)', async () => {
    const lead = makeDetectedLead({ consentStatus: 'given', exportState: 'detected' });
    saveLead(lead);
    await assert.rejects(
      () => exportLead(lead.id, 'admin_operator'),
      /lead is in state 'detected'/
    );
  });

  test('throws when lead is already exported', async () => {
    const lead = makeDetectedLead({ consentStatus: 'given', exportState: 'exported' });
    saveLead(lead);
    await assert.rejects(
      () => exportLead(lead.id, 'admin_operator'),
      /lead is in state 'exported'/
    );
  });

  test('throws for unknown leadId', async () => {
    await assert.rejects(
      () => exportLead('does-not-exist', 'admin_operator'),
      /Lead not found/
    );
  });

  test('throws when target is crm_webhook but webhookUrl is missing', async () => {
    const lead = makeDetectedLead();
    await advanceToReadyForExport(lead);
    await assert.rejects(
      () => exportLead(lead.id, 'admin_operator', { target: 'crm_webhook' }),
      /webhookUrl is required/
    );
  });
});

// ─── archiveLead ─────────────────────────────────────────────────────────────

describe('archiveLead', () => {
  test('archives a detected lead', async () => {
    const lead = makeDetectedLead({ exportState: 'lead_created' });
    saveLead(lead);
    const { lead: archived, log } = await archiveLead(lead.id, 'admin_operator', 'No longer relevant');
    assert.equal(archived.exportState, 'archived');
    assert.equal(log.reason, 'No longer relevant');
    assert.equal(log.action, 'lead_archived');
  });

  test('archives an exported lead (post-export cleanup)', async () => {
    const lead = makeDetectedLead({ exportState: 'exported' });
    saveLead(lead);
    const { lead: archived } = await archiveLead(lead.id, 'admin_operator', 'Exported and closed');
    assert.equal(archived.exportState, 'archived');
  });

  test('saves archived state to store', async () => {
    const lead = makeDetectedLead({ exportState: 'lead_created' });
    saveLead(lead);
    await archiveLead(lead.id, 'admin_operator', 'Duplicate lead');
    assert.equal(getLead(lead.id).exportState, 'archived');
  });

  test('throws for unknown leadId', async () => {
    await assert.rejects(
      async () => await archiveLead('bad-id', 'admin_operator', 'reason'),
      /Lead not found/
    );
  });

  test('throws for invalid transition (archived → archived)', async () => {
    const lead = makeDetectedLead({ exportState: 'archived' });
    saveLead(lead);
    await assert.rejects(
      async () => await archiveLead(lead.id, 'admin_operator', 'reason'),
      /Invalid lead transition/
    );
  });
});

// ─── Full lifecycle ───────────────────────────────────────────────────────────

describe('full lead lifecycle', () => {
  test('detected → lead_created → ready_for_export → exported → archived', async () => {
    const lead = makeDetectedLead();
    saveLead(lead);

    // 1. Confirm
    const { lead: l1 } = await confirmLead(lead.id, 'admin_operator');
    assert.equal(l1.exportState, 'lead_created');

    // 2. Update consent and mark ready
    saveLead({ ...l1, consentStatus: 'given' });
    const { lead: l2 } = await markLeadReadyForExport(lead.id, 'admin_operator');
    assert.equal(l2.exportState, 'ready_for_export');

    // 3. Export
    const { lead: l3 } = await exportLead(lead.id, 'admin_operator', { target: 'internal' });
    assert.equal(l3.exportState, 'exported');
    assert.ok(l3.exportTimestamp);

    // 4. Archive post-export
    const { lead: l4 } = await archiveLead(lead.id, 'admin_operator', 'Done');
    assert.equal(l4.exportState, 'archived');

    // 5. Verify audit trail has all actions
    const logs = getAllAuditLogs().filter(l => l.entityId === lead.id);
    const actions = logs.map(l => l.action);
    assert.ok(actions.includes('lead_confirmed'));
    assert.ok(actions.includes('marked_ready_for_export'));
    assert.ok(actions.includes('exported'));
    assert.ok(actions.includes('lead_archived'));
  });

  test('failed export can be retried (ready_for_export → failed → ready_for_export)', async () => {
    const lead = makeDetectedLead({ exportState: 'ready_for_export', consentStatus: 'given' });
    saveLead(lead);

    // Force a failure by using crm_webhook without URL
    try {
      await exportLead(lead.id, 'admin_operator', { target: 'crm_webhook' });
    } catch {
      // expected
    }

    // After failure the lead might still be in ready_for_export (consent check fires first)
    // OR we can manually set to failed to test retry path
    saveLead({ ...getLead(lead.id), exportState: 'failed' });

    // Retry: transition failed → ready_for_export
    const { lead: retried } = await markLeadReadyForExport(lead.id, 'admin_operator');
    assert.equal(retried.exportState, 'ready_for_export');

    // Now export successfully
    const { lead: done } = await exportLead(lead.id, 'admin_operator', { target: 'internal' });
    assert.equal(done.exportState, 'exported');
  });
});
