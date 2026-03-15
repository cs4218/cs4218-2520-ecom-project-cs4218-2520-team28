// Combined Frontend Test Config
// Runs ALL frontend tests (unit + integration) found anywhere under client/src
// and collects coverage from every source file under client/src -- including any
// files not explicitly tested, so gaps are immediately visible.
export default {
  displayName: "frontend:all",
  testEnvironment: "jest-environment-jsdom",

  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],

  // Pick up every *.test.js file under client/src (unit + integration)
  testMatch: [
    "<rootDir>/client/src/**/*.test.js",
  ],

  // Collect coverage from every JS source file under client/src,
  // excluding test files, setup/config files, generated output, and pure entry-points.
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/**/*.js",
    "!client/src/**/*.test.js",
    "!client/src/setupTests.js",
    "!client/src/reportWebVitals.js",
    "!client/src/index.js",
    "!client/src/_site/**",
  ],

  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
