// Ho Chi Thanh, A0276229W
// MS4 Non-Functional Testing - Load Test for Payment Flow

import http from "k6/http";
import { check, fail } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const TEST_DURATION = __ENV.TEST_DURATION || "5m";
const CHECKOUT_TIMEOUT_MS = parseInt(__ENV.CHECKOUT_TIMEOUT_MS || "7000", 10);
const PAYMENT_NONCE = __ENV.PAYMENT_NONCE || "fake-valid-nonce";
const INVALID_PAYMENT_NONCE = __ENV.INVALID_PAYMENT_NONCE || "fake-invalid-nonce";

function asInt(name, fallback) {
  const value = parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const CHECKOUT_RATE = asInt("CHECKOUT_RATE", 16);
const RETRY_RATE = asInt("RETRY_RATE", 7);
const CONSISTENCY_RATE = asInt("CONSISTENCY_RATE", 8);

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 599 }));

export const checkoutEndToEndDuration = new Trend("checkout_end_to_end_duration", true);
export const orderPlacementDuration = new Trend("order_placement_duration", true);
export const paymentDependencyDuration = new Trend("payment_dependency_duration", true);

export const checkoutAttempts = new Counter("checkout_attempts");
export const checkoutCompletions = new Counter("checkout_completions");
export const orderCreateAttempts = new Counter("order_create_attempts");

export const checkoutSuccessRate = new Rate("checkout_success_rate");
export const orderCreationAccuracyRate = new Rate("order_creation_accuracy_rate");
export const duplicateOrderRate = new Rate("duplicate_order_rate");
export const oversellRiskRate = new Rate("oversell_risk_rate");
export const unreconciledPaymentOrderRate = new Rate("unreconciled_payment_order_rate");
export const paymentDependencyFailureRate = new Rate("payment_dependency_failure_rate");
export const checkoutFlowErrorRate = new Rate("checkout_flow_error_rate");
export const checkoutTimeoutRate = new Rate("checkout_timeout_rate");

export const dropoffBeforeAuthRate = new Rate("dropoff_before_auth_rate");
export const dropoffAfterAuthRate = new Rate("dropoff_after_auth_rate");
export const dropoffAfterTokenRate = new Rate("dropoff_after_token_rate");

const vuUserCache = {};

export const options = {
  scenarios: {
    checkout_progression_flow: {
      executor: "constant-arrival-rate",
      exec: "checkoutProgressionFlow",
      rate: CHECKOUT_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(12, Math.ceil(CHECKOUT_RATE * 0.8)),
      maxVUs: Math.max(80, CHECKOUT_RATE * 4),
    },
    payment_retry_flow: {
      executor: "constant-arrival-rate",
      exec: "paymentRetryFlow",
      rate: RETRY_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(RETRY_RATE * 0.8)),
      maxVUs: Math.max(50, RETRY_RATE * 5),
    },
    order_consistency_probe_flow: {
      executor: "constant-arrival-rate",
      exec: "orderConsistencyProbeFlow",
      rate: CONSISTENCY_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(CONSISTENCY_RATE * 0.8)),
      maxVUs: Math.max(40, CONSISTENCY_RATE * 4),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2200", "p(99)<4500"],

    checkout_success_rate: ["rate>0.70"],
    order_creation_accuracy_rate: ["rate>0.95"],
    duplicate_order_rate: ["rate<0.01"],
    oversell_risk_rate: ["rate<0.02"],
    unreconciled_payment_order_rate: ["rate<0.02"],
    payment_dependency_failure_rate: ["rate<0.05"],
    checkout_flow_error_rate: ["rate<0.05"],
    checkout_timeout_rate: ["rate<0.03"],

    checkout_end_to_end_duration: ["p(95)<2800"],
    order_placement_duration: ["p(95)<2000"],
    payment_dependency_duration: ["p(95)<1800"],

    "http_req_duration{endpoint:checkout_payment_submit}": ["p(95)<2000"],
    "http_req_duration{endpoint:checkout_payment_token}": ["p(95)<1500"],
    "http_req_duration{endpoint:checkout_order_fetch}": ["p(95)<1200"],
  },
};

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function safeJson(res) {
  try {
    return res.json();
  } catch (error) {
    return null;
  }
}

function requestParams(endpoint, contentType = "application/json") {
  return {
    timeout: `${CHECKOUT_TIMEOUT_MS}ms`,
    headers: {
      Accept: "application/json",
      "Content-Type": contentType,
    },
    tags: {
      feature: "payment_flow",
      testtype: "load",
      endpoint,
    },
  };
}

function markTimeout(res) {
  const timeout = res.status === 0 || res.timings.duration >= CHECKOUT_TIMEOUT_MS;
  checkoutTimeoutRate.add(timeout);
}

function normalizeCartItem(product) {
  return {
    _id: product._id,
    name: product.name,
    description: product.description,
    price: Number(product.price) || 0,
    quantity: 1,
  };
}

function buildCart(products) {
  const cartSize = Math.random() < 0.75 ? 1 : 2;
  const cart = [];
  for (let i = 0; i < cartSize; i += 1) {
    const p = pickRandom(products);
    if (p) {
      cart.push(normalizeCartItem(p));
    }
  }
  return cart;
}

function cartHasOversellRisk(cart, quantityById) {
  for (const line of cart) {
    const available = Number(quantityById[line._id] ?? 0);
    if (!Number.isFinite(available) || available <= 0) {
      return true;
    }
    if (line.quantity > available) {
      return true;
    }
  }
  return false;
}

function ensureVuUser(seed) {
  const cacheKey = String(__VU || 0);
  if (vuUserCache[cacheKey]) {
    return vuUserCache[cacheKey];
  }

  const unique = `${seed}-${cacheKey}`;
  const credentials = {
    name: `payment-load-vu-${unique}`,
    email: `payment.vu.${unique}@example.com`,
    password: "PaymentLoad123!",
    phone: "91234567",
    address: "Payment Flow Street",
    answer: "blue",
  };

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(credentials),
    requestParams("checkout_register")
  );
  const registerBody = safeJson(registerRes);
  markTimeout(registerRes);

  const registerOk =
    registerRes.status === 201 ||
    (registerRes.status === 200 && registerBody && registerBody.success === false);

  if (!registerOk) {
    fail(`Failed to create checkout VU user. status=${registerRes.status}`);
  }

  const user = {
    email: credentials.email,
    password: credentials.password,
  };
  vuUserCache[cacheKey] = user;
  return user;
}

function login(email, password, endpointTag) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    requestParams(endpointTag)
  );
  const body = safeJson(res);
  markTimeout(res);
  return { res, body };
}

function getOrders(token) {
  const res = http.get(`${BASE_URL}/api/v1/auth/orders`, {
    ...requestParams("checkout_order_fetch", "application/json"),
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const body = safeJson(res);
  markTimeout(res);
  return { res, body };
}

function getPaymentToken(token) {
  const res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
    ...requestParams("checkout_payment_token", "application/json"),
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const body = safeJson(res);
  markTimeout(res);
  paymentDependencyDuration.add(res.timings.duration);

  const ok =
    res.status === 200 &&
    body &&
    typeof body.clientToken === "string" &&
    body.clientToken.length > 0;

  paymentDependencyFailureRate.add(!ok);
  return { res, body, ok };
}

function submitPayment(token, cart, nonce, endpointTag = "checkout_payment_submit") {
  const payload = JSON.stringify({ nonce, cart });
  const res = http.post(`${BASE_URL}/api/v1/product/braintree/payment`, payload, {
    ...requestParams(endpointTag),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
  const body = safeJson(res);
  markTimeout(res);
  paymentDependencyDuration.add(res.timings.duration);

  const paymentOk = res.status === 200 && body && body.ok === true;
  paymentDependencyFailureRate.add(!paymentOk);

  return { res, body, paymentOk };
}

function checkSession(token) {
  const res = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
    ...requestParams("checkout_session_validate", "application/json"),
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const body = safeJson(res);
  markTimeout(res);

  return res.status === 200 && body && body.ok === true;
}

function evaluateReconciliation(beforeOrders, afterOrders, paymentOk, cartLength) {
  const before = Array.isArray(beforeOrders) ? beforeOrders.length : 0;
  const after = Array.isArray(afterOrders) ? afterOrders.length : 0;
  const delta = after - before;

  const latest = Array.isArray(afterOrders) && afterOrders.length > 0 ? afterOrders[0] : null;
  const latestProductsCount = Array.isArray(latest?.products) ? latest.products.length : 0;

  let accurate = true;
  let duplicate = false;
  let unreconciled = false;

  if (paymentOk) {
    accurate = delta === 1 && latestProductsCount === cartLength;
    duplicate = delta > 1;
    unreconciled = delta < 1;
  } else {
    accurate = delta === 0;
    duplicate = delta > 1;
    unreconciled = delta > 0;
  }

  return {
    accurate,
    duplicate,
    unreconciled,
  };
}

export function setup() {
  const productRes = http.get(`${BASE_URL}/api/v1/product/get-product`, requestParams("checkout_setup_products"));
  const productBody = safeJson(productRes);
  markTimeout(productRes);

  const products = Array.isArray(productBody?.products)
    ? productBody.products
        .filter((p) => p && p._id)
        .map((p) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 0,
        }))
    : [];

  if (products.length === 0) {
    fail("No products available for payment flow load test. Seed product data first.");
  }

  const quantityById = {};
  for (const p of products) {
    quantityById[p._id] = p.quantity;
  }

  return {
    products,
    quantityById,
    userSeed: Date.now(),
  };
}

// End-to-end checkout with realistic stage progression and intentional drop-offs.
export function checkoutProgressionFlow(data) {
  checkoutAttempts.add(1);
  const iterStart = Date.now();
  let flowError = false;

  const cart = buildCart(data.products);
  if (cart.length === 0) {
    checkoutFlowErrorRate.add(true);
    return;
  }

  // Step 1: Browse/cart review stage.
  const listRes = http.get(`${BASE_URL}/api/v1/product/product-list/1`, requestParams("checkout_cart_review"));
  const listBody = safeJson(listRes);
  markTimeout(listRes);
  const browseOk = check(listRes, {
    "checkout browse status 200": (r) => r.status === 200,
    "checkout browse products array": () => Array.isArray(listBody?.products),
  });
  if (!browseOk) {
    flowError = true;
  }

  // Realistic pre-auth abandonment.
  const droppedBeforeAuth = Math.random() < 0.20;
  dropoffBeforeAuthRate.add(droppedBeforeAuth);
  if (droppedBeforeAuth) {
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(flowError);
    return;
  }

  const vuUser = ensureVuUser(data.userSeed);
  const auth = login(vuUser.email, vuUser.password, "checkout_login");
  const token = auth.body?.token;

  const loginOk =
    auth.res.status === 200 &&
    typeof token === "string" &&
    token.length > 0;

  if (!loginOk) {
    flowError = true;
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(true);
    return;
  }

  const sessionOk = checkSession(token);
  if (!sessionOk) {
    flowError = true;
  }

  // Post-auth abandonment.
  const droppedAfterAuth = Math.random() < 0.12;
  dropoffAfterAuthRate.add(droppedAfterAuth);
  if (droppedAfterAuth) {
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(flowError);
    return;
  }

  const tokenRes = getPaymentToken(token);
  if (!tokenRes.ok) {
    flowError = true;
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(true);
    return;
  }

  // Token obtained but user abandons before submit.
  const droppedAfterToken = Math.random() < 0.10;
  dropoffAfterTokenRate.add(droppedAfterToken);
  if (droppedAfterToken) {
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(flowError);
    return;
  }

  const beforeOrders = getOrders(token);
  if (beforeOrders.res.status !== 200 || !Array.isArray(beforeOrders.body)) {
    flowError = true;
  }

  const oversellRisk = cartHasOversellRisk(cart, data.quantityById);
  oversellRiskRate.add(oversellRisk);

  orderCreateAttempts.add(1);
  const placeStart = Date.now();
  const payment = submitPayment(token, cart, PAYMENT_NONCE);
  const afterOrders = getOrders(token);
  orderPlacementDuration.add(Date.now() - placeStart);

  const reconciled = evaluateReconciliation(
    beforeOrders.body,
    afterOrders.body,
    payment.paymentOk,
    cart.length
  );

  orderCreationAccuracyRate.add(reconciled.accurate);
  duplicateOrderRate.add(reconciled.duplicate);
  unreconciledPaymentOrderRate.add(reconciled.unreconciled);

  const checkoutSuccess = payment.paymentOk && reconciled.accurate && !reconciled.duplicate && !reconciled.unreconciled;
  checkoutSuccessRate.add(checkoutSuccess);
  if (checkoutSuccess) {
    checkoutCompletions.add(1);
  }

  checkoutEndToEndDuration.add(Date.now() - iterStart);
  checkoutFlowErrorRate.add(flowError || !checkoutSuccess);
}

// Retry/error-state profile: invalid payment first, then retry with valid nonce.
export function paymentRetryFlow(data) {
  checkoutAttempts.add(1);
  const iterStart = Date.now();
  let flowError = false;

  const cart = buildCart(data.products);
  if (cart.length === 0) {
    checkoutFlowErrorRate.add(true);
    return;
  }

  const vuUser = ensureVuUser(data.userSeed);
  const auth = login(vuUser.email, vuUser.password, "checkout_retry_login");
  const token = auth.body?.token;
  const loginOk = auth.res.status === 200 && typeof token === "string" && token.length > 0;

  if (!loginOk || !checkSession(token)) {
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(true);
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    return;
  }

  const tokenRes = getPaymentToken(token);
  if (!tokenRes.ok) {
    checkoutSuccessRate.add(false);
    checkoutFlowErrorRate.add(true);
    checkoutEndToEndDuration.add(Date.now() - iterStart);
    return;
  }

  const beforeOrders = getOrders(token);

  const firstTry = submitPayment(token, cart, INVALID_PAYMENT_NONCE, "checkout_payment_submit_invalid");
  const firstTryExpectedFail = !firstTry.paymentOk;

  const secondTry = submitPayment(token, cart, PAYMENT_NONCE, "checkout_payment_submit_retry");
  const afterOrders = getOrders(token);

  const reconciled = evaluateReconciliation(
    beforeOrders.body,
    afterOrders.body,
    secondTry.paymentOk,
    cart.length
  );

  orderCreationAccuracyRate.add(reconciled.accurate);
  duplicateOrderRate.add(reconciled.duplicate);
  unreconciledPaymentOrderRate.add(reconciled.unreconciled);

  if (!firstTryExpectedFail) {
    flowError = true;
  }

  const checkoutSuccess = secondTry.paymentOk && reconciled.accurate && !reconciled.duplicate && !reconciled.unreconciled;
  checkoutSuccessRate.add(checkoutSuccess);
  if (checkoutSuccess) {
    checkoutCompletions.add(1);
  }

  checkoutEndToEndDuration.add(Date.now() - iterStart);
  checkoutFlowErrorRate.add(flowError || !checkoutSuccess);
}

// Read-oriented consistency checks over created orders and payment/order linkage.
export function orderConsistencyProbeFlow(data) {
  const vuUser = ensureVuUser(data.userSeed);
  const auth = login(vuUser.email, vuUser.password, "checkout_consistency_login");
  const token = auth.body?.token;

  const loginOk = auth.res.status === 200 && typeof token === "string" && token.length > 0;
  if (!loginOk) {
    checkoutFlowErrorRate.add(true);
    return;
  }

  const ordersRes = getOrders(token);
  if (ordersRes.res.status !== 200 || !Array.isArray(ordersRes.body)) {
    checkoutFlowErrorRate.add(true);
    return;
  }

  const ids = new Set();
  let duplicateFound = false;
  let unreconciledFound = false;

  for (const order of ordersRes.body) {
    const id = String(order?._id || "");
    if (id && ids.has(id)) {
      duplicateFound = true;
    }
    if (id) {
      ids.add(id);
    }

    const paymentSuccess = Boolean(order?.payment?.success);
    const hasProducts = Array.isArray(order?.products) && order.products.length > 0;
    if (paymentSuccess && !hasProducts) {
      unreconciledFound = true;
    }
  }

  duplicateOrderRate.add(duplicateFound);
  unreconciledPaymentOrderRate.add(unreconciledFound);
  orderCreationAccuracyRate.add(!duplicateFound && !unreconciledFound);
  checkoutFlowErrorRate.add(duplicateFound || unreconciledFound);
}
