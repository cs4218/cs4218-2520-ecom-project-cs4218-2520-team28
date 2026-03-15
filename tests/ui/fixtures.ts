// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)


/**
 * Shared Playwright fixtures for UI tests.
 *
 * Provides a `db` fixture that connects to the same in-memory MongoDB that
 * start-test-server.js started, so tests can seed or wipe data directly.
 *
 * Usage in a spec file:
 *
 *   import { test, expect } from './fixtures';
 *
 *   test('my test', async ({ page, db }) => {
 *     // seed before the test
 *     await db.collection('users').insertOne({ ... });
 *
 *     await page.goto('/');
 *     // ...assertions...
 *
 *     // db is disconnected automatically after the test
 *   });
 *
 * If you want a clean slate before every test, call clearDB() in beforeEach:
 *
 *   test.beforeEach(async ({ db }) => {
 *     await clearDB(db);
 *   });
 */

import { test as base } from '@playwright/test';
import { readFileSync } from 'fs';
import { MongoClient, Db } from 'mongodb';

// Read the URI written by start-test-server.js
function readTestEnv(): { mongoUri: string; backendPort: string } {
  const raw = readFileSync('.tmp/test-env.json', 'utf-8');
  return JSON.parse(raw);
}

/** Drop every collection, giving each test a clean database state. */
export async function clearDB(db: Db): Promise<void> {
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.map((c) => db.collection(c.name).deleteMany({})));
}

// Extend Playwright's base test with the `db` fixture
type Fixtures = {
  db: Db;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  db: async ({}, use) => {
    const { mongoUri } = readTestEnv();
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(); // uses the default db from the URI

    await use(db);

    await client.close();
  },
});

export { expect } from '@playwright/test';
