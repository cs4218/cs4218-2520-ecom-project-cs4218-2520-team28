// jest.frontend.me.config.js
export default {
  displayName: "frontend:me",
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
    "<rootDir>/client/src/components/AdminMenu.test.js",
    "<rootDir>/client/src/components/Footer.test.js",
    "<rootDir>/client/src/components/Header.test.js",
    "<rootDir>/client/src/components/Layout.test.js",

    "<rootDir>/client/src/context/auth.test.js",

    "<rootDir>/client/src/pages/admin/AdminDashboard.test.js",
    "<rootDir>/client/src/pages/user/Profile.test.js",

    "<rootDir>/client/src/pages/About.test.js",
    "<rootDir>/client/src/pages/Pagenotfound.test.js",
  ],

  collectCoverage: true,

  // Only the source files YOU are testing
  collectCoverageFrom: [
    "<rootDir>/client/src/components/AdminMenu.js",
    "<rootDir>/client/src/components/Footer.js",
    "<rootDir>/client/src/components/Header.js",
    "<rootDir>/client/src/components/Layout.js",

    "<rootDir>/client/src/context/auth.js",

    "<rootDir>/client/src/pages/admin/AdminDashboard.js",
    "<rootDir>/client/src/pages/user/Profile.js",

    "<rootDir>/client/src/pages/About.js",
    "<rootDir>/client/src/pages/Pagenotfound.js",
  ],

  coverageReporters: ["text", "text-summary"],
};
