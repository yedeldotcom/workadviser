/**
 * Admin Server — Express application
 *
 * Starts the admin API server.
 * Port: process.env.ADMIN_PORT or 3001 (default).
 *
 * Usage:
 *   node src/admin/server.js
 *   ADMIN_PORT=3001 node src/admin/server.js
 */

import express from 'express';
import adminRouter from './router.js';

export function createAdminApp() {
  const app = express();

  app.use(express.json());

  // Admin API mounted at /admin
  app.use('/admin', adminRouter);

  // 404 fallback
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    console.error('[admin]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Start server only when run directly (not imported in tests)
if (process.argv[1]?.endsWith('server.js')) {
  const PORT = parseInt(process.env.ADMIN_PORT ?? '3001', 10);
  const app = createAdminApp();
  app.listen(PORT, () => {
    console.log(`WorkAdviser Admin API listening on http://localhost:${PORT}/admin`);
  });
}
