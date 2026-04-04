// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// catalog-stress-solo.js — Story 2A: product_list endpoint in isolation
//
// PURPOSE
//   Stress the most critical catalog read path — GET /api/v1/product/product-list/:page —
//   in isolation.  Results establish the baseline latency curve for product listings
//   without interference from photo downloads, filter queries, or frontend serving.
//   Compare against catalog-stress.js (2B) to measure combined-scenario interference.
//
// VU STAIRCASE  (1 min ramp + 3 min hold per step)
//   10 steps, constant increment of 100 VUs per step:
//     Step 1  :  100 VUs
//     Step 2  :  200 VUs
//     Step 3  :  300 VUs
//     Step 4  :  400 VUs
//     Step 5  :  500 VUs
//     Step 6  :  600 VUs
//     Step 7  :  700 VUs
//     Step 8  :  800 VUs
//     Step 9  :  900 VUs
//     Step 10 : 1000 VUs
//   Each step: 1 min ramp up, 3 min hold. Test aborts on p(95) > 500 ms.
//
// THRESHOLD RATIONALE
//   p(95) < 500 ms — users browse the shop and expect products to appear quickly.
//   Nielsen Norman: > 1 s response = user notices the response delay.
//   Product listing is a pure MongoDB read (no bcrypt, no file I/O) so 500 ms
//   is a conservative bound even at 300 VUs.
//   p(99) < 500 ms: not required — a few outliers on a read are acceptable.
//   abortOnFail: true — k6 terminates the instant the threshold is violated, so
//     the solo run cost does not exceed ~26 min (8 × 1 + 3 min × 3 steps).
//   delayAbortEval: '60s' — prevents false abort during the warm-up ramp.
//
// PREREQUISITES
//   Backend : npm run server  (port 6060, or override BASE_URL)
//   DB      : at least 12 products seeded (product-list page 1 must return items)
//   Frontend: NOT required — this is an API-only test
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/catalog-stress-solo.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/catalog-stress-solo.txt"

import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── product_list ────────────────────────────────────────────────────────
    // GET /api/v1/product/product-list/:page — the most-called catalog endpoint.
    // Every shop homepage mount triggers page 1; pagination triggers page 2+.
    // Pure MongoDB find() — no aggregation, no file I/O.
    product_list: {
      executor:  'ramping-vus',
      exec:      'productList',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 100 }, { duration: '3m',  target: 100 },
        { duration: '1m',  target: 200 }, { duration: '3m',  target: 200 },
        { duration: '1m',  target: 300 }, { duration: '3m',  target: 300 },
        { duration: '1m',  target: 400 }, { duration: '3m',  target: 400 },
        { duration: '1m',  target: 500 }, { duration: '3m',  target: 500 },
        { duration: '1m',  target: 600 }, { duration: '3m',  target: 600 },
        { duration: '1m',  target: 700 }, { duration: '3m',  target: 700 },
        { duration: '1m',  target: 800 }, { duration: '3m',  target: 800 },
        { duration: '1m',  target: 900 }, { duration: '3m',  target: 900 },
        { duration: '1m',  target: 1000 }, { duration: '3m', target: 1000 },
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // abortOnFail: true — terminate as soon as the ceiling is found.
    // delayAbortEval: '60s' — ignore threshold violations in the first 60 s
    //   of each abort evaluation window (covers the initial ramp phase).

    // product_list: fast MongoDB read — 500 ms is generous.
    'http_req_duration{scenario:product_list}': [
      { threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate — any 5xx or network error = server is overwhelmed.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Assertion gate — catches 200 OK responses with error bodies.
    'checks': [
      { threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '60s' },
    ],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Warm up the connection pool by pre-fetching page 1.
// Also verifies the backend is reachable before VUs start.
export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`);
  check(res, {
    'setup: product-list reachable':     (r) => r.status === 200,
    'setup: products array returned':    (r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });
}

// ─── Scenario: product_list ───────────────────────────────────────────────────
// Alternates between page 1 and page 2 to simulate real pagination behaviour.
// VU number is used to stagger pages so half the VUs hit page 1 and half hit page 2
// — prevents all VUs from hammering the same MongoDB cursor simultaneously.
export function productList() {
  const page = (__VU % 2 === 0) ? 1 : 2;
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);

  check(res, {
    'product-list status 200':       (r) => r.status === 200,
    'product-list has products':     (r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
    'product-list non-empty':        (r) => {
      try { return r.json('products').length > 0; } catch { return false; }
    },
  });

  // 0.2 s think time — shopper pauses briefly between page navigations.
  // At 100 VUs × (avg_latency + 200 ms) this yields ~300–400 RPS.
  sleep(0.2);
}
