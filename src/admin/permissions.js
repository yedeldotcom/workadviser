/**
 * Permissions — FPP §6.4
 *
 * Five-role model. Visibility depends on: role, partner org, case assignment,
 * consent scope, and action type.
 *
 * Role hierarchy (most → least privileged):
 *   system_owner → admin_operator → clinical_content_partner
 *               → outreach_referral_partner → employer_facing_operator
 */

// ─── Role definitions ─────────────────────────────────────────────────────────

export const ROLES = {
  SYSTEM_OWNER:              'system_owner',
  ADMIN_OPERATOR:            'admin_operator',
  CLINICAL_CONTENT_PARTNER:  'clinical_content_partner',
  OUTREACH_REFERRAL_PARTNER: 'outreach_referral_partner',
  EMPLOYER_FACING_OPERATOR:  'employer_facing_operator',
};

// ─── Capability definitions ───────────────────────────────────────────────────

/**
 * What each role can do.
 * Capabilities are checked by name; adding a new capability here automatically
 * makes it available in the permission check without touching route code.
 */
const ROLE_CAPABILITIES = {
  system_owner: [
    'view_all_cases',
    'view_interview_history',
    'view_logic_map',
    'view_full_profile',
    'approve_report',
    'reject_report',
    'edit_recommendation',
    'add_note',
    'mark_followup',
    'export_lead',
    'manage_rules',
    'manage_knowledge',
    'view_analytics',
    'manage_permissions',
    'view_audit_log',
    'view_raw_messages',
    'view_voice_notes',
    'send_employer_report',
  ],
  admin_operator: [
    'view_all_cases',
    'view_interview_history',
    'view_logic_map',
    'view_full_profile',
    'approve_report',
    'reject_report',
    'edit_recommendation',
    'add_note',
    'mark_followup',
    'export_lead',
    'view_audit_log',
    'send_employer_report',
  ],
  clinical_content_partner: [
    'view_assigned_cases',
    'view_logic_map',
    'edit_recommendation',     // suggest edits, subject to approval
    'add_note',
    'view_audit_log',
  ],
  outreach_referral_partner: [
    'view_assigned_cases',
    'add_note',
    'mark_followup',
  ],
  employer_facing_operator: [
    'view_assigned_cases',
    'send_employer_report',
    'add_note',
  ],
};

// ─── Permission check ─────────────────────────────────────────────────────────

/**
 * Check if a role has a given capability.
 * @param {string} role
 * @param {string} capability
 * @returns {boolean}
 */
export function can(role, capability) {
  return (ROLE_CAPABILITIES[role] ?? []).includes(capability);
}

/**
 * Check if a role can access a given case.
 * system_owner and admin_operator see all cases.
 * Partner roles see only assigned cases (by partnerSource match).
 *
 * @param {string} role
 * @param {string | null} partnerOrgId - Operator's partner org
 * @param {import('../core/models/user.js').User} user - Case user record
 * @returns {boolean}
 */
export function canAccessCase(role, partnerOrgId, user) {
  if (can(role, 'view_all_cases')) return true;
  if (can(role, 'view_assigned_cases')) {
    // Partner can see cases referred by their org
    return !partnerOrgId || user?.partnerSource === partnerOrgId;
  }
  return false;
}

// ─── Express middleware ───────────────────────────────────────────────────────

/**
 * Attach admin identity to request.
 * Production: replace header-based auth with JWT/session validation.
 *
 * Expects: `X-Admin-Role` and optional `X-Partner-Org` request headers.
 * In production, these would come from a verified token, not raw headers.
 */
export function attachAdminIdentity(req, res, next) {
  const role = req.headers['x-admin-role'];
  const partnerOrgId = req.headers['x-partner-org'] ?? null;

  if (!role || !ROLE_CAPABILITIES[role]) {
    return res.status(401).json({ error: 'Missing or invalid admin role', code: 'UNAUTHORIZED' });
  }

  req.adminRole = role;
  req.adminPartnerOrgId = partnerOrgId;
  next();
}

/**
 * Require a specific capability on a route.
 * @param {string} capability
 * @returns Express middleware
 */
export function requireCapability(capability) {
  return (req, res, next) => {
    if (!can(req.adminRole, capability)) {
      return res.status(403).json({
        error: `Role '${req.adminRole}' cannot perform '${capability}'`,
        code: 'FORBIDDEN',
      });
    }
    next();
  };
}

/**
 * Require that the requesting admin can access the specified case.
 * Attaches the user record to req.caseUser for downstream use.
 * @param {Function} getUserFn - (userId) → User (from store)
 */
export function requireCaseAccess(getUserFn) {
  return (req, res, next) => {
    const { caseId } = req.params;
    const user = getUserFn(caseId); // caseId === userId in this system
    if (!user) {
      return res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });
    }
    if (!canAccessCase(req.adminRole, req.adminPartnerOrgId, user)) {
      return res.status(403).json({ error: 'Access denied for this case', code: 'FORBIDDEN' });
    }
    req.caseUser = user;
    next();
  };
}
