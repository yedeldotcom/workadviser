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

import express from 'express';
import adminRouter from './admin/router.js';
import webhookRouter from './whatsapp/webhook.js';
import { landingPageHandler } from './whatsapp/landingPage.js';

export function createApp() {
  const app = express();

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
}
