// Ho Jian Tao, A0273320R
// MS3 Non-Functional Testing - Spike Test for Product Listing

// ChatGPT was used to assist in generating and refining this k6 spike test script, including test structure, thresholds, and validation checks.


import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const LISTING_PATH = __ENV.LISTING_PATH || '/api/v1/product/get-product';


// K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=catalog-listing-spike-report.html k6 run tests/spike_test/product-listing-spike.js 

export const options = {
  scenarios: {
    product_listing_spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // { duration: '10s', target: 200 },

        { duration: '10s', target: 5 },


        { duration: '2s', target: 50 },
        { duration: '15s', target: 50 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

        { duration: '2s', target: 100 },
        { duration: '15s', target: 100 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

        { duration: '2s', target: 150 },
        { duration: '15s', target: 150 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

        { duration: '2s', target: 200 },
        { duration: '15s', target: 200 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1800'],
    checks: ['rate>0.95'],
  },
};

function hasProductArray(body) {
  return (
    Array.isArray(body) ||
    Array.isArray(body?.products) ||
    Array.isArray(body?.product) ||
    Array.isArray(body?.results)
  );
}

export default function () {
  const params = {
    headers: {
      Accept: 'application/json',
    },
    tags: {
      feature: 'product',
      flow: 'listing',
      testtype: 'spike',
    },
  };

  const res = http.get(`${BASE_URL}${LISTING_PATH}`, params);

  let body = null;
  try {
    body = res.json();
  } catch (e) {
    body = null;
  }

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response is JSON or parseable': () => body !== null,
    'response has product array shape': () => hasProductArray(body),
    'response time < 1800ms': (r) => r.timings.duration < 1800,
  });

  if (!passed) {
    console.log(`LISTING FAILED | status=${res.status} | body=${res.body}`);
  }

  sleep(1);
}