/**
 * VoiceHandler — FPP §2.3B
 *
 * Voice note transcription stub.
 * Production implementation: OpenAI Whisper API or similar Hebrew-capable STT service.
 *
 * The FPP specifies that users may respond via voice note (common in WhatsApp).
 * This module accepts audio and returns transcribed text for the interview pipeline.
 */

/**
 * @typedef {'audio/ogg' | 'audio/mp4' | 'audio/mpeg' | 'audio/webm'} AudioMimeType
 *
 * @typedef {Object} TranscriptionResult
 * @property {string} text                - Transcribed text in Hebrew
 * @property {'stub' | 'whisper' | 'other'} provider
 * @property {number} confidence          - 0.0–1.0
 * @property {string | null} languageDetected
 * @property {string} transcribedAt       - ISO timestamp
 */

/**
 * Transcribe a voice note audio buffer to text.
 *
 * STUB: Returns a placeholder until a real STT provider is wired in.
 * Set `VOICE_TRANSCRIPTION_ENABLED=true` and provide `WHISPER_API_KEY`
 * (or configure an alternative provider) to enable live transcription.
 *
 * @param {Buffer | Uint8Array} audioBuffer - Raw audio data
 * @param {AudioMimeType} [mimeType='audio/ogg']
 * @param {string} [languageHint='he']
 * @returns {Promise<TranscriptionResult>}
 */
export async function transcribeVoiceNote(audioBuffer, mimeType = 'audio/ogg', languageHint = 'he') {
  if (process.env.VOICE_TRANSCRIPTION_ENABLED !== 'true') {
    return {
      text: '[הודעה קולית — תמלול לא זמין כרגע. אנא ענה/י בטקסט.]',
      provider: 'stub',
      confidence: 0.0,
      languageDetected: null,
      transcribedAt: new Date().toISOString(),
    };
  }

  // ─── Real implementation (Whisper) ────────────────────────────────────────
  // Uncomment when WHISPER_API_KEY is available:
  //
  // const { default: OpenAI } = await import('openai');
  // const openai = new OpenAI({ apiKey: process.env.WHISPER_API_KEY });
  //
  // const file = new File([audioBuffer], 'audio.ogg', { type: mimeType });
  // const transcription = await openai.audio.transcriptions.create({
  //   model: 'whisper-1',
  //   file,
  //   language: languageHint,
  // });
  //
  // return {
  //   text: transcription.text,
  //   provider: 'whisper',
  //   confidence: 0.9,
  //   languageDetected: languageHint,
  //   transcribedAt: new Date().toISOString(),
  // };

  throw new Error('Voice transcription is enabled but no provider is configured. Implement transcribeVoiceNote() in voiceHandler.js.');
}

/**
 * Check if voice transcription is available in the current environment.
 * @returns {boolean}
 */
export function isVoiceTranscriptionAvailable() {
  return process.env.VOICE_TRANSCRIPTION_ENABLED === 'true';
}

/**
 * Message to send to user when they send a voice note but transcription is unavailable.
 * @returns {string}
 */
export function getVoiceUnavailableMessage() {
  return 'תודה על ההודעה הקולית! כרגע אני יכול/ה לקרוא טקסט בלבד. האם תוכל/י לכתוב את תשובתך בקצרה?';
}
