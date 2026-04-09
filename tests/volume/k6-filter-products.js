// Ho Jin Han, A0266275W
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Volume testing: Evaluating offset-based pagination at high offsets.
export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<3000'], // Allow up to 3 seconds for deep pagination
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  console.log('Testing deep pagination. DB should contain 100,000+ products for accurate volume metrics.');
  return {
    pageToTest: 100, // Testing a deep page offset
    limit: 100
  };
}

export default function (data) {
  // API: POST /api/v1/product/product-filters
  const url = `${BASE_URL}/api/v1/product/product-filters`;

  const payload = JSON.stringify({
    page: data.pageToTest,
    limit: data.limit,
    radio: [0, 10000], // Price range
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Add a second request to compare page 1 vs page 1000 first IDs.
  const resPage1 = http.post(url, JSON.stringify({ page: 1, limit: data.limit, radio: [0, 10000] }), params);


  check(res, {
    "status is 200": (r) => r.status === 200,
    "response is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
    "products is array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.products);
      } catch {
        return false;
      }
    },
    "products length <= limit": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.products) && body.products.length <= data.limit;
      } catch {
        return false;
      }
    },
    "page 1 and deep page differ": () => {
      try {
        const bodyA = JSON.parse(res.body);
        const bodyB = JSON.parse(resPage1.body);

        const a = bodyA.products?.[0]?._id;
        const b = bodyB.products?.[0]?._id;

        // If deep page has no data, don't fail the test
        if (!bodyA.products?.length || !bodyB.products?.length) return true;

        return a !== b;
      } catch {
        return false;
      }
    },

  });


  sleep(1);
}
