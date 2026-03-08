/**
 * WhatsApp Layer — public API (FPP §7)
 *
 * Three sub-modules:
 *   webhook      — Express router: GET verification + POST inbound handler
 *   userRouter   — findOrCreateUser, findOrCreateSession, routeMessage
 *   sender       — sendMessage, sendMessages (stub / Twilio / Meta)
 *   landingPage  — minimal Hebrew HTML landing page handler
 */
export { default as webhookRouter } from './webhook.js';
export { findOrCreateUser, findOrCreateSession, routeMessage } from './userRouter.js';
export { sendMessage, sendMessages } from './sender.js';
export { landingPageHandler } from './landingPage.js';
