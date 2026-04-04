// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// admin-stress-solo.js — Story 4A: all_orders_poll endpoint in isolation
//
// PURPOSE
//   Stress the most frequently polled admin endpoint —
//   GET /api/v1/auth/all-orders — in isolation.
//   The admin dashboard auto-refreshes this endpoint to show new orders.
//   Isolating it reveals the base read performance of the full orders collection
//   before write contention (concurrent status updates, product uploads) is introduced.
//   Compare against admin-stress.js (4B) to measure combined interference.
//
// VU STAIRCASE  (1 min ramp + 3 min hold per step)
//   Step 1 :  15 VUs   — baseline; admin staff team size is small
//   Step 2 :  30 VUs   — moderate; multiple browser tabs and background polling
//   Step 3 :  50 VUs   — ceiling candidate; large result set ceiling expected here
//
// THRESHOLD RATIONALE
//   p(95) < 2000 ms — the admin orders list is a large dataset (all orders, all users).
//   Admins are power users and slightly more tolerant of latency, but a 2 s wait is
//   still noticeable for a frequently auto-refreshed table.
//   abortOnFail terminates as soon as the ceiling is found.
//   delayAbortEval: '60s' prevents false abort during the warm-up ramp.
//
// PREREQUISITES
//   Backend : npm run server  (port 6060, or override BASE_URL)
//   Auth    : An admin probe user must exist (created by setup() idempotently)
//   DB      : At least 10 orders pre-seeded so the result set is non-trivial
//   Frontend: NOT required — this is an API-only test
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/admin-stress-solo.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/admin-stress-solo.txt"

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken } from './helpers/auth.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// ─── Probe credentials ─────────────────────────────────────────────────────
// Admin probe user — must have role:1 (admin) in the DB.
// setup() registers the user; the role must be set manually or via a seed script
// if the registerController defaults all users to role:0.
// Admin role is checked by the requireAdmin middleware using JWT payload .role.
const ADMIN_EMAIL = 'stress.admin@k6.test';
const ADMIN_PASS  = 'AdminProbe@k6!';

// ─── Per-VU JWT cache ─────────────────────────────────────────────────────
let cachedAdminToken = null;

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── all_orders_poll ─────────────────────────────────────────────────────
    // GET /api/v1/auth/all-orders — the admin orders dashboard.
    // Requires admin JWT (requireAdmin middleware checks role from JWT payload).
    all_orders_poll: {
      executor:  'ramping-vus',
      exec:      'allOrdersPoll',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 },
        { duration: '1m',  target: 70 }, { duration: '3m',  target: 70 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 },
        { duration: '1m',  target: 90 }, { duration: '3m',  target: 90 },
        { duration: '1m',  target: 100 }, { duration: '3m', target: 100 },
        { duration: '1m',  target: 110 }, { duration: '3m', target: 110 },
        { duration: '1m',  target: 120 }, { duration: '3m', target: 120 }
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // all_orders_poll: large dataset — 2 s is the admin's patience threshold.
    'http_req_duration{scenario:all_orders_poll}': [
      { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Assertion gate.
    'checks': [
      { threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '60s' },
    ],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Registers the admin probe user idempotently.
// IMPORTANT: After first registration, set role=1 in MongoDB:
//   db.users.updateOne({ email: 'stress.admin@k6.test' }, { $set: { role: 1 } })
// If the user already has role=1, this registration call returns success:false — safe.
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Admin Stress User', email: ADMIN_EMAIL, password: ADMIN_PASS,
      phone: '66666666', address: 'Admin Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, {
    'admin probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });
  return { email: ADMIN_EMAIL, pass: ADMIN_PASS };
}

// ─── Scenario: all_orders_poll ────────────────────────────────────────────────
// Simulates the admin dashboard auto-refresh: GET all orders.
// VU logs in once to obtain an admin JWT, then polls the endpoint.
export function allOrdersPoll(data) {
  // One-time login per VU.
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, data.email, data.pass);
  }

  const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
    headers: { authorization: cachedAdminToken || '' },
  });

  check(res, {
    'all-orders status 200':  (r) => r.status === 200,
    'all-orders array':       (r) => {
      try { return Array.isArray(r.json('orders')); } catch { return false; }
    },
  });

  // 3 s think time — admin dashboard auto-refresh interval is typically 3–5 s.
  // At 15 VUs × (avg_latency + 3 s) this yields ~4–5 RPS, which is realistic.
  sleep(3);
}
