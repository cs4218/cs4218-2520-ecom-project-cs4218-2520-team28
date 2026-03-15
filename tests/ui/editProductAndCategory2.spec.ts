// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

// Note: The file will be split into 4 parts due to too many tests in one file taking forever to run.
// - editProductAndCategory1.spec.ts -> Suite A to C focusing on product creation/update/delete tests (1 edit action each test)
// - editProductAndCategory2.spec.ts -> Suite D to F focusing on category creation/update/delete tests (1 edit action each test)
// - editProductAndCategory3.spec.ts -> Suite G focusing on more complex scenarios involving multiple edit actions in sequence
// - editProductAndCategory4.spec.ts -> Suite H focusing on multiple edit actions in sequence
//      and Suite I focusing on normal users unable to access admin edit pages and actions

// Instructions for AI
// Plan for testing of ui test involving create/update/delete category
// Rules: Start with log in page

// Must include these test cases:
// Suite D: Create Category (13 tests)
// 1) log in as admin -> go to manage category page ->
//      create category with valid name -> assert success toast (e.g. "<name> is created")
// 2) log in as admin -> go to manage category page ->
//      create category with valid name -> assert category is saved in database with correct name and slug
// 3) log in as admin -> go to manage category page ->
//      create category with valid name ->
//      assert category is visible in all places where it can be seen:
//        - admin manage category table
//        - nav category dropdown link
//        - all-categories page (/categories)
//        - category browse page (/category/:slug heading shows correct name)
//        - product creation form (category dropdown option)
//      (1 test case per location)
// 4) log in as admin -> go to manage category page ->
//      create category with valid name -> log out ->
//      log in as normal user -> assert category visible on all-categories page and browse page
//      (1 test case per location)
// 5) log in as admin -> create two categories -> assert both appear in admin table
// 6) log in as admin -> go to manage category page ->
//      submit with empty name -> assert error message
//      [Known Bug: catch block shows "something went wrong in input form" instead of propagating
//       backend's "Name is required" — same class of bug as was fixed in CreateProduct.js]
// 7) log in as admin -> create category -> create same category again ->
//      assert "Category Already Exists" message
//      [Known Bug: frontend checks data?.success which is true for the duplicate response,
//       so it shows a success toast instead of the "Category Already Exists" message]
// 8) log in as admin -> create category with very long name -> assert success
//      (no max-length restriction exists in the backend or frontend)
//
// Suite E: Update Category (11 tests)
// 1) log in as admin -> go to manage category page for existing category ->
//      click Edit -> update name -> assert success toast ("<newName> is updated")
// 2) log in as admin -> go to manage category page for existing category ->
//      click Edit -> update name -> assert category updated in database (new name + new slug)
// 3) log in as admin -> go to manage category page for existing category ->
//      click Edit -> update name ->
//      assert updated name visible in all relevant places:
//        - admin manage category table (new visible, old gone)
//        - all-categories page (new visible, old gone)
//        - category browse page via new slug
//        - new category selectable in product creation form
//      (1 test case per location / assertion)
// 4) log in as admin -> update category -> log out ->
//      log in as regular user -> assert updated name visible in /categories
// 5) log in as admin -> click Edit -> assert modal pre-fills current category name
// 6) log in as admin -> click Edit -> clear name -> submit -> assert error message
//      [Known Bug: catch block in handleUpdate shows "Something went wrong" instead of
//       propagating backend's "Name is required"]
// 7) log in as admin -> update category name with long name -> assert success
// 8) log in as admin -> update category with products -> assert products remain accessible
//      via the new category slug after the update
//
// Suite F: Delete Category (8 tests)
// 1) log in as admin -> go to manage category page for existing category ->
//      click Delete -> confirm Yes -> assert success toast
// 2) log in as admin -> delete category -> assert category removed from database
// 3) log in as admin -> delete category ->
//      assert category not visible in relevant places:
//        - admin manage category table
//        - /categories all-categories page
//        - nav category dropdown (link no longer present)
//      (1 test case per location)
// 4) log in as admin -> delete category -> log out ->
//      log in as regular user -> assert category not visible in /categories
// 5) log in as admin -> delete category that has products ->
//      assert products still exist in the database after category deletion
// 6) log in as admin -> click Delete -> assert confirmation modal appears with Yes/No buttons
// 7) log in as admin -> click Delete -> click No -> assert category is NOT deleted
//      (still in database and still visible in table)


import { test, expect, clearDB } from './fixtures';
import type { Page } from '@playwright/test';
import type { Db, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

// ─────────────────────────────── Constants ───────────────────────────────────

const ADMIN = {
  name:     'Test Admin',
  email:    'admin@test.com',
  password: 'Admin123!',
  phone:    12345678,
  address:  '1 Admin Street',
  answer:   'admin',
  role:     1,
};

const USER = {
  name:     'Test User',
  email:    'user@test.com',
  password: 'User123!',
  phone:    87654321,
  address:  '1 User Street',
  answer:   'user',
  role:     0,
};

// Category created via UI in Suite D tests
// Note: slug is lowercased by the Mongoose schema (lowercase: true) when saved
const NEW_CATEGORY = {
  name: 'Test Category',
  slug: 'test-category',
};

// Pre-seeded category for Suite E / F tests
const SEED_CATEGORY = {
  name: 'Seed Category',
  slug: 'seed-category',
};

// Values used when updating SEED_CATEGORY in Suite E
const UPDATED_CATEGORY = {
  name: 'Updated Seed Category',
  // slugify("Updated Seed Category") → "Updated-Seed-Category"; Mongoose lowercase: true → stored as "updated-seed-category"
  slug: 'updated-seed-category',
};

// ──────────────────────────── Seed helpers ───────────────────────────────────

async function seedAdmin(db: Db): Promise<void> {
  const hash = await bcrypt.hash(ADMIN.password, 10);
  await db.collection('users').insertOne({ ...ADMIN, password: hash });
}

async function seedUser(db: Db): Promise<void> {
  const hash = await bcrypt.hash(USER.password, 10);
  await db.collection('users').insertOne({ ...USER, password: hash });
}

// Inserts a category directly via MongoDB driver (bypasses Mongoose — slug must be pre-lowercased)
async function seedCategory(db: Db, cat: { name: string; slug: string }): Promise<ObjectId> {
  const { insertedId } = await db.collection('categories').insertOne({ ...cat });
  return insertedId;
}

// Inserts a product linked to the given categoryId (used in E-11 and F-6)
async function seedProductForCategory(db: Db, categoryId: ObjectId): Promise<void> {
  await db.collection('products').insertOne({
    name:        'Category Test Product',
    slug:        'Category-Test-Product',
    description: 'Product seeded for category update/delete tests',
    price:       99,
    quantity:    3,
    category:    categoryId,
    shipping:    false,
  });
}

// ─────────────────────────────── Page helpers ────────────────────────────────

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('Enter Your Email').fill(email);
  await page.getByPlaceholder('Enter Your Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.waitForURL('/');
}

async function logout(page: Page): Promise<void> {
  await page.locator('.navbar .nav-item.dropdown').last()
    .locator('.nav-link.dropdown-toggle').click();
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.waitForURL('/login');
}

async function goToManageCategoryPage(page: Page): Promise<void> {
  await page.goto('/dashboard/admin/create-category');
  await expect(page.getByRole('heading', { name: 'Manage Category' })).toBeVisible();
}

// Fills the main (non-modal) category form and submits.
// Using .first() for the Submit button as a precaution (modal Submit is only present when modal is open).
async function createCategoryViaForm(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Enter new category').fill(name);
  await expect(page.getByPlaceholder('Enter new category')).toHaveValue(name);
  await page.getByRole('button', { name: 'Submit' }).first().click();
}

// Opens the edit modal for a given category row and returns the modal locator.
async function openEditModal(page: Page, categoryName: string): Promise<ReturnType<Page['locator']>> {
  await page.locator('tr', { hasText: categoryName })
    .getByRole('button', { name: 'Edit' }).click();
  const modal = page.locator('.ant-modal-content');
  await expect(modal).toBeVisible();
  return modal;
}

// ═════════════════════════════════════════════════════════════════════════════
// Suite D: Create Category (13 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite D: Create Category', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    await loginAs(page, ADMIN.email, ADMIN.password);
  });

  // ── D-1: Success toast ────────────────────────────────────────────────────

  test('D-1: shows success toast after creating category', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);

    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();
  });

  // ── D-2: Saved in database ────────────────────────────────────────────────

  test('D-2: category saved in database with correct name and slug', async ({ page, db }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    const doc = await db.collection('categories').findOne({ name: NEW_CATEGORY.name });
    expect(doc).not.toBeNull();
    // Mongoose schema has lowercase: true on slug — "Test-Category" gets stored as "test-category"
    expect(doc?.slug).toBe(NEW_CATEGORY.slug);
  });

  // ── D-3: Visible in admin manage category table ───────────────────────────

  test('D-3: created category appears in admin manage category table', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    // The page refreshes categories list (getAllCategory) after creation
    await expect(page.locator('tbody').getByText(NEW_CATEGORY.name)).toBeVisible();
  });

  // ── D-4: Link present in nav category dropdown ────────────────────────────

  test('D-4: created category link is present in nav category dropdown', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await page.goto('/');
    // useCategory() hook fetches fresh list — the link should now be in the navbar DOM
    await expect(
      page.locator(`.navbar a[href="/category/${NEW_CATEGORY.slug}"]`)
    ).toBeAttached();
  });

  // ── D-5: Visible on all-categories page ──────────────────────────────────

  test('D-5: created category visible on all-categories page', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await page.goto('/categories');
    await expect(page.getByRole('link', { name: NEW_CATEGORY.name })).toBeVisible();
  });

  // ── D-6: Category browse page renders correctly ───────────────────────────

  test('D-6: category browse page renders with correct heading after creation', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await page.goto(`/category/${NEW_CATEGORY.slug}`);
    await expect(page.getByText(`Category - ${NEW_CATEGORY.name}`)).toBeVisible();
  });

  // ── D-7: Visible to regular user on all-categories page ──────────────────

  test('D-7: created category visible to regular user on all-categories page', async ({ page, db }) => {
    await seedUser(db);

    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto('/categories');
    await expect(page.getByRole('link', { name: NEW_CATEGORY.name })).toBeVisible();
  });

  // ── D-8: Category browse page accessible to regular user ──────────────────

  test('D-8: category browse page accessible to regular user via slug', async ({ page, db }) => {
    await seedUser(db);

    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/category/${NEW_CATEGORY.slug}`);
    await expect(page.getByText(`Category - ${NEW_CATEGORY.name}`)).toBeVisible();
  });

  // ── D-9: New category selectable in product creation form ─────────────────

  test('D-9: newly created category appears as option in product creation form', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    await page.goto('/dashboard/admin/create-product');
    await expect(page.getByRole('heading', { name: 'Create Product' })).toBeVisible();

    // Open ant-select category dropdown
    await page.locator('.ant-select').first().click();
    await expect(
      page.locator('.ant-select-item-option-content', { hasText: NEW_CATEGORY.name })
    ).toBeVisible();
  });

  // ── D-10: Empty name shows error ──────────────────────────────────────────
  // Known Bug: the catch block in handleSubmit (CreateCategory.js) shows a generic
  // "something went wrong in input form" message instead of propagating the backend's
  // specific "Name is required" error. The same class of bug was already fixed in
  // CreateProduct.js and UpdateProduct.js. The catch block should use:
  //   toast.error(error.response?.data?.message || "something went wrong in input form")

  test('D-10: shows error when category name is empty', async ({ page }) => {
    await goToManageCategoryPage(page);
    // Submit without typing anything
    await page.getByRole('button', { name: 'Submit' }).first().click();

    // Backend returns 400 { message: "Name is required" } — should be shown to user
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  // ── D-11: Duplicate name shows appropriate message ────────────────────────
  // Known Bug: when the category already exists, the backend returns
  //   { success: true, message: "Category Already Exists" } at HTTP 200.
  // The frontend checks `if (data?.success)` — which is true — so it shows
  //   toast.success(`${name} is created`) instead of the "Category Already Exists" message.
  // The fix would be to also check data.message (e.g. treat "Category Already Exists" as an error).

  test('D-11: shows "Category Already Exists" message for duplicate category name', async ({ page }) => {
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, NEW_CATEGORY.name);
    await expect(page.getByText(`${NEW_CATEGORY.name} is created`)).toBeVisible();

    // Try to create the same category again
    await createCategoryViaForm(page, NEW_CATEGORY.name);

    await expect(page.getByText('Category Already Exists')).toBeVisible();
  });

  // ── D-12: Long name accepted ──────────────────────────────────────────────

  test('D-12: excessively long category name is accepted (no max-length restriction)', async ({ page }) => {
    const longName = 'C'.repeat(200);
    await goToManageCategoryPage(page);
    await createCategoryViaForm(page, longName);

    // Long names are allowed — category should be created successfully
    await expect(page.locator('tbody').getByText(longName)).toBeVisible();
  });

  // ── D-13: Multiple categories both visible in admin table ─────────────────

  test('D-13: creating two categories — both appear in admin manage category table', async ({ page }) => {
    await goToManageCategoryPage(page);

    await createCategoryViaForm(page, 'Alpha Category');
    await expect(page.getByText('Alpha Category is created')).toBeVisible();

    await createCategoryViaForm(page, 'Beta Category');
    await expect(page.getByText('Beta Category is created')).toBeVisible();

    await expect(page.locator('tbody').getByText('Alpha Category')).toBeVisible();
    await expect(page.locator('tbody').getByText('Beta Category')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// Suite E: Update Category (11 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite E: Update Category', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    await seedCategory(db, SEED_CATEGORY);
    await loginAs(page, ADMIN.email, ADMIN.password);
    await goToManageCategoryPage(page);
  });

  // ── E-1: Success toast ────────────────────────────────────────────────────

  test('E-1: shows success toast after updating category', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await expect(modal.getByPlaceholder('Enter new category')).toHaveValue(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();
  });

  // ── E-2: Database reflects updated name and slug ──────────────────────────

  test('E-2: category updated in database with new name and new slug', async ({ page, db }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    const updated = await db.collection('categories').findOne({ name: UPDATED_CATEGORY.name });
    expect(updated).not.toBeNull();
    expect(updated?.slug).toBe(UPDATED_CATEGORY.slug);

    const old = await db.collection('categories').findOne({ name: SEED_CATEGORY.name });
    expect(old).toBeNull();
  });

  // ── E-3: Admin table shows updated name, old name is gone ────────────────

  test('E-3: admin table shows updated name and old name is removed', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    await expect(page.locator('tbody').getByText(UPDATED_CATEGORY.name, { exact: true })).toBeVisible();
    await expect(page.locator('tbody').getByText(SEED_CATEGORY.name, { exact: true })).not.toBeVisible();
  });

  // ── E-4: All-categories page shows updated name, old is gone ─────────────

  test('E-4: all-categories page shows updated name and old name is gone', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    await page.goto('/categories');
    await expect(page.getByRole('link', { name: UPDATED_CATEGORY.name, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: SEED_CATEGORY.name, exact: true })).not.toBeVisible();
  });

  // ── E-5: Category browse page accessible via new slug ────────────────────

  test('E-5: category browse page accessible via updated slug', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    await page.goto(`/category/${UPDATED_CATEGORY.slug}`);
    await expect(page.getByText(`Category - ${UPDATED_CATEGORY.name}`)).toBeVisible();
  });

  // ── E-6: Updated category selectable in product creation form ────────────

  test('E-6: updated category name selectable in product creation form', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    await page.goto('/dashboard/admin/create-product');
    await expect(page.getByRole('heading', { name: 'Create Product' })).toBeVisible();

    await page.locator('.ant-select').first().click();
    await expect(
      page.locator('.ant-select-item-option-content', { hasText: new RegExp(`^${UPDATED_CATEGORY.name}$`) })
    ).toBeVisible();
    await expect(
      page.locator('.ant-select-item-option-content', { hasText: new RegExp(`^${SEED_CATEGORY.name}$`) })
    ).not.toBeVisible();
  });

  // ── E-7: Updated category visible to regular user ─────────────────────────

  test('E-7: updated category visible to regular user on all-categories page', async ({ page, db }) => {
    await seedUser(db);

    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto('/categories');
    await expect(page.getByRole('link', { name: UPDATED_CATEGORY.name, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: SEED_CATEGORY.name, exact: true })).not.toBeVisible();
  });

  // ── E-8: Edit modal pre-fills current category name ──────────────────────

  test('E-8: edit modal opens with the current category name pre-filled', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);

    // The modal input should be pre-filled with the existing category name
    await expect(modal.getByPlaceholder('Enter new category')).toHaveValue(SEED_CATEGORY.name);
  });

  // ── E-9: Error when updated name is empty ────────────────────────────────
  // Known Bug: the catch block in handleUpdate (CreateCategory.js) shows a generic
  // "Something went wrong" message instead of propagating the backend's
  // specific "Name is required" error. The catch block should use:
  //   toast.error(error.response?.data?.message || "Something went wrong")

  test('E-9: shows error when updated category name is cleared to empty', async ({ page }) => {
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill('');
    await expect(modal.getByPlaceholder('Enter new category')).toHaveValue('');
    await modal.getByRole('button', { name: 'Submit' }).click();

    // Backend returns 400 { message: "Name is required" } — should be shown to user
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  // ── E-10: Long name accepted in update ────────────────────────────────────

  test('E-10: excessively long category name is accepted during update', async ({ page }) => {
    const longName = 'U'.repeat(200);
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(longName);
    await expect(modal.getByPlaceholder('Enter new category')).toHaveValue(longName);
    await modal.getByRole('button', { name: 'Submit' }).click();

    // Long names are allowed — update should succeed
    await expect(page.locator('tbody').getByText(longName)).toBeVisible();
  });

  // ── E-11: Products remain accessible after category name/slug update ──────

  test('E-11: products associated with category remain accessible via new slug after update', async ({ page, db }) => {
    // Seed a product linked to SEED_CATEGORY
    const catDoc = await db.collection('categories').findOne({ name: SEED_CATEGORY.name });
    await seedProductForCategory(db, catDoc!._id);

    // Update the category name (and therefore slug)
    const modal = await openEditModal(page, SEED_CATEGORY.name);
    await modal.getByPlaceholder('Enter new category').fill(UPDATED_CATEGORY.name);
    await modal.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(`${UPDATED_CATEGORY.name} is updated`)).toBeVisible();

    // The product should still appear on the new category browse page
    await page.goto(`/category/${UPDATED_CATEGORY.slug}`);
    await expect(page.getByText('Category Test Product')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// Suite F: Delete Category (8 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite F: Delete Category', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    await seedCategory(db, SEED_CATEGORY);
    await loginAs(page, ADMIN.email, ADMIN.password);
    await goToManageCategoryPage(page);
  });

  // ── F-1: Success toast ────────────────────────────────────────────────────

  test('F-1: shows success toast after deleting category', async ({ page }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();

    await expect(page.getByText('Category deleted successfully')).toBeVisible();
  });

  // ── F-2: Category removed from database ───────────────────────────────────

  test('F-2: category is removed from database after deletion', async ({ page, db }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Category deleted successfully')).toBeVisible();

    const doc = await db.collection('categories').findOne({ name: SEED_CATEGORY.name });
    expect(doc).toBeNull();
  });

  // ── F-3: Not visible in admin table ──────────────────────────────────────

  test('F-3: deleted category is not visible in admin manage category table', async ({ page }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Category deleted successfully')).toBeVisible();

    await expect(page.locator('tbody').getByText(SEED_CATEGORY.name)).not.toBeVisible();
  });

  // ── F-4: Not visible on all-categories page ───────────────────────────────

  test('F-4: deleted category is not visible on all-categories page', async ({ page }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Category deleted successfully')).toBeVisible();

    await page.goto('/categories');
    await expect(page.getByRole('link', { name: SEED_CATEGORY.name })).not.toBeVisible();
  });

  // ── F-5: Not visible in nav dropdown ─────────────────────────────────────

  test('F-5: deleted category link is no longer present in nav dropdown', async ({ page }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Category deleted successfully')).toBeVisible();

    await page.goto('/');
    // The nav link for the deleted category should no longer be in the DOM
    await expect(
      page.locator(`.navbar a[href="/category/${SEED_CATEGORY.slug}"]`)
    ).not.toBeAttached();
  });

  // ── F-6: Products still exist after category deletion ────────────────────

  test('F-6: products associated with deleted category still exist in database', async ({ page, db }) => {
    const catDoc = await db.collection('categories').findOne({ name: SEED_CATEGORY.name });
    await seedProductForCategory(db, catDoc!._id);

    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Category deleted successfully')).toBeVisible();

    // Product record should still be in the database even though its category is deleted
    const product = await db.collection('products').findOne({ name: 'Category Test Product' });
    expect(product).not.toBeNull();
  });

  // ── F-7: Confirmation modal appears ──────────────────────────────────────

  test('F-7: confirmation dialog appears with Yes/No buttons when Delete is clicked', async ({ page }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Are you sure you want to delete this category?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No' })).toBeVisible();
  });

  // ── F-8: Category not deleted when confirmation is cancelled ─────────────

  test('F-8: category is not deleted when confirmation is cancelled (No button)', async ({ page, db }) => {
    await page.locator('tr', { hasText: SEED_CATEGORY.name })
      .getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'No' }).click();

    // Dialog should close
    await expect(page.getByText('Are you sure you want to delete this category?')).not.toBeVisible();

    // Category must still be in the database
    const doc = await db.collection('categories').findOne({ name: SEED_CATEGORY.name });
    expect(doc).not.toBeNull();

    // Category must still appear in the admin table
    await expect(page.locator('tbody').getByText(SEED_CATEGORY.name)).toBeVisible();
  });

});
