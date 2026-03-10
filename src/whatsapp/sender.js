/**
 * WhatsApp Sender — FPP §7
 *
 * Abstraction for outbound WhatsApp message delivery.
 *
 * In the pilot the send is stubbed — messages are logged and returned
 * rather than dispatched to Twilio / Meta Cloud API.
 *
 * To enable real delivery:
 *   1. Set WHATSAPP_PROVIDER = 'twilio' | 'meta'
 *   2. Set provider credentials (see env vars below)
 *   3. The stub automatically upgrades to a real call
 *
 * Env vars:
 *   WHATSAPP_PROVIDER        = 'stub' | 'twilio' | 'meta'  (default: 'stub')
 *   TWILIO_ACCOUNT_SID       = AC...
 *   TWILIO_AUTH_TOKEN        = ...
 *   TWILIO_WHATSAPP_FROM     = whatsapp:+14155238886
 *   META_ACCESS_TOKEN        = ...
 *   META_PHONE_NUMBER_ID     = ...
 */

import { randomUUID } from 'node:crypto';

const PROVIDER = process.env.WHATSAPP_PROVIDER ?? 'stub';

/**
 * @typedef {Object} SendResult
 * @property {boolean} ok
 * @property {string} provider
 * @property {string | null} messageId   - Provider message SID / ID
 * @property {string} sentAt
 * @property {string | null} error
 */

/**
 * Send a WhatsApp text message.
 *
 * @param {string} to        - Recipient E.164 phone number (e.g. '+972501234567')
 * @param {string} text      - Message text (Hebrew or English)
 * @returns {Promise<SendResult>}
 */
export async function sendMessage(to, text) {
  if (PROVIDER === 'twilio') return _sendTwilio(to, text);
  if (PROVIDER === 'meta')   return _sendMeta(to, text);
  return _sendStub(to, text);
}

/**
 * Send multiple messages in sequence with a short delay between them.
 * WhatsApp renders multi-part messages better with a small gap.
 *
 * @param {string} to
 * @param {string[]} texts
 * @param {number} [delayMs=400]
 * @returns {Promise<SendResult[]>}
 */
export async function sendMessages(to, texts, delayMs = 400) {
  const results = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await sendMessage(to, texts[i]));
    if (delayMs > 0 && i < texts.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

// ─── Stub (default for pilot) ─────────────────────────────────────────────────

function _sendStub(to, text) {
  const result = {
    ok: true,
    provider: 'stub',
    messageId: `stub-${randomUUID()}`,
    sentAt: new Date().toISOString(),
    error: null,
  };
  // Log to stdout in dev; silent in test (NODE_ENV=test)
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[whatsapp:stub] → ${to}: ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
  }
  return Promise.resolve(result);
}

// ─── Twilio ───────────────────────────────────────────────────────────────────

async function _sendTwilio(to, text) {
  const sid    = process.env.TWILIO_ACCOUNT_SID;
  const token  = process.env.TWILIO_AUTH_TOKEN;
  const from   = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';

  if (!sid || !token) {
    return { ok: false, provider: 'twilio', messageId: null, sentAt: new Date().toISOString(), error: 'Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN' };
  }

  try {
    const body = new URLSearchParams({ To: `whatsapp:${to}`, From: from, Body: text });
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body }
    );
    const data = await resp.json();
    return {
      ok: resp.ok,
      provider: 'twilio',
      messageId: data.sid ?? null,
      sentAt: new Date().toISOString(),
      error: resp.ok ? null : (data.message ?? `HTTP ${resp.status}`),
    };
  } catch (err) {
    return { ok: false, provider: 'twilio', messageId: null, sentAt: new Date().toISOString(), error: err.message };
  }
}

// ─── Meta Cloud API ───────────────────────────────────────────────────────────

async function _sendMeta(to, text) {
  const token   = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return { ok: false, provider: 'meta', messageId: null, sentAt: new Date().toISOString(), error: 'Missing META_ACCESS_TOKEN or META_PHONE_NUMBER_ID' };
  }

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      }
    );
    const data = await resp.json();
    return {
      ok: resp.ok,
      provider: 'meta',
      messageId: data.messages?.[0]?.id ?? null,
      sentAt: new Date().toISOString(),
      error: resp.ok ? null : (data.error?.message ?? `HTTP ${resp.status}`),
    };
  } catch (err) {
    return { ok: false, provider: 'meta', messageId: null, sentAt: new Date().toISOString(), error: err.message };
  }
}
