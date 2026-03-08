/**
 * NormalizedSignal — FPP §9.1
 *
 * A structured signal extracted from a raw message.
 * Multiple signals can be extracted from one message.
 */

/**
 * @typedef {'barrier_score' | 'distress_indicator' | 'trigger_mention' |
 *           'amplifier_mention' | 'employment_event' | 'disclosure_intent'} SignalType
 *
 * @typedef {Object} NormalizedSignal
 * @property {string} id
 * @property {string} sourceMessageId
 * @property {string} sessionId
 * @property {SignalType} signalType
 * @property {*} value                     - Signal-type-dependent value
 * @property {number} confidence           - 0.0–1.0
 * @property {string[]} barrierIds         - Implicated barrier IDs
 * @property {string[]} triggerIds         - Implicated trigger IDs
 * @property {string[]} amplifierIds       - Implicated amplifier IDs
 * @property {string | null} questionId    - Source question, if any
 * @property {string} detectedAt           - ISO timestamp
 */

export function createNormalizedSignal(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    version: fields.version ?? '1.0',
    sourceMessageId: fields.sourceMessageId ?? null,
    sessionId: fields.sessionId ?? null,
    signalType: fields.signalType ?? 'barrier_score',
    value: fields.value ?? null,
    confidence: fields.confidence ?? 1.0,
    barrierIds: fields.barrierIds ?? [],
    triggerIds: fields.triggerIds ?? [],
    amplifierIds: fields.amplifierIds ?? [],
    questionId: fields.questionId ?? null,
    detectedAt: fields.detectedAt ?? new Date().toISOString(),
  };
}
