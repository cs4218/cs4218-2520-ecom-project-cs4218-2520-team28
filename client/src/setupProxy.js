// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

// Proxy middleware for the React dev server.
// Reads BACKEND_PORT from the environment so that Playwright UI tests can
// start the backend on a dynamic port (avoiding conflicts with a running
// `npm run dev`).  Falls back to 6060 for normal local development.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://localhost:${process.env.BACKEND_PORT || 6060}`,
      changeOrigin: true,
    })
  );
};
