// Ho Jin Han, A0266275W
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Volume testing: evaluating unpaginated data fetch when category collection is extremely large.
export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<2500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  console.log('Testing Get All Categories. Needs a database pre-seeded with 10k+ categories.');
}

export default function () {
  // API: GET /api/v1/category/get-category
  const url = `${BASE_URL}/api/v1/category/get-category`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    // Verifying it successfully fetched the large dataset
    'returns category array': (r) => Array.isArray(JSON.parse(r.body).category),
  });

  sleep(1);
}
