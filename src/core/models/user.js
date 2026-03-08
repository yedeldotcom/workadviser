/**
 * User — FPP §9.1
 *
 * Top-level identity record. Created on first contact (WhatsApp or web).
 * Deliberately minimal — sensitive data lives in UserProfile.
 */

/**
 * @typedef {'whatsapp' | 'web'} Channel
 * @typedef {'pending' | 'given' | 'withdrawn'} ConsentState
 */

/**
 * @typedef {Object} User
 * @property {string} id                - Stable UUID
 * @property {string} createdAt         - ISO timestamp
 * @property {Channel} channel          - Entry channel
 * @property {string | null} phoneNumber - WhatsApp E.164 number; null for web
 * @property {ConsentState} consentState
 * @property {string | null} partnerSource - Referring partner org ID, if any
 */

/**
 * Create a new User.
 * @param {Partial<User>} fields
 * @returns {User}
 */
export function createUser(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    createdAt: fields.createdAt ?? new Date().toISOString(),
    channel: fields.channel ?? 'whatsapp',
    phoneNumber: fields.phoneNumber ?? null,
    consentState: fields.consentState ?? 'pending',
    partnerSource: fields.partnerSource ?? null,
  };
}
