// jest.backend.me.config.js
export default {
  displayName: "backend:me",
  testEnvironment: "node",

  testMatch: [
    "<rootDir>/config/db.test.js",
    "<rootDir>/helpers/authHelper.test.js",
    "<rootDir>/middlewares/authMiddleware.test.js",
  ],

  collectCoverage: true,

  // Only the source files YOU are testing
  collectCoverageFrom: [
    "<rootDir>/config/db.js",
    "<rootDir>/helpers/authHelper.js",
    "<rootDir>/middlewares/authMiddleware.js",
  ],

  // optional (makes output simpler)
  coverageReporters: ["text", "text-summary"],
};
