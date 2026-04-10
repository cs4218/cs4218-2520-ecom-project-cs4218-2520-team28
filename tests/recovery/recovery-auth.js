// Foo Tzie Huang, A0262376Y
// MS3 Non-Functional Testing - Recovery Test for Authentication Endpoints
//
// Recovery Testing: Measures how quickly the system returns to normal operation
// after experiencing a period of high stress/failure. This script:
//   Phase 1 (Baseline)  - Normal load to establish healthy baseline metrics
//   Phase 2 (Stress)    - Sudden spike to overwhelm the auth endpoints
//   Phase 3 (Recovery)  - Drop back to normal load and measure recovery behaviour
//
// Metrics tracked: error rate, response time (p95), TTR (time-to-recovery)
//
// To run:
//   k6 run tests/recovery/recovery-auth.js
// With dashboard export:
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/auth-recovery-report.html k6 run tests/recovery/recovery-auth.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// Custom metrics to track recovery behaviour
const recoveryResponseTime = new Trend('recovery_response_time_ms', true);
const errorRate = new Rate('recovery_error_rate');
const failedRequests = new Counter('recovery_failed_requests');

export const options = {
  scenarios: {
    auth_recovery: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Phase 1: Baseline - normal healthy load
        { duration: '20s', target: 5 },
        { duration: '20s', target: 5 },

        // Phase 2: Stress - sudden overload to trigger failures
        { duration: '5s',  target: 100 },
        { duration: '30s', target: 100 },

        // Phase 3: Recovery - drop back to normal, measure how fast system recovers
        { duration: '5s',  target: 5 },
        { duration: '40s', target: 5 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // During recovery phase the system should stabilise:
    http_req_failed:          ['rate<0.50'],   // overall error rate < 50% (4xx expected for missing test user)
    http_req_duration:        ['p(95)<3000'],  // 95% of requests < 3s
    recovery_error_rate:      ['rate<0.20'],   // 5xx error rate < 20%
    recovery_response_time_ms: ['p(95)<3000'],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function loginRequest() {
  const payload = JSON.stringify({
    email: __ENV.LOGIN_EMAIL    || 'k6user1@example.com',
    password: __ENV.LOGIN_PASSWORD || 'Test1234!',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login', phase: currentPhase() },
  };
  return http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);
}

function registerRequest() {
  // Use a unique email per VU+iteration to avoid duplicate-registration errors
  const uid = `${__VU}_${__ITER}`;
  const payload = JSON.stringify({
    name:     `RecoveryUser${uid}`,
    email:    `recovery_${uid}@test.com`,
    password: 'Recovery123!',
    phone:    '91234567',
    address:  '1 Recovery St',
    answer:   'recovery',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'register', phase: currentPhase() },
  };
  return http.post(`${BASE_URL}/api/v1/auth/register`, payload, params);
}

// Rough phase detection based on elapsed time (seconds since test start)
function currentPhase() {
  // Baseline: 0-40s | Stress: 40-75s | Recovery: 75s+
  const elapsed = Date.now() / 1000;
  if (elapsed < 40)  return 'baseline';
  if (elapsed < 75)  return 'stress';
  return 'recovery';
}

// ── Default function ──────────────────────────────────────────────────────────

export default function () {
  // Alternate between login and register to exercise both auth endpoints
  const res = (__ITER % 2 === 0) ? loginRequest() : registerRequest();

  let body = null;
  try { body = res.json(); } catch (_) { body = null; }

  // 4xx = expected (user not found / duplicate register) — not a server failure
  // Only 5xx or timeout = real recovery failure
  const isServerError = res.status >= 500 || res.timings.duration >= 3000;

  check(res, {
    'not a server error (5xx)':  (r) => r.status < 500,
    'response time < 3000ms':    (r) => r.timings.duration < 3000,
    'has response body':         (r) => r.body && r.body.length > 0,
  });

  recoveryResponseTime.add(res.timings.duration);
  errorRate.add(isServerError);
  if (isServerError) {
    failedRequests.add(1);
    console.log(`[AUTH RECOVERY] FAIL | phase=${currentPhase()} | status=${res.status} | t=${res.timings.duration}ms`);
  }

  sleep(1);
}
