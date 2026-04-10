// Ho Jin Han, A0266275W
import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Volume testing: Evaluating unpaginated data fetch when collection size is massive.
export const options = {
  vus: 1,
  iterations: 5, // Lower iterations as unpaginated massive fetches take time and memory
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  console.log('Testing unpaginated All Orders endpoint. Needs an Admin Token.');

  // To run this test, pass the token via environment variable:
  // k6 run -e ADMIN_TOKEN=your_jwt_token_here tests/volume/k6-get-all-orders.js
  const token = __ENV.ADMIN_TOKEN;

  if (!token) {
    fail("ADMIN_TOKEN is required. Run with: k6 run -e ADMIN_TOKEN=... ");
  }

  return { token };
}

export default function (data) {
  // API: GET /api/v1/auth/all-orders
  const url = `${BASE_URL}/api/v1/auth/all-orders?page=1&limit=50`;


  const params = {
    headers: {
      'Authorization': `${data.token}`,
    },
    timeout: '30s', // Giving it extra time in case of massive data volume
  };

  const res = http.get(url, params);

  if (res.status !== 200) {
    console.log("STATUS:", res.status);
    console.log("HEADERS:", JSON.stringify(res.headers));
    console.log("BODY(first200):", (res.body || "").slice(0, 200));
  }


  // If the dataset is too huge, this will timeout or return a massive payload
  check(res, {
    "is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
    'status is 200': (r) => r.status === 200,
    'response not empty': (r) => r.body && r.body.length > 0,
    // Checking if we actually received an array of orders (volume check)
    'returns orders array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.orders);
      } catch {
        return false;
      }
    },
    
  });

  sleep(2);
}
