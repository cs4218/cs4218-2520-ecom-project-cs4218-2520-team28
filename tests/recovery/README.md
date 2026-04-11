# Recovery Tests — Foo Tzie Huang, A0262376Y
# MS3 Non-Functional Testing

## Overview
Recovery testing measures how quickly the system returns to normal operation
after experiencing a period of high stress or failure.

Each script follows a 3-phase pattern:
- **Phase 1 (Baseline)**: Light load — establishes healthy baseline metrics
- **Phase 2 (Stress)**: Heavy concurrent load — degrades the target endpoints
- **Phase 3 (Recovery)**: Return to light load — measures time-to-recovery (TTR)

## Prerequisites
- [k6](https://k6.io/docs/getting-started/installation/) installed
- App running locally: `npm run dev` (default port 6060)

## Scripts

| File | Endpoints Tested |
|------|-----------------|
| `recovery-auth.js` | POST /auth/login, POST /auth/register |
| `recovery-product-catalog.js` | GET /product/get-product, /search, /product-list, /product-count |
| `recovery-checkout.js` | GET+POST /product/braintree/token+payment, /product-filters |
| `recovery-admin.js` | GET /auth/all-orders, /auth/admin-auth, /product/get-product |
| `recovery-mixed.js` | All of the above simultaneously |

## How to Run

```bash
# Basic run
k6 run tests/recovery/recovery-auth.js
k6 run tests/recovery/recovery-product-catalog.js
k6 run tests/recovery/recovery-checkout.js
k6 run tests/recovery/recovery-admin.js
k6 run tests/recovery/recovery-mixed.js

# With HTML dashboard report
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/recovery/results/auth-recovery-report.html \
  k6 run tests/recovery/recovery-auth.js

# With admin/auth token (for protected endpoints)
k6 run -e ADMIN_TOKEN=<your_jwt> tests/recovery/recovery-admin.js
k6 run -e AUTH_TOKEN=<your_jwt> tests/recovery/recovery-mixed.js
```

## Metrics Tracked
- `http_req_duration` — response time (p50, p95, p99)
- `http_req_failed` — overall HTTP error rate
- `*_recovery_response_time_ms` — per-test custom response time trend
- `*_recovery_error_rate` — per-test custom error rate
- `*_recovery_failed_requests` — count of failed requests per test

## Results
HTML dashboard reports are saved to `tests/recovery/results/` after running with `K6_WEB_DASHBOARD_EXPORT`.
