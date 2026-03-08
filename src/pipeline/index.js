/**
 * WorkAdviser Pipeline
 *
 * Full 5-engine pipeline:
 * [1] Intake → [2] Interpretation → [3] Translation → [4] Implementation → [5] Framing
 *
 * Input: raw questionnaire responses (13 barrier scores)
 * Output: complete employer-facing implementation plan with framing
 */

import { scoreResponses } from '../engines/intake/index.js';
import { interpretProfile } from '../engines/interpretation/index.js';
import { translateToWorkplace } from '../engines/translation/index.js';
import { generateImplementationPlan } from '../engines/implementation/index.js';
import { generateFraming } from '../engines/framing/index.js';
import { createAuditLog } from '../core/models/auditLog.js';
import { appendAuditLog } from '../admin/store.js';

/**
 * Run the full pipeline.
 * @param {Object} input
 * @param {Object<string, number>} input.responses - barrier_id → score (1-5)
 * @param {string} [input.phase='pre_employment'] - coaching phase
 * @param {string} [input.orgReadiness='basic'] - organization readiness level
 * @param {string} [input.audience='hr'] - target audience for framing
 * @param {string} [input.sessionId] - Optional session ID for audit traceability
 * @param {string} [input.userId] - Optional user ID for audit traceability
 * @returns {PipelineResult}
 */
export function runPipeline({ responses, phase = 'pre_employment', orgReadiness = 'basic', audience = 'hr', sessionId = null, userId = null }) {
  // Engine 1: Intake — score and profile
  const intakeProfile = scoreResponses(responses);

  // Engine 2: Interpretation — clinical/functional meaning
  const interpretation = interpretProfile(intakeProfile, phase);

  // Engine 3: Translation — workplace scenarios and accommodations
  const translation = translateToWorkplace(interpretation);

  // Engine 4: Implementation — organizational procedures
  const implementation = generateImplementationPlan(translation, orgReadiness);

  // Engine 5: Framing — employer communication
  const framing = generateFraming(implementation, audience);

  const result = {
    engines: {
      intake: intakeProfile,
      interpretation,
      translation,
      implementation,
      framing,
    },
    summary: {
      overallSeverity: intakeProfile.overallSeverity,
      criticalBarriersCount: intakeProfile.criticalBarriers.length,
      patternsDetected: intakeProfile.patterns.map(p => p.en),
      riskFlags: interpretation.riskFlags.map(f => ({ id: f.id, severity: f.severity, en: f.en })),
      totalAccommodations: translation.summary.totalAccommodations,
      zeroCostPercentage: translation.summary.zeroCostPercentage,
      procedureModules: implementation.applicableModules.length,
      investmentPriorities: interpretation.investmentPriorities.filter(p => p.priority !== 'low'),
    },
    timestamp: new Date().toISOString(),
  };

  // FPP §9.6: all important outputs must be traceable
  const log = createAuditLog({
    entityType: 'pipeline',
    entityId: sessionId ?? userId ?? 'anonymous',
    action: 'pipeline_run',
    changedBy: 'system',
    diff: {
      phase,
      orgReadiness,
      audience,
      overallSeverity: result.summary.overallSeverity,
      criticalBarriersCount: result.summary.criticalBarriersCount,
      patternsDetected: result.summary.patternsDetected,
      riskFlagIds: result.summary.riskFlags.map(f => f.id),
    },
    meaningChanged: false,
    scope: 'local',
    reason: 'Full 5-engine pipeline run',
  });
  appendAuditLog(log);

  return result;
}

/**
 * Run pipeline and return a human-readable summary in Hebrew.
 */
export function runPipelineHebrew(input) {
  const result = runPipeline(input);
  const { engines, summary } = result;
  const { intake, interpretation, translation, implementation } = engines;

  const lines = [];
  lines.push('══════════════════════════════════════════');
  lines.push('        דו"ח WorkAdviser — סיכום          ');
  lines.push('══════════════════════════════════════════');
  lines.push('');

  // Overall
  lines.push(`▸ עומס חסמים כללי: ${intake.overallSeverity.he} (ציון ממוצע: ${intake.meanScore})`);
  lines.push(`▸ חסמים קריטיים: ${intake.criticalBarriers.length}`);
  lines.push('');

  // Critical barriers
  if (intake.criticalBarriers.length > 0) {
    lines.push('── חסמים קריטיים ──');
    for (const b of intake.criticalBarriers) {
      lines.push(`  ● ${b.he} — ציון ${b.score}/5`);
    }
    lines.push('');
  }

  // Patterns
  if (intake.patterns.length > 0) {
    lines.push('── דפוסים שזוהו ──');
    for (const p of intake.patterns) {
      lines.push(`  ◆ ${p.he}`);
      lines.push(`    ${p.description_he}`);
    }
    lines.push('');
  }

  // Risk flags
  if (interpretation.riskFlags.length > 0) {
    lines.push('── דגלי סיכון ──');
    for (const f of interpretation.riskFlags) {
      lines.push(`  ⚠ ${f.he}`);
      lines.push(`    פעולה: ${f.action_he}`);
    }
    lines.push('');
  }

  // Top recommendations
  lines.push('── התאמות מומלצות ──');
  lines.push(`  סה"כ: ${translation.summary.totalAccommodations} התאמות`);
  lines.push(`  ללא עלות: ${translation.summary.zeroCostPercentage}%`);
  lines.push('');

  const seenDomains = new Set();
  for (const rec of translation.recommendations.slice(0, 8)) {
    if (!seenDomains.has(rec.domain)) {
      lines.push(`  ─ ${rec.domainName.he} ─`);
      seenDomains.add(rec.domain);
    }
    lines.push(`    ${rec.barrierName.he} (${rec.barrierScore}/5):`);
    for (const acc of rec.accommodations.slice(0, 2)) {
      lines.push(`      • ${acc.action_he} [${acc.costInfo.he}]`);
    }
  }
  lines.push('');

  // Procedure modules
  lines.push('── מודולים ארגוניים ──');
  for (const mod of implementation.applicableModules.slice(0, 5)) {
    lines.push(`  ■ ${mod.he} (${mod.for_role.join(', ')})`);
    for (const action of mod.actions.slice(0, 2)) {
      lines.push(`    → ${action.he}`);
    }
  }
  lines.push('');

  // Investment priorities
  lines.push('── סדרי עדיפות להשקעה ──');
  for (const p of interpretation.investmentPriorities.filter(p => p.priority !== 'low').slice(0, 5)) {
    const typeMap = { accommodate: 'התאמת סביבה', support: 'תמיכה', monitor: 'ניטור', maintain: 'שמירה' };
    lines.push(`  ${p.clusterName}: ${typeMap[p.investmentType] || p.investmentType} (עדיפות ${p.priority === 'high' ? 'גבוהה' : 'בינונית'})`);
  }

  lines.push('');
  lines.push('══════════════════════════════════════════');

  return lines.join('\n');
}
