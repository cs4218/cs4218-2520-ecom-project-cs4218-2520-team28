// Ho Jin Han, A0266275W
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Volume testing: evaluating how the Search API behaves when scanning a large dataset using regex.
export const options = {
  vus: 1, // Single User to test purely the database read/scan capability, not concurrency
  iterations: 10,
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
    http_req_failed: ['rate<0.01'],    // Errors should be less than 1%
  },
};

export function setup() {
  // NOTE: For true volume testing (e.g. 100k records), data should be pre-seeded directly into MongoDB.
  // This setup demonstrates how to dynamically inject data via API before the test if needed.
  console.log('For optimal volume testing, ensure the database is pre-seeded with >100,000 product documents.');

  const seedCount = __ENV.SEED_COUNT ? parseInt(__ENV.SEED_COUNT) : 0;
  if (seedCount > 0) {
    console.log(`Seeding ${seedCount} products...`);
    // Assuming admin login and token setup would go here to create products
  }

  return { keyword: 'laptop' }; // Example keyword expected to have many matches in a large dataset
}

export default function (data) {
  // API: GET /api/v1/product/search/:keyword
  const url = `${BASE_URL}/api/v1/product/search/${data.keyword}?page=1&limit=50`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,

    // New response shape: { success, page, limit, total, products: [...] }
    "has products array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && Array.isArray(body.products);
      } catch {
        return false;
      }
    },

    "returns <= limit products": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.products) && body.products.length <= 50;
      } catch {
        return false;
      }
    },

    "response time is acceptable": (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
