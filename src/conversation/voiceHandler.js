/**
 * VoiceHandler — FPP §2.3B
 *
 * Voice note transcription via OpenAI Whisper API (Hebrew-capable).
 *
 * The FPP specifies that users may respond via voice note (common in WhatsApp).
 * This module accepts audio and returns transcribed text for the interview pipeline.
 *
 * Environment variables:
 *   VOICE_TRANSCRIPTION_ENABLED = 'true'   — activates real transcription
 *   WHISPER_API_KEY                         — OpenAI API key for Whisper
 *   WHISPER_MODEL                           — model name (default: 'whisper-1')
 */

import OpenAI from 'openai';
import { toFile } from 'openai';

// Lazy-initialised client — only created when first needed
let _whisperClient = null;
function getWhisperClient() {
  if (!_whisperClient) {
    _whisperClient = new OpenAI({ apiKey: process.env.WHISPER_API_KEY });
  }
  return _whisperClient;
}

/**
 * @typedef {'audio/ogg' | 'audio/mp4' | 'audio/mpeg' | 'audio/webm'} AudioMimeType
 *
 * @typedef {Object} TranscriptionResult
 * @property {string} text                - Transcribed text in Hebrew
 * @property {'stub' | 'whisper'} provider
 * @property {number} confidence          - 0.0–1.0
 * @property {string | null} languageDetected
 * @property {string} transcribedAt       - ISO timestamp
 */

// MIME type → file extension map for Whisper upload
const MIME_TO_EXT = {
  'audio/ogg':  'ogg',
  'audio/mp4':  'mp4',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
};

/**
 * Transcribe a voice note audio buffer to text.
 *
 * When `VOICE_TRANSCRIPTION_ENABLED=true` and `WHISPER_API_KEY` is set,
 * sends the audio to OpenAI Whisper for transcription.
 * Otherwise returns a stub response asking the user to type instead.
 *
 * @param {Buffer | Uint8Array} audioBuffer - Raw audio data
 * @param {AudioMimeType} [mimeType='audio/ogg']
 * @param {string} [languageHint='he']
 * @returns {Promise<TranscriptionResult>}
 */
export async function transcribeVoiceNote(audioBuffer, mimeType = 'audio/ogg', languageHint = 'he') {
  if (process.env.VOICE_TRANSCRIPTION_ENABLED !== 'true' || !process.env.WHISPER_API_KEY) {
    return {
      text: '[הודעה קולית — תמלול לא זמין כרגע. אנא ענה/י בטקסט.]',
      provider: 'stub',
      confidence: 0.0,
      languageDetected: null,
      transcribedAt: new Date().toISOString(),
    };
  }

  const ext = MIME_TO_EXT[mimeType] ?? 'ogg';
  const filename = `voice.${ext}`;
  const model = process.env.WHISPER_MODEL ?? 'whisper-1';

  const file = await toFile(audioBuffer, filename, { type: mimeType });
  const transcription = await getWhisperClient().audio.transcriptions.create({
    model,
    file,
    language: languageHint,
  });

  return {
    text: transcription.text,
    provider: 'whisper',
    confidence: 0.9,
    languageDetected: languageHint,
    transcribedAt: new Date().toISOString(),
  };
}

/**
 * Check if voice transcription is available in the current environment.
 * Requires both VOICE_TRANSCRIPTION_ENABLED=true and WHISPER_API_KEY to be set.
 * @returns {boolean}
 */
export function isVoiceTranscriptionAvailable() {
  return process.env.VOICE_TRANSCRIPTION_ENABLED === 'true' && !!process.env.WHISPER_API_KEY;
}

/**
 * Message to send to user when they send a voice note but transcription is unavailable.
 * @returns {string}
 */
export function getVoiceUnavailableMessage() {
  return 'תודה על ההודעה הקולית! כרגע אני יכול/ה לקרוא טקסט בלבד. האם תוכל/י לכתוב את תשובתך בקצרה?';
}
