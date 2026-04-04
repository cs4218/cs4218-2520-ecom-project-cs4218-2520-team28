// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// catalog-stress.js — Story 2B: all catalog endpoints + frontend pages simultaneous
//
// PURPOSE
//   Run all eight catalog scenarios simultaneously to find the combined breaking point
//   under realistic mixed catalog traffic.  Complements catalog-stress-solo.js (2A)
//   which tests product_list in isolation — compare results to measure the additional
//   latency introduced when photo downloads, search, filters, and frontend serving
//   compete for the same Mongoose connection pool and Node event loop.
//
// VU STAIRCASE  (each scenario: 1 min ramp + 3 min hold per step)
//   8 scenarios, each with constant VU increments and 7 steps:
//     product_list:      100 → 200 → 300 → 400 → 500 → 600 → 700 → 800 VUs (increment 100)
//     homepage_load:      70 → 140 → 210 → 280 → 350 → 420 → 490 → 560 VUs (increment 70)
//     photo_stress:       50 → 100 → 150 → 200 → 250 → 300 → 350 → 400 VUs (increment 50)
//     search_stress:      20 → 40 → 60 → 80 → 100 → 120 → 140 → 160 VUs (increment 20)
//     filter_stress:      10 → 20 → 30 → 40 → 50 → 60 → 70 → 80 VUs (increment 10)
//     category_page:      10 → 20 → 30 → 40 → 50 → 60 → 70 → 80 VUs (increment 10)
//     search_page:        10 → 20 → 30 → 40 → 50 → 60 → 70 → 80 VUs (increment 10)
//     related_products:   10 → 20 → 30 → 40 → 50 → 60 → 70 → 80 VUs (increment 10)
//   Each step: 1 min ramp up, 3 min hold. Test aborts on scenario-specific thresholds.
//
// THRESHOLD RATIONALE  (Nielsen Norman UX benchmarks throughout)
//   product_list     p(95) < 500 ms   — browse; expects products to appear quickly
//   related_products p(95) < 500 ms   — secondary content; same fast-read expectation
//   search_stress    p(95) < 1000 ms  — user typed a query; expects results within 1 s
//   filter_stress    p(95) < 1000 ms  — user applied a filter; expects quick results
//   photo_stress     p(99) < 2000 ms  — images load progressively; a few slow OK; all slow not OK
//   homepage_load    p(95) < 3000 ms  — standard web page load guideline (first meaningful paint)
//   category_page    p(95) < 3000 ms  — standard web page load guideline
//   search_page      p(95) < 3000 ms  — standard web page load guideline
//
// PREREQUISITES
//   Backend:  npm run server  (port 6060, or override BASE_URL)
//   Frontend: npm run client  (port 3000) — required for *_load and category/search page scenarios
//   DB:       at least 12 products and 2 categories seeded
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/catalog-stress.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/catalog-stress.txt"

import http from 'k6/http';
import { check, sleep } from 'k6';
import { fetchProducts, fetchFilterPayloads, keywords } from './helpers/seed-data.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:6060';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── product_list ──────────────────────────────────────────────────────
    // GET /api/v1/product/product-list/:page — dominant read path.
    // Highest VU count because every homepage mount fires this request.
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
        { duration: '1m',  target: 800 }, { duration: '3m',  target: 800 }
      ],
      gracefulRampDown: '30s',
    },

    // ── homepage_load ─────────────────────────────────────────────────────
    // GET http://localhost:3000/ — React SPA HTML shell.
    // High VU count because the homepage is the entry point for most sessions.
    // REQUIRES: React dev server running on FRONTEND_URL.
    homepage_load: {
      executor:  'ramping-vus',
      exec:      'homepageLoad',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  70 }, { duration: '3m',  target:  70 },
        { duration: '1m',  target: 140 }, { duration: '3m',  target: 140 },
        { duration: '1m',  target: 210 }, { duration: '3m',  target: 210 },
        { duration: '1m',  target: 280 }, { duration: '3m',  target: 280 },
        { duration: '1m',  target: 350 }, { duration: '3m',  target: 350 },
        { duration: '1m',  target: 420 }, { duration: '3m',  target: 420 },
        { duration: '1m',  target: 490 }, { duration: '3m',  target: 490 },
        { duration: '1m',  target: 560 }, { duration: '3m',  target: 560 }
      ],
      gracefulRampDown: '30s',
    },

    // ── photo_stress ──────────────────────────────────────────────────────
    // GET /api/v1/product/product-photo/:pid — binary image buffer.
    // One photo per product in each listing (up to 12 photos per page load).
    // Photo requests are the widest payloads — saturate bandwidth before CPU.
    // Uses p(99) threshold: images load lazily, a few slow ones are tolerable.
    photo_stress: {
      executor:  'ramping-vus',
      exec:      'photoStress',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  50 }, { duration: '3m',  target:  50 },
        { duration: '1m',  target: 100 }, { duration: '3m',  target: 100 },
        { duration: '1m',  target: 150 }, { duration: '3m',  target: 150 },
        { duration: '1m',  target: 200 }, { duration: '3m',  target: 200 },
        { duration: '1m',  target: 250 }, { duration: '3m',  target: 250 },
        { duration: '1m',  target: 300 }, { duration: '3m',  target: 300 },
        { duration: '1m',  target: 350 }, { duration: '3m',  target: 350 },
        { duration: '1m',  target: 400 }, { duration: '3m',  target: 400 }
      ],
      gracefulRampDown: '30s',
    },

    // ── search_stress ─────────────────────────────────────────────────────
    // GET /api/v1/product/search/:keyword — text-search query.
    // Moderate VU count — not every session includes a search.
    search_stress: {
      executor:  'ramping-vus',
      exec:      'searchStress',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 25 }, { duration: '3m',  target: 25 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 },
        { duration: '1m',  target: 75 }, { duration: '3m',  target: 75 },
        { duration: '1m',  target: 100 }, { duration: '3m', target: 100 },
        { duration: '1m',  target: 125 }, { duration: '3m', target: 125 },
        { duration: '1m',  target: 150 }, { duration: '3m', target: 150 },
        { duration: '1m',  target: 175 }, { duration: '3m', target: 175 },
        { duration: '1m',  target: 200 }, { duration: '3m', target: 200 }
      ],
      gracefulRampDown: '30s',
    },

    // ── filter_stress ─────────────────────────────────────────────────────
    // POST /api/v1/product/product-filters — category + price filter combos.
    // Slightly lower than search — filters are used by more deliberate shoppers.
    filter_stress: {
      executor:  'ramping-vus',
      exec:      'filterStress',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 },
        { duration: '1m',  target: 100 }, { duration: '3m', target: 100 },
        { duration: '1m',  target: 120 }, { duration: '3m', target: 120 },
        { duration: '1m',  target: 140 }, { duration: '3m', target: 140 },
        { duration: '1m',  target: 160 }, { duration: '3m', target: 160 }
      ],
      gracefulRampDown: '30s',
    },

    // ── category_page ─────────────────────────────────────────────────────
    // GET http://localhost:3000/categories — React SPA page.
    // Low VU count — only users who click the Categories nav link.
    // REQUIRES: React dev server running on FRONTEND_URL.
    category_page: {
      executor:  'ramping-vus',
      exec:      'categoryPage',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 },
        { duration: '1m',  target: 70 }, { duration: '3m',  target: 70 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 }
      ],
      gracefulRampDown: '30s',
    },

    // ── search_page ───────────────────────────────────────────────────────
    // GET http://localhost:3000/search/shirt — React SPA search results page.
    // Low VU count — subset of users who click Search.
    // REQUIRES: React dev server running on FRONTEND_URL.
    search_page: {
      executor:  'ramping-vus',
      exec:      'searchPage',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 },
        { duration: '1m',  target: 70 }, { duration: '3m',  target: 70 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 },
      ],
      gracefulRampDown: '30s',
    },

    // ── related_products ──────────────────────────────────────────────────
    // GET /api/v1/product/related-product/:pid/:cid — secondary product page content.
    // Low VU count — only users who open the product detail page.
    related_products: {
      executor:  'ramping-vus',
      exec:      'relatedProducts',
      startVUs:  0,
      stages: [
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 },
        { duration: '1m',  target: 70 }, { duration: '3m',  target: 70 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 },
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // abortOnFail: true — k6 terminates the entire run the instant any constraint
    // is violated.  delayAbortEval: '60s' prevents false abort during warm-up ramp.

    // product_list: fast MongoDB read — 500 ms is conservative.
    'http_req_duration{scenario:product_list}': [
      { threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // related_products: secondary read, same expectation as product_list.
    'http_req_duration{scenario:related_products}': [
      { threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // search_stress: DB text-search query — 1 s is the user's patience threshold.
    'http_req_duration{scenario:search_stress}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // filter_stress: DB filtered query — same expectation as search.
    'http_req_duration{scenario:filter_stress}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // photo_stress: binary payloads — p(99) because a few slow images are OK.
    'http_req_duration{scenario:photo_stress}': [
      { threshold: 'p(99)<2000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Page loads: standard React SPA first-meaningful-paint guideline.
    'http_req_duration{scenario:homepage_load}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],
    'http_req_duration{scenario:category_page}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],
    'http_req_duration{scenario:search_page}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Assertion gate — catches 200 OK responses with error bodies.
    'checks': [
      { threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '60s' },
    ],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Verifies backend is reachable and fetches seed data for VU functions.
export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`);
  check(res, {
    'setup: backend reachable':       (r) => r.status === 200,
    'setup: products array returned': (r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });
  const products      = fetchProducts(BASE_URL);
  const filterPayloads = fetchFilterPayloads(BASE_URL);
  return { products, filterPayloads };
}

// ─── Scenario: product_list ───────────────────────────────────────────────────
export function productList() {
  const page = (__VU % 2 === 0) ? 1 : 2;
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);

  check(res, {
    'product-list status 200':   (r) => r.status === 200,
    'product-list has products': (r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });

  sleep(0.2);
}

// ─── Scenario: homepage_load ──────────────────────────────────────────────────
export function homepageLoad() {
  const res = http.get(`${FRONTEND_URL}/`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'homepage status 200':   (r) => r.status === 200,
    'homepage has root':     (r) => r.body != null && r.body.includes('<div id="root">'),
    'homepage not error':    (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(1);
}

// ─── Scenario: photo_stress ───────────────────────────────────────────────────
// Picks a random product ID from the seed-data pool and downloads its photo.
// photo_stress is the widest-payload scenario — most likely to breach threshold first.
export function photoStress(data) {
  const products = data.products;
  const p = products[Math.floor(Math.random() * products.length)];
  const pid = p._id || 'unknown';
  const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${pid}`);

  check(res, {
    // Photo endpoint returns 200 with image bytes, or 404 if product has no photo
    'photo status 200 or 304': (r) => r.status === 200 || r.status === 304,
    'photo non-empty':         (r) => r.body != null && r.body.length > 0,
  });

  sleep(0.5);
}

// ─── Scenario: search_stress ──────────────────────────────────────────────────
export function searchStress() {
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  const res = http.get(`${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`);

  check(res, {
    'search status 200':    (r) => r.status === 200,
    'search results array': (r) => {
      try { return Array.isArray(r.json('results')); } catch { return false; }
    },
  });

  sleep(0.5);
}

// ─── Scenario: filter_stress ──────────────────────────────────────────────────
export function filterStress(data) {
  const filterPayloads = data.filterPayloads;
  const payload = filterPayloads[Math.floor(Math.random() * filterPayloads.length)];
  const res = http.post(
    `${BASE_URL}/api/v1/product/product-filters`,
    JSON.stringify(payload),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, {
    'filter status 200':    (r) => r.status === 200,
    'filter products array':(r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });

  sleep(0.5);
}

// ─── Scenario: category_page ──────────────────────────────────────────────────
export function categoryPage() {
  const res = http.get(`${FRONTEND_URL}/categories`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'category page status 200': (r) => r.status === 200,
    'category page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'category page not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(1);
}

// ─── Scenario: search_page ────────────────────────────────────────────────────
export function searchPage() {
  const res = http.get(`${FRONTEND_URL}/search/shirt`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'search page status 200': (r) => r.status === 200,
    'search page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'search page not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(1);
}

// ─── Scenario: related_products ───────────────────────────────────────────────
export function relatedProducts(data) {
  const products = data.products;
  const p = products[Math.floor(Math.random() * products.length)];
  const pid = p._id || 'unknown';
  const cid = (p.category && p.category._id) ? p.category._id : 'unknown';
  const res = http.get(`${BASE_URL}/api/v1/product/related-product/${pid}/${cid}`);

  check(res, {
    'related status 200':    (r) => r.status === 200,
    'related products array':(r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });

  sleep(0.3);
}

// ─── Default function (MCP / CLI fallback) ────────────────────────────────────
export default function () {
  productList();
}
