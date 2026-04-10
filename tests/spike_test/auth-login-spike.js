// Ho Jian Tao, A0273320R
// MS3 Non-Functional Testing - Spike Test for Authentication Login

// ChatGPT was used to assist in generating and refining this k6 spike test script, including test structure, thresholds, and validation checks.

// to run:
// K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=auth-spike-report.html k6 run k6/spike_test/auth-login-spike.js 

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const LOGIN_PATH = '/api/v1/auth/login';

// use a real test account that already exists in your DB
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'k6user1@example.com';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'Test1234!';



export const options = {
  scenarios: {
    auth_login_spike: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        //  { duration: '10s', target: 500 },

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

        { duration: '2s', target: 250 },
        { duration: '15s', target: 250 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },

        { duration: '2s', target: 300 },
        { duration: '15s', target: 300 },
        { duration: '2s', target: 5 },
        { duration: '15s', target: 5 },


      ],
      gracefulRampDown: '20s',  // k6 waits up to 10 seconds for ongoing work to finish first
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const payload = JSON.stringify({
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      feature: 'auth',
      flow: 'login',
      testtype: 'spike',
    },
  };

  const res = http.post(`${BASE_URL}${LOGIN_PATH}`, payload, params);

  let body = null;
  try {
    body = res.json();
  } catch (e) {
    body = null;
  }

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success=true': () => body && body.success === true,
    'response has token': () =>
      body && typeof body.token === 'string' && body.token.length > 0,
    'response has user': () => body && body.user,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  if (!passed) {
    console.log(`LOGIN FAILED | status=${res.status} | body=${res.body}`);
  }

  sleep(1);
}