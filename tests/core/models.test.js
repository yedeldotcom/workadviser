/**
 * Tests for core data model factory functions (Step 1).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createUser } from '../../src/core/models/user.js';
import { createUserProfile } from '../../src/core/models/userProfile.js';
import { createInterviewSession } from '../../src/core/models/interviewSession.js';
import { createMessage } from '../../src/core/models/message.js';
import { createNormalizedSignal } from '../../src/core/models/normalizedSignal.js';
import { createBarrier, buildBarrierRegistry } from '../../src/core/models/barrier.js';
import { createTrigger, KNOWN_TRIGGERS } from '../../src/core/models/trigger.js';
import { createWorkplaceAmplifier, WORKPLACE_AMPLIFIERS } from '../../src/core/models/workplaceAmplifier.js';
import { createChangeEvent, REVALIDATION_LEVELS } from '../../src/core/models/changeEvent.js';
import {
  createRecommendationFamily,
  createRecommendationTemplate,
  createRenderedRecommendation,
} from '../../src/core/models/recommendation.js';
import { createReport, createLead } from '../../src/core/models/report.js';
import { createApprovalObject } from '../../src/core/models/approvalObject.js';
import { createAuditLog } from '../../src/core/models/auditLog.js';
import { createRuleObject } from '../../src/core/models/ruleObject.js';
import { createKnowledgeItem, createKnowledgeSource, KNOWLEDGE_SOURCES } from '../../src/core/models/knowledgeItem.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasAllKeys(obj, keys) {
  for (const key of keys) {
    assert.ok(key in obj, `Missing key: ${key}`);
  }
}

// ─── User ─────────────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('creates a user with all required fields', () => {
    const u = createUser();
    hasAllKeys(u, ['id', 'createdAt', 'channel', 'phoneNumber', 'consentState', 'partnerSource']);
    assert.equal(u.channel, 'whatsapp');
    assert.equal(u.consentState, 'pending');
    assert.equal(u.phoneNumber, null);
  });

  it('accepts overrides', () => {
    const u = createUser({ channel: 'web', consentState: 'given', phoneNumber: '+972501234567' });
    assert.equal(u.channel, 'web');
    assert.equal(u.consentState, 'given');
    assert.equal(u.phoneNumber, '+972501234567');
  });
});

// ─── UserProfile ──────────────────────────────────────────────────────────────

describe('createUserProfile', () => {
  it('creates a profile with nested defaults', () => {
    const p = createUserProfile({ userId: 'u-123' });
    assert.equal(p.userId, 'u-123');
    assert.equal(p.disclosurePreference, 'no_disclosure');
    assert.deepEqual(p.interviewSessionIds, []);
    assert.equal(p.supportSafetyState.state, 'nominal');
    assert.equal(p.knowledgeContributionStatus.promoted, false);
  });

  it('merges partial identityBasics', () => {
    const p = createUserProfile({ identityBasics: { firstName: 'יוסי' } });
    assert.equal(p.identityBasics.firstName, 'יוסי');
    assert.equal(p.identityBasics.gender, null);
  });
});

// ─── InterviewSession ─────────────────────────────────────────────────────────

describe('createInterviewSession', () => {
  it('creates session with not_started state', () => {
    const s = createInterviewSession({ userId: 'u-1' });
    assert.equal(s.state, 'not_started');
    assert.equal(s.phase, 'pre_employment');
    assert.deepEqual(s.messageIds, []);
    assert.equal(s.dropoutType, null);
  });
});

// ─── Message ──────────────────────────────────────────────────────────────────

describe('createMessage', () => {
  it('defaults to inbound text', () => {
    const m = createMessage({ sessionId: 's-1', rawContent: 'hello' });
    assert.equal(m.direction, 'inbound');
    assert.equal(m.inputType, 'text');
    assert.equal(m.rawContent, 'hello');
  });
});

// ─── NormalizedSignal ─────────────────────────────────────────────────────────

describe('createNormalizedSignal', () => {
  it('defaults confidence to 1.0', () => {
    const sig = createNormalizedSignal({ signalType: 'barrier_score', value: 4, barrierIds: ['fatigue'] });
    assert.equal(sig.confidence, 1.0);
    assert.deepEqual(sig.barrierIds, ['fatigue']);
  });
});

// ─── Barrier ──────────────────────────────────────────────────────────────────

describe('buildBarrierRegistry', () => {
  it('returns exactly 13 barriers', () => {
    const registry = buildBarrierRegistry();
    assert.equal(registry.length, 13);
  });

  it('all barriers have id, text_he, text_en, cluster', () => {
    for (const b of buildBarrierRegistry()) {
      assert.ok(b.id, `Missing id`);
      assert.ok(b.text_he, `Missing text_he for ${b.id}`);
      assert.ok(b.text_en, `Missing text_en for ${b.id}`);
      assert.ok(b.cluster, `Missing cluster for ${b.id}`);
    }
  });

  it('all barriers are active and validated', () => {
    for (const b of buildBarrierRegistry()) {
      assert.equal(b.lifecycleState, 'active');
      assert.equal(b.promotionState, 'validated');
    }
  });
});

// ─── Trigger ──────────────────────────────────────────────────────────────────

describe('KNOWN_TRIGGERS', () => {
  it('has 7 seed triggers', () => {
    assert.equal(KNOWN_TRIGGERS.length, 7);
  });

  it('all triggers have he/en text and barrierIds', () => {
    for (const t of KNOWN_TRIGGERS) {
      assert.ok(t.text_he, `Missing text_he for ${t.id}`);
      assert.ok(t.text_en, `Missing text_en for ${t.id}`);
      assert.ok(t.barrierIds.length > 0, `No barrierIds for ${t.id}`);
    }
  });
});

// ─── WorkplaceAmplifier ───────────────────────────────────────────────────────

describe('WORKPLACE_AMPLIFIERS', () => {
  it('has 10 amplifiers', () => {
    assert.equal(WORKPLACE_AMPLIFIERS.length, 10);
  });

  it('all amplifiers have type and barrierIds', () => {
    const validTypes = ['sensory', 'relational', 'structural', 'temporal'];
    for (const a of WORKPLACE_AMPLIFIERS) {
      assert.ok(validTypes.includes(a.type), `Invalid type ${a.type} for ${a.id}`);
      assert.ok(a.barrierIds.length > 0, `No barrierIds for ${a.id}`);
    }
  });
});

// ─── ChangeEvent ──────────────────────────────────────────────────────────────

describe('createChangeEvent', () => {
  it('assigns correct revalidation levels', () => {
    const hired = createChangeEvent({ userId: 'u-1', eventType: 'hired' });
    assert.equal(hired.revalidationLevel, 'full_reassessment');

    const teamChange = createChangeEvent({ userId: 'u-1', eventType: 'team_change' });
    assert.equal(teamChange.revalidationLevel, 'light_refresh');

    const promo = createChangeEvent({ userId: 'u-1', eventType: 'promotion' });
    assert.equal(promo.revalidationLevel, 'partial_revalidation');
  });

  it('sets revalidationRequired true by default', () => {
    const e = createChangeEvent({ eventType: 'new_boss' });
    assert.equal(e.revalidationRequired, true);
  });
});

// ─── Recommendation ───────────────────────────────────────────────────────────

describe('createRecommendationTemplate', () => {
  it('creates template with tracking defaults', () => {
    const t = createRecommendationTemplate({
      text_he: 'הקצאת שולחן קבוע',
      text_en: 'Assign a permanent desk',
      barrierTags: ['sensory_discomfort'],
    });
    assert.equal(t.tracking.retrievalCount, 0);
    assert.equal(t.lifecycleState, 'active');
    assert.deepEqual(t.disclosureSuitability, ['functional_only']);
  });
});

describe('createRenderedRecommendation', () => {
  it('defaults to pending review', () => {
    const r = createRenderedRecommendation({ templateId: 't-1', audience: 'hr' });
    assert.equal(r.reviewStatus, 'pending');
    assert.equal(r.timeHorizon, 'near_term');
  });
});

// ─── Report ───────────────────────────────────────────────────────────────────

describe('createReport', () => {
  it('starts in draft_generated state', () => {
    const r = createReport({ caseId: 'c-1', reportType: 'user' });
    assert.equal(r.state, 'draft_generated');
    assert.equal(r.version, '1.0.0');
    assert.equal(r.disclosureLevel, 'no_disclosure');
  });
});

describe('createLead', () => {
  it('starts in detected state', () => {
    const l = createLead({ caseId: 'c-1' });
    assert.equal(l.exportState, 'detected');
    assert.equal(l.consentStatus, 'pending');
  });
});

// ─── ApprovalObject ───────────────────────────────────────────────────────────

describe('createApprovalObject', () => {
  it('defaults to admin_approval approved', () => {
    const a = createApprovalObject({ reportId: 'r-1', approvedBy: 'admin-1' });
    assert.equal(a.type, 'admin_approval');
    assert.equal(a.decision, 'approved');
  });
});

// ─── AuditLog ────────────────────────────────────────────────────────────────

describe('createAuditLog', () => {
  it('defaults meaningChanged to false', () => {
    const l = createAuditLog({ entityType: 'report', entityId: 'r-1', action: 'created' });
    assert.equal(l.meaningChanged, false);
    assert.equal(l.scope, 'local');
    assert.equal(l.changedBy, 'system');
  });
});

// ─── RuleObject ──────────────────────────────────────────────────────────────

describe('createRuleObject', () => {
  it('creates rule with empty changeLog', () => {
    const r = createRuleObject({ ruleType: 'global', description: 'Max recommendations per report' });
    assert.deepEqual(r.changeLog, []);
    assert.equal(r.scope, 'all_cases');
  });
});

// ─── KnowledgeItem ───────────────────────────────────────────────────────────

describe('createKnowledgeItem', () => {
  it('defaults to case_only promotion state', () => {
    const k = createKnowledgeItem({ type: 'barrier_definition', content: { he: 'עייפות', en: 'Fatigue' } });
    assert.equal(k.promotionState, 'case_only');
    assert.equal(k.lifecycleState, 'active');
  });
});

describe('KNOWLEDGE_SOURCES', () => {
  it('has 5 canonical sources', () => {
    assert.equal(KNOWLEDGE_SOURCES.length, 5);
  });
  it('all sources have role and filename', () => {
    for (const s of KNOWLEDGE_SOURCES) {
      assert.ok(s.role, `Missing role for ${s.id}`);
      assert.ok(s.filename, `Missing filename for ${s.id}`);
    }
  });
});
