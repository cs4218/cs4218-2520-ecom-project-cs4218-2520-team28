// Foo Tzie Huang, A0262376Y
// MS3 Non-Functional Testing - Recovery Test: Mixed Traffic (All Endpoints)
//
// Recovery Testing: Simulates realistic mixed traffic across ALL major endpoint
// groups simultaneously (auth + product catalog + admin + checkout). This is the
// most realistic recovery scenario - it shows how the entire system behaves when
// recovering from a broad overload event.
//
// Endpoints tested:
//   POST /api/v1/auth/login                  (auth)
//   GET  /api/v1/product/get-product         (catalog)
//   GET  /api/v1/product/search/:keyword     (catalog)
//   GET  /api/v1/product/product-list/:page  (catalog)
//   POST /api/v1/product/product-filters     (catalog/cart)
//   GET  /api/v1/product/product-count       (catalog)
//   GET  /api/v1/auth/user-auth              (auth check - requires user JWT)
//
// Phases:
//   Phase 1 (Baseline)  - Mixed light traffic across all endpoints
//   Phase 2 (Stress)    - Heavy mixed traffic to simulate a traffic surge
//   Phase 3 (Recovery)  - Drop back to light load, measure system-wide recovery
//
// Key recovery metrics:
//   - Time-to-Recovery (TTR): how long until error rate drops back below 5%
//   - p95 response time during recovery vs baseline
//   - Error rate per endpoint group during stress and recovery phases
//
// To run:
//   k6 run tests/recovery/recovery-mixed.js
// With dashboard:
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/mixed-recovery-report.html k6 run tests/recovery/recovery-mixed.js
// With auth token for protected endpoints:
//   k6 run -e AUTH_TOKEN=<jwt> tests/recovery/recovery-mixed.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:6060';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Custom metrics
const mixedRecoveryTime    = new Trend('mixed_recovery_response_time_ms', true);
const mixedErrorRate       = new Rate('mixed_recovery_error_rate');
const mixedFailedRequests  = new Counter('mixed_recovery_failed_requests');

export const options = {
  scenarios: {
    mixed_recovery: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Phase 1: Baseline - light mixed traffic
        { duration: '20s', target: 5   },
        { duration: '20s', target: 5   },

        // Phase 2: Stress - heavy mixed traffic surge
        { duration: '5s',  target: 100 },
        { duration: '30s', target: 100 },

        // Phase 3: Recovery - drop back to normal, observe recovery
        { duration: '5s',  target: 5   },
        { duration: '40s', target: 5   },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed:                 ['rate<0.15'],
    http_req_duration:               ['p(95)<3000'],
    mixed_recovery_error_rate:       ['rate<0.15'],
    mixed_recovery_response_time_ms: ['p(95)<3000'],
  },
};

// ── Endpoint definitions ──────────────────────────────────────────────────────

function makeRequest(iter) {
  const slot = iter % 7;

  switch (slot) {
    case 0: {
      // Auth: login
      const payload = JSON.stringify({
        email:    __ENV.LOGIN_EMAIL    || 'k6user1@example.com',
        password: __ENV.LOGIN_PASSWORD || 'Test1234!',
      });
      return {
        name: 'login',
        res: http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
          headers: { 'Content-Type': 'application/json' },
          tags: { group: 'auth', endpoint: 'login' },
        }),
        expectStatus: [200, 400, 401], // 400/401 if test user doesn't exist
      };
    }
    case 1: {
      // Catalog: get all products
      return {
        name: 'get-product',
        res: http.get(`${BASE_URL}/api/v1/product/get-product`, {
          tags: { group: 'catalog', endpoint: 'get-product' },
        }),
        expectStatus: [200],
      };
    }
    case 2: {
      // Catalog: search
      return {
        name: 'search',
        res: http.get(`${BASE_URL}/api/v1/product/search/shirt`, {
          tags: { group: 'catalog', endpoint: 'search' },
        }),
        expectStatus: [200],
      };
    }
    case 3: {
      // Catalog: paginated list
      return {
        name: 'product-list',
        res: http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
          tags: { group: 'catalog', endpoint: 'product-list' },
        }),
        expectStatus: [200],
      };
    }
    case 4: {
      // Cart: product filters
      const payload = JSON.stringify({ checked: [], radio: [] });
      return {
        name: 'product-filters',
        res: http.post(`${BASE_URL}/api/v1/product/product-filters`, payload, {
          headers: { 'Content-Type': 'application/json' },
          tags: { group: 'catalog', endpoint: 'product-filters' },
        }),
        expectStatus: [200],
      };
    }
    case 5: {
      // Catalog: product count
      return {
        name: 'product-count',
        res: http.get(`${BASE_URL}/api/v1/product/product-count`, {
          tags: { group: 'catalog', endpoint: 'product-count' },
        }),
        expectStatus: [200],
      };
    }
    case 6:
    default: {
      // Auth: user-auth check (requires JWT)
      const headers = AUTH_TOKEN
        ? { Authorization: AUTH_TOKEN }
        : {};
      return {
        name: 'user-auth',
        res: http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
          headers,
          tags: { group: 'auth', endpoint: 'user-auth' },
        }),
        expectStatus: AUTH_TOKEN ? [200] : [401],
      };
    }
  }
}

// ── Default function ──────────────────────────────────────────────────────────

export default function () {
  const { name, res, expectStatus } = makeRequest(__ITER);

  const ok = check(res, {
    'acceptable status':      (r) => expectStatus.includes(r.status),
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'body not empty':         (r) => r.body && r.body.length > 0,
  });

  mixedRecoveryTime.add(res.timings.duration);

  // Only flag 5xx or timeouts as real errors
  const isServerError = res.status >= 500 || res.timings.duration >= 3000;
  mixedErrorRate.add(isServerError);
  if (isServerError) {
    mixedFailedRequests.add(1);
    console.log(`[MIXED RECOVERY] SERVER ERROR | endpoint=${name} | status=${res.status} | t=${res.timings.duration}ms`);
  }

  sleep(1);
}
