// Foo Tzie Huang, A0262376Y
// MS3 Non-Functional Testing - Recovery Test for Checkout/Payment/CartPage Endpoints
//
// Recovery Testing: Measures how quickly the checkout and payment-related endpoints
// recover after being subjected to heavy load. Tests:
//   GET  /api/v1/product/braintree/token    (payment token - requires auth)
//   POST /api/v1/product/braintree/payment  (payment submission - requires auth)
//   GET  /api/v1/product/product-list/1     (cart product listing)
//   POST /api/v1/product/product-filters    (cart category/price filters)
//
// Note: Braintree token/payment endpoints require a valid JWT. Pass via env var:
//   k6 run -e AUTH_TOKEN=<jwt> tests/recovery/recovery-checkout.js
// If no token is provided the test still runs but braintree calls will return 401
// (which is expected and counted as a known failure, not a recovery failure).
//
// Phases:
//   Phase 1 (Baseline)  - Light load
//   Phase 2 (Stress)    - Heavy concurrent checkout traffic
//   Phase 3 (Recovery)  - Return to light load, measure recovery
//
// To run:
//   k6 run tests/recovery/recovery-checkout.js
// With dashboard:
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/checkout-recovery-report.html k6 run tests/recovery/recovery-checkout.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:6060';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const recoveryResponseTime = new Trend('checkout_recovery_response_time_ms', true);
const errorRate            = new Rate('checkout_recovery_error_rate');
const failedRequests       = new Counter('checkout_recovery_failed_requests');

export const options = {
  scenarios: {
    checkout_recovery: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Phase 1: Baseline
        { duration: '20s', target: 5  },
        { duration: '20s', target: 5  },

        // Phase 2: Stress
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
    http_req_failed:                    ['rate<0.15'],  // slightly relaxed: braintree 401s expected without real creds
    http_req_duration:                  ['p(95)<3000'],
    checkout_recovery_error_rate:       ['rate<0.15'],
    checkout_recovery_response_time_ms: ['p(95)<3000'],
  },
};

function authHeaders() {
  return AUTH_TOKEN
    ? { 'Content-Type': 'application/json', Authorization: AUTH_TOKEN }
    : { 'Content-Type': 'application/json' };
}

export default function () {
  const iter = __ITER % 4;

  let res;
  let endpointName;

  if (iter === 0) {
    // Cart product listing (no auth needed)
    endpointName = 'product-list';
    res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
      tags: { endpoint: endpointName },
    });
  } else if (iter === 1) {
    // Cart filters (no auth needed)
    endpointName = 'product-filters';
    const payload = JSON.stringify({ checked: [], radio: [] });
    res = http.post(`${BASE_URL}/api/v1/product/product-filters`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: endpointName },
    });
  } else if (iter === 2) {
    // Braintree token (requires auth)
    endpointName = 'braintree-token';
    res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
      headers: authHeaders(),
      tags: { endpoint: endpointName },
    });
  } else {
    // Braintree payment (requires auth + real nonce - will 400/401 without real creds)
    endpointName = 'braintree-payment';
    const payload = JSON.stringify({ nonce: 'fake-valid-nonce', cart: [] });
    res = http.post(`${BASE_URL}/api/v1/product/braintree/payment`, payload, {
      headers: authHeaders(),
      tags: { endpoint: endpointName },
    });
  }

  // For braintree endpoints without real credentials, 401/400 is expected - not a system failure
  const isBraintree = endpointName.startsWith('braintree');
  const expectedStatus = isBraintree && !AUTH_TOKEN ? [400, 401] : [200];

  const ok = check(res, {
    'acceptable status':      (r) => expectedStatus.includes(r.status) || r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'body not empty':         (r) => r.body && r.body.length > 0,
  });

  recoveryResponseTime.add(res.timings.duration);

  // Only count as error if it's a server error (5xx) or unexpected timeout
  const isServerError = res.status >= 500 || res.timings.duration >= 3000;
  errorRate.add(isServerError);
  if (isServerError) {
    failedRequests.add(1);
    console.log(`[CHECKOUT RECOVERY] SERVER ERROR | endpoint=${endpointName} | status=${res.status} | t=${res.timings.duration}ms`);
  }

  sleep(1);
}
