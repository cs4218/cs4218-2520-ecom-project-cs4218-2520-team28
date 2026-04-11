// Ho Chi Thanh, A0276229W
// MS4 Non-Functional Testing - Load Test for Authentication Paths

import http from "k6/http";
import { check, fail } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const TEST_DURATION = __ENV.TEST_DURATION || "4m";
const AUTH_TIMEOUT_MS = parseInt(__ENV.AUTH_TIMEOUT_MS || "5000", 10);
const IDP_HEALTHCHECK_URL = __ENV.IDP_HEALTHCHECK_URL || "";

function asInt(name, fallback) {
  const value = parseInt(__ENV[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const LOGIN_RATE = asInt("LOGIN_RATE", 22);
const REFRESH_LIKE_RATE = asInt("REFRESH_LIKE_RATE", 14);
const SESSION_VALIDATE_RATE = asInt("SESSION_VALIDATE_RATE", 18);
const INVALID_BURST_RATE = asInt("INVALID_BURST_RATE", 12);
const IDP_FLOW_RATE = asInt("IDP_FLOW_RATE", 3);

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const authLoginDuration = new Trend("auth_login_duration", true);
export const authRefreshLikeDuration = new Trend("auth_refresh_like_duration", true);
export const authSessionValidationDuration = new Trend("auth_session_validation_duration", true);
export const authInvalidBurstDuration = new Trend("auth_invalid_burst_duration", true);
export const idpDependencyDuration = new Trend("idp_dependency_duration", true);

export const authBusinessFailureRate = new Rate("auth_business_failure_rate");
export const invalidBurstServerErrorRate = new Rate("invalid_burst_server_error_rate");
export const authTimeoutRate = new Rate("auth_timeout_rate");
export const idpUnavailableRate = new Rate("idp_unavailable_rate");
export const idpFallbackSuccessRate = new Rate("idp_fallback_success_rate");

export const options = {
  scenarios: {
    login_steady: {
      executor: "constant-arrival-rate",
      exec: "loginFlow",
      rate: LOGIN_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(12, Math.ceil(LOGIN_RATE * 0.8)),
      maxVUs: Math.max(72, LOGIN_RATE * 3),
    },
    refresh_like_steady: {
      executor: "constant-arrival-rate",
      exec: "refreshLikeFlow",
      rate: REFRESH_LIKE_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(10, Math.ceil(REFRESH_LIKE_RATE * 0.8)),
      maxVUs: Math.max(60, REFRESH_LIKE_RATE * 3),
    },
    session_validation_steady: {
      executor: "constant-arrival-rate",
      exec: "sessionValidationFlow",
      rate: SESSION_VALIDATE_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(10, Math.ceil(SESSION_VALIDATE_RATE * 0.8)),
      maxVUs: Math.max(65, SESSION_VALIDATE_RATE * 3),
    },
    invalid_login_spike: {
      executor: "ramping-arrival-rate",
      exec: "invalidLoginBurstFlow",
      startRate: Math.max(4, Math.floor(INVALID_BURST_RATE / 2)),
      timeUnit: "1s",
      stages: [
        { target: Math.max(4, Math.floor(INVALID_BURST_RATE / 2)), duration: "45s" },
        { target: INVALID_BURST_RATE * 3, duration: "20s" },
        { target: INVALID_BURST_RATE * 3, duration: "40s" },
        { target: Math.max(4, Math.floor(INVALID_BURST_RATE / 2)), duration: "35s" },
      ],
      preAllocatedVUs: Math.max(12, INVALID_BURST_RATE * 2),
      maxVUs: Math.max(100, INVALID_BURST_RATE * 8),
    },
    idp_dependency_probe: {
      executor: "constant-arrival-rate",
      exec: "idpDependencyFallbackFlow",
      rate: IDP_FLOW_RATE,
      timeUnit: "1s",
      duration: TEST_DURATION,
      preAllocatedVUs: Math.max(3, IDP_FLOW_RATE),
      maxVUs: Math.max(20, IDP_FLOW_RATE * 5),
    },
  },
  thresholds: {
    // Auth APIs should avoid server-side errors/timeouts under load.
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(95)<1500"],

    auth_business_failure_rate: ["rate<0.03"],
    auth_timeout_rate: ["rate<0.02"],
    invalid_burst_server_error_rate: ["rate<0.01"],

    "http_req_duration{endpoint:login}": ["p(95)<1200"],
    "http_req_duration{endpoint:refresh_like}": ["p(95)<1300"],
    "http_req_duration{endpoint:session_validate}": ["p(95)<1200"],
    "http_req_duration{endpoint:invalid_burst}": ["p(95)<1400"],

    // IdP behaviour/fallback tracking (target fallback reliability).
    idp_fallback_success_rate: ["rate>0.95"],
  },
};

function requestParams(endpoint, contentType = "application/json") {
  return {
    timeout: `${AUTH_TIMEOUT_MS}ms`,
    headers: {
      Accept: "application/json",
      "Content-Type": contentType,
    },
    tags: {
      feature: "auth",
      testtype: "load",
      endpoint,
    },
  };
}

function safeJson(res) {
  try {
    return res.json();
  } catch (error) {
    return null;
  }
}

function authPayload(email, password) {
  return JSON.stringify({ email, password });
}

function recordHealth(res, logicalOk) {
  const timeout = res.status === 0 || res.timings.duration >= AUTH_TIMEOUT_MS;
  authTimeoutRate.add(timeout);

  const businessFailure = !logicalOk || res.status >= 500;
  authBusinessFailureRate.add(businessFailure);

  if (businessFailure) {
    console.log(`AUTH_FAIL status=${res.status} dur=${res.timings.duration} body=${(res.body || "").slice(0, 160)}`);
  }
}

function login(email, password, endpointTag) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    authPayload(email, password),
    requestParams(endpointTag)
  );
  const body = safeJson(res);
  return { res, body };
}

export function setup() {
  const ts = Date.now();
  const testUser = {
    name: `load-user-${ts}`,
    email: `load.user.${ts}@example.com`,
    password: "LoadTest123!",
    phone: "91234567",
    address: "Load Test Address",
    answer: "blue",
  };

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(testUser),
    requestParams("register")
  );

  const registerBody = safeJson(registerRes);
  const registerOk =
    registerRes.status === 201 ||
    (registerRes.status === 200 && registerBody && registerBody.success === false);

  if (!registerOk) {
    fail(`Failed to create/load auth test user. status=${registerRes.status}`);
  }

  return {
    validEmail: testUser.email,
    validPassword: testUser.password,
    invalidPassword: "WrongPass!234",
    unknownEmail: `unknown.${ts}@example.com`,
  };
}

export function loginFlow(data) {
  const { res, body } = login(data.validEmail, data.validPassword, "login");
  const ok = check(res, {
    "login status 200": (r) => r.status === 200,
    "login success true": () => body?.success === true,
    "login has token": () => typeof body?.token === "string" && body.token.length > 0,
  });

  authLoginDuration.add(res.timings.duration);
  recordHealth(res, ok);
}

// Refresh-like flow: this system has no refresh endpoint, so token renewal is represented by re-authentication.
export function refreshLikeFlow(data) {
  const first = login(data.validEmail, data.validPassword, "refresh_like");
  const second = login(data.validEmail, data.validPassword, "refresh_like");

  const ok =
    check(first.res, {
      "refresh-like first login 200": (r) => r.status === 200,
      "refresh-like first token exists": () => typeof first.body?.token === "string" && first.body.token.length > 0,
    }) &&
    check(second.res, {
      "refresh-like second login 200": (r) => r.status === 200,
      "refresh-like second token exists": () => typeof second.body?.token === "string" && second.body.token.length > 0,
    });

  authRefreshLikeDuration.add((first.res.timings.duration + second.res.timings.duration) / 2);
  recordHealth(first.res, ok);
  recordHealth(second.res, ok);
}

export function sessionValidationFlow(data) {
  const auth = login(data.validEmail, data.validPassword, "session_validate");
  let ok = false;

  if (auth.res.status === 200 && typeof auth.body?.token === "string" && auth.body.token.length > 0) {
    const userAuthRes = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
      ...requestParams("session_validate", "application/json"),
      headers: {
        Accept: "application/json",
        Authorization: auth.body.token,
      },
    });
    const userAuthBody = safeJson(userAuthRes);

    ok = check(userAuthRes, {
      "session validate status 200": (r) => r.status === 200,
      "session validate ok true": () => userAuthBody?.ok === true,
    });

    authSessionValidationDuration.add(userAuthRes.timings.duration);
    recordHealth(userAuthRes, ok);
  } else {
    authBusinessFailureRate.add(true);
  }

  recordHealth(auth.res, auth.res.status === 200);
}

export function invalidLoginBurstFlow(data) {
  const useUnknownEmail = Math.random() < 0.5;
  const email = useUnknownEmail ? data.unknownEmail : data.validEmail;
  const password = data.invalidPassword;

  const { res, body } = login(email, password, "invalid_burst");

  // Invalid login is expected to be 200/404 in this codebase, but never 5xx.
  const ok = check(res, {
    "invalid burst returns non-5xx": (r) => r.status < 500,
    "invalid burst returns expected status": (r) => r.status === 404 || r.status === 200,
    "invalid burst has structured response": () => body !== null,
  });

  invalidBurstServerErrorRate.add(res.status >= 500);
  authInvalidBurstDuration.add(res.timings.duration);
  recordHealth(res, ok);
}

export function idpDependencyFallbackFlow(data) {
  let idpUnavailable = true;

  if (IDP_HEALTHCHECK_URL) {
    const idpRes = http.get(IDP_HEALTHCHECK_URL, requestParams("idp_probe", "application/json"));
    idpDependencyDuration.add(idpRes.timings.duration);
    idpUnavailable = idpRes.status === 0 || idpRes.status >= 500;
  }

  idpUnavailableRate.add(idpUnavailable);

  // Fallback behaviour: local auth should continue working when IdP is degraded/unavailable.
  if (idpUnavailable) {
    const fallback = login(data.validEmail, data.validPassword, "idp_fallback");
    const fallbackOk =
      fallback.res.status === 200 &&
      typeof fallback.body?.token === "string" &&
      fallback.body.token.length > 0;

    idpFallbackSuccessRate.add(fallbackOk);
    authRefreshLikeDuration.add(fallback.res.timings.duration);
    recordHealth(fallback.res, fallbackOk);
  } else {
    idpFallbackSuccessRate.add(true);
  }
}
