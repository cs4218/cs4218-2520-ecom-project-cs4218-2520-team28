// Ho Chi Thanh, A0276229W
// MS4 Non-Functional Testing - Load Test for Product Detail and Inventory Read Paths

import http from "k6/http";
import { check, fail } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const TEST_DURATION = __ENV.TEST_DURATION || "4m";
const REQUEST_TIMEOUT_MS = parseInt(__ENV.REQUEST_TIMEOUT_MS || "5000", 10);

function asInt(name, fallback) {
  const value = parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const PDP_RATE = asInt("PDP_RATE", 32);
const INVENTORY_RATE = asInt("INVENTORY_RATE", 20);
const RECOMMEND_RATE = asInt("RECOMMEND_RATE", 14);
const PHOTO_RATE = asInt("PHOTO_RATE", 10);

export const pdpAggregateDuration = new Trend("pdp_aggregate_duration", true);
export const inventoryReadDuration = new Trend("inventory_read_duration", true);
export const recommendationDuration = new Trend("recommendation_duration", true);
export const photoReadDuration = new Trend("photo_read_duration", true);

export const pdpRequestErrorRate = new Rate("pdp_request_error_rate");
export const timeoutRate = new Rate("timeout_rate");
export const inventoryFreshnessViolationRate = new Rate("inventory_freshness_violation_rate");
export const cacheHitProxyRate = new Rate("cache_hit_proxy_rate");

export const options = {
  scenarios: {
    pdp_reads: {
      executor: "constant-arrival-rate",
      exec: "pdpReadFlow",
      rate: PDP_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(16, Math.ceil(PDP_RATE * 0.8)),
      maxVUs: Math.max(80, PDP_RATE * 3),
    },
    inventory_reads: {
      executor: "constant-arrival-rate",
      exec: "inventoryReadFlow",
      rate: INVENTORY_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(12, Math.ceil(INVENTORY_RATE * 0.8)),
      maxVUs: Math.max(60, INVENTORY_RATE * 3),
    },
    recommendation_reads: {
      executor: "constant-arrival-rate",
      exec: "recommendationFlow",
      rate: RECOMMEND_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(RECOMMEND_RATE * 0.8)),
      maxVUs: Math.max(45, RECOMMEND_RATE * 3),
    },
    photo_cache_reads: {
      executor: "constant-arrival-rate",
      exec: "photoCacheFlow",
      rate: PHOTO_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(6, Math.ceil(PHOTO_RATE * 0.8)),
      maxVUs: Math.max(35, PHOTO_RATE * 3),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1400", "p(99)<2800"],

    pdp_request_error_rate: ["rate<0.02"],
    timeout_rate: ["rate<0.01"],
    inventory_freshness_violation_rate: ["rate<0.02"],
    cache_hit_proxy_rate: ["rate>0.60"],

    "http_req_duration{endpoint:pdp}": ["p(95)<1200"],
    "http_req_duration{endpoint:inventory}": ["p(95)<1000"],
    "http_req_duration{endpoint:recommendation}": ["p(95)<1200"],
    "http_req_duration{endpoint:photo}": ["p(95)<800"],
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

function reqParams(endpointTag) {
  return {
    timeout: `${REQUEST_TIMEOUT_MS}ms`,
    tags: {
      feature: "pdp_inventory",
      testtype: "load",
      endpoint: endpointTag,
    },
  };
}

function recordRequestHealth(res, logicalOk) {
  const timedOut = res.status === 0 || res.timings.duration >= REQUEST_TIMEOUT_MS;
  timeoutRate.add(timedOut);

  const requestFailed = res.status >= 400 || !logicalOk;
  pdpRequestErrorRate.add(requestFailed);

  if (requestFailed) {
    console.log(`FAIL status=${res.status} dur=${res.timings.duration} body=${(res.body || "").slice(0, 160)}`);
  }
}

export function setup() {
  const seedRes = http.get(`${BASE_URL}/api/v1/product/get-product`, reqParams("setup"));
  const seedBody = safeJson(seedRes);

  const products = Array.isArray(seedBody?.products) ? seedBody.products : [];
  const candidates = products
    .filter((p) => p && p._id && p?.category?._id)
    .map((p) => ({
      id: p._id,
      categoryId: p.category._id,
    }));

  if (candidates.length === 0) {
    fail("No product candidates found for PDP/inventory load test. Check dataset availability.");
  }

  return { candidates };
}

export function pdpReadFlow(data) {
  const target = pickRandom(data.candidates);
  const res = http.get(`${BASE_URL}/api/v1/product/get-product/${target.id}`, reqParams("pdp"));
  const body = safeJson(res);

  const ok = check(res, {
    "pdp status is 200": (r) => r.status === 200,
    "pdp has success=true": () => body?.success === true,
    "pdp has product object": () => !!body?.product,
    "pdp has price": () => Number.isFinite(body?.product?.price),
    "pdp has quantity": () => Number.isFinite(body?.product?.quantity),
  });

  pdpAggregateDuration.add(res.timings.duration);
  recordRequestHealth(res, ok);
}

export function inventoryReadFlow(data) {
  const target = pickRandom(data.candidates);

  const first = http.get(`${BASE_URL}/api/v1/product/get-product/${target.id}`, reqParams("inventory"));
  const firstBody = safeJson(first);
  const second = http.get(`${BASE_URL}/api/v1/product/get-product/${target.id}`, reqParams("inventory"));
  const secondBody = safeJson(second);

  const q1 = firstBody?.product?.quantity;
  const q2 = secondBody?.product?.quantity;

  const firstOk = check(first, {
    "inventory first read status 200": (r) => r.status === 200,
    "inventory first read has quantity": () => Number.isFinite(q1),
  });

  const secondOk = check(second, {
    "inventory second read status 200": (r) => r.status === 200,
    "inventory second read has quantity": () => Number.isFinite(q2),
  });

  const freshnessViolation = Number.isFinite(q1) && Number.isFinite(q2) ? q1 !== q2 : true;
  inventoryFreshnessViolationRate.add(freshnessViolation);

  inventoryReadDuration.add((first.timings.duration + second.timings.duration) / 2);
  recordRequestHealth(first, firstOk);
  recordRequestHealth(second, secondOk);
}

export function recommendationFlow(data) {
  const target = pickRandom(data.candidates);

  const res = http.get(
    `${BASE_URL}/api/v1/product/related-product/${target.id}/${target.categoryId}`,
    reqParams("recommendation")
  );
  const body = safeJson(res);

  const ok = check(res, {
    "recommendation status is 200": (r) => r.status === 200,
    "recommendation has success=true": () => body?.success === true,
    "recommendation has products array": () => Array.isArray(body?.products),
  });

  recommendationDuration.add(res.timings.duration);
  recordRequestHealth(res, ok);
}

export function photoCacheFlow(data) {
  const target = pickRandom(data.candidates);

  const first = http.get(`${BASE_URL}/api/v1/product/product-photo/${target.id}`, reqParams("photo"));
  const second = http.get(`${BASE_URL}/api/v1/product/product-photo/${target.id}`, reqParams("photo"));

  const firstOk = check(first, {
    "photo first read status 200": (r) => r.status === 200,
  });
  const secondOk = check(second, {
    "photo second read status 200": (r) => r.status === 200,
  });

  // Cache-hit proxy heuristic: second read is significantly faster or under absolute threshold.
  const secondFaster = second.timings.duration <= first.timings.duration * 0.85;
  const fastEnough = second.timings.duration <= 300;
  cacheHitProxyRate.add(secondFaster || fastEnough);

  photoReadDuration.add((first.timings.duration + second.timings.duration) / 2);
  recordRequestHealth(first, firstOk);
  recordRequestHealth(second, secondOk);
}
