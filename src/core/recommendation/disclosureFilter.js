/**
 * Disclosure Filter — FPP §4.4, §5.2, Non-Negotiable
 *
 * The disclosure spectrum controls what an employer report may reveal.
 * This module is a SEPARATE, standalone gate — never mixed with case analysis.
 *
 * Spectrum (ascending):
 *   no_disclosure       → user declines any employer communication
 *   functional_only     → functional work impact only, no clinical framing
 *   partial_contextual  → barriers named functionally, limited context
 *   full_voluntary      → user fully consents to contextual disclosure
 *
 * FPP non-negotiable: employer-facing output is NOT a copy of the user report.
 * Every field that reaches an employer output must pass through this filter.
 */

// ─── Disclosure levels (ordered) ─────────────────────────────────────────────

export const DISCLOSURE_LEVELS = [
  'no_disclosure',
  'functional_only',
  'partial_contextual',
  'full_voluntary',
];

/**
 * Return true if `level` is at least as permissive as `threshold`.
 * @param {string} level
 * @param {string} threshold
 */
export function meetsDisclosureLevel(level, threshold) {
  return DISCLOSURE_LEVELS.indexOf(level) >= DISCLOSURE_LEVELS.indexOf(threshold);
}

// ─── Field rules ─────────────────────────────────────────────────────────────

/**
 * What each disclosure level permits in an employer report.
 * Keys correspond to logical data fields; values are what may appear.
 */
export const FIELD_RULES = {
  no_disclosure: {
    // Nothing may be sent to an employer.
    allowedFields: [],
    barrierRepresentation: 'blocked',
    clinicalContext: false,
    triggerList: false,
    amplifierList: false,
    quotes: false,
    diagnosis: false,
  },
  functional_only: {
    // Only functional work impact — no clinical labels, no named barriers.
    allowedFields: ['workImpactSummary', 'generalAccommodationCategories'],
    barrierRepresentation: 'functional_impact_only',
    clinicalContext: false,
    triggerList: false,
    amplifierList: false,
    quotes: false,
    diagnosis: false,
  },
  partial_contextual: {
    // Named barriers (functional names), limited context. No triggers or diagnosis.
    allowedFields: [
      'workImpactSummary',
      'namedBarriers',
      'recommendedAccommodations',
      'generalAccommodationCategories',
    ],
    barrierRepresentation: 'functional_name',
    clinicalContext: false,
    triggerList: false,
    amplifierList: false,
    quotes: false,
    diagnosis: false,
  },
  full_voluntary: {
    // Full context: barriers, context notes, amplifiers — but still no diagnosis.
    allowedFields: [
      'workImpactSummary',
      'namedBarriers',
      'recommendedAccommodations',
      'generalAccommodationCategories',
      'contextNotes',
      'amplifiers',
    ],
    barrierRepresentation: 'functional_name_with_context',
    clinicalContext: true,
    triggerList: false,  // triggers are never shared with employers
    amplifierList: true,
    quotes: false,       // interview quotes are never shared
    diagnosis: false,    // diagnosis is never shared
  },
};

// ─── Main filter function ─────────────────────────────────────────────────────

/**
 * Filter a case analysis result for employer consumption.
 * Throws immediately if disclosureLevel === 'no_disclosure'.
 *
 * @param {object} caseAnalysis - Full pipeline result (from runPipeline)
 * @param {object} profile - UserProfile (for disclosure preference, context)
 * @param {string} disclosureLevel - One of DISCLOSURE_LEVELS
 * @returns {EmployerReportData}
 */
export function filterForEmployer(caseAnalysis, profile, disclosureLevel) {
  if (disclosureLevel === 'no_disclosure') {
    throw new Error(
      'Employer report generation blocked: user disclosure level is no_disclosure. ' +
      'No employer communication may be initiated under this setting.'
    );
  }

  if (!DISCLOSURE_LEVELS.includes(disclosureLevel)) {
    throw new Error(`Unknown disclosure level: ${disclosureLevel}`);
  }

  const rules = FIELD_RULES[disclosureLevel];
  const { engines, summary } = caseAnalysis;

  const result = {
    disclosureLevel,
    filteredAt: new Date().toISOString(),
  };

  // Work impact summary — always included (minimum viable employer content)
  result.workImpactSummary = buildWorkImpactSummary(engines, disclosureLevel);

  // Barriers
  if (rules.allowedFields.includes('namedBarriers')) {
    result.namedBarriers = filterBarriers(engines.intake, rules.barrierRepresentation);
  }

  // Accommodations
  if (rules.allowedFields.includes('recommendedAccommodations')) {
    result.recommendedAccommodations = filterAccommodations(engines.translation, disclosureLevel);
  }

  // General accommodation categories (always present for functional_only+)
  result.generalAccommodationCategories = buildAccommodationCategories(engines.translation);

  // Amplifiers (only at full_voluntary)
  if (rules.amplifierList && rules.allowedFields.includes('amplifiers')) {
    result.amplifiers = filterAmplifiers(engines.intake);
  }

  // Context notes (only at full_voluntary, from profile)
  if (rules.allowedFields.includes('contextNotes')) {
    result.contextNotes = buildContextNotes(profile);
  }

  // Lecture opportunity signal (always safe — org-level, not individual)
  result.lectureOpportunitySignal = buildLectureSignal(summary);

  return result;
}

// ─── Sub-filters ─────────────────────────────────────────────────────────────

function buildWorkImpactSummary(engines, disclosureLevel) {
  const { intake, interpretation } = engines;
  const severity = intake.overallSeverity;

  // Generic functional language — no clinical labeling below full_voluntary
  const severityLabel = {
    low: 'מינימלי',
    moderate: 'מתון',
    high: 'משמעותי',
    critical: 'גבוה',
  }[severity] ?? 'לא ידוע';

  const impactSummary = {
    overallImpactLevel: severityLabel,
    primaryWorkDomains: buildPrimaryDomains(engines.translation),
  };

  if (meetsDisclosureLevel(disclosureLevel, 'partial_contextual')) {
    impactSummary.investmentPriorities = (interpretation.investmentPriorities ?? []).slice(0, 3);
    impactSummary.trajectory = interpretation.trajectory ?? null;
  }

  return impactSummary;
}

function filterBarriers(intake, representation) {
  const barriers = intake.criticalBarriers ?? [];
  return barriers.map(b => {
    if (representation === 'functional_name') {
      return { id: b.id, en: b.en, score: b.score };
    }
    if (representation === 'functional_name_with_context') {
      return { id: b.id, he: b.he, en: b.en, score: b.score, cluster: b.cluster };
    }
    // functional_impact_only: no names, just counts/domains
    return { score: b.score };
  });
}

function filterAccommodations(translation, disclosureLevel) {
  if (!translation.recommendations) return [];
  return translation.recommendations.slice(0, 5).map(rec => ({
    domain: rec.domain,
    barrierName: meetsDisclosureLevel(disclosureLevel, 'partial_contextual')
      ? rec.barrierName
      : null,
    topAccommodations: (rec.accommodations ?? []).slice(0, 2).map(a => ({
      action_he: a.action_he,
      action_en: a.action_en ?? null,
      cost: a.cost,
      timeframe: a.timeframe ?? null,
    })),
  }));
}

function buildAccommodationCategories(translation) {
  // High-level category groupings — safe at any disclosure level
  const categories = new Set();
  (translation.recommendations ?? []).forEach(rec => {
    (rec.accommodations ?? []).forEach(a => {
      if (a.cost === 'zero' || a.cost === 'low') categories.add('low_cost_adjustments');
      if (a.cost === 'medium' || a.cost === 'high') categories.add('structural_changes');
      if (rec.domain === 'management') categories.add('management_practices');
      if (rec.domain === 'physical_env') categories.add('physical_environment');
      if (rec.domain === 'schedule') categories.add('scheduling_flexibility');
    });
  });
  return [...categories];
}

function filterAmplifiers(intake) {
  // Amplifiers are safe at full_voluntary — functional labels, no clinical content
  return (intake.patterns ?? []).map(p => ({
    id: p.id,
    en: p.en,
  }));
}

function buildContextNotes(profile) {
  if (!profile) return null;
  return {
    employmentStage: profile.employmentContext?.employmentStage ?? null,
    disclosurePreference: profile.disclosurePreference,
    // Never include personal identifiers, diagnosis, or raw interview content
  };
}

function buildPrimaryDomains(translation) {
  const domainCounts = {};
  (translation.recommendations ?? []).forEach(rec => {
    if (rec.domain) domainCounts[rec.domain] = (domainCounts[rec.domain] ?? 0) + 1;
  });
  return Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([domain]) => domain);
}

function buildLectureSignal(summary) {
  if (!summary) return null;
  // Org-level signal only — never tied to individual case
  return {
    hasOrgLevelOpportunity: Boolean(
      summary.overallSeverity === 'high' || summary.overallSeverity === 'critical'
    ),
    suggestedAngle: 'workplace_accessibility_ptsd',
  };
}
