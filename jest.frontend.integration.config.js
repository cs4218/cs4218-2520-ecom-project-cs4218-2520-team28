// Frontend Integration Test Config
// Runs L3 (page + real Layout/Header/Footer) and L4 (full App routing) tests
// for Contact and Policy pages.
export default {
  displayName: "frontend:integration",
  testEnvironment: "jest-environment-jsdom",

  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],

  testMatch: [
    "<rootDir>/client/src/tests/integration/**/*.integration.test.js",
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    "<rootDir>/client/src/pages/Contact.js",
    "<rootDir>/client/src/pages/Policy.js",
    "<rootDir>/client/src/pages/user/Dashboard.js",
    "<rootDir>/client/src/pages/admin/Products.js",
    "<rootDir>/client/src/pages/CartPage.js",
    "<rootDir>/client/src/pages/HomePage.js",
  ],
};
