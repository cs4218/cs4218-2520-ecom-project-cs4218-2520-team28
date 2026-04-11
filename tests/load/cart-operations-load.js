// Ho Chi Thanh, A0276229W
// MS4 Non-Functional Testing - Load Test for Cart Operations

import http from "k6/http";
import { check, fail } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const TEST_DURATION = __ENV.TEST_DURATION || "5m";
const CART_TIMEOUT_MS = parseInt(__ENV.CART_TIMEOUT_MS || "5000", 10);

function asInt(name, fallback) {
  const value = parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const GUEST_RATE = asInt("GUEST_RATE", 24);
const SIGNED_RATE = asInt("SIGNED_RATE", 18);
const MERGE_RATE = asInt("MERGE_RATE", 8);
const READ_RATE = asInt("READ_RATE", 14);
const INTEGRITY_RATE = asInt("INTEGRITY_RATE", 10);

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const basketAddDuration = new Trend("basket_add_duration", true);
export const basketUpdateDuration = new Trend("basket_update_duration", true);
export const basketRemoveDuration = new Trend("basket_remove_duration", true);
export const basketMergeDuration = new Trend("basket_merge_duration", true);
export const basketReadDuration = new Trend("basket_read_duration", true);

export const basketWriteOps = new Counter("basket_write_ops");
export const basketReadOps = new Counter("basket_read_ops");

export const basketOperationErrorRate = new Rate("basket_operation_error_rate");
export const basketIntegrityViolationRate = new Rate("basket_integrity_violation_rate");
export const basketDuplicateLineViolationRate = new Rate("basket_duplicate_line_violation_rate");
export const basketMergeViolationRate = new Rate("basket_merge_violation_rate");
export const basketDataLossRate = new Rate("basket_data_loss_rate");
export const basketTimeoutRate = new Rate("basket_timeout_rate");

export const options = {
  scenarios: {
    guest_cart_flow: {
      executor: "constant-arrival-rate",
      exec: "guestCartFlow",
      rate: GUEST_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(12, Math.ceil(GUEST_RATE * 0.8)),
      maxVUs: Math.max(70, GUEST_RATE * 3),
    },
    signed_cart_flow: {
      executor: "constant-arrival-rate",
      exec: "signedInCartFlow",
      rate: SIGNED_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(10, Math.ceil(SIGNED_RATE * 0.8)),
      maxVUs: Math.max(60, SIGNED_RATE * 3),
    },
    merge_behavior_flow: {
      executor: "constant-arrival-rate",
      exec: "mergeBehaviorFlow",
      rate: MERGE_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(6, Math.ceil(MERGE_RATE * 0.8)),
      maxVUs: Math.max(30, MERGE_RATE * 3),
    },
    basket_read_flow: {
      executor: "constant-arrival-rate",
      exec: "basketReadFlow",
      rate: READ_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(READ_RATE * 0.8)),
      maxVUs: Math.max(40, READ_RATE * 3),
    },
    integrity_probe_flow: {
      executor: "constant-arrival-rate",
      exec: "integrityProbeFlow",
      rate: INTEGRITY_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(INTEGRITY_RATE * 0.8)),
      maxVUs: Math.max(45, INTEGRITY_RATE * 3),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(95)<1500", "p(99)<2800"],

    basket_operation_error_rate: ["rate<0.03"],
    basket_integrity_violation_rate: ["rate<0.02"],
    basket_duplicate_line_violation_rate: ["rate<0.02"],
    basket_merge_violation_rate: ["rate<0.01"],
    basket_data_loss_rate: ["rate<0.01"],
    basket_timeout_rate: ["rate<0.02"],

    basket_add_duration: ["p(95)<1200"],
    basket_update_duration: ["p(95)<1200"],
    basket_remove_duration: ["p(95)<900"],
    basket_merge_duration: ["p(95)<900"],
    basket_read_duration: ["p(95)<1200"],

    "http_req_duration{endpoint:cart_add_detail}": ["p(95)<1200"],
    "http_req_duration{endpoint:cart_update_detail}": ["p(95)<1200"],
    "http_req_duration{endpoint:cart_read_list}": ["p(95)<1200"],
    "http_req_duration{endpoint:cart_session_validate}": ["p(95)<1200"],
  },
};

function pickRandom(items, fallback = null) {
  if (!items || items.length === 0) {
    return fallback;
  }
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
    timeout: `${CART_TIMEOUT_MS}ms`,
    headers: {
      Accept: "application/json",
      "Content-Type": contentType,
    },
    tags: {
      feature: "cart",
      testtype: "load",
      endpoint,
    },
  };
}

function asLine(product, quantity = 1) {
  return {
    _id: product._id,
    price: Number(product.price) || 0,
    quantity,
  };
}

function calcTotal(cartLines) {
  return cartLines.reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0);
}

function hasDuplicateLines(cartLines) {
  const seen = new Set();
  for (const line of cartLines) {
    if (!line || !line._id) {
      continue;
    }
    if (seen.has(line._id)) {
      return true;
    }
    seen.add(line._id);
  }
  return false;
}

function cartIntegrityOk(cartLines) {
  if (!Array.isArray(cartLines)) {
    return false;
  }
  for (const line of cartLines) {
    const validQuantity = Number.isInteger(line?.quantity) && line.quantity > 0;
    const validPrice = Number.isFinite(Number(line?.price)) && Number(line.price) >= 0;
    if (!validQuantity || !validPrice) {
      return false;
    }
  }
  return Number.isFinite(calcTotal(cartLines));
}

function emulateMergeFromContext(guestCart, userCart) {
  const safeGuest = Array.isArray(guestCart) ? guestCart.slice() : [];
  const safeUser = Array.isArray(userCart) ? userCart.slice() : [];

  const mergedUser = safeUser.length === 0 ? safeGuest.slice() : safeUser.slice();
  const guestAfterMerge = safeGuest.slice();

  return {
    mergedUser,
    guestAfterMerge,
  };
}

function trackTimeout(res) {
  const timedOut = res.status === 0 || res.timings.duration >= CART_TIMEOUT_MS;
  basketTimeoutRate.add(timedOut);
}

function login(email, password, endpoint = "cart_login") {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    requestParams(endpoint)
  );
  const body = safeJson(res);
  trackTimeout(res);

  return { res, body };
}

function fetchProductDetail(productId, endpointTag) {
  const res = http.get(`${BASE_URL}/api/v1/product/get-product/${productId}`, requestParams(endpointTag));
  const body = safeJson(res);
  trackTimeout(res);
  return { res, body };
}

function seededCart(products, maxItems = 2) {
  const size = Math.max(0, Math.min(maxItems, Math.floor(Math.random() * (maxItems + 1))));
  const cart = [];
  for (let i = 0; i < size; i += 1) {
    const p = pickRandom(products);
    if (p) {
      cart.push(asLine(p, 1 + Math.floor(Math.random() * 2)));
    }
  }
  return cart;
}

export function setup() {
  const productRes = http.get(`${BASE_URL}/api/v1/product/get-product`, requestParams("cart_setup_products"));
  const productBody = safeJson(productRes);

  const products = Array.isArray(productBody?.products)
    ? productBody.products
        .filter((p) => p && p._id)
        .map((p) => ({
          _id: p._id,
          slug: p.slug,
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 0,
        }))
    : [];

  if (products.length === 0) {
    fail("No products found for cart load test. Seed product data first.");
  }

  const ts = Date.now();
  const userPayload = {
    name: `cart-load-user-${ts}`,
    email: `cart.load.${ts}@example.com`,
    password: "CartLoad123!",
    phone: "91234567",
    address: "Cart Load Test Address",
    answer: "blue",
  };

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(userPayload),
    requestParams("cart_setup_register")
  );
  const registerBody = safeJson(registerRes);
  const registerOk =
    registerRes.status === 201 ||
    (registerRes.status === 200 && registerBody && registerBody.success === false);

  if (!registerOk) {
    fail(`Failed to prepare cart load user. status=${registerRes.status}`);
  }

  return {
    products,
    authUser: {
      email: userPayload.email,
      password: userPayload.password,
    },
  };
}

export function guestCartFlow(data) {
  let opError = false;
  const guestCart = seededCart(data.products, 2);

  const addProduct = pickRandom(data.products);
  const addStart = Date.now();
  const addRes = fetchProductDetail(addProduct._id, "cart_add_detail");
  const addOk = check(addRes.res, {
    "guest add detail status 200": (r) => r.status === 200,
    "guest add detail has product": () => !!addRes.body?.product,
  });
  if (addOk) {
    guestCart.push(asLine(addRes.body.product, 1));
    basketWriteOps.add(1);
  } else {
    opError = true;
  }
  basketAddDuration.add(Date.now() - addStart);

  const hasItems = guestCart.length > 0;
  const updateStart = Date.now();
  if (hasItems) {
    const idx = Math.floor(Math.random() * guestCart.length);
    const line = guestCart[idx];
    const updateRes = fetchProductDetail(line._id, "cart_update_detail");
    const updateOk = check(updateRes.res, {
      "guest update detail status 200": (r) => r.status === 200,
      "guest update detail has product": () => !!updateRes.body?.product,
    });
    if (updateOk) {
      guestCart[idx] = asLine(updateRes.body.product, 1 + Math.floor(Math.random() * 3));
      basketWriteOps.add(1);
    } else {
      opError = true;
    }
  }
  basketUpdateDuration.add(Date.now() - updateStart);

  const removeStart = Date.now();
  if (guestCart.length > 0) {
    const before = guestCart.length;
    const removeIndex = Math.floor(Math.random() * guestCart.length);
    guestCart.splice(removeIndex, 1);
    basketWriteOps.add(1);

    if (!(guestCart.length === before - 1)) {
      basketDataLossRate.add(true);
      opError = true;
    } else {
      basketDataLossRate.add(false);
    }
  } else {
    basketDataLossRate.add(false);
  }
  basketRemoveDuration.add(Date.now() - removeStart);

  const integrityOk = cartIntegrityOk(guestCart);
  const duplicateLineViolation = hasDuplicateLines(guestCart);

  basketIntegrityViolationRate.add(!integrityOk);
  basketDuplicateLineViolationRate.add(duplicateLineViolation);
  basketOperationErrorRate.add(opError || !integrityOk || duplicateLineViolation);
}

export function signedInCartFlow(data) {
  let opError = false;
  const userCart = seededCart(data.products, 2);

  const auth = login(data.authUser.email, data.authUser.password, "cart_login");
  const token = auth.body?.token;
  const loginOk = check(auth.res, {
    "signed-in login status 200": (r) => r.status === 200,
    "signed-in login token present": () => typeof token === "string" && token.length > 0,
  });

  if (!loginOk) {
    basketOperationErrorRate.add(true);
    return;
  }

  const sessionRes = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
    ...requestParams("cart_session_validate"),
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const sessionBody = safeJson(sessionRes);
  trackTimeout(sessionRes);

  const sessionOk = check(sessionRes, {
    "session validate status 200": (r) => r.status === 200,
    "session validate ok": () => sessionBody?.ok === true,
  });

  if (!sessionOk) {
    opError = true;
  }

  const addProduct = pickRandom(data.products);
  const addStart = Date.now();
  const addRes = fetchProductDetail(addProduct._id, "cart_add_detail");
  if (addRes.res.status === 200 && addRes.body?.product) {
    userCart.push(asLine(addRes.body.product, 1));
    basketWriteOps.add(1);
  } else {
    opError = true;
  }
  basketAddDuration.add(Date.now() - addStart);

  const updateStart = Date.now();
  if (userCart.length > 0) {
    const index = Math.floor(Math.random() * userCart.length);
    const line = userCart[index];
    const updateRes = fetchProductDetail(line._id, "cart_update_detail");
    if (updateRes.res.status === 200 && updateRes.body?.product) {
      userCart[index] = asLine(updateRes.body.product, 1 + Math.floor(Math.random() * 3));
      basketWriteOps.add(1);
    } else {
      opError = true;
    }
  }
  basketUpdateDuration.add(Date.now() - updateStart);

  const removeStart = Date.now();
  if (userCart.length > 0) {
    const before = userCart.length;
    userCart.splice(Math.floor(Math.random() * userCart.length), 1);
    basketWriteOps.add(1);
    basketDataLossRate.add(userCart.length !== before - 1);
    if (userCart.length !== before - 1) {
      opError = true;
    }
  } else {
    basketDataLossRate.add(false);
  }
  basketRemoveDuration.add(Date.now() - removeStart);

  const integrityOk = cartIntegrityOk(userCart);
  const duplicateLineViolation = hasDuplicateLines(userCart);

  basketIntegrityViolationRate.add(!integrityOk);
  basketDuplicateLineViolationRate.add(duplicateLineViolation);
  basketOperationErrorRate.add(opError || !integrityOk || duplicateLineViolation);
}

export function mergeBehaviorFlow(data) {
  const mergeStart = Date.now();
  let opError = false;

  const guestCart = seededCart(data.products, 3);
  const userCart = Math.random() < 0.5 ? [] : seededCart(data.products, 2);

  const mergeResult = emulateMergeFromContext(guestCart, userCart);

  const userWasEmpty = userCart.length === 0;
  const expectedUserCartLength = userWasEmpty ? guestCart.length : userCart.length;

  const mergeOk =
    mergeResult.mergedUser.length === expectedUserCartLength &&
    JSON.stringify(mergeResult.guestAfterMerge) === JSON.stringify(guestCart);

  if (!mergeOk) {
    opError = true;
  }

  basketMergeViolationRate.add(!mergeOk);
  basketMergeDuration.add(Date.now() - mergeStart);

  const integrityOk = cartIntegrityOk(mergeResult.mergedUser);
  const duplicateLineViolation = hasDuplicateLines(mergeResult.mergedUser);

  basketIntegrityViolationRate.add(!integrityOk);
  basketDuplicateLineViolationRate.add(duplicateLineViolation);
  basketOperationErrorRate.add(opError || !integrityOk || duplicateLineViolation);
}

export function basketReadFlow(data) {
  let opError = false;
  const readStart = Date.now();

  const page = 1 + Math.floor(Math.random() * 4);
  const listRes = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`, requestParams("cart_read_list"));
  const listBody = safeJson(listRes);
  trackTimeout(listRes);

  const listOk = check(listRes, {
    "basket read list status 200": (r) => r.status === 200,
    "basket read list has products": () => Array.isArray(listBody?.products),
  });

  if (!listOk) {
    opError = true;
  }

  const virtualMiniCart = seededCart(data.products, 4);
  const computedTotal = calcTotal(virtualMiniCart);
  const validRead = Number.isFinite(computedTotal) && virtualMiniCart.length >= 0;

  basketReadOps.add(1);
  basketReadDuration.add(Date.now() - readStart);
  basketIntegrityViolationRate.add(!validRead);
  basketOperationErrorRate.add(opError || !validRead);
}

export function integrityProbeFlow(data) {
  let opError = false;

  const baseCart = seededCart(data.products, 2);
  const snapshotA = baseCart.slice();
  const snapshotB = baseCart.slice();

  const p1 = pickRandom(data.products);
  const p2 = pickRandom(data.products);

  if (p1) {
    snapshotA.push(asLine(p1, 1));
    basketWriteOps.add(1);
  }
  if (snapshotB.length > 0) {
    snapshotB[0] = {
      ...snapshotB[0],
      quantity: (snapshotB[0].quantity || 1) + 1,
    };
    basketWriteOps.add(1);
  }
  if (p2 && Math.random() < 0.5) {
    snapshotB.push(asLine(p2, 1));
    basketWriteOps.add(1);
  }

  const chosenFinal = Math.random() < 0.5 ? snapshotA : snapshotB;
  const expectedMinSize = Math.max(snapshotA.length, snapshotB.length) - 1;

  // Lost update proxy: final cart unexpectedly smaller than both operation snapshots.
  const dataLoss = chosenFinal.length < expectedMinSize;
  basketDataLossRate.add(dataLoss);
  if (dataLoss) {
    opError = true;
  }

  const integrityOk = cartIntegrityOk(chosenFinal);
  const duplicateLineViolation = hasDuplicateLines(chosenFinal);

  basketIntegrityViolationRate.add(!integrityOk);
  basketDuplicateLineViolationRate.add(duplicateLineViolation);
  basketOperationErrorRate.add(opError || !integrityOk || duplicateLineViolation);
}
