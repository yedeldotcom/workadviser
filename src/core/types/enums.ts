// Employment journey stages (spec section 3.4)
export enum EmploymentStage {
  JOB_SEARCH = 'job_search',
  RECRUITMENT = 'recruitment',
  ONBOARDING = 'onboarding',
  ACTIVE_EMPLOYMENT = 'active_employment',
  CHANGE_INSTABILITY = 'change_instability',
  RETURN_TO_WORK = 'return_to_work',
  RETENTION_RISK = 'retention_risk',
}

// Workplace types (spec section 3.5)
export enum WorkplaceType {
  PUBLIC_SECTOR = 'public_sector',
  PRIVATE_COMPANY = 'private_company',
  NGO = 'ngo',
  EDUCATION = 'education',
  CUSTOMER_FACING = 'customer_facing',
  SECURITY_SENSITIVE = 'security_sensitive',
  SMALL_BUSINESS = 'small_business',
}

// Disclosure levels (spec section 4 — disclosure rules)
export enum DisclosureLevel {
  NONE = 'none',
  FUNCTIONAL = 'functional',
  PARTIAL_CONTEXTUAL = 'partial_contextual',
  FULL_VOLUNTARY = 'full_voluntary',
}

// Knowledge unit types (spec section 3.2)
export enum KnowledgeUnitType {
  BARRIER_DEFINITION = 'barrier_definition',
  SIGNAL_INDICATOR = 'signal_indicator',
  CONTEXT_MODIFIER = 'context_modifier',
  TRIGGER = 'trigger',
  WORKPLACE_AMPLIFIER = 'workplace_amplifier',
  WORKPLACE_MANIFESTATION = 'workplace_manifestation',
  RECOMMENDATION_FAMILY = 'recommendation_family',
  RECOMMENDATION_TEMPLATE = 'recommendation_template',
  IMPLEMENTATION_ACTION = 'implementation_action',
  COMMUNICATION_FRAMING = 'communication_framing',
  BOUNDARY_CAUTION = 'boundary_caution',
  SALES_SIGNAL = 'sales_signal',
}

// Knowledge source roles (spec section 3.1)
export enum KnowledgeSourceRole {
  CLASSIFICATION = 'classification',
  INTERPRETATION = 'interpretation',
  APPLIED_PATTERN = 'applied_pattern',
  IMPLEMENTATION = 'implementation',
  COMMUNICATION = 'communication',
}

// Knowledge promotion states (spec section 3.7)
export enum KnowledgePromotionState {
  CASE_ONLY = 'case_only',
  CANDIDATE_PATTERN = 'candidate_pattern',
  VALIDATED = 'validated',
  RULE_UPDATE_CANDIDATE = 'rule_update_candidate',
}

// Change event types (spec section 5.7)
export enum ChangeEventType {
  HIRED = 'hired',
  NEW_ROLE = 'new_role',
  PROMOTION = 'promotion',
  NEW_BOSS = 'new_boss',
  TEAM_CHANGE = 'team_change',
  SHIFT_CHANGE = 'shift_change',
  WORK_MODE_CHANGE = 'work_mode_change',
  PERFORMANCE_ISSUE = 'performance_issue',
  LEAVE_RETURN = 'leave_return',
  JOB_ENDED = 'job_ended',
  MOVED_CITY = 'moved_city',
  MOVED_ABROAD = 'moved_abroad',
  COMMUTE_CHANGE = 'commute_change',
}

// Revalidation levels (spec section 5.7)
export enum RevalidationLevel {
  LIGHT_REFRESH = 'light_refresh',
  PARTIAL = 'partial',
  FULL_REASSESSMENT = 'full_reassessment',
}

// Interview states
export enum InterviewState {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FOLLOW_UP = 'follow_up',
}

// Message types
export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  QUICK_REPLY = 'quick_reply',
}

// Report types (spec section 5.1)
export enum ReportType {
  USER = 'user',
  EMPLOYER = 'employer',
  ORG_SIGNAL = 'org_signal',
}

// Output release states (spec section 5.3 — 13 states)
export enum ReleaseState {
  DRAFT_GENERATED = 'draft_generated',
  ADMIN_REVIEW_REQUIRED = 'admin_review_required',
  ADMIN_EDITED_APPROVED = 'admin_edited_approved',
  USER_DELIVERY_READY = 'user_delivery_ready',
  DELIVERED_TO_USER = 'delivered_to_user',
  USER_VIEWED = 'user_viewed',
  USER_REQUESTED_CORRECTION = 'user_requested_correction',
  USER_APPROVED_EMPLOYER_SHARING = 'user_approved_employer_sharing',
  EMPLOYER_DELIVERY_READY = 'employer_delivery_ready',
  SENT_TO_EMPLOYER = 'sent_to_employer',
  EMPLOYER_VIEWED = 'employer_viewed',
  WITHHELD_CANCELLED = 'withheld_cancelled',
  ARCHIVED_REPLACED = 'archived_replaced',
}

// Delivery channels
export enum DeliveryChannel {
  WHATSAPP = 'whatsapp',
  SECURE_LINK = 'secure_link',
  EMAIL = 'email',
  ADMIN_MANUAL = 'admin_manual',
}

// Recommendation family names (spec section 4.2)
export enum RecommendationFamilyName {
  PREDICTABILITY = 'predictability',
  COMMUNICATION_CLARITY = 'communication_clarity',
  SENSORY_ENVIRONMENT = 'sensory_environment',
  MEETING_ADAPTATION = 'meeting_adaptation',
  SCHEDULE_FLEXIBILITY = 'schedule_flexibility',
  MANAGER_BEHAVIOR = 'manager_behavior',
  HR_PROCESS_ADAPTATION = 'hr_process_adaptation',
  EXTERNAL_RESOURCE = 'external_resource',
}

// Recommendation lifecycle (spec section 4.8)
export enum RecommendationLifecycle {
  DRAFT = 'draft',
  ACTIVE = 'active',
  MONITORED = 'monitored',
  EXPERIMENTAL = 'experimental',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

// Time horizons (spec section 4.7)
export enum TimeHorizon {
  IMMEDIATE = 'immediate',
  NEAR_TERM = 'near_term',
  LONGER_TERM = 'longer_term',
}

// Target actors for recommendations
export enum ActorType {
  USER_SELF = 'user_self',
  USER_COMMUNICATION = 'user_communication',
  MANAGER = 'manager',
  HR_ORGANIZATIONAL = 'hr_organizational',
  EXTERNAL_SPECIALIST = 'external_specialist',
}

// Confidence levels (spec section 4.6)
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  ESCALATE = 'escalate',
}

// Audience for rendered recommendations
export enum Audience {
  USER = 'user',
  EMPLOYER = 'employer',
  ORG = 'org',
}

// Lead handoff states
export enum LeadHandoffState {
  DETECTED = 'detected',
  LEAD_CREATED = 'lead_created',
  EXPORTED = 'exported',
  CONFIRMED = 'confirmed',
}

// Consent state
export enum ConsentState {
  PENDING = 'pending',
  GRANTED = 'granted',
  WITHDRAWN = 'withdrawn',
}

// Approval actions
export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT = 'edit',
}

// Admin edit types (spec section 6.3)
export enum AdminEditType {
  LIGHT = 'light',
  SUBSTANTIVE = 'substantive',
  RULE_SUGGESTION = 'rule_suggestion',
  CASE_EXCEPTION = 'case_exception',
}

// Rule types (spec section 6.2)
export enum RuleType {
  GLOBAL = 'global',
  KNOWLEDGE = 'knowledge',
  LOGIC = 'logic',
  CAMPAIGN = 'campaign',
  CASE = 'case',
}

// Support/safety state
export enum SupportState {
  STABLE = 'stable',
  MONITORING = 'monitoring',
  DISTRESS_DETECTED = 'distress_detected',
  ESCALATED = 'escalated',
}

// Interruption types (spec section 5.6)
export enum InterruptionType {
  INTENTIONAL_PAUSE = 'intentional_pause',
  SILENT_DROPOUT = 'silent_dropout',
  DISTRESS_INTERRUPTION = 'distress_interruption',
  TRUST_STOP = 'trust_stop',
}

// Gap types (spec section 3.6)
export enum GapType {
  KNOWLEDGE = 'knowledge',
  LOGIC = 'logic',
  RULE = 'rule',
  WORKFLOW_INTERFACE = 'workflow_interface',
}
