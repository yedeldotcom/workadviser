/**
 * Message — FPP §9.1
 *
 * A single inbound or outbound message in an interview session.
 */

/**
 * @typedef {'inbound' | 'outbound'} MessageDirection
 * @typedef {'text' | 'voice' | 'image' | 'system'} InputType
 *
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} sessionId
 * @property {MessageDirection} direction
 * @property {InputType} inputType
 * @property {string | null} rawContent          - Original content (may be voice note URL)
 * @property {string | null} transcribedContent  - Text after transcription (voice notes)
 * @property {string | null} questionId          - Which question this answers (if inbound)
 * @property {string} timestamp                  - ISO
 * @property {Object} metadata                   - WhatsApp message ID, delivery status, etc.
 */

export function createMessage(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    sessionId: fields.sessionId ?? null,
    direction: fields.direction ?? 'inbound',
    inputType: fields.inputType ?? 'text',
    rawContent: fields.rawContent ?? null,
    transcribedContent: fields.transcribedContent ?? null,
    questionId: fields.questionId ?? null,
    timestamp: fields.timestamp ?? new Date().toISOString(),
    metadata: fields.metadata ?? {},
  };
}
