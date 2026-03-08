/**
 * UserProfile — FPP §9.1
 *
 * Full case record for a user. Accumulates over time across sessions,
 * follow-ups, and change events. Stored per-user; never shared raw.
 */

/**
 * @typedef {'no_disclosure' | 'functional_only' | 'partial_contextual' | 'full_voluntary'} DisclosureLevel
 *
 * @typedef {Object} IdentityBasics
 * @property {string | null} firstName    - Optional; user-provided
 * @property {string | null} preferredName
 * @property {string | null} ageGroup     - e.g. '25-34'
 * @property {string | null} gender       - Self-described or null
 *
 * @typedef {Object} EmploymentContext
 * @property {string | null} currentStatus     - 'employed' | 'job_seeking' | 'on_leave' | 'student' | 'other'
 * @property {string | null} employmentStage   - FPP §3.4 stage
 * @property {string | null} workplaceType     - 'office' | 'remote' | 'hybrid' | 'field' | 'other'
 * @property {string | null} industryHint
 * @property {string | null} orgSize           - 'micro' | 'small' | 'medium' | 'large'
 *
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} userId
 * @property {IdentityBasics} identityBasics
 * @property {EmploymentContext} employmentContext
 * @property {DisclosureLevel} disclosurePreference
 * @property {string[]} interviewSessionIds
 * @property {string[]} followUpIds
 * @property {string[]} changeEventIds
 * @property {string[]} generatedReportIds
 * @property {string[]} adminReviewIds
 * @property {string[]} recommendationHistoryIds
 * @property {{ state: string, flaggedAt: string | null, notes: string | null }} supportSafetyState
 * @property {{ promoted: boolean, promotedAt: string | null, scope: string | null }} knowledgeContributionStatus
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export function createUserProfile(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id ?? crypto.randomUUID(),
    userId: fields.userId ?? null,
    identityBasics: {
      firstName: null,
      preferredName: null,
      ageGroup: null,
      gender: null,
      ...fields.identityBasics,
    },
    employmentContext: {
      currentStatus: null,
      employmentStage: null,
      workplaceType: null,
      industryHint: null,
      orgSize: null,
      ...fields.employmentContext,
    },
    disclosurePreference: fields.disclosurePreference ?? 'no_disclosure',
    interviewSessionIds: fields.interviewSessionIds ?? [],
    followUpIds: fields.followUpIds ?? [],
    changeEventIds: fields.changeEventIds ?? [],
    generatedReportIds: fields.generatedReportIds ?? [],
    adminReviewIds: fields.adminReviewIds ?? [],
    recommendationHistoryIds: fields.recommendationHistoryIds ?? [],
    supportSafetyState: {
      state: 'nominal',
      flaggedAt: null,
      notes: null,
      ...fields.supportSafetyState,
    },
    knowledgeContributionStatus: {
      promoted: false,
      promotedAt: null,
      scope: null,
      ...fields.knowledgeContributionStatus,
    },
    createdAt: fields.createdAt ?? now,
    updatedAt: fields.updatedAt ?? now,
  };
}
