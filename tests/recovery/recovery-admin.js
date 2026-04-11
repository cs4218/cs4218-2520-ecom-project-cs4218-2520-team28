// Foo Tzie Huang, A0262376Y
// MS3 Non-Functional Testing - Recovery Test for Admin Operations Endpoints
//
// Recovery Testing: Measures how quickly admin-only endpoints recover after
// being subjected to heavy load. Tests:
//   GET  /api/v1/auth/all-orders              (admin view all orders - requires admin JWT)
//   GET  /api/v1/product/get-product          (admin product listing)
//   POST /api/v1/product/product-filters      (admin product filtering)
//   GET  /api/v1/auth/admin-auth              (admin auth check - requires admin JWT)
//
// Note: Admin endpoints require a valid admin JWT. Pass via env var:
//   k6 run -e ADMIN_TOKEN=<jwt> tests/recovery/recovery-admin.js
// Without a token, protected endpoints return 401 (expected, not a recovery failure).
//
// Phases:
//   Phase 1 (Baseline)  - Light admin traffic
//   Phase 2 (Stress)    - Heavy concurrent admin requests
//   Phase 3 (Recovery)  - Return to light load, measure recovery
//
// To run:
//   k6 run tests/recovery/recovery-admin.js
// With dashboard:
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/admin-recovery-report.html k6 run tests/recovery/recovery-admin.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:6060';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

const recoveryResponseTime = new Trend('admin_recovery_response_time_ms', true);
const errorRate            = new Rate('admin_recovery_error_rate');
const failedRequests       = new Counter('admin_recovery_failed_requests');

export const options = {
  scenarios: {
    admin_recovery: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Phase 1: Baseline
        { duration: '20s', target: 5  },
        { duration: '20s', target: 5  },

        // Phase 2: Stress - simulate many concurrent admin users
        { duration: '5s',  target: 80 },
        { duration: '30s', target: 80 },

        // Phase 3: Recovery
        { duration: '5s',  target: 5  },
        { duration: '40s', target: 5  },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed:                  ['rate<0.15'],  // relaxed: 401s expected without real admin token
    http_req_duration:                ['p(95)<3000'],
    admin_recovery_error_rate:        ['rate<0.15'],
    admin_recovery_response_time_ms:  ['p(95)<3000'],
  },
};

function adminHeaders() {
  return ADMIN_TOKEN
    ? { 'Content-Type': 'application/json', Authorization: ADMIN_TOKEN }
    : { 'Content-Type': 'application/json' };
}

export default function () {
  const iter = __ITER % 4;
  let res;
  let endpointName;
  let requiresAdmin = false;

  if (iter === 0) {
    // Public: get all products (no auth)
    endpointName = 'get-product';
    res = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      tags: { endpoint: endpointName },
    });
  } else if (iter === 1) {
    // Public: product filters (no auth)
    endpointName = 'product-filters';
    const payload = JSON.stringify({ checked: [], radio: [] });
    res = http.post(`${BASE_URL}/api/v1/product/product-filters`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: endpointName },
    });
  } else if (iter === 2) {
    // Admin: all orders (requires admin JWT)
    endpointName = 'all-orders';
    requiresAdmin = true;
    res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers: adminHeaders(),
      tags: { endpoint: endpointName },
    });
  } else {
    // Admin: admin-auth check (requires admin JWT)
    endpointName = 'admin-auth';
    requiresAdmin = true;
    res = http.get(`${BASE_URL}/api/v1/auth/admin-auth`, {
      headers: adminHeaders(),
      tags: { endpoint: endpointName },
    });
  }

  // Without a real admin token, protected endpoints return 401 - that's expected
  const expectedOk = requiresAdmin && !ADMIN_TOKEN
    ? (r) => r.status === 401 || r.status === 200
    : (r) => r.status === 200;

  const ok = check(res, {
    'acceptable status':      expectedOk,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'body not empty':         (r) => r.body && r.body.length > 0,
  });

  recoveryResponseTime.add(res.timings.duration);

  // Only flag as error on 5xx or timeout
  const isServerError = res.status >= 500 || res.timings.duration >= 3000;
  errorRate.add(isServerError);
  if (isServerError) {
    failedRequests.add(1);
    console.log(`[ADMIN RECOVERY] SERVER ERROR | endpoint=${endpointName} | status=${res.status} | t=${res.timings.duration}ms`);
  }

  sleep(1);
}
