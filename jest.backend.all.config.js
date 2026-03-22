// Combined Backend Test Config
// Runs ALL backend tests (unit + integration) found in the project root and
// collects coverage from every backend source file -- including any files not
// explicitly tested, so gaps are immediately visible.
export default {
  displayName: "backend:all",
  testEnvironment: "node",

  // Pick up every *.test.js file in the backend source tree (unit + integration)
  testMatch: [
    "<rootDir>/controllers/**/*.test.js",
    "<rootDir>/models/**/*.test.js",
    "<rootDir>/helpers/**/*.test.js",
    "<rootDir>/middlewares/**/*.test.js",
    "<rootDir>/config/**/*.test.js",
    "<rootDir>/routes/**/*.test.js",
    "<rootDir>/tests/**/*.test.js",
  ],

  // Collect coverage from every JS source file in the backend tree,
  // excluding test files and the server entry-point.
  coverageDirectory: "coverage/backend",
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "helpers/**/*.js",
    "middlewares/**/*.js",
    "config/**/*.js",
    "routes/**/*.js",
    "!**/*.test.js",
    "!server.js",
    "!tests/**",
  ],

  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
};
