/**
 * Base44 Client — singleton SDK client for all server-side persistence.
 *
 * Replaces the volatile in-memory store with Base44's managed backend.
 * All data operations go through base44Store.js, which uses `db` from here.
 *
 * Required env vars: BASE44_APP_ID, BASE44_SERVICE_TOKEN
 */

import { createClient } from '@base44/sdk';

if (!process.env.BASE44_APP_ID) {
  throw new Error('BASE44_APP_ID environment variable is required. Set it to your Base44 app ID.');
}

if (!process.env.BASE44_SERVICE_TOKEN) {
  throw new Error('BASE44_SERVICE_TOKEN environment variable is required. Set it to your Base44 API key.');
}

export const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  serviceToken: process.env.BASE44_SERVICE_TOKEN,
});

/**
 * Service-role entity client — bypasses user-scoped permissions.
 * All server-side reads and writes should use this.
 */
export const db = base44.asServiceRole.entities;
