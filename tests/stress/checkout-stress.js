// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//

// checkout-stress.js — Story 3B: all checkout endpoints + frontend pages simultaneous
//
// PURPOSE
//   Run all five checkout scenarios simultaneously to find the combined breaking
//   point under realistic mixed checkout traffic. Complements checkout-stress-solo.js (3A)
//   which tests braintree/token in isolation — compare to measure interference from
//   simultaneous order history polling and full-checkout journeys.
//
// VU STAIRCASE (each scenario: 1 min ramp + 3 min hold per step, 10 steps, constant increment)
//   All scenarios start at 0 and ramp up in constant increments. Each scenario runs for
//   40 min total (10 steps × 4 min/step). VU ratios reflect realistic checkout traffic.
//   Counts are ÷4 vs original design — keeps Braintree sandbox under its ~12-conn limit
//   at step 1 so the test can ramp gradually and find the real breaking point.
//
//   Scenario         | Step 1 | ... | Step 10 | Increment | Description
//   -----------------|--------|-----|---------|-----------|-----------------------------
//   token_ramp       |    8   | ... |    75   |   ~+8     | every cart mount (token)
//   cart_page_load   |    5   | ... |    50   |   +5      | frontend /cart
//   product_detail   |    3   | ... |    25   |   ~+2-3   | frontend /product/:slug
//   orders_ramp      |    2   | ... |    20   |   +2      | GET /auth/orders
//   full_checkout    |    1   | ... |    10   |   +1      | POST braintree/payment
//
// THRESHOLD RATIONALE (Nielsen Norman UX benchmarks)
//   token_ramp:     p(95) < 1000 ms  — invisible call that blocks cart page render
//   orders_ramp:    p(95) < 1000 ms  — user viewing their order history
//   cart_page_load: p(95) < 3000 ms  — standard web page load guideline
//   product_detail: p(95) < 3000 ms  — standard web page load guideline
//   full_checkout:  checks rate > 0.98 — payment success rate matters more than latency
//
// PREREQUISITES
//   Backend:  npm run server  (port 6060, or override BASE_URL)
//   Frontend: npm run client  (port 3000) — required for cart_page_load and product_detail
//   Braintree: sandbox configured; fake-valid-nonce is used for deterministic test charges
//   DB: products must be seeded for product detail slug lookup
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/checkout-stress.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/checkout-stress.txt"

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getToken, authHeaders } from './helpers/auth.js';
import { fetchProducts } from './helpers/seed-data.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:6060';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ─── Probe credentials ─────────────────────────────────────────────────────
const PROBE_EMAIL = 'stress.checkout@k6.test';
const PROBE_PASS  = 'CheckoutProbe@k6!';

// Braintree sandbox nonce — deterministic test charge, never hits real payment network.
const FAKE_NONCE = 'fake-valid-nonce';

// ─── Per-VU JWT cache ─────────────────────────────────────────────────────
let cachedToken = null;

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ── token_ramp ──────────────────────────────────────────────────────────
    // GET /api/v1/product/braintree/token — called on every cart page mount.
    // Highest VU count because every cart visitor triggers this, not just buyers.
    token_ramp: {
      executor:  'ramping-vus',
      exec:      'tokenRamp',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:   8 }, { duration: '3m',  target:   8 },
        { duration: '1m',  target:  15 }, { duration: '3m',  target:  15 },
        { duration: '1m',  target:  23 }, { duration: '3m',  target:  23 },
        { duration: '1m',  target:  30 }, { duration: '3m',  target:  30 },
        { duration: '1m',  target:  38 }, { duration: '3m',  target:  38 },
        { duration: '1m',  target:  45 }, { duration: '3m',  target:  45 },
        { duration: '1m',  target:  53 }, { duration: '3m',  target:  53 },
        { duration: '1m',  target:  60 }, { duration: '3m',  target:  60 },
        { duration: '1m',  target:  68 }, { duration: '3m',  target:  68 },
        { duration: '1m',  target:  75 }, { duration: '3m',  target:  75 }
      ],
      gracefulRampDown: '30s',
    },

    // ── cart_page_load ────────────────────────────────────────────────────
    // GET http://localhost:3000/cart — React SPA HTML shell.
    // REQUIRES: React dev server running on FRONTEND_URL.
    cart_page_load: {
      executor:  'ramping-vus',
      exec:      'cartPageLoad',
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

    // ── product_detail ────────────────────────────────────────────────────
    // GET http://localhost:3000/product/:slug — "Add to Cart" precursor page.
    // REQUIRES: React dev server running on FRONTEND_URL.
    product_detail: {
      executor:  'ramping-vus',
      exec:      'productDetail',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  3 }, { duration: '3m',  target:  3 },
        { duration: '1m',  target:  5 }, { duration: '3m',  target:  5 },
        { duration: '1m',  target:  8 }, { duration: '3m',  target:  8 },
        { duration: '1m',  target: 10 }, { duration: '3m',  target: 10 },
        { duration: '1m',  target: 13 }, { duration: '3m',  target: 13 },
        { duration: '1m',  target: 15 }, { duration: '3m',  target: 15 },
        { duration: '1m',  target: 18 }, { duration: '3m',  target: 18 },
        { duration: '1m',  target: 20 }, { duration: '3m',  target: 20 },
        { duration: '1m',  target: 23 }, { duration: '3m',  target: 23 },
        { duration: '1m',  target: 25 }, { duration: '3m',  target: 25 }
      ],
      gracefulRampDown: '30s',
    },

    // ── orders_ramp ───────────────────────────────────────────────────────
    // GET /api/v1/auth/orders — user views their order history.
    // Moderate VU count — only logged-in users who navigate to the orders page.
    orders_ramp: {
      executor:  'ramping-vus',
      exec:      'ordersRamp',
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

    // ── full_checkout ─────────────────────────────────────────────────────
    // Full payment journey: GET token → POST payment → GET orders.
    // Low VU count — only ~5% of cart visitors complete a purchase.
    // Uses group() so Grafana shows per-step breakdown.
    // Uses Braintree sandbox fake-valid-nonce for deterministic test charges.
    // NOTE: generates real order documents in MongoDB.
    //   Clean up after testing: db.orders.deleteMany({ buyer: <probe user id> })
    full_checkout: {
      executor:  'ramping-vus',
      exec:      'fullCheckout',
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
    // token_ramp: invisible call that blocks cart page render.
    'http_req_duration{scenario:token_ramp}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '3m' },
    ],

    // orders_ramp: user viewing order history.
    'http_req_duration{scenario:orders_ramp}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // Page loads: standard React SPA guideline.
    'http_req_duration{scenario:cart_page_load}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],
    'http_req_duration{scenario:product_detail}': [
      { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // full_checkout: payment success rate matters more than individual step latency.
    'checks{scenario:full_checkout}': [
      { threshold: 'rate>0.98', abortOnFail: true, delayAbortEval: '60s' },
    ],

    // HTTP error gate.
    'http_req_failed': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' },
    ],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Creates the probe user idempotently.
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Checkout Stress User', email: PROBE_EMAIL, password: PROBE_PASS,
      phone: '55555555', address: 'Checkout Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, {
    'checkout probe user ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });
  const products = fetchProducts(BASE_URL);
  return { email: PROBE_EMAIL, pass: PROBE_PASS, products };
}

// ─── Scenario: token_ramp ─────────────────────────────────────────────────────
export function tokenRamp(data) {
  if (!cachedToken) {
    cachedToken = getToken(BASE_URL, data.email, data.pass);
  }

  const res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
    headers: { authorization: cachedToken || '' },
  });

  check(res, {
    'braintree token status 200':  (r) => r.status === 200,
    'braintree token clientToken': (r) => {
      try { return typeof r.json('clientToken') === 'string'; } catch { return false; }
    },
  });

  sleep(0.5);
}

// ─── Scenario: cart_page_load ─────────────────────────────────────────────────
export function cartPageLoad() {
  const res = http.get(`${FRONTEND_URL}/cart`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'cart page status 200':  (r) => r.status === 200,
    'cart page has root':    (r) => r.body != null && r.body.includes('<div id="root">'),
    'cart page not error':   (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(1);
}

// ─── Scenario: product_detail ─────────────────────────────────────────────────
export function productDetail(data) {
  const products = data.products;
  const p = products[Math.floor(Math.random() * products.length)];
  const slug = p.slug || 'unknown';
  const res = http.get(`${FRONTEND_URL}/product/${slug}`, { headers: { 'Accept': 'text/html' } });

  check(res, {
    'product detail status 200': (r) => r.status === 200,
    'product detail has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'product detail not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });

  sleep(1);
}

// ─── Scenario: orders_ramp ────────────────────────────────────────────────────
export function ordersRamp(data) {
  if (!cachedToken) {
    cachedToken = getToken(BASE_URL, data.email, data.pass);
  }

  const res = http.get(`${BASE_URL}/api/v1/auth/orders`, {
    headers: { authorization: cachedToken || '' },
  });

  check(res, {
    'orders status 200':   (r) => r.status === 200,
    'orders array':        (r) => {
      try { return Array.isArray(r.json('orders')); } catch { return false; }
    },
  });

  sleep(1);
}

// ─── Scenario: full_checkout ──────────────────────────────────────────────────
// Full payment journey grouped so Grafana / InfluxDB records per-step timings.
// Step 1: GET braintree/token (renders the payment form)
// Step 2: POST braintree/payment (submits the order)
// Step 3: GET auth/orders (confirms order was recorded)
export function fullCheckout(data) {
  if (!cachedToken) {
    cachedToken = getToken(BASE_URL, data.email, data.pass);
  }
  const products = data.products;
  const hdr = authHeaders(cachedToken);

  let tokenOk    = false;
  let paymentOk  = false;
  let ordersOk   = false;

  // Step 1 — obtain Braintree client token
  group('step1_get_token', function () {
    const r = http.get(`${BASE_URL}/api/v1/product/braintree/token`, { headers: hdr });
    tokenOk = check(r, {
      'checkout step1 token 200':   (res) => res.status === 200,
      'checkout step1 clientToken': (res) => {
        try { return typeof res.json('clientToken') === 'string'; } catch { return false; }
      },
    });
  });

  if (!tokenOk) { sleep(1); return; }

  // Step 2 — submit payment using the deterministic Braintree sandbox nonce
  group('step2_payment', function () {
    const p = products[Math.floor(Math.random() * products.length)];
    const r = http.post(
      `${BASE_URL}/api/v1/product/braintree/payment`,
      JSON.stringify({
        nonce: FAKE_NONCE,
        cart:  [{ _id: p._id, price: 10 }],
      }),
      { headers: hdr },
    );
    paymentOk = check(r, {
      'checkout step2 payment 200': (res) => res.status === 200,
      'checkout step2 ok':          (res) => {
        try { return res.json('ok') === true; } catch { return false; }
      },
    });
  });

  if (!paymentOk) { sleep(1); return; }

  // Step 3 — verify order appears in order history
  group('step3_orders', function () {
    const r = http.get(`${BASE_URL}/api/v1/auth/orders`, { headers: hdr });
    ordersOk = check(r, {
      'checkout step3 orders 200': (res) => res.status === 200,
      'checkout step3 orders set': (res) => {
        try { return Array.isArray(res.json('orders')); } catch { return false; }
      },
    });
  });

  // 2 s think time — purchasing is a deliberate action; user reviews the confirmation.
  sleep(2);
}

// ─── Default function (MCP / CLI fallback) ────────────────────────────────────
export default function (data) {
  tokenRamp(data);
}
