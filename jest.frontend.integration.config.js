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
    // "<rootDir>/client/src/tests/integration/**/*.integration.test.js",
    "<rootDir>/client/src/tests/integration/About.integration.test.js",
    "<rootDir>/client/src/tests/integration/AdminDashboard.integration.test.js",
    "<rootDir>/client/src/tests/integration/Header.integration.test.js",
    "<rootDir>/client/src/tests/integration/Header.dropdown.integration.test.js",
    "<rootDir>/client/src/tests/integration/Layout.integration.test.js",
    "<rootDir>/client/src/tests/integration/Pagenotfound.integration.test.js",
    "<rootDir>/client/src/tests/integration/Profile.integration.test.js",
    "<rootDir>/client/src/tests/integration/Spinner.integration.test.js",
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    // "<rootDir>/client/src/pages/Contact.js",
    // "<rootDir>/client/src/pages/Policy.js",
    // "<rootDir>/client/src/pages/user/Dashboard.js",
    // "<rootDir>/client/src/pages/admin/Products.js",
    // "<rootDir>/client/src/pages/CartPage.js",
    // "<rootDir>/client/src/pages/HomePage.js",
    "<rootDir>/client/src/pages/About.js",
    "<rootDir>/client/src/pages/Pagenotfound.js",
    "<rootDir>/client/src/pages/user/Profile.js",
    "<rootDir>/client/src/components/Header.js",
    "<rootDir>/client/src/components/Layout.js",
    "<rootDir>/client/src/components/Spinner.js",
    "<rootDir>/client/src/pages/admin/AdminDashboard.js",
  ],
};
