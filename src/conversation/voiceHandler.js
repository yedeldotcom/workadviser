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

// Lazy-initialised OpenAI client — only imported and created when first needed.
// This avoids crashing in environments where the 'openai' package is not installed
// (e.g. test environments that don't use voice transcription).
let _whisperClient = null;
async function getWhisperClient() {
  if (!_whisperClient) {
    const { default: OpenAI } = await import('openai');
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
      text: '[הודעה קולית — תמלול לא זמין כרגע. אפשר לכתוב בטקסט.]',
      provider: 'stub',
      confidence: 0.0,
      languageDetected: null,
      transcribedAt: new Date().toISOString(),
    };
  }

  const ext = MIME_TO_EXT[mimeType] ?? 'ogg';
  const filename = `voice.${ext}`;
  const model = process.env.WHISPER_MODEL ?? 'whisper-1';

  const { toFile } = await import('openai');
  const file = await toFile(audioBuffer, filename, { type: mimeType });
  const client = await getWhisperClient();
  const transcription = await client.audio.transcriptions.create({
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
  return 'תודה על ההודעה הקולית! כרגע אפשר לקרוא טקסט בלבד. אפשר לכתוב את התשובה בקצרה?';
}

/**
 * Download a media file from Meta Cloud API using its media ID.
 *
 * Two-step process:
 *   1. GET https://graph.facebook.com/v19.0/{mediaId} → { url }
 *   2. GET {url} → binary audio data
 *
 * Uses META_ACCESS_TOKEN env var for authorization.
 *
 * @param {string} mediaId - Meta media object ID from the webhook payload
 * @returns {Promise<Buffer | null>}
 */
export async function downloadMediaFromMeta(mediaId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || !mediaId) return null;

  // Step 1: Get the media download URL
  const metaResp = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaResp.ok) {
    throw new Error(`Meta media lookup failed: ${metaResp.status} ${metaResp.statusText}`);
  }
  const { url } = await metaResp.json();

  // Step 2: Download the binary audio data
  const audioResp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!audioResp.ok) {
    throw new Error(`Meta media download failed: ${audioResp.status} ${audioResp.statusText}`);
  }
  return Buffer.from(await audioResp.arrayBuffer());
}
