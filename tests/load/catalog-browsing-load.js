// Ho Chi Thanh, A0276229W
// MS4 Non-Functional Testing - Load Test for Product Catalog Browsing

import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const TEST_DURATION = __ENV.TEST_DURATION || "8m";

const KEYWORDS = (__ENV.SEARCH_KEYWORDS || "laptop,phone,shoe,bag,watch")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

function asInt(name, fallback) {
  const value = parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const LISTING_RATE = asInt("LISTING_RATE", 45);
const SEARCH_RATE = asInt("SEARCH_RATE", 25);
const FILTER_RATE = asInt("FILTER_RATE", 15);
const CATEGORY_RATE = asInt("CATEGORY_RATE", 10);
const COUNT_RATE = asInt("COUNT_RATE", 5);

export const catalogRequestFailures = new Rate("catalog_request_failures");
export const catalogBusinessFailures = new Rate("catalog_business_failures");

export const listingDuration = new Trend("catalog_listing_duration", true);
export const searchDuration = new Trend("catalog_search_duration", true);
export const filterDuration = new Trend("catalog_filter_duration", true);
export const categoryDuration = new Trend("catalog_category_duration", true);
export const countDuration = new Trend("catalog_count_duration", true);

export const options = {
  scenarios: {
    listing_flow: {
      executor: "constant-arrival-rate",
      exec: "listingFlow",
      rate: LISTING_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(20, Math.ceil(LISTING_RATE * 0.8)),
      maxVUs: Math.max(80, LISTING_RATE * 3),
    },
    search_flow: {
      executor: "constant-arrival-rate",
      exec: "searchFlow",
      rate: SEARCH_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(12, Math.ceil(SEARCH_RATE * 0.8)),
      maxVUs: Math.max(48, SEARCH_RATE * 3),
    },
    filter_flow: {
      executor: "constant-arrival-rate",
      exec: "filterFlow",
      rate: FILTER_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(10, Math.ceil(FILTER_RATE * 0.8)),
      maxVUs: Math.max(40, FILTER_RATE * 3),
    },
    category_flow: {
      executor: "constant-arrival-rate",
      exec: "categoryFlow",
      rate: CATEGORY_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(8, Math.ceil(CATEGORY_RATE * 0.8)),
      maxVUs: Math.max(30, CATEGORY_RATE * 3),
    },
    count_flow: {
      executor: "constant-arrival-rate",
      exec: "countFlow",
      rate: COUNT_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(5, Math.ceil(COUNT_RATE * 0.8)),
      maxVUs: Math.max(20, COUNT_RATE * 3),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200", "p(99)<2200"],
    checks: ["rate>0.95"],

    catalog_request_failures: ["rate<0.02"],
    catalog_business_failures: ["rate<0.03"],

    "http_req_duration{endpoint:listing}": ["p(95)<900"],
    "http_req_duration{endpoint:search}": ["p(95)<1300"],
    "http_req_duration{endpoint:filters}": ["p(95)<1400"],
    "http_req_duration{endpoint:category}": ["p(95)<1200"],
    "http_req_duration{endpoint:count}": ["p(95)<500"],
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

function trackResult(res, body, ok, durationMetric) {
  catalogRequestFailures.add(res.status >= 400);
  catalogBusinessFailures.add(!ok);
  durationMetric.add(res.timings.duration);

  if (!ok) {
    console.log(
      `Request failed | status=${res.status} | duration=${res.timings.duration}ms | body=${(res.body || "").slice(0, 180)}`
    );
  }
}

export function setup() {
  const categoryRes = http.get(`${BASE_URL}/api/v1/category/get-category`, {
    tags: { endpoint: "setup_category", feature: "catalog", testtype: "load" },
  });

  const categoryBody = safeJson(categoryRes);
  const categories = Array.isArray(categoryBody?.category) ? categoryBody.category : [];

  return {
    categorySlugs: categories.map((c) => c.slug).filter(Boolean),
    categoryIds: categories.map((c) => c._id).filter(Boolean),
    keywords: KEYWORDS,
  };
}

export function listingFlow() {
  const page = 1 + Math.floor(Math.random() * 8);
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`, {
    tags: { endpoint: "listing", feature: "catalog", testtype: "load" },
  });
  const body = safeJson(res);

  const ok = check(res, {
    "listing status is 200": (r) => r.status === 200,
    "listing response has success=true": () => body?.success === true,
    "listing response has products array": () => Array.isArray(body?.products),
  });

  trackResult(res, body, ok, listingDuration);
}

export function searchFlow(data) {
  const keyword = encodeURIComponent(pickRandom(data.keywords, "laptop"));
  const page = 1 + Math.floor(Math.random() * 6);
  const limit = pickRandom([12, 18, 24], 18);
  const res = http.get(
    `${BASE_URL}/api/v1/product/search/${keyword}?page=${page}&limit=${limit}`,
    {
      tags: { endpoint: "search", feature: "catalog", testtype: "load" },
    }
  );
  const body = safeJson(res);

  const ok = check(res, {
    "search status is 200": (r) => r.status === 200,
    "search response has success=true": () => body?.success === true,
    "search response has products array": () => Array.isArray(body?.products),
  });

  trackResult(res, body, ok, searchDuration);
}

export function filterFlow(data) {
  const hasCategory = data.categoryIds && data.categoryIds.length > 0;
  const checked = hasCategory && Math.random() > 0.35 ? [pickRandom(data.categoryIds)] : [];

  const payload = JSON.stringify({
    checked,
    radio: [0, 10000],
    page: 1 + Math.floor(Math.random() * 6),
    limit: pickRandom([12, 18, 24], 18),
  });

  const res = http.post(`${BASE_URL}/api/v1/product/product-filters`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "filters", feature: "catalog", testtype: "load" },
  });
  const body = safeJson(res);

  const ok = check(res, {
    "filter status is 200": (r) => r.status === 200,
    "filter response has success=true": () => body?.success === true,
    "filter response has products array": () => Array.isArray(body?.products),
  });

  trackResult(res, body, ok, filterDuration);
}

export function categoryFlow(data) {
  const slug = encodeURIComponent(pickRandom(data.categorySlugs, "electronics"));
  const res = http.get(`${BASE_URL}/api/v1/product/product-category/${slug}`, {
    tags: { endpoint: "category", feature: "catalog", testtype: "load" },
  });
  const body = safeJson(res);

  const ok = check(res, {
    "category status is 200": (r) => r.status === 200,
    "category response has success=true": () => body?.success === true,
    "category response has products array": () => Array.isArray(body?.products),
  });

  trackResult(res, body, ok, categoryDuration);
}

export function countFlow() {
  const res = http.get(`${BASE_URL}/api/v1/product/product-count`, {
    tags: { endpoint: "count", feature: "catalog", testtype: "load" },
  });
  const body = safeJson(res);

  const ok = check(res, {
    "count status is 200": (r) => r.status === 200,
    "count response has success=true": () => body?.success === true,
    "count response has numeric total": () => Number.isFinite(body?.total),
  });

  trackResult(res, body, ok, countDuration);
}
