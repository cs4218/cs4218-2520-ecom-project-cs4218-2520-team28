// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

/**
 * Test DB isolation middleware — only active when UI_TEST=true.
 *
 * Each Playwright worker sends an X-Test-DB header with its unique database
 * name.  This middleware reads that header and switches Mongoose to that
 * database for the request, so parallel workers never share data.
 *
 * Mounted conditionally in app.js:
 *   if (process.env.UI_TEST === 'true') app.use(testDbMiddleware)
 *
 * In normal dev/production (UI_TEST unset) this file is never imported.
 */
import mongoose from 'mongoose';

const testDbMiddleware = (req, res, next) => {
  const dbName = req.headers['x-test-db'];
  if (!dbName) return next();
  req._testDb = mongoose.connection.useDb(dbName, { useCache: true });
  next();
};

export default testDbMiddleware;
