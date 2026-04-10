// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// helpers/auth.js — reusable JWT acquisition helper for stress test scripts
//
// PURPOSE
//   Performs a POST /api/v1/auth/login and returns the JWT token string.
//   Used by checkout and admin scripts that need an authenticated session before
//   calling protected endpoints.  Returns null on failure and logs the status so
//   the calling scenario can decide whether to skip the iteration.
//
// USAGE  (in a scenario function or setup())
//   import { getToken } from './helpers/auth.js';
//   const token = getToken(BASE_URL, email, password);
//   if (!token) return;   // skip iteration if login failed

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

/**
 * Login and return the JWT token string, or null on failure.
 *
 * @param {string} baseUrl  - API base URL (default: BASE_URL env)
 * @param {string} email    - User email
 * @param {string} password - User password
 * @returns {string|null}   - JWT token or null
 */
export function getToken(baseUrl, email, password) {
  const url = (baseUrl || BASE_URL) + '/api/v1/auth/login';
  const res = http.post(
    url,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    'auth helper: login status 200': (r) => r.status === 200,
    'auth helper: token issued':     (r) => { try { return typeof r.json('token') === 'string'; } catch { return false; } },
  });

  try {
    const token = res.json('token');
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}

/**
 * Return standard JSON + Authorization headers for a protected API call.
 *
 * @param {string} token - JWT token (result of getToken)
 * @returns {object}     - headers object
 */
export function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'authorization': token || '',
  };
}
