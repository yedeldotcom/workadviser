/**
 * Core State Machines — FPP §9.2
 */

export {
  INTERVIEW_STATES,
  isValidTransition as isValidInterviewTransition,
  transitionInterview,
} from './interviewState.js';

export {
  RELEASE_STATES,
  isValidReleaseTransition,
  transitionRelease,
} from './releaseState.js';

export {
  RECOMMENDATION_STATES,
  isValidRecommendationTransition,
  transitionRecommendation,
} from './recommendationLifecycle.js';

export {
  LEAD_STATES,
  isValidLeadTransition,
  transitionLead,
} from './leadHandoffState.js';

export {
  REVIEW_STATES,
  isValidReviewTransition,
  transitionReview,
} from './reviewApprovalState.js';
