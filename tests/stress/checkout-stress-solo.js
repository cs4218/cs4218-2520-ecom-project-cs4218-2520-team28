// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// checkout-stress-solo.js — Story 3A: token_ramp endpoint in isolation
//
// PURPOSE
//   Stress the highest-frequency checkout endpoint —
//   GET /api/v1/product/braintree/token — in isolation.
//   This endpoint is called on every cart page mount, even when the user is
//   just browsing without purchasing.  Isolating it reveals the base Braintree
//   SDK network latency before full-journey noise is added.
//   Compare against checkout-stress.js (3B) to measure combined interference.
//
// VU STAIRCASE  (1 min ramp + 3 min hold per step)
//   Step 1 :  50 VUs   — baseline; every cart visitor gets a Braintree client token
//   Step 2 : 100 VUs   — moderate; watch connection pool and Braintree API rate limits
//   Step 3 : 200 VUs   — ceiling candidate; breaking point expected at this step
//
// THRESHOLD RATIONALE
//   p(95) < 1000 ms — the Braintree token call is invisible to the user but blocks
//   the cart page from rendering.  If it exceeds 1 s, the user stares at a blank
//   cart with no payment form.  abortOnFail terminates as soon as the ceiling is found.
//   delayAbortEval: '60s' prevents false abort during the warm-up ramp.
//
// PREREQUISITES
//   Backend : npm run server  (port 6060, or override BASE_URL)
//   Auth    : A valid probe user must exist (created by setup() idempotently)
//   Braintree sandbox must be configured in the server environment
//   Frontend: NOT required — this is an API-only test
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/checkout-stress-solo.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/checkout-stress-solo.txt"

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken } from './helpers/auth.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// ─── Probe credentials ─────────────────────────────────────────────────────
// Dedicated checkout probe user — separate from auth probe to avoid cross-contamination.
const PROBE_EMAIL = 'stress.checkout@k6.test';
const PROBE_PASS  = 'CheckoutProbe@k6!';

// ─── Per-VU JWT cache ─────────────────────────────────────────────────────
// Each VU logs in once on the first iteration and reuses the JWT.
// This isolates the braintree/token call from login latency.
let cachedToken = null;

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── token_ramp ──────────────────────────────────────────────────────────
    // GET /api/v1/product/braintree/token — called on every cart page mount.
    // Requires a valid JWT (requireSignIn middleware) — VU logs in once on first
    // iteration to obtain a token, then reuses it across subsequent iterations.
    token_ramp: {
      executor:  'ramping-vus',
      exec:      'tokenRamp',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  30 }, { duration: '3m',  target:  30 },
        { duration: '1m',  target:  60 }, { duration: '3m',  target:  60 },
        { duration: '1m',  target:  90 }, { duration: '3m',  target:  90 },
        { duration: '1m',  target: 120 }, { duration: '3m',  target: 120 },
        { duration: '1m',  target: 150 }, { duration: '3m',  target: 150 },
        { duration: '1m',  target: 180 }, { duration: '3m',  target: 180 },
        { duration: '1m',  target: 210 }, { duration: '3m',  target: 210 },
        { duration: '1m',  target: 240 }, { duration: '3m',  target: 240 },
        { duration: '1m',  target: 270 }, { duration: '3m',  target: 270 },
        { duration: '1m',  target: 300 }, { duration: '3m',  target: 300 }
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // token_ramp: invisible call that blocks cart page render.
    'http_req_duration{scenario:token_ramp}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
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
// Creates the probe user idempotently.
// registerController returns 201 on first call, 200 with success:false if already exists.
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Checkout Stress User', email: PROBE_EMAIL, password: PROBE_PASS,
      phone: '55555555', address: 'Checkout Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, {
    'checkout probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });
  return { email: PROBE_EMAIL, pass: PROBE_PASS };
}

// ─── Scenario: token_ramp ────────────────────────────────────────────────────
// Simulates cart page mounts requesting a Braintree client token.
// VU logs in once to obtain a JWT, then calls the protected token endpoint.
export function tokenRamp(data) {
  // One-time login per VU — reuse JWT for all subsequent iterations.
  if (!cachedToken) {
    cachedToken = getToken(BASE_URL, data.email, data.pass);
  }

  const res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
    headers: { authorization: cachedToken || '' },
  });

  check(res, {
    'braintree token status 200':    (r) => r.status === 200,
    'braintree token clientToken':   (r) => {
      try { return typeof r.json('clientToken') === 'string'; } catch { return false; }
    },
  });

  // 0.5 s think time — cart page renders between token fetches.
  sleep(0.5);
}
