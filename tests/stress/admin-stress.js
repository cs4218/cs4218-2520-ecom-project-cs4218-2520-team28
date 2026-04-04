// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// admin-stress.js — Story 4B: all admin endpoints + frontend pages simultaneous
//
// PURPOSE
//   Run all six admin scenarios simultaneously to find the combined breaking point
//   under realistic mixed admin traffic.  Complements admin-stress-solo.js (4A)
//   which tests all-orders polling in isolation — compare to measure write
//   contention impact: concurrent status updates and product uploads degrade
//   the orders read query performance.
//
// VU STAIRCASE  (each scenario: 1 min ramp + 3 min hold per step)
//   6 scenarios, each with constant VU increments and 10 steps:
//     all_orders_poll:      5 → 10 → 15 → 20 → 25 → 30 → 35 → 40 → 45 → 50 VUs (increment 5)
//     admin_dashboard:      5 → 10 → 15 → 20 → 25 → 30 → 35 → 40 → 45 → 50 VUs (increment 5)
//     admin_products_page:  4 → 8 → 12 → 16 → 20 → 24 → 28 → 32 → 36 → 40 VUs (increment 4)
//     order_status_updates: 3 → 6 → 9 → 12 → 15 → 18 → 21 → 24 → 27 → 30 VUs (increment 3)
//     category_churn:       2 → 4 → 6 → 8 → 10 → 12 → 14 → 16 → 18 → 20 VUs (increment 2)
//     product_create:       1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 VUs (increment 1)
//   Each step: 1 min ramp up, 3 min hold. Test aborts on scenario-specific thresholds.
//
// THRESHOLD RATIONALE  (admin UX expectations)
//   order_status_updates  p(95) < 1000 ms  — admin clicks "Update Status"; expects immediate ack
//   category_churn        p(95) < 1000 ms  — CRUD operations; expects responsive feedback
//   all_orders_poll       p(95) < 2000 ms  — large dataset; admin knows this takes a moment
//   product_create        p(95) < 3000 ms  — file upload; user expects it to take a moment
//   admin_dashboard       p(95) < 3000 ms  — standard web page load guideline
//   admin_products_page   p(95) < 3000 ms  — standard web page load guideline
//
// PREREQUISITES
//   Backend:  npm run server  (port 6060, or override BASE_URL)
//   Frontend: npm run client  (port 3000) — required for admin_dashboard and admin_products_page
//   Auth:     Admin probe user must have role=1 in MongoDB
//             db.users.updateOne({ email: 'stress.admin@k6.test' }, { $set: { role: 1 } })
//   DB:       Products and categories must be seeded
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/admin-stress.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/admin-stress.txt"

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken, authHeaders } from './helpers/auth.js';
import { fetchCategories, orderStatuses } from './helpers/seed-data.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:6060';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ─── Probe credentials ─────────────────────────────────────────────────────
const ADMIN_EMAIL = 'stress.admin@k6.test';
const ADMIN_PASS  = 'AdminProbe@k6!';

// ─── Per-VU JWT cache ─────────────────────────────────────────────────────
let cachedAdminToken = null;

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── all_orders_poll ────────────────────────────────────────────────────
    // GET /api/v1/auth/all-orders — dashboard auto-refresh (dominant admin read).
    all_orders_poll: {
      executor:  'ramping-vus',
      exec:      'allOrdersPoll',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  5 }, { duration: '3m',  target:  5 },
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 15 }, { duration: '3m',  target: 15 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 25 }, { duration: '3m',  target: 25 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 35 }, { duration: '3m',  target: 35 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 45 }, { duration: '3m',  target: 45 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 }
      ],
      gracefulRampDown: '30s',
    },

    // ── admin_dashboard ────────────────────────────────────────────────────
    // GET http://localhost:3000/dashboard/admin — React SPA HTML shell.
    // REQUIRES: React dev server running on FRONTEND_URL.
    admin_dashboard: {
      executor:  'ramping-vus',
      exec:      'adminDashboard',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  5 }, { duration: '3m',  target:  5 },
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 15 }, { duration: '3m',  target: 15 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 25 }, { duration: '3m',  target: 25 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 35 }, { duration: '3m',  target: 35 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 45 }, { duration: '3m',  target: 45 },
        { duration: '1m',  target: 50 }, { duration: '3m',  target: 50 }
      ],
      gracefulRampDown: '30s',
    },

    // ── admin_products_page ────────────────────────────────────────────────
    // GET http://localhost:3000/dashboard/admin/products — product list under write load.
    // REQUIRES: React dev server running on FRONTEND_URL.
    admin_products_page: {
      executor:  'ramping-vus',
      exec:      'adminProductsPage',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  4 }, { duration: '3m',  target:  4 },
        { duration: '1m',  target:  8 }, { duration: '3m',  target:  8 },
        { duration: '1m',  target: 12 }, { duration: '3m',  target: 12 },
        { duration: '1m',  target: 16 }, { duration: '3m',  target: 16 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 24 }, { duration: '3m',  target: 24 },
        { duration: '1m',  target: 28 }, { duration: '3m',  target: 28 },
        { duration: '1m',  target: 32 }, { duration: '3m',  target: 32 },
        { duration: '1m',  target: 36 }, { duration: '3m',  target: 36 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 }
      ],
      gracefulRampDown: '30s',
    },

    // ── order_status_updates ───────────────────────────────────────────────
    // PUT /api/v1/auth/order-status/:orderId — concurrent order status updates.
    // Generates write contention with the all-orders read query.
    // Uses a pre-fetched order ID from the setup() return value.
    order_status_updates: {
      executor:  'ramping-vus',
      exec:      'orderStatusUpdates',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  3 }, { duration: '3m',  target:  3 },
        { duration: '1m',  target:  6 }, { duration: '3m',  target:  6 },
        { duration: '1m',  target:  9 }, { duration: '3m',  target:  9 },
        { duration: '1m',  target: 12 }, { duration: '3m',  target: 12 },
        { duration: '1m',  target: 15 }, { duration: '3m',  target: 15 },
        { duration: '1m',  target: 18 }, { duration: '3m',  target: 18 },
        { duration: '1m',  target: 21 }, { duration: '3m',  target: 21 },
        { duration: '1m',  target: 24 }, { duration: '3m',  target: 24 },
        { duration: '1m',  target: 27 }, { duration: '3m',  target: 27 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 }
      ],
      gracefulRampDown: '30s',
    },

    // ── category_churn ─────────────────────────────────────────────────────
    // POST /api/v1/category/create-category + DELETE — write CRUD churn.
    // Creates a new category each iteration, then deletes it → net-zero DB growth.
    // NOTE: Generates stress.cat.* categories in MongoDB.  Clean up after testing:
    //   db.categories.deleteMany({ name: /^stress\.cat\./ })
    category_churn: {
      executor:  'ramping-vus',
      exec:      'categoryChurn',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  2 }, { duration: '3m',  target:  2 },
        { duration: '1m',  target:  4 }, { duration: '3m',  target:  4 },
        { duration: '1m',  target:  6 }, { duration: '3m',  target:  6 },
        { duration: '1m',  target:  8 }, { duration: '3m',  target:  8 },
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 12 }, { duration: '3m',  target: 12 },
        { duration: '1m',  target: 14 }, { duration: '3m',  target: 14 },
        { duration: '1m',  target: 16 }, { duration: '3m',  target: 16 },
        { duration: '1m',  target: 18 }, { duration: '3m',  target: 18 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 }
      ],
      gracefulRampDown: '30s',
    },

    // ── product_create ─────────────────────────────────────────────────────
    // POST /api/v1/product/create-product — multipart form-data product upload.
    // Rarest admin action — product catalog changes infrequently.
    // NOTE: Generates stress.product.* entries in MongoDB.  Clean up after testing:
    //   db.products.deleteMany({ name: /^stress\.product\./ })
    product_create: {
      executor:  'ramping-vus',
      exec:      'productCreate',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  1 }, { duration: '3m',  target:  1 },
        { duration: '1m',  target:  2 }, { duration: '3m',  target:  2 },
        { duration: '1m',  target:  3 }, { duration: '3m',  target:  3 },
        { duration: '1m',  target:  4 }, { duration: '3m',  target:  4 },
        { duration: '1m',  target:  5 }, { duration: '3m',  target:  5 },
        { duration: '1m',  target:  6 }, { duration: '3m',  target:  6 },
        { duration: '1m',  target:  7 }, { duration: '3m',  target:  7 },
        { duration: '1m',  target:  8 }, { duration: '3m',  target:  8 },
        { duration: '1m',  target:  9 }, { duration: '3m',  target:  9 },
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 }
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // order_status_updates: admin clicks Update Status; expects immediate feedback.
    'http_req_duration{scenario:order_status_updates}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // category_churn: CRUD operations; admin expects responsive interface.
    'http_req_duration{scenario:category_churn}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // all_orders_poll: large dataset; admin tolerates a brief loading moment.
    'http_req_duration{scenario:all_orders_poll}': [
      { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // product_create: file upload; user expects it to take a moment.
    'http_req_duration{scenario:product_create}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Admin page loads: standard web page load guideline.
    'http_req_duration{scenario:admin_dashboard}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],
    'http_req_duration{scenario:admin_products_page}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Assertion gate.
    'checks': [
      { threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '60s' },
    ],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Creates the admin probe user and fetches a sample order ID for status updates.
export function setup() {
  // Register admin probe user idempotently.
  const regRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Admin Stress User', email: ADMIN_EMAIL, password: ADMIN_PASS,
      phone: '66666666', address: 'Admin Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(regRes, {
    'admin probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  // Obtain admin JWT to fetch a sample order ID.
  const token = getToken(BASE_URL, ADMIN_EMAIL, ADMIN_PASS);

  // Fetch all orders to find an ID to use for status update stress.
  let sampleOrderId = null;
  if (token) {
    const ordersRes = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers: { authorization: token },
    });
    try {
      const body = JSON.parse(ordersRes.body);
      if (Array.isArray(body.orders) && body.orders.length > 0) {
        sampleOrderId = body.orders[0]._id;
      }
    } catch { /* no orders yet — status update scenario will skip gracefully */ }
  }

  const categories = fetchCategories(BASE_URL);
  return { email: ADMIN_EMAIL, pass: ADMIN_PASS, sampleOrderId, categories };
}

// ─── Scenario: all_orders_poll ────────────────────────────────────────────────
export function allOrdersPoll(data) {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, data.email, data.pass);
  }

  const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
    headers: { authorization: cachedAdminToken || '' },
  });

  check(res, {
    'all-orders status 200': (r) => r.status === 200,
    'all-orders array':      (r) => {
      try { return Array.isArray(r.json('orders')); } catch { return false; }
    },
  });

  // 3 s think time — admin dashboard auto-refresh interval.
  sleep(3);
}

// ─── Scenario: admin_dashboard ────────────────────────────────────────────────
export function adminDashboard() {
  const res = http.get(`${FRONTEND_URL}/dashboard/admin`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'admin dashboard status 200': (r) => r.status === 200,
    'admin dashboard has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'admin dashboard not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(2);
}

// ─── Scenario: admin_products_page ────────────────────────────────────────────
export function adminProductsPage() {
  const res = http.get(
    `${FRONTEND_URL}/dashboard/admin/products`,
    { headers: { 'Accept': 'text/html' } },
  );

  check(res, {
    'admin products page status 200': (r) => r.status === 200,
    'admin products page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'admin products page not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(2);
}

// ─── Scenario: order_status_updates ──────────────────────────────────────────
// Cycles through all order statuses for the sample order in a round-robin pattern.
// If no sample order exists (empty DB), the scenario skips gracefully.
export function orderStatusUpdates(data) {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, data.email, data.pass);
  }
  if (!data.sampleOrderId) { sleep(1); return; }

  const status = orderStatuses[__ITER % orderStatuses.length];
  const res = http.put(
    `${BASE_URL}/api/v1/auth/order-status/${data.sampleOrderId}`,
    JSON.stringify({ status }),
    { headers: authHeaders(cachedAdminToken) },
  );

  check(res, {
    'order-status update 200': (r) => r.status === 200,
    'order-status ok':         (r) => {
      try { return r.json('success') === true; } catch { return false; }
    },
  });

  // 1 s think time — admin clicks Update, reads the confirmation, then moves on.
  sleep(1);
}

// ─── Scenario: category_churn ─────────────────────────────────────────────────
// Creates a unique category per VU × iteration, then immediately deletes it.
// Net-zero DB growth — safe to leave running without accumulation.
export function categoryChurn(data) {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, data.email, data.pass);
  }
  const hdr = authHeaders(cachedAdminToken);

  const catName = `stress.cat.${__VU}.${__ITER}`;

  // Create
  const createRes = http.post(
    `${BASE_URL}/api/v1/category/create-category`,
    JSON.stringify({ name: catName }),
    { headers: hdr },
  );

  const created = check(createRes, {
    'category create 201': (r) => r.status === 201,
    'category create ok':  (r) => {
      try { return r.json('success') === true; } catch { return false; }
    },
  });

  // Delete immediately to keep DB clean.
  if (created) {
    let newId;
    try { newId = createRes.json('category._id'); } catch { /* skip delete if ID missing */ }
    if (newId) {
      http.del(
        `${BASE_URL}/api/v1/category/delete-category/${newId}`,
        null,
        { headers: hdr },
      );
    }
  }

  sleep(1);
}

// ─── Scenario: product_create ─────────────────────────────────────────────────
// Creates a product using multipart/form-data (no photo attachment to keep payloads small).
// Unique name per VU × iteration.
// NOTE: Products accumulate in DB — clean up after testing:
//   db.products.deleteMany({ name: /^stress\.product\./ })
export function productCreate(data) {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, data.email, data.pass);
  }

  const cat = data.categories[Math.floor(Math.random() * data.categories.length)];
  const catId = cat._id || 'unknown';
  const productName = `stress.product.${__VU}.${__ITER}`;

  const formData = {
    name:        productName,
    description: 'k6 stress test product',
    price:       '9.99',
    category:    catId,
    quantity:    '1',
    shipping:    '0',
  };

  const res = http.post(
    `${BASE_URL}/api/v1/product/create-product`,
    formData,
    { headers: { authorization: cachedAdminToken || '' } },
  );

  check(res, {
    'product create 201': (r) => r.status === 201,
    'product create ok':  (r) => {
      try { return r.json('success') === true; } catch { return false; }
    },
  });

  // 2 s think time — admin fills in the product form; upload takes a visible moment.
  sleep(2);
}

// ─── Default function (MCP / CLI fallback) ────────────────────────────────────
export default function (data) {
  allOrdersPoll(data);
}
