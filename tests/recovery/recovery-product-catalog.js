// Foo Tzie Huang, A0262376Y
// MS3 Non-Functional Testing - Recovery Test for Product Catalog Endpoints
//
// Recovery Testing: Measures how quickly the product catalog endpoints recover
// after being overwhelmed. Tests the following endpoints:
//   GET /api/v1/product/get-product        (list all products)
//   GET /api/v1/product/search/:keyword    (search products)
//   GET /api/v1/product/product-list/:page (paginated list)
//   GET /api/v1/product/product-count      (product count)
//
// Phases:
//   Phase 1 (Baseline)  - Light load, establish healthy response time baseline
//   Phase 2 (Stress)    - Heavy concurrent load to degrade the catalog endpoints
//   Phase 3 (Recovery)  - Return to light load, measure time-to-recovery
//
// To run:
//   k6 run tests/recovery/recovery-product-catalog.js
// With dashboard export:
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/catalog-recovery-report.html k6 run tests/recovery/recovery-product-catalog.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

const recoveryResponseTime = new Trend('catalog_recovery_response_time_ms', true);
const errorRate            = new Rate('catalog_recovery_error_rate');
const failedRequests       = new Counter('catalog_recovery_failed_requests');

export const options = {
  scenarios: {
    catalog_recovery: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // Phase 1: Baseline
        { duration: '20s', target: 5  },
        { duration: '20s', target: 5  },

        // Phase 2: Stress - heavy load
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
    http_req_failed:                   ['rate<0.10'],
    http_req_duration:                 ['p(95)<3000'],
    catalog_recovery_error_rate:       ['rate<0.10'],
    catalog_recovery_response_time_ms: ['p(95)<3000'],
  },
};

// Rotate through catalog endpoints to simulate realistic mixed read traffic
const ENDPOINTS = [
  { name: 'get-product',    url: () => `${BASE_URL}/api/v1/product/get-product`          },
  { name: 'search',         url: () => `${BASE_URL}/api/v1/product/search/laptop`        },
  { name: 'product-list',   url: () => `${BASE_URL}/api/v1/product/product-list/1`       },
  { name: 'product-count',  url: () => `${BASE_URL}/api/v1/product/product-count`        },
];

export default function () {
  const ep  = ENDPOINTS[__ITER % ENDPOINTS.length];
  const res = http.get(ep.url(), { tags: { endpoint: ep.name } });

  let body = null;
  try { body = res.json(); } catch (_) { body = null; }

  const ok = check(res, {
    'status 200':             (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'body not empty':         (r) => r.body && r.body.length > 0,
  });

  recoveryResponseTime.add(res.timings.duration);
  errorRate.add(!ok);
  if (!ok) {
    failedRequests.add(1);
    console.log(`[CATALOG RECOVERY] FAIL | endpoint=${ep.name} | status=${res.status} | t=${res.timings.duration}ms`);
  }

  sleep(1);
}
