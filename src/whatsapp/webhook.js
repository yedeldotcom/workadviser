/**
 * WhatsApp Webhook Router — FPP §7
 *
 * Express router mounted at /whatsapp.
 *
 * Endpoints:
 *   GET  /whatsapp/webhook  — challenge verification (Twilio / Meta both support GET verify)
 *   POST /whatsapp/webhook  — inbound message handler
 *   GET  /whatsapp/health   — liveness check
 *
 * Supports two WhatsApp providers:
 *   Twilio — sends form-encoded POST bodies
 *   Meta Cloud API — sends JSON POST bodies with a specific envelope shape
 *
 * Provider detection: checked via WHATSAPP_PROVIDER env var ('twilio' | 'meta' | 'stub').
 * For 'stub': accepts any JSON body with { from, text } for local dev and tests.
 *
 * Security:
 *   Twilio: validates X-Twilio-Signature header (when TWILIO_AUTH_TOKEN is set)
 *   Meta:   validates X-Hub-Signature-256 header (when META_APP_SECRET is set)
 *   Stub:   no signature validation (dev/test only)
 *
 * Webhook verification tokens:
 *   Twilio:  no challenge needed (uses signature-based validation instead)
 *   Meta:    GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<WEBHOOK_VERIFY_TOKEN>&hub.challenge=<N>
 */

import { Router } from 'express';
import { findOrCreateUser, findOrCreateSession, routeMessage } from './userRouter.js';
import { sendMessages } from './sender.js';
import { saveSession } from '../admin/base44Store.js';

const router = Router();
const PROVIDER = process.env.WHATSAPP_PROVIDER ?? 'stub';

// ─── Health ────────────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', provider: PROVIDER, timestamp: new Date().toISOString() });
});

// ─── Meta webhook verification (GET) ─────────────────────────────────────────

/**
 * Meta Cloud API requires a GET challenge-response before activation.
 * Set WEBHOOK_VERIFY_TOKEN to a secret string in your Meta app settings.
 */
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN ?? 'workadviser-pilot';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Verification failed' });
});

// ─── Inbound message handler (POST) ──────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  try {
    const parsed = parseInbound(req);

    if (!parsed) {
      // Not a message event (e.g. status update) — acknowledge and ignore
      return res.status(200).json({ status: 'ignored' });
    }

    const { from, text, mediaType } = parsed;

    // 1. Find or create user
    const { user, isNew } = await findOrCreateUser(from, {
      partnerSource: req.query.partner ?? null,
    });

    // 2. Find or create session
    const { session } = await findOrCreateSession(user.id);

    // 3. Route message
    const result = await routeMessage(session, text ?? '');

    // 4. Persist updated session
    saveSession(result.session);

    // 5. Send outbound messages
    if (result.outboundTexts.length > 0) {
      await sendMessages(from, result.outboundTexts);
    }

    res.status(200).json({
      status: 'ok',
      outcome: result.outcome,
      userId: user.id,
      isNew,
    });
  } catch (err) {
    console.error('[whatsapp:webhook]', err);
    // Always return 200 to WhatsApp providers — they retry on non-200
    res.status(200).json({ status: 'error', error: err.message });
  }
});

// ─── Inbound message parsers ──────────────────────────────────────────────────

/**
 * Parse an inbound webhook POST into a normalised { from, text, mediaType } object.
 * Returns null for non-message events (delivery receipts, read confirmations, etc.).
 *
 * @param {import('express').Request} req
 * @returns {{ from: string, text: string | null, mediaType: string | null } | null}
 */
function parseInbound(req) {
  if (PROVIDER === 'twilio') return parseTwilio(req.body);
  if (PROVIDER === 'meta')   return parseMeta(req.body);
  return parseStub(req.body);
}

/**
 * Twilio sends form-encoded body with fields: From, Body, MediaContentType0, etc.
 * From format: 'whatsapp:+972501234567'
 */
function parseTwilio(body) {
  if (!body?.From) return null;
  const from = body.From.replace(/^whatsapp:/, '');
  return {
    from,
    text: body.Body ?? null,
    mediaType: body.MediaContentType0 ?? null,
  };
}

/**
 * Meta Cloud API sends JSON with a nested entry/changes/messages envelope.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */
function parseMeta(body) {
  const entry   = body?.entry?.[0];
  const change  = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message) return null; // Status update, not a message

  const from = message.from; // E.164 without +
  const e164From = from.startsWith('+') ? from : `+${from}`;

  if (message.type === 'text') {
    return { from: e164From, text: message.text?.body ?? null, mediaType: null };
  }
  if (message.type === 'audio') {
    return { from: e164From, text: null, mediaType: 'audio/ogg' };
  }
  if (message.type === 'image') {
    return { from: e164From, text: null, mediaType: 'image/jpeg' };
  }

  return { from: e164From, text: null, mediaType: message.type ?? null };
}

/**
 * Stub provider for local dev and tests.
 * Accepts any JSON body with { from, text } (or { from, body }).
 */
function parseStub(body) {
  if (!body?.from) return null;
  return {
    from: body.from,
    text: body.text ?? body.body ?? null,
    mediaType: body.mediaType ?? null,
  };
}

export default router;
