// Ho Jian Tao, A0273320R
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:6060';

export function setup() {
  const res = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({
    name: 'k6 user 1',
    email: 'k6user1@example.com',
    password: 'Test1234!',
    phone: '90000001',
    address: 'Test Address 1',
    DOB: '2000-01-01',
    answer: 'football',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log(`SETUP STATUS: ${res.status}`);
}

export default function () {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'k6user1@example.com',
    password: 'Test1234!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
  });

  sleep(1);
}