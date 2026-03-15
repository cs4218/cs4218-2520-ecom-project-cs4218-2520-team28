import { test, expect, clearDB } from './fixtures';

// Import mongoose models if you need to seed via the ODM, or use db directly.
// Example: import userModel from '../../models/userModel.js';

// Wipe all collections before each test so every test starts with a clean DB.
test.beforeEach(async ({ db }) => {
  await clearDB(db);
});

// Placeholder — add UI tests here
test('placeholder', async ({ page, db }) => {
  // Seed example (raw MongoDB driver):
  // await db.collection('users').insertOne({ name: 'Alice', email: 'a@test.com' });

  // Navigate and assert
  await page.goto('/');
  // TODO: add assertions here
});
