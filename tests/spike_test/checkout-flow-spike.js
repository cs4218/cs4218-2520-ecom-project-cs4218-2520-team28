// Ho Jian Tao, A0273320R
// MS3 Non-Functional Testing - Spike Test for Checkout Flow

// ChatGPT was used to assist in generating and refining this k6 spike test script, including test structure, thresholds, and validation checks.


import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'k6user1@example.com';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'Test1234!';
const TEST_NONCE = __ENV.TEST_NONCE || 'fake-valid-nonce';
const CART_SIZE = Number(__ENV.CART_SIZE || 1);

// K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=checkout-spike-report.html k6 run k6/spike_test/checkout-flow-spike.js 

export const payment_failure_rate = new Rate('payment_failure_rate');
export const checkout_success_rate = new Rate('checkout_success_rate');
export const token_fetch_delay = new Trend('token_fetch_delay');
export const payment_duration = new Trend('payment_duration');
export const orders_refresh_delay = new Trend('orders_refresh_delay');

export const options = {
  scenarios: {
    checkout_spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [

        // { duration: '15s', target: 150 },

        { duration: '15s', target: 5 },

        { duration: '2s', target: 20 },
        { duration: '15s', target: 20 },
        { duration: '10s', target: 5 },
        { duration: '30s', target: 5 },

        { duration: '2s', target: 30 },
        { duration: '15s', target: 30 },
        { duration: '10s', target: 5 },
        { duration: '30s', target: 5 },

        { duration: '2s', target: 50 },
        { duration: '15s', target: 50 },
        { duration: '10s', target: 5 },
        { duration: '30s', target: 5 },

        { duration: '2s', target: 100 },
        { duration: '15s', target: 100 },
        { duration: '10s', target: 5 },
        { duration: '30s', target: 5 },
      ],
      gracefulRampDown: '100s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500'],
    checks: ['rate>0.95'],

    payment_failure_rate: ['rate<0.01'],
    checkout_success_rate: ['rate>0.95'],
    token_fetch_delay: ['p(95)<1800'],
    payment_duration: ['p(95)<2500'],
    orders_refresh_delay: ['p(95)<1800'],
  },
};

function safeJson(res) {
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}

function buildJsonParams(extra = {}, tags = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    },
    tags: {
      feature: 'checkout',
      testtype: 'spike',
      ...tags,
    },
  };
}

function normalizeCart(products) {
  return products.slice(0, Math.max(1, CART_SIZE)).map((p) => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price) || 0,
    category: typeof p.category === 'object' ? p.category?._id : p.category,
    quantity: p.quantity,
    shipping: p.shipping,
  }));
}

function login() {
  const payload = JSON.stringify({
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    payload,
    buildJsonParams({}, { step: 'login', name: 'POST /api/v1/auth/login' })
  );

  const body = safeJson(res);

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login response is JSON': () => body !== null,
    'login success is true': () => body?.success === true,
    'login token exists': () => typeof body?.token === 'string' && body.token.length > 0,
  });

  return body?.token || '';
}

export default function () {
  const token = login();

  if (!token) {
    payment_failure_rate.add(true);
    checkout_success_rate.add(false);
    sleep(1);
    return;
  }

  const authHeaders = { authorization: token };

  // 1) Get product list
  const productsRes = http.get(
    `${BASE_URL}/api/v1/product/get-product`,
    buildJsonParams(authHeaders, { step: 'products', name: 'GET /api/v1/product/get-product' })
  );
  const productsBody = safeJson(productsRes);
  const products = Array.isArray(productsBody?.products) ? productsBody.products : [];

  // 2) Open one product details page (optional but useful)
  let selectedProduct = products.length > 0 ? products[0] : null;
  let singleRes = null;
  let singleBody = null;

  if (selectedProduct?._id) {
    singleRes = http.get(
      `${BASE_URL}/api/v1/product/get-product/${encodeURIComponent(selectedProduct._id)}`,
      buildJsonParams(authHeaders, { step: 'product_details', name: 'GET /api/v1/product/get-product/:pid' })
    );
    singleBody = safeJson(singleRes);

    if (singleBody?.product) {
      selectedProduct = singleBody.product;
    }
  }

  const cart = normalizeCart(selectedProduct ? [selectedProduct] : products);

  // 3) Get token
  const tokenRes = http.get(
    `${BASE_URL}/api/v1/product/braintree/token`,
    buildJsonParams(authHeaders, { step: 'braintree_token', name: 'GET /api/v1/product/braintree/token' })
  );
  token_fetch_delay.add(tokenRes.timings.duration);
  const btTokenBody = safeJson(tokenRes);

  // 4) Orders before
  const ordersBeforeRes = http.get(
    `${BASE_URL}/api/v1/auth/orders`,
    buildJsonParams(authHeaders, { step: 'orders_before', name: 'GET /api/v1/auth/orders' })
  );
  const ordersBeforeBody = safeJson(ordersBeforeRes);
  const ordersBeforeCount = Array.isArray(ordersBeforeBody) ? ordersBeforeBody.length : -1;

  // 5) Payment
  let paymentRes = null;
  let paymentBody = null;

  if (cart.length > 0) {
    paymentRes = http.post(
      `${BASE_URL}/api/v1/product/braintree/payment`,
      JSON.stringify({
        nonce: TEST_NONCE,
        cart,
      }),
      buildJsonParams(authHeaders, { step: 'payment', name: 'POST /api/v1/product/braintree/payment' })
    );
    payment_duration.add(paymentRes.timings.duration);
    paymentBody = safeJson(paymentRes);
  }

  // 6) Orders after
  const ordersAfterRes = http.get(
    `${BASE_URL}/api/v1/auth/orders`,
    buildJsonParams(authHeaders, { step: 'orders_after', name: 'GET /api/v1/auth/orders' })
  );
  orders_refresh_delay.add(ordersAfterRes.timings.duration);
  const ordersAfterBody = safeJson(ordersAfterRes);
  const ordersAfterCount = Array.isArray(ordersAfterBody) ? ordersAfterBody.length : -1;

  const passed = check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products response is JSON': () => productsBody !== null,
    'products array exists': () => Array.isArray(products),
    'at least one product exists': () => products.length > 0,
  }) && check(tokenRes, {
    'token status is 200': (r) => r.status === 200,
    'token response is JSON': () => btTokenBody !== null,
    'clientToken exists': () =>
      typeof btTokenBody?.clientToken === 'string' && btTokenBody.clientToken.length > 0,
  }) && check(paymentRes || { status: 0, timings: { duration: 999999 } }, {
    'payment status is 200': (r) => r.status === 200,
    'payment response is JSON': () => paymentBody !== null,
    'payment ok is true': () => paymentBody?.ok === true,
    'payment time < 2500ms': (r) => r.timings.duration < 2500,
  }) && check(ordersAfterRes, {
    'orders refresh status is 200': (r) => r.status === 200,
    'orders response is array': () => Array.isArray(ordersAfterBody),
    'orders count is valid': () => ordersAfterCount >= 0,
  });

  const paymentSucceeded =
    paymentRes &&
    paymentRes.status === 200 &&
    paymentBody &&
    paymentBody.ok === true;

  const checkoutSucceeded =
    paymentSucceeded &&
    Array.isArray(ordersAfterBody) &&
    ordersAfterCount >= 0 &&
    (
      ordersBeforeCount < 0 ||
      ordersAfterCount >= ordersBeforeCount
    );

  payment_failure_rate.add(!paymentSucceeded);
  checkout_success_rate.add(checkoutSucceeded);

  if (!passed) {
    console.log(
      `CHECKOUT FAILED | login=${token ? 'ok' : 'fail'} | ` +
      `productsStatus=${productsRes.status} | tokenStatus=${tokenRes.status} | ` +
      `paymentStatus=${paymentRes ? paymentRes.status : 'n/a'} | ` +
      `ordersAfterStatus=${ordersAfterRes.status} | ` +
      `paymentBody=${paymentRes ? paymentRes.body : 'n/a'}`
    );
  }

  sleep(1);
}