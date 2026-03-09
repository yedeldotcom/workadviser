/**
 * Main Application Server — WorkAdviser
 *
 * Mounts:
 *   GET  /                  → Landing page (Hebrew HTML)
 *   /whatsapp/*             → WhatsApp webhook + routing
 *   /admin/*                → Admin API (requires X-Admin-Role header)
 *
 * Ports (configurable via env):
 *   PORT = 3000 (main)
 *
 * Usage:
 *   node src/server.js
 *   PORT=3000 node src/server.js
 */

import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import express from 'express';
import cors from 'cors';
import adminRouter from './admin/router.js';
import webhookRouter from './whatsapp/webhook.js';
import { landingPageHandler } from './whatsapp/landingPage.js';
import { loadContentOverrides } from './admin/base44Store.js';
import { setOnboardingOverride } from './conversation/onboarding.js';
import { setQuestionBankOverride } from './conversation/interviewer.js';

export function createApp() {
  const app = express();

  // CORS — allow Base44 frontend and any configured origin to call the admin API
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',').map(o => o.trim()).filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, Railway health checks)
      if (!origin) return cb(null, true);
      // Allow any base44.com subdomain or explicitly listed origins
      if (origin.endsWith('.base44.com') || origin === 'https://base44.com' || origin.endsWith('.base44.app') || origin === 'https://base44.app' || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Role', 'X-Partner-Org'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }));

  // Parse JSON bodies (needed for Meta Cloud API + admin routes)
  app.use(express.json());

  // Parse URL-encoded bodies (needed for Twilio)
  app.use(express.urlencoded({ extended: false }));

  // Landing page
  app.get('/', landingPageHandler);

  // WhatsApp webhook + routing
  app.use('/whatsapp', webhookRouter);

  // Admin API
  app.use('/admin', adminRouter);

  // 404 fallback
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    console.error('[server]', err);
    // Always return 200 for WhatsApp routes (providers retry on non-200)
    const status = req.path.startsWith('/whatsapp') ? 200 : 500;
    res.status(status).json({ error: 'Internal server error' });
  });

  return app;
}

// Start only when run directly (not imported in tests)
if (process.argv[1]?.endsWith('server.js')) {
  const PORT = parseInt(process.env.PORT ?? '3000', 10);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`WorkAdviser listening on http://localhost:${PORT}`);
    console.log(`  Landing page : http://localhost:${PORT}/`);
    console.log(`  WhatsApp     : http://localhost:${PORT}/whatsapp/webhook`);
    console.log(`  Admin API    : http://localhost:${PORT}/admin`);
  });

  // Load admin-edited content overrides from Base44 into memory.
  // Non-blocking — if Base44 is unavailable, hardcoded defaults are used.
  loadContentOverrides().then(({ onboarding, questions }) => {
    if (onboarding) setOnboardingOverride(onboarding);
    if (questions)  setQuestionBankOverride(questions);
  }).catch(err => console.error('[server] content load failed:', err.message));
}
