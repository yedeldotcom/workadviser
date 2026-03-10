/**
 * Base44 Client — direct HTTP client for server-side persistence.
 *
 * Uses the Base44 REST API with api_key header authentication.
 * asServiceRole (Bearer token) only works inside Base44-hosted functions;
 * external services (Railway) must use api_key header instead.
 *
 * Required env vars: BASE44_APP_ID, BASE44_API_KEY
 * (BASE44_API_KEY is the same key shown in Base44 → API tab)
 */

const APP_ID  = process.env.BASE44_APP_ID;
const API_KEY = process.env.BASE44_API_KEY ?? process.env.BASE44_SERVICE_TOKEN;
const BASE_URL = 'https://base44.app/api';

// Env var validation is deferred to request-time so that importing this module
// in test environments (where BASE44_* vars are not set) does not throw.
// Any real API call will still fail fast with a clear error message.

async function request(method, path, { body, params } = {}) {
  if (!APP_ID) throw new Error('BASE44_APP_ID environment variable is required.');
  if (!API_KEY) throw new Error('BASE44_API_KEY environment variable is required.');

  const DEFAULT_HEADERS = {
    'api_key': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  let url = `${BASE_URL}/apps/${APP_ID}/entities/${path}`;
  if (params && Object.keys(params).length > 0) {
    // Use encodeURIComponent (not URLSearchParams) so that + in phone numbers
    // becomes %2B instead of being decoded as a space on the server side.
    const parts = [];
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
    url += '?' + parts.join('&');
  }

  const res = await fetch(url, {
    method,
    headers: DEFAULT_HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg;
    try { msg = (await res.json()).message ?? res.statusText; }
    catch { msg = res.statusText; }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function createEntityHandler(entityName) {
  return {
    $name: entityName, // Exposed for logging in upsert
    list(sort, limit, skip) {
      const params = {};
      if (sort)  params.sort  = sort;
      if (limit) params.limit = limit;
      if (skip)  params.skip  = skip;
      return request('GET', entityName, { params });
    },
    filter(query, sort, limit, skip) {
      // Base44 REST API uses 'filter' as the query param name (not 'q').
      const filterStr = JSON.stringify(query);
      const params = { filter: filterStr };
      if (sort)  params.sort  = sort;
      if (limit) params.limit = limit;
      if (skip != null && skip !== 0) params.skip = skip;
      console.log(`[base44Client] filter ${entityName} filter=${filterStr}${limit ? ` limit=${limit}` : ''}`);
      return request('GET', entityName, { params });
    },
    get(id) {
      return request('GET', `${entityName}/${id}`);
    },
    create(data) {
      return request('POST', entityName, { body: data });
    },
    update(id, data) {
      return request('PUT', `${entityName}/${id}`, { body: data });
    },
    delete(id) {
      return request('DELETE', `${entityName}/${id}`);
    },
  };
}

/**
 * Entity client — same interface as base44.asServiceRole.entities
 * but uses api_key header (works from external services like Railway).
 */
export const db = new Proxy({}, {
  get(_, entityName) {
    if (typeof entityName !== 'string' || entityName === 'then' || entityName.startsWith('_')) {
      return undefined;
    }
    return createEntityHandler(entityName);
  },
});
