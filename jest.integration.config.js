export default {
  // display name
  displayName: "integration",

  // node environment (no browser needed)
  testEnvironment: "node",

  // only run integration test files
  testMatch: [
    "<rootDir>/tests/integration/**/*.integration.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "routes/**",
    "middlewares/**",
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
  // Prevent open handles from mongodb-memory-server keeping Jest alive
  forceExit: true,
};
