// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// auth-stress-solo.js — Story 1A: POST /api/v1/auth/login in isolation
//
// PURPOSE
//   Find the bcrypt CPU breaking point for login under a sustained staircase load
//   without interference from other concurrent auth scenarios.  Run this BEFORE
//   auth-stress.js so you have a clean isolated baseline to compare against.
//
// STAIRCASE SHAPE  (+10 VUs per step; 1 min ramp + 3 min hold each)
//   Starts at L = 10 (the calibrated starting point) and steps up by 10 each stage.
//   abortOnFail on the p(95) threshold terminates the run automatically the
//   instant the UX limit is breached — breaking point always found without re-runs.
//
// THRESHOLD RATIONALE
//   p(95) < 1000 ms — Nielsen Norman "acceptable" boundary.
//   A user clicking Login expects a snappy response.  Anything beyond 1 s makes
//   the login page feel broken.  The calibration probe uses the tighter 300 ms
//   gate so the real test has a comfortable gap below the UX degradation floor.
//
// NOTE: All VUs share one probe account intentionally.
//   bcrypt work per call is determined by the hash, not the user identity.
//   A single shared account keeps the CPU cost uniform and reproducible.
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/auth-stress-solo.js --out influxdb=http://localhost:8086/k6

import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── URLs ─────────────────────────────────────────────────────────────────────
// Default: the backend .env PORT (6060).
// Override with  -e BASE_URL=<url>  (e.g. when running via MCP Docker container:
//   -e BASE_URL=http://host.docker.internal:6060 )
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// ─── Probe credentials ────────────────────────────────────────────────────────
// Single shared account — bcrypt cost is per-hash, not per-user, so sharing is correct.
const PROBE_EMAIL = 'stress.solo@k6.test';
const PROBE_PASS  = 'SoloProbe@k6!';

// ─── Options ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    login_flow: {
      executor:  'ramping-vus',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 10 }, // ramp to Step 1
        { duration: '3m',  target: 10 }, // hold Step 1
        { duration: '1m',  target: 20 }, // ramp to Step 2
        { duration: '3m',  target: 20 }, // hold Step 2
        { duration: '1m',  target: 30 }, // ramp to Step 3
        { duration: '3m',  target: 30 }, // hold Step 3
        { duration: '1m',  target: 40 }, // ramp to Step 4
        { duration: '3m',  target: 40 }, // hold Step 4
        { duration: '1m',  target: 50 }, // ramp to Step 5
        { duration: '3m',  target: 50 }, // hold Step 5
        { duration: '1m',  target: 60 }, // ramp to Step 6
        { duration: '3m',  target: 60 }, // hold Step 6
        { duration: '1m',  target: 70 }, // ramp to Step 7
        { duration: '3m',  target: 70 }, // hold Step 7
        { duration: '1m',  target: 80 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target: 80 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // UX threshold — abortOnFail: true stops the entire run the instant p(95) ≥ 1000 ms.
    // delayAbortEval: '60s' lets the current step warm up before the threshold is checked,
    // avoiding a false abort during the ramp phase.
    'http_req_duration{scenario:login_flow}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate — abort immediately if > 1 % of requests fail (connections refused,
    // timeouts, 4xx/5xx).  No delay needed: a sustained error spike is never a warm-up artefact.
    'http_req_failed': [{ threshold: 'rate<0.01', abortOnFail: true }],

    // Explicit assertion gate — catches silent 200-OK responses with error bodies
    // (e.g. {"success":false,"message":"Invalid Password"}).
    'checks': [{ threshold: 'rate>0.99', abortOnFail: true }],
  },
};

// ─── Setup (runs once before any VU starts) ───────────────────────────────────
// Creates the probe user if it does not exist yet.  Idempotent — safe to re-run.
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:     'Stress Solo User',
      email:    PROBE_EMAIL,
      password: PROBE_PASS,
      phone:    '11111111',
      address:  'Stress Test HQ',
      answer:   'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // registerController returns:
  //   201 Created             → user just created       ✓
  //   200 { success: false }  → "Already Register …"   ✓ (idempotent on re-runs)
  const justCreated   = res.status === 201;
  const alreadyExists = res.status === 200 && res.json('success') === false;

  check(res, {
    'probe user is ready': () => justCreated || alreadyExists,
  });

  return { email: PROBE_EMAIL, password: PROBE_PASS };
}

// ─── Default function (called by every VU on every iteration) ─────────────────
// All VUs hammer POST /api/v1/auth/login.  bcrypt.compare(10 rounds) fires every
// call — this is a pure CPU throughput test for the bcrypt thread pool.
export default function (data) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: data.email, password: data.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    // HTTP layer: server must not return a network error or 4xx/5xx
    'status 200':      (r) => r.status === 200,
    // Business logic: loginController confirmed success (not a soft-fail 200)
    'login succeeded': (r) => { try { return r.json('success') === true;         } catch { return false; } },
    // JWT issued: the token field must be a string in the response body
    'token issued':    (r) => { try { return typeof r.json('token') === 'string'; } catch { return false; } },
  });

  // 0.1 s think time — prevents VUs from busy-spinning between iterations.
  // At 10 VUs × ~170 ms bcrypt + 100 ms think = ~270 ms/iter → ~37 RPS total,
  // which is enough to saturate the bcrypt thread pool at ceiling VU count.
  sleep(0.1);
}
