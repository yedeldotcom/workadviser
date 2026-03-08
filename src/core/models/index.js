/**
 * Core Data Model — FPP §9.1
 * Re-exports all model factories and types.
 */

export { createUser } from './user.js';
export { createUserProfile } from './userProfile.js';
export { createInterviewSession } from './interviewSession.js';
export { createMessage } from './message.js';
export { createNormalizedSignal } from './normalizedSignal.js';
export { createBarrier, buildBarrierRegistry } from './barrier.js';
export { createTrigger, KNOWN_TRIGGERS } from './trigger.js';
export { createWorkplaceAmplifier, WORKPLACE_AMPLIFIERS } from './workplaceAmplifier.js';
export { createChangeEvent, REVALIDATION_LEVELS } from './changeEvent.js';
export {
  createRecommendationFamily,
  createRecommendationTemplate,
  createRenderedRecommendation,
} from './recommendation.js';
export { createReport, createLead } from './report.js';
export { createApprovalObject } from './approvalObject.js';
export { createAuditLog } from './auditLog.js';
export { createRuleObject } from './ruleObject.js';
export { createKnowledgeItem, createKnowledgeSource, KNOWLEDGE_SOURCES } from './knowledgeItem.js';
