/**
 * Foo Chao, A0272024R
 * AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
 * 
 * calibration-probe.js
 *
 * PURPOSE:  Fast VU ceiling finder for POST /api/v1/auth/login.
 *
 * This is NOT a stress test submission.  It uses 30-second hold durations
 * (instead of the 3-minute holds in the real scripts) so the doubling loop
 * completes in ~5-10 minutes rather than ~40 minutes.
 *
 * HOW TO USE (CLI):
 *   k6 run tests/stress/calibration-probe.js -e TARGET_VUS=50  --web-dashboard
 *   k6 run tests/stress/calibration-probe.js -e TARGET_VUS=100 --web-dashboard
 *   k6 run tests/stress/calibration-probe.js -e TARGET_VUS=200 --web-dashboard
 *   ...double until p(95) > 300ms OR error rate >= 1%.
 *   The last PASSING value is L (the login ceiling).
 *   All other scenario VU ceilings are derived from L — see ratio table in PLAN.md.
 *
 * WHY LOGIN:
 *   POST /api/v1/auth/login calls bcrypt.compare(10 rounds) on every request.
 *   bcrypt is CPU-bound, making login the natural system-wide CPU ceiling anchor.
 *   Lighter endpoints (JWT checks, DB reads) will handle more VUs than L;
 *   heavier operations (register, forgot-password, checkout) will handle fewer.
 *
 * THRESHOLD:
 *   p(95) < 300ms is tighter than the 1000ms user-tolerance threshold —
 *   this is intentional.  Calibrate conservatively so the real scripts stay
 *   comfortably below UX-degradation territory.
 *
 * DO NOT submit this file as a stress test result.
 *
 */

import http from 'k6/http';
import { check } from 'k6';

// ─── Configuration ────────────────────────────────────────────────────────────

// Override via CLI: -e TARGET_VUS=<n>
// Default 50 is a safe first step; double each run until threshold fails.
const TARGET_VUS = __ENV.TARGET_VUS ? parseInt(__ENV.TARGET_VUS, 10) : 50;

// Probe user — created once in setup(), reused by all VUs.
// Using a fixed probe account keeps bcrypt work identical across every VU,
// making the CPU measurement clean and reproducible.
const PROBE_EMAIL = 'stress.probe@k6.test';
const PROBE_PASS  = 'ProbePass@k6!';

// App base URL — matches the .env PORT (6060)
const BASE_URL = 'http://localhost:6060';

// ─── Test options ─────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    login_probe: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '30s', target: TARGET_VUS }, // ramp up to ceiling candidate
        { duration: '30s', target: TARGET_VUS }, // hold — Copilot reads p(95) and error rate here
        { duration: '10s', target: 0           }, // cool-down before next probe run
      ],
      // Give any in-flight login up to 5 s to finish during ramp-down.
      gracefulRampDown: '5s',
    },
  },

  thresholds: {
    // Calibration stopping condition: if this FAILS → previous TARGET_VUS was L.
    // 300ms gives a comfortable gap below the 1000ms user-tolerance floor,
    // so the real stress scripts are not right at the edge of user pain.
    'http_req_duration{scenario:login_probe}': ['p(95)<300'],
    // Error gate: any network failure / 4xx / 5xx means the server is already failing.
    'http_req_failed': ['rate<0.01'],
  },
};

// ─── Setup (runs once, before any VU starts) ──────────────────────────────────

/**
 * Registers the probe user if they do not exist yet.
 * Returns credentials so every VU's default() can call login without
 * importing any external helper.
 *
 * The register endpoint returns:
 *   201 Created              → user was just created ✓
 *   200 { success: false }  → "Already Register please login" ✓ (subsequent runs)
 *   anything else            → unexpected; probe should not proceed
 */
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:    'K6 Probe User',
      email:   PROBE_EMAIL,
      password: PROBE_PASS,
      phone:   '00000000',
      address: 'Probe HQ',
      answer:  'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // Both outcomes mean the probe user exists and is ready.
  const alreadyExists = res.status === 200 && res.json('success') === false;
  const justCreated   = res.status === 201;

  check(res, {
    'probe user is ready': () => alreadyExists || justCreated,
  });

  return { email: PROBE_EMAIL, password: PROBE_PASS };
}

// ─── Default (called by every VU on every iteration) ─────────────────────────

/**
 * Hammers POST /api/v1/auth/login so bcrypt.compare fires on every call.
 * All VUs share the same account deliberately — what we measure is bcrypt CPU
 * capacity on the server, not uniqueness of user records.
 *
 * Assertions checked:
 *   status 200   — HTTP layer is healthy (not 4xx/5xx)
 *   has token    — loginController completed successfully and issued a JWT
 *   login ok     — response body confirms success:true (not a soft-fail 200)
 */
export default function (data) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: data.email, password: data.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'has token':  (r) => {
      try { return r.json('token') !== undefined; } catch { return false; }
    },
    'login ok':   (r) => {
      try { return r.json('success') === true; } catch { return false; }
    },
  });
}
