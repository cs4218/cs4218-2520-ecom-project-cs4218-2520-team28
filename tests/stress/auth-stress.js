// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// auth-stress.js — Story 1B: all auth endpoints + frontend pages simultaneous
//
// PURPOSE
//   Run all six auth scenarios simultaneously to find the combined breaking point
//   under realistic mixed auth traffic.  Complements auth-stress-solo.js (1A) which
//   tests login in isolation — compare results to measure interference overhead.
//
// VU STAIRCASE  (each scenario: +step per step, 1 min ramp + 3 min hold)
//   VU ratios reflect realistic auth traffic distribution (from PLAN.md), scaled so
//   login_flow starts at L = 10 (calibration starting point).  All other scenarios'
//   starting VUs are derived from the same PLAN ratios applied to L.
//   Scale factor = L / plan_login_step1 = 10 / 80 = 1/8.
//   abortOnFail: true on every threshold — k6 terminates automatically the instant
//   any p(95) constraint is violated.  Stages extend well past expected stress
//   points so the real breaking point is always found without re-runs.
//
//   Scenario           Reasoning                                   Step 1   Increment
//   ─────────────────  ──────────────────────────────────────────  ───────  ─────────
//   session_check      JWT.verify() only — fires on every nav      20       +20
//   login_flow         bcrypt.compare — once per session            10       +10
//   login_page_load    React SPA fetch — no bcrypt                   8       + 8
//   register_flow      bcrypt.hash — new signups                     3       + 3
//   register_page_load React SPA fetch                               2       + 2
//   forgot_password    bcrypt.hash + DB write — rarest action         1       + 1
//
// THRESHOLD RATIONALE  (Nielsen Norman UX benchmarks throughout)
//   session_check      p(95) < 500 ms   — every protected nav; slow = every page feels sluggish
//   login_flow         p(95) < 1000 ms  — user clicks Login, expects snappy response
//   register_flow      p(95) < 1500 ms  — user fills form then submits; slightly more patient
//   forgot_password    p(95) < 3000 ms  — user knows an email is being sent; tolerates a wait
//   login_page_load    p(95) < 3000 ms  — standard web page load guideline
//   register_page_load p(95) < 3000 ms  — standard web page load guideline
//
// PREREQUISITES
//   Backend:  npm run server  (port 6060)
//   Frontend: npm run client  (port 3000) — required for *_page_load scenarios only
//   If the frontend is not running, page_load checks will fail gracefully
//   (connection refused → http_req_failed threshold will catch it).
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/auth-stress.js --out influxdb=http://localhost:8086/k6

import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── URLs ─────────────────────────────────────────────────────────────────────
// Defaults match .env PORT (6060) and React dev server (3000).
// Override with  -e BASE_URL=<url>  or  -e FRONTEND_URL=<url>  as needed.
const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:6060';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ─── Probe credentials ────────────────────────────────────────────────────────
// LOGIN / SESSION_CHECK: shared account — bcrypt cost is per-hash, not per-user.
const LOGIN_EMAIL = 'stress.auth@k6.test';
const LOGIN_PASS  = 'AuthProbe@k6!';

// FORGOT_PASSWORD: dedicated account — forgot-pw calls change the password hash.
// Using a separate user keeps the login_flow and session_check probe unaffected.
// newPassword is always reset to FP_PASS itself → idempotent across iterations.
const FP_EMAIL  = 'stress.fp@k6.test';
const FP_PASS   = 'FpProbe@k6!';
const FP_ANSWER = 'k6';

// ─── Per-VU JWT cache (session_check only) ────────────────────────────────────
// k6 gives every VU an isolated JavaScript context.  Module-level `let` variables
// are therefore safely per-VU.  session_check VUs log in once on their first
// iteration, cache the JWT, and reuse it for all subsequent iterations.
// This simulates a user who is already logged in and just navigates protected pages.
let cachedSessionToken = null;

// ─── Options ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── session_check ─────────────────────────────────────────────────────────
    // Simulates JWT verification on every protected page navigation.
    // Highest VU count because requireSignIn is pure JWT.verify():
    // no MongoDB lookup, no bcrypt — just HMAC computation (~100 µs).
    // Each VU logs in once to obtain a valid JWT, then reuses it every iteration.
    session_check: {
      executor:  'ramping-vus',
      exec:      'sessionCheck',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  20 }, // ramp to Step 1
        { duration: '3m',  target:  20 }, // hold Step 1
        { duration: '1m',  target:  40 }, // ramp to Step 2
        { duration: '3m',  target:  40 }, // hold Step 2
        { duration: '1m',  target:  60 }, // ramp to Step 3
        { duration: '3m',  target:  60 }, // hold Step 3
        { duration: '1m',  target:  80 }, // ramp to Step 4
        { duration: '3m',  target:  80 }, // hold Step 4
        { duration: '1m',  target: 100 }, // ramp to Step 5
        { duration: '3m',  target: 100 }, // hold Step 5
        { duration: '1m',  target: 120 }, // ramp to Step 6
        { duration: '3m',  target: 120 }, // hold Step 6
        { duration: '1m',  target: 140 }, // ramp to Step 7
        { duration: '3m',  target: 140 }, // hold Step 7
        { duration: '1m',  target: 160 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target: 160 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },

    // ── login_flow ────────────────────────────────────────────────────────────
    // Simulates users submitting the login form.
    // bcrypt.compare(10 rounds) fires on every iteration — CPU-bound bottleneck.
    login_flow: {
      executor:  'ramping-vus',
      exec:      'loginFlow',
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

    // ── login_page_load ───────────────────────────────────────────────────────
    // Simulates users fetching the React /login SPA page.
    // React SPA serving is heavier than a raw API call but has no bcrypt cost —
    // the ceiling is I/O + bundle-size bound, not CPU-bound.
    // REQUIRES: React dev server running on FRONTEND_URL (default port 3000).
    login_page_load: {
      executor:  'ramping-vus',
      exec:      'loginPageLoad',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  8 }, // ramp to Step 1
        { duration: '3m',  target:  8 }, // hold Step 1
        { duration: '1m',  target: 16 }, // ramp to Step 2
        { duration: '3m',  target: 16 }, // hold Step 2
        { duration: '1m',  target: 24 }, // ramp to Step 3
        { duration: '3m',  target: 24 }, // hold Step 3
        { duration: '1m',  target: 32 }, // ramp to Step 4
        { duration: '3m',  target: 32 }, // hold Step 4
        { duration: '1m',  target: 40 }, // ramp to Step 5
        { duration: '3m',  target: 40 }, // hold Step 5
        { duration: '1m',  target: 48 }, // ramp to Step 6
        { duration: '3m',  target: 48 }, // hold Step 6
        { duration: '1m',  target: 56 }, // ramp to Step 7
        { duration: '3m',  target: 56 }, // hold Step 7
        { duration: '1m',  target: 64 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target: 64 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },

    // ── register_flow ─────────────────────────────────────────────────────────
    // Simulates new user registration.
    // bcrypt.hash(10 rounds) fires every call — slightly heavier than bcrypt.compare
    // (hash generates a new salt each time).
    // Uses unique email per VU × iteration to avoid duplicate-user errors.
    // NOTE: Populates DB with stress.reg.*@k6.test users. Clean up after testing:
    //   db.users.deleteMany({ email: /^stress\.reg\..+@k6\.test$/ })
    register_flow: {
      executor:  'ramping-vus',
      exec:      'registerFlow',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  3 }, // ramp to Step 1
        { duration: '3m',  target:  3 }, // hold Step 1
        { duration: '1m',  target:  6 }, // ramp to Step 2
        { duration: '3m',  target:  6 }, // hold Step 2
        { duration: '1m',  target:  9 }, // ramp to Step 3
        { duration: '3m',  target:  9 }, // hold Step 3
        { duration: '1m',  target: 12 }, // ramp to Step 4
        { duration: '3m',  target: 12 }, // hold Step 4
        { duration: '1m',  target: 15 }, // ramp to Step 5
        { duration: '3m',  target: 15 }, // hold Step 5
        { duration: '1m',  target: 18 }, // ramp to Step 6
        { duration: '3m',  target: 18 }, // hold Step 6
        { duration: '1m',  target: 21 }, // ramp to Step 7
        { duration: '3m',  target: 21 }, // hold Step 7
        { duration: '1m',  target: 24 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target: 24 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },

    // ── register_page_load ────────────────────────────────────────────────────
    // Simulates users fetching the React /register SPA page.
    // Same shape as login_page_load — both are SPA HTML fetches.
    // REQUIRES: React dev server running on FRONTEND_URL (default port 3000).
    register_page_load: {
      executor:  'ramping-vus',
      exec:      'registerPageLoad',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  2 }, // ramp to Step 1
        { duration: '3m',  target:  2 }, // hold Step 1
        { duration: '1m',  target:  4 }, // ramp to Step 2
        { duration: '3m',  target:  4 }, // hold Step 2
        { duration: '1m',  target:  6 }, // ramp to Step 3
        { duration: '3m',  target:  6 }, // hold Step 3
        { duration: '1m',  target:  8 }, // ramp to Step 4
        { duration: '3m',  target:  8 }, // hold Step 4
        { duration: '1m',  target: 10 }, // ramp to Step 5
        { duration: '3m',  target: 10 }, // hold Step 5
        { duration: '1m',  target: 12 }, // ramp to Step 6
        { duration: '3m',  target: 12 }, // hold Step 6
        { duration: '1m',  target: 14 }, // ramp to Step 7
        { duration: '3m',  target: 14 }, // hold Step 7
        { duration: '1m',  target: 16 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target: 16 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },

    // ── forgot_password ───────────────────────────────────────────────────────
    // Simulates password-reset submissions — bcrypt.hash + DB findOne + DB update.
    // The rarest real-world auth action (~2 % of login volume).
    // Uses a dedicated probe account (stress.fp@k6.test) so its password changes
    // never affect the shared login/session_check probe credentials.
    // newPassword is always reset to FP_PASS itself → calls are fully idempotent.
    forgot_password: {
      executor:  'ramping-vus',
      exec:      'forgotPassword',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  1 }, // ramp to Step 1
        { duration: '3m',  target:  1 }, // hold Step 1
        { duration: '1m',  target:  2 }, // ramp to Step 2
        { duration: '3m',  target:  2 }, // hold Step 2
        { duration: '1m',  target:  3 }, // ramp to Step 3
        { duration: '3m',  target:  3 }, // hold Step 3
        { duration: '1m',  target:  4 }, // ramp to Step 4
        { duration: '3m',  target:  4 }, // hold Step 4
        { duration: '1m',  target:  5 }, // ramp to Step 5
        { duration: '3m',  target:  5 }, // hold Step 5
        { duration: '1m',  target:  6 }, // ramp to Step 6
        { duration: '3m',  target:  6 }, // hold Step 6
        { duration: '1m',  target:  7 }, // ramp to Step 7
        { duration: '3m',  target:  7 }, // hold Step 7
        { duration: '1m',  target:  8 }, // ramp to Step 8 (safety ceiling)
        { duration: '3m',  target:  8 }, // hold Step 8
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // abortOnFail: true on every threshold — k6 terminates the entire run the instant
    // any constraint is violated.  delayAbortEval: '60s' prevents a false abort during
    // the warm-up ramp at the start of each step.

    // session_check: JWT verify only — fastest endpoint; slow here = every page feels sluggish.
    'http_req_duration{scenario:session_check}': [
      { threshold: 'p(95)<500',  abortOnFail: true, delayAbortEval: '60s' },
    ],

    // login_flow: bcrypt.compare fires every call — CPU bottleneck.
    'http_req_duration{scenario:login_flow}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // register_flow: bcrypt.hash per call — slightly slower than compare.
    'http_req_duration{scenario:register_flow}': [
      { threshold: 'p(95)<1500', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // forgot_password: bcrypt.hash + DB write — user tolerates a visible wait.
    'http_req_duration{scenario:forgot_password}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Page loads: standard React SPA bundle load guideline.
    'http_req_duration{scenario:login_page_load}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],
    'http_req_duration{scenario:register_page_load}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate — no delay: a sustained error spike is never a warm-up artefact.
    'http_req_failed': [{ threshold: 'rate<0.01', abortOnFail: true }],

    // Explicit assertion gate — catches silent 200-OK error bodies.
    'checks': [{ threshold: 'rate>0.99', abortOnFail: true }],
  },
};

// ─── Setup (runs once before any VU starts) ───────────────────────────────────
// Creates both probe users.  Safe to re-run — registerController is idempotent.
export function setup() {
  // Shared login / session_check probe user
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Auth Stress User', email: LOGIN_EMAIL, password: LOGIN_PASS,
      phone: '22222222', address: 'Auth Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, {
    'login probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  // Dedicated forgot-password probe user
  const fpRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'FP Probe User', email: FP_EMAIL, password: FP_PASS,
      phone: '33333333', address: 'FP Test HQ', answer: FP_ANSWER,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(fpRes, {
    'fp probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  return {
    loginEmail: LOGIN_EMAIL,
    loginPass:  LOGIN_PASS,
    fpEmail:    FP_EMAIL,
    fpAnswer:   FP_ANSWER,
    // Reset to the same password each iteration — keeps the account in a known state
    // across multiple test runs without manually resetting DB data.
    fpNewPass: FP_PASS,
  };
}

// ─── Scenario: session_check ──────────────────────────────────────────────────
// Simulates an already-logged-in user navigating to a protected page.
// VU logs in once to get a JWT, caches it (per-VU module-level var), then calls
// GET /api/v1/auth/user-auth on every subsequent iteration.
// requireSignIn calls JWT.verify() only — ~100 µs per call, no DB, no bcrypt.
export function sessionCheck(data) {
  // One-time login per VU (cachedSessionToken is null on the very first iteration)
  if (!cachedSessionToken) {
    const r = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: data.loginEmail, password: data.loginPass }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    // If login fails, cachedSessionToken stays null and will be retried next iteration
    try { cachedSessionToken = r.json('token'); } catch { /* will retry */ }
  }

  // Protected JWT-only endpoint — no DB, no bcrypt
  const res = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
    headers: { authorization: cachedSessionToken || '' },
  });

  check(res, {
    'user-auth status 200': (r) => r.status === 200,
    'user-auth ok':         (r) => { try { return r.json('ok') === true; } catch { return false; } },
  });

  // 0.1 s think time — simulates rapid sequential page navigation (protected pages
  // load fast, user clicks through quickly)
  sleep(0.1);
}

// ─── Scenario: login_flow ─────────────────────────────────────────────────────
// Simulates fresh login form submissions.
// bcrypt.compare(10 rounds) fires on every iteration — this is the CPU bottleneck.
export function loginFlow(data) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: data.loginEmail, password: data.loginPass }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    // HTTP layer: no connection error or server error
    'login status 200':   (r) => r.status === 200,
    // Business logic: loginController confirmed success (not a soft-fail 200)
    'login succeeded':    (r) => { try { return r.json('success') === true;         } catch { return false; } },
    // JWT issued: token must be present in the response body
    'login token issued': (r) => { try { return typeof r.json('token') === 'string'; } catch { return false; } },
  });

  // 0.1 s think time — login is a quick user action, immediate re-submission
  sleep(0.1);
}

// ─── Scenario: login_page_load ────────────────────────────────────────────────
// Simulates users fetching the React /login SPA page.
// REQUIRES: React dev server running on FRONTEND_URL (npm run client, port 3000).
// k6 fetches the HTML skeleton; JS bundle rendering is NOT evaluated here.
export function loginPageLoad() {
  const res = http.get(`${FRONTEND_URL}/login`);

  check(res, {
    // React dev server must respond successfully
    'login page status 200': (r) => r.status === 200,
    // The HTML skeleton must include the React root mount point
    'login page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    // Must not be a plain Express "Cannot GET /login" 404 fallback
    'login page not 404':    (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  // 1 s think time — user loads the page and reads briefly before typing credentials
  sleep(1);
}

// ─── Scenario: register_flow ──────────────────────────────────────────────────
// Simulates new user registrations.
// bcrypt.hash(10 rounds) fires every call — slightly heavier than bcrypt.compare.
// Email is unique per VU × iteration to avoid duplicate-registration errors.
// NOTE: Leaves stress.reg.*@k6.test users in the DB.  Clean up after testing:
//   db.users.deleteMany({ email: /^stress\.reg\..+@k6\.test$/ })
export function registerFlow() {
  // __VU  = VU number (1-based, up to maxVUs for this scenario)
  // __ITER = iteration counter (0-based, per-VU) — combination is globally unique
  const uniqueEmail = `stress.reg.${__VU}.${__ITER}@k6.test`;

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name:     `Stress Reg ${__VU}-${__ITER}`,
      email:    uniqueEmail,
      password: 'RegPass@k6!',
      phone:    '44444444',
      address:  'Reg Test HQ',
      answer:   'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    // registerController must return 201 for a successful new registration
    'register status 201':   (r) => r.status === 201,
    // Response body must confirm success and return the new user object
    'register succeeded':    (r) => { try { return r.json('success') === true;         } catch { return false; } },
    'register user returned':(r) => { try { return typeof r.json('user') === 'object'; } catch { return false; } },
  });

  // 1 s think time — user fills in the form before submitting
  sleep(1);
}

// ─── Scenario: register_page_load ────────────────────────────────────────────
// Simulates users fetching the React /register SPA page.
// REQUIRES: React dev server running on FRONTEND_URL (npm run client, port 3000).
export function registerPageLoad() {
  const res = http.get(`${FRONTEND_URL}/register`);

  check(res, {
    'register page status 200': (r) => r.status === 200,
    'register page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'register page not 404':    (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  // 1 s think time — user loads the page before filling in the form
  sleep(1);
}

// ─── Default function (MCP / isolated smoke-test fallback) ──────────────────
// Called by the default scenario when k6 CLI flags (--vus / --duration) override
// the named scenarios block — e.g. when running via the MCP k6 Docker tool.
// Routes to loginFlow so the login-probe checks are verified in any execution mode.
// Not invoked during normal k6 runs that use the named scenarios above (exec:).
export default function (data) {
  loginFlow(data);
}

// ─── Scenario: forgot_password ────────────────────────────────────────────────
// Simulates password-reset requests to POST /api/v1/auth/forgot-password.
// Calls: DB findOne (email+answer lookup) → bcrypt.hash(newPassword) → DB update.
// Uses the dedicated FP probe user so the shared login probe credentials are
// never touched.  Always resets to FP_PASS → idempotent on repeated runs.
export function forgotPassword(data) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/forgot-password`,
    JSON.stringify({
      email:       data.fpEmail,
      answer:      data.fpAnswer,
      newPassword: data.fpNewPass, // always the same value → idempotent
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    // forgotPasswordController must return 200 with success:true
    'forgot-pw status 200': (r) => r.status === 200,
    'forgot-pw succeeded':  (r) => { try { return r.json('success') === true; } catch { return false; } },
  });

  // 2 s think time — password reset is a rare, deliberate user action;
  // a longer think time reflects the ~2 % frequency relative to login volume
  sleep(2);
}
