// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// mixed-stress.js — Story 5: realistic combined workload across all stories
//
// PURPOSE
//   Run all Stories 1–4 scenarios simultaneously in a single test to find the
//   system-wide breaking point under realistic mixed traffic.  Individual story
//   scripts establish per-component ceilings; this script reveals the ceiling of
//   the whole system when all workloads compete for the same resources:
//   MongoDB connection pool, Node.js event loop, bcrypt thread pool, Braintree API.
//
//   Ratios are weighted by realistic traffic:
//   catalog reads dominate → auth checks are high-frequency → checkout is mid-volume → admin is lightest.
//
// VU STAIRCASE  (each scenario: 1 min ramp + 3 min hold per step)
//   All scenarios start from time zero (no startTime offset).
//   VU ratios are directly from PLAN.md § Story 5.
//
//   ─── Catalog (dominant — anonymous browsing) ───
//   product_list       : steps 100 → 200 → 300 VUs   ← every homepage mount
//   homepage_load      : steps  80 → 150 → 220 VUs   [frontend /]
//   photo_stress       : steps  50 → 100 → 150 VUs   ← one per listed product
//   ─── Auth (high-frequency — every protected page) ───
//   session_check      : steps  60 → 120 → 180 VUs   ← JWT verify on each nav
//   login_flow         : steps  30 →  60 →  90 VUs   ← once per session
//   login_page_load    : steps  25 →  50 →  80 VUs   [frontend /login]
//   ─── Checkout (mid-frequency — cart visitors only) ───
//   token_ramp         : steps  20 →  40 →  60 VUs   ← every cart mount
//   cart_page_load     : steps  15 →  30 →  50 VUs   [frontend /cart]
//   full_checkout      : steps   5 →  10 →  20 VUs   ← actual buyers (~5%)
//   ─── Admin (lightest — small user base) ───
//   all_orders_poll    : steps  10 →  15 →  20 VUs
//   admin_dashboard    : steps   8 →  12 →  18 VUs   [frontend /dashboard/admin]
//   order_status_updates: steps  5 →   8 →  12 VUs
//
// THRESHOLD RATIONALE
//   Same UX-based values as Stories 1–4.  User experience expectations do not
//   change in a mixed workload.  abortOnFail: true on every threshold so k6
//   terminates the instant the first component breaches its UX constraint.
//
// PREREQUISITES
//   Backend:  npm run server  (port 6060, or override BASE_URL)
//   Frontend: npm run client  (port 3000) — required for all *_load and *_page scenarios
//   Auth:     Both login probe (stress.auth@k6.test) and admin probe (stress.admin@k6.test)
//             must exist.  Admin user must have role=1.
//   Braintree: sandbox configured; fake-valid-nonce used for deterministic charges
//   DB:       Products, categories, and at least 1 order seeded
//
// SUBMISSION RUN (streams metrics to InfluxDB / Grafana):
//   k6 run tests/stress/mixed-stress.js --out influxdb=http://localhost:8086/k6 2>&1 | Tee-Object -FilePath "tests/stress/results/mixed-stress.txt"

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { getToken, authHeaders } from './helpers/auth.js';
import { products, categories, keywords, filterPayloads, orderStatuses } from './helpers/seed-data.js';

// ─── URLs ──────────────────────────────────────────────────────────────────
const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:6060';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// ─── Probe credentials ─────────────────────────────────────────────────────
const LOGIN_EMAIL = 'stress.auth@k6.test';
const LOGIN_PASS  = 'AuthProbe@k6!';

const CHECKOUT_EMAIL = 'stress.checkout@k6.test';
const CHECKOUT_PASS  = 'CheckoutProbe@k6!';

const ADMIN_EMAIL = 'stress.admin@k6.test';
const ADMIN_PASS  = 'AdminProbe@k6!';

// Braintree sandbox nonce.
const FAKE_NONCE = 'fake-valid-nonce';

// ─── Custom Trend metrics ─────────────────────────────────────────────────
// Story 5 defines custom Trends so Grafana can plot aggregate duration lines
// across logically grouped scenarios.
const loginDuration    = new Trend('login_duration');
const checkoutDuration = new Trend('checkout_duration');
const catalogDuration  = new Trend('catalog_duration');
const homepageDuration = new Trend('homepage_duration');
const cartPageDuration = new Trend('cart_page_duration');

// ─── Per-VU caches ────────────────────────────────────────────────────────
// Module-level vars are per-VU in k6 (each VU has its own JS context).
let cachedLoginToken    = null;
let cachedCheckoutToken = null;
let cachedAdminToken    = null;

// ─── Options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {

    // ═══════════════════════════════════════════════════════════════
    // CATALOG — dominant workload (anonymous browsing)
    // ═══════════════════════════════════════════════════════════════

    product_list: {
      executor:  'ramping-vus',
      exec:      'productList',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  25 }, { duration: '3m',  target:  25 },
        { duration: '1m',  target:  50 }, { duration: '3m',  target:  50 },
        { duration: '1m',  target:  75 }, { duration: '3m',  target:  75 },
        { duration: '1m',  target: 100 }, { duration: '3m',  target: 100 },
        { duration: '1m',  target: 125 }, { duration: '3m',  target: 125 },
        { duration: '1m',  target: 150 }, { duration: '3m',  target: 150 },
        { duration: '1m',  target: 175 }, { duration: '3m',  target: 175 },
        { duration: '1m',  target: 200 }, { duration: '3m',  target: 200 },
        { duration: '1m',  target: 225 }, { duration: '3m',  target: 225 },
        { duration: '1m',  target: 250 }, { duration: '3m',  target: 250 }
      ],
      gracefulRampDown: '30s',
    },

    homepage_load: {
      executor:  'ramping-vus',
      exec:      'homepageLoad',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  20 }, { duration: '3m',  target:  20 },
        { duration: '1m',  target:  40 }, { duration: '3m',  target:  40 },
        { duration: '1m',  target:  60 }, { duration: '3m',  target:  60 },
        { duration: '1m',  target:  80 }, { duration: '3m',  target:  80 },
        { duration: '1m',  target: 100 }, { duration: '3m',  target: 100 },
        { duration: '1m',  target: 120 }, { duration: '3m',  target: 120 },
        { duration: '1m',  target: 140 }, { duration: '3m',  target: 140 },
        { duration: '1m',  target: 160 }, { duration: '3m',  target: 160 },
        { duration: '1m',  target: 180 }, { duration: '3m',  target: 180 },
        { duration: '1m',  target: 200 }, { duration: '3m',  target: 200 }
      ],
      gracefulRampDown: '30s',
    },

    photo_stress: {
      executor:  'ramping-vus',
      exec:      'photoStress',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  12 }, { duration: '3m',  target:  12 },
        { duration: '1m',  target:  24 }, { duration: '3m',  target:  24 },
        { duration: '1m',  target:  36 }, { duration: '3m',  target:  36 },
        { duration: '1m',  target:  48 }, { duration: '3m',  target:  48 },
        { duration: '1m',  target:  60 }, { duration: '3m',  target:  60 },
        { duration: '1m',  target:  72 }, { duration: '3m',  target:  72 },
        { duration: '1m',  target:  84 }, { duration: '3m',  target:  84 },
        { duration: '1m',  target:  96 }, { duration: '3m',  target:  96 },
        { duration: '1m',  target: 108 }, { duration: '3m',  target: 108 },
        { duration: '1m',  target: 120 }, { duration: '3m',  target: 120 }
      ],
      gracefulRampDown: '30s',
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTH — high-frequency (every protected page nav)
    // ═══════════════════════════════════════════════════════════════

    session_check: {
      executor:  'ramping-vus',
      exec:      'sessionCheck',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  15 }, { duration: '3m',  target:  15 },
        { duration: '1m',  target:  30 }, { duration: '3m',  target:  30 },
        { duration: '1m',  target:  45 }, { duration: '3m',  target:  45 },
        { duration: '1m',  target:  60 }, { duration: '3m',  target:  60 },
        { duration: '1m',  target:  75 }, { duration: '3m',  target:  75 },
        { duration: '1m',  target:  90 }, { duration: '3m',  target:  90 },
        { duration: '1m',  target: 105 }, { duration: '3m',  target: 105 },
        { duration: '1m',  target: 120 }, { duration: '3m',  target: 120 },
        { duration: '1m',  target: 135 }, { duration: '3m',  target: 135 },
        { duration: '1m',  target: 150 }, { duration: '3m',  target: 150 }
      ],
      gracefulRampDown: '30s',
    },

    login_flow: {
      executor:  'ramping-vus',
      exec:      'loginFlow',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  8 }, { duration: '3m',  target:  8 },
        { duration: '1m',  target: 16 }, { duration: '3m',  target: 16 },
        { duration: '1m',  target: 24 }, { duration: '3m',  target: 24 },
        { duration: '1m',  target: 32 }, { duration: '3m',  target: 32 },
        { duration: '1m',  target: 40 }, { duration: '3m',  target: 40 },
        { duration: '1m',  target: 48 }, { duration: '3m',  target: 48 },
        { duration: '1m',  target: 56 }, { duration: '3m',  target: 56 },
        { duration: '1m',  target: 64 }, { duration: '3m',  target: 64 },
        { duration: '1m',  target: 72 }, { duration: '3m',  target: 72 },
        { duration: '1m',  target: 80 }, { duration: '3m',  target: 80 }
      ],
      gracefulRampDown: '30s',
    },

    login_page_load: {
      executor:  'ramping-vus',
      exec:      'loginPageLoad',
      startVUs:  0,
      stages: [
        { duration: '1m',  target:  6 }, { duration: '3m',  target:  6 },
        { duration: '1m',  target: 12 }, { duration: '3m',  target: 12 },
        { duration: '1m',  target: 18 }, { duration: '3m',  target: 18 },
        { duration: '1m',  target: 24 }, { duration: '3m',  target: 24 },
        { duration: '1m',  target: 30 }, { duration: '3m',  target: 30 },
        { duration: '1m',  target: 36 }, { duration: '3m',  target: 36 },
        { duration: '1m',  target: 42 }, { duration: '3m',  target: 42 },
        { duration: '1m',  target: 48 }, { duration: '3m',  target: 48 },
        { duration: '1m',  target: 54 }, { duration: '3m',  target: 54 },
        { duration: '1m',  target: 60 }, { duration: '3m',  target: 60 }
      ],
      gracefulRampDown: '30s',
    },

    // ═══════════════════════════════════════════════════════════════
    // CHECKOUT — mid-frequency (cart visitors only)
    // ═══════════════════════════════════════════════════════════════

    token_ramp: {
      executor:  'ramping-vus',
      exec:      'tokenRamp',
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

    cart_page_load: {
      executor:  'ramping-vus',
      exec:      'cartPageLoad',
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

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — lightest (small user base)
    // ═══════════════════════════════════════════════════════════════

    all_orders_poll: {
      executor:  'ramping-vus',
      exec:      'allOrdersPoll',
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

    admin_dashboard: {
      executor:  'ramping-vus',
      exec:      'adminDashboard',
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

    order_status_updates: {
      executor:  'ramping-vus',
      exec:      'orderStatusUpdates',
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
    // ── Catalog thresholds ──
    'http_req_duration{scenario:product_list}':   [{ threshold: 'p(95)<500',  abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:photo_stress}':   [{ threshold: 'p(99)<2000', abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:homepage_load}':  [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' }],

    // ── Auth thresholds ──
    'http_req_duration{scenario:session_check}':  [{ threshold: 'p(95)<500',  abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:login_flow}':     [{ threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:login_page_load}':[{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' }],

    // ── Checkout thresholds ──
    'http_req_duration{scenario:token_ramp}':     [{ threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:cart_page_load}': [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' }],
    'checks{scenario:full_checkout}':             [{ threshold: 'rate>0.98',  abortOnFail: true, delayAbortEval: '60s' }],

    // ── Admin thresholds ──
    'http_req_duration{scenario:all_orders_poll}':      [{ threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:admin_dashboard}':      [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' }],
    'http_req_duration{scenario:order_status_updates}': [{ threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '60s' }],

    // ── Global gates ──
    'http_req_failed': [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '60s' }],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
// Creates all probe users idempotently.
export function setup() {
  // Login probe (auth + session_check + login_flow)
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Auth Stress User', email: LOGIN_EMAIL, password: LOGIN_PASS,
      phone: '22222222', address: 'Auth Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, {
    'login probe ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  // Checkout probe
  const checkoutRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Checkout Stress User', email: CHECKOUT_EMAIL, password: CHECKOUT_PASS,
      phone: '55555555', address: 'Checkout Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(checkoutRes, {
    'checkout probe ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  // Admin probe
  const adminRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({
      name: 'Admin Stress User', email: ADMIN_EMAIL, password: ADMIN_PASS,
      phone: '66666666', address: 'Admin Test HQ', answer: 'k6',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(adminRes, {
    'admin probe ready': (r) =>
      r.status === 201 || (r.status === 200 && r.json('success') === false),
  });

  // Fetch a sample order ID for order_status_updates.
  const adminToken = getToken(BASE_URL, ADMIN_EMAIL, ADMIN_PASS);
  let sampleOrderId = null;
  if (adminToken) {
    const ordersRes = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers: { authorization: adminToken },
    });
    try {
      const body = JSON.parse(ordersRes.body);
      if (Array.isArray(body.orders) && body.orders.length > 0) {
        sampleOrderId = body.orders[0]._id;
      }
    } catch { /* no orders yet */ }
  }

  return { sampleOrderId };
}

// ════════════════════════════════════════════════════════════════════════════
// CATALOG SCENARIOS
// ════════════════════════════════════════════════════════════════════════════

export function productList() {
  const page = (__VU % 2 === 0) ? 1 : 2;
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);
  catalogDuration.add(Date.now() - start);

  check(res, {
    'product-list status 200':   (r) => r.status === 200,
    'product-list has products': (r) => {
      try { return Array.isArray(r.json('products')); } catch { return false; }
    },
  });
  sleep(0.2);
}

export function homepageLoad() {
  const start = Date.now();
  const res = http.get(`${FRONTEND_URL}/`, { headers: { 'Accept': 'text/html' } });
  homepageDuration.add(Date.now() - start);

  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'homepage not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });
  sleep(1);
}

export function photoStress() {
  const p = products[Math.floor(Math.random() * products.length)];
  const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${p._id || 'unknown'}`);

  check(res, {
    'photo status 200 or 304': (r) => r.status === 200 || r.status === 304,
    'photo non-empty':         (r) => r.body != null && r.body.length > 0,
  });
  sleep(0.5);
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH SCENARIOS
// ════════════════════════════════════════════════════════════════════════════

export function sessionCheck() {
  if (!cachedLoginToken) {
    cachedLoginToken = getToken(BASE_URL, LOGIN_EMAIL, LOGIN_PASS);
  }

  const res = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
    headers: { authorization: cachedLoginToken || '' },
  });
  check(res, {
    'user-auth status 200': (r) => r.status === 200,
    'user-auth ok':         (r) => { try { return r.json('ok') === true; } catch { return false; } },
  });
  sleep(0.1);
}

export function loginFlow() {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASS }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginDuration.add(Date.now() - start);

  check(res, {
    'login status 200':   (r) => r.status === 200,
    'login succeeded':    (r) => { try { return r.json('success') === true;         } catch { return false; } },
    'login token issued': (r) => { try { return typeof r.json('token') === 'string'; } catch { return false; } },
  });
  sleep(0.1);
}

export function loginPageLoad() {
  const res = http.get(`${FRONTEND_URL}/login`, { headers: { 'Accept': 'text/html' } });
  check(res, {
    'login page status 200': (r) => r.status === 200,
    'login page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'login page not 404':    (r) => r.body != null && !r.body.includes('Cannot GET'),
  });
  sleep(1);
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT SCENARIOS
// ════════════════════════════════════════════════════════════════════════════

export function tokenRamp() {
  if (!cachedCheckoutToken) {
    cachedCheckoutToken = getToken(BASE_URL, CHECKOUT_EMAIL, CHECKOUT_PASS);
  }

  const res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
    headers: { authorization: cachedCheckoutToken || '' },
  });
  check(res, {
    'braintree token status 200':  (r) => r.status === 200,
    'braintree token clientToken': (r) => {
      try { return typeof r.json('clientToken') === 'string'; } catch { return false; }
    },
  });
  sleep(0.5);
}

export function cartPageLoad() {
  const start = Date.now();
  const res = http.get(`${FRONTEND_URL}/cart`, { headers: { 'Accept': 'text/html' } });
  cartPageDuration.add(Date.now() - start);

  check(res, {
    'cart page status 200': (r) => r.status === 200,
    'cart page has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'cart page not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });
  sleep(1);
}

export function fullCheckout() {
  if (!cachedCheckoutToken) {
    cachedCheckoutToken = getToken(BASE_URL, CHECKOUT_EMAIL, CHECKOUT_PASS);
  }
  const hdr = authHeaders(cachedCheckoutToken);

  let tokenOk = false;
  const start = Date.now();

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

  group('step2_payment', function () {
    const p = products[Math.floor(Math.random() * products.length)];
    const r = http.post(
      `${BASE_URL}/api/v1/product/braintree/payment`,
      JSON.stringify({ nonce: FAKE_NONCE, cart: [{ _id: p._id, price: 10 }] }),
      { headers: hdr },
    );
    check(r, {
      'checkout step2 payment 200': (res) => res.status === 200,
      'checkout step2 ok':          (res) => {
        try { return res.json('ok') === true; } catch { return false; }
      },
    });
  });

  checkoutDuration.add(Date.now() - start);
  sleep(2);
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN SCENARIOS
// ════════════════════════════════════════════════════════════════════════════

export function allOrdersPoll() {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, ADMIN_EMAIL, ADMIN_PASS);
  }

  const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
    headers: { authorization: cachedAdminToken || '' },
  });
  check(res, {
    'all-orders status 200': (r) => r.status === 200,
    'all-orders array':      (r) => { try { return Array.isArray(r.json('orders')); } catch { return false; } },
  });
  sleep(3);
}

export function adminDashboard() {
  const res = http.get(`${FRONTEND_URL}/dashboard/admin`, { headers: { 'Accept': 'text/html' } });
  check(res, {
    'admin dashboard status 200': (r) => r.status === 200,
    'admin dashboard has root':   (r) => r.body != null && r.body.includes('<div id="root">'),
    'admin dashboard not error':  (r) => r.body != null && !r.body.includes('Cannot GET'),
  });
  sleep(2);
}

export function orderStatusUpdates(data) {
  if (!cachedAdminToken) {
    cachedAdminToken = getToken(BASE_URL, ADMIN_EMAIL, ADMIN_PASS);
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
    'order-status ok':         (r) => { try { return r.json('success') === true; } catch { return false; } },
  });
  sleep(1);
}

// ─── Default function (MCP / CLI fallback) ────────────────────────────────────
export default function () {
  productList();
}
