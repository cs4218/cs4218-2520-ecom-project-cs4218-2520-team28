// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)


/**
 * Shared Playwright fixtures for UI tests.
 *
 * Provides a `db` fixture that connects to the same in-memory MongoDB that
 * start-test-server.js started, so tests can seed or wipe data directly.
 *
 * Tests run with workers: 1 (serial), so clearDB() in beforeEach is safe —
 * there is only ever one test running at a time sharing the database.
 *
 * Usage in a spec file:
 *
 *   import { test, expect, clearDB } from './fixtures';
 *
 *   test.beforeEach(async ({ db }) => {
 *     await clearDB(db);          // clean slate before every test
 *   });
 *
 *   test('my test', async ({ page, db }) => {
 *     await db.collection('users').insertOne({ ... });  // seed
 *     await page.goto('/');
 *     // ...assertions...
 *   });                            // db closed automatically
 */

import { test as base } from '@playwright/test';
import { readFileSync } from 'fs';
import { MongoClient, Db } from 'mongodb';

// Read the URI written by start-test-server.js
function readTestEnv(): { mongoUri: string; backendPort: string } {
  const raw = readFileSync('.tmp/test-env.json', 'utf-8');
  return JSON.parse(raw);
}

/** Drop every collection in the given db — safe to call in beforeEach. */
export async function clearDB(db: Db): Promise<void> {
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.map((c) => db.collection(c.name).deleteMany({})));
}

// Extend Playwright's base test with the `db` fixture
type Fixtures = {
  db: Db;
};

export const test = base.extend<Fixtures>({
  db: async ({}, use) => {
    const { mongoUri } = readTestEnv();
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(); // single shared db — safe because workers: 1

    await use(db);

    await client.close();
  },
});

export { expect } from '@playwright/test';
