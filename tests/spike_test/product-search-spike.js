// Ho Jian Tao, A0273320R
// MS3 Non-Functional Testing - Spike Test for Product Search

// ChatGPT was used to assist in generating and refining this k6 spike test script, including test structure, thresholds, and validation checks.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || 'phone'; 

// K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=catalog-search-spike-report.html k6 run tests/spike_test/product-search-spike.js 

export const options = {
  scenarios: {
    product_search_spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        // { duration: '10s', target: 150 },

        { duration: '10s', target: 5 },

        // { duration: '2s', target: 50 },
        // { duration: '15s', target: 50 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },

        // { duration: '2s', target: 100 },
        // { duration: '15s', target: 100 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },

        { duration: '2s', target: 150 },
        { duration: '15s', target: 150 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

        // { duration: '2s', target: 200 },
        // { duration: '15s', target: 200 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },

        // { duration: '2s', target: 250 },
        // { duration: '15s', target: 250 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },
        
        // { duration: '2s', target: 300 },
        // { duration: '15s', target: 300 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },


        // { duration: '2s', target: 400 },
        // { duration: '15s', target: 400 },
        // { duration: '2s', target: 5 },
        // { duration: '15s', target: 5 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1800'],
    checks: ['rate>0.95'],
  },
};

function hasSearchArray(body) {
  return (
    Array.isArray(body) ||
    Array.isArray(body?.products) ||
    Array.isArray(body?.results) ||
    Array.isArray(body?.data)
  );
}

export default function () {
  const params = {
    headers: {
      Accept: 'application/json',
    },
    tags: {
      feature: 'product',
      flow: 'search',
      testtype: 'spike',
    },
  };

  const path = `/api/v1/product/search/${encodeURIComponent(SEARCH_KEYWORD)}`;
  const res = http.get(`${BASE_URL}${path}`, params);

  let body = null;
  try {
    body = res.json();
  } catch (e) {
    body = null;
  }

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response is JSON or parseable': () => body !== null,
    'response has search result array shape': () => hasSearchArray(body),
    'response time < 1800ms': (r) => r.timings.duration < 1800,
  });

  if (!passed) {
    console.log(`SEARCH FAILED | status=${res.status} | body=${res.body}`);
  }

  sleep(1);
}