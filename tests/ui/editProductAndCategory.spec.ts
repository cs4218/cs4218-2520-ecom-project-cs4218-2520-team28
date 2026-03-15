// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)


// Instructions for AI
// Plan for testing of ui test involving create product/ category
// Rules: Start with log in page

// Must include these test cases:
// Suite A: Create Product (27 tests)
// 1) log in as admin -> go to create product page -> 
//      create product with valid details -> assert success message (test with and without photo)
// 2) log in as admin -> go to create product page ->
//      create product with valid details -> assert product is created in database with correct details (test with and without photo)
// 3) log in as admin -> go to create product page -> 
//      create product with valid details -> 
//      navigate to all possible place where it can be seen (home page, category page, product page product details page) -> 
//      assert product is visible with correct details (test with and without photo) (1 test case for each location)
// 4) log in as admin -> go to create product page ->
//      create product with valid details -> log out ->
//      log in as normal user -> assert product is visible in all valid locations with correct details (test with and without photo) (1 test case for each location)
// 5) log in as admin -> go to create product page -> 
//      create product with missing required fields -> assert error message 
//      (tests all fields missing and pairwise testing of missing fields and 1 case of triplet and all missing)
// 6) log in as admin -> go to create product page -> 
//      create product with invalid field values (negative price, non-numeric price, excessively long name/description) -> assert error message
//      (tests all fields invalid and pairwise testing of invalid fields and 1 case of triplet and all invalid)
//
// Suite B: Update Product (26 tests)
// 1) log in as admin -> go to update product page for existing product ->
//      update product with valid details -> assert success message (test with and without photo)
// 2) log in as admin -> go to update product page for existing product ->
//      update product with valid details -> assert product is updated in database with correct details (test with and without photo)
// 3) log in as admin -> go to update product page for existing product ->
//      update product with valid details -> 
//      navigate to all possible place where it can be seen (home page, category page, product page product details page) ->
//      assert product is visible with correct details (test with and without photo) (1 test case for each location)
// 4) log in as admin -> go to update product page for existing product ->
//      update product with valid details -> log out ->
//      log in as normal user -> assert product is visible in all valid locations with correct details (test with and without photo) (1 test case for each location)
// 5) log in as admin -> go to update product page for existing product ->
//      update product with missing required fields -> assert error message 
//      (tests all fields missing and pairwise testing of missing fields and 1 case of triplet and all missing)
// 6) log in as admin -> go to update product page for existing product ->
//      update product with invalid field values (negative price, non-numeric price, excessively long name/description) -> assert error message
//      (tests all fields invalid and pairwise testing of invalid fields and 1 case of triplet and all invalid)
//
// Suite C: Delete Product (10 tests)
// 1) log in as admin -> go to update product page for existing product ->
//      delete product -> assert success message
// 2) log in as admin -> go to update product page for existing product ->
//      delete product -> assert product is deleted in database
// 3) log in as admin -> go to update product page for existing product ->
//      delete product -> 
//      navigate to all possible place where it can be seen (home page, category page, product page product details page) ->
//      assert product is not visible (1 test case for each location)
// 4) log in as admin -> go to update product page for existing product ->
//      delete product -> log out ->
//      log in as normal user -> assert product is not visible in all valid locations (1 test case for each location)
// 5) log in as admin -> go to update product page for existing product ->
//      delete product -> assert confirmation modal appears and product is not deleted if deletion is cancelled 
//          + check one other location to confirm not deleted


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

const CATEGORY = { name: 'Electronics', slug: 'electronics' };

// Product created by the UI in Suite A
const NEW_PRODUCT = {
  name:        'Playwright Test Product',
  // slugify("Playwright Test Product") with default options
  slug:        'Playwright-Test-Product',
  description: 'A product created during Playwright testing',
  price:       '149',
  quantity:    '25',
};

// Product pre-seeded for Suite B / C
const SEED_PRODUCT = {
  name:        'Seed Product',
  slug:        'Seed-Product',
  description: 'Pre-seeded product for update/delete tests',
  price:       50,
  quantity:    5,
};

// Values used when updating SEED_PRODUCT in Suite B
const UPDATED_PRODUCT = {
  name:        'Updated Playwright Product',
  // slugify("Updated Playwright Product")
  slug:        'Updated-Playwright-Product',
  description: 'Updated description for Playwright testing',
  price:       '299',
  quantity:    '15',
};

// Smallest valid PNG (1x1 pixel) — no disk file required
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// ──────────────────────────── Seed helpers ───────────────────────────────────

async function seedAdmin(db: Db): Promise<void> {
  const hash = await bcrypt.hash(ADMIN.password, 10);
  await db.collection('users').insertOne({ ...ADMIN, password: hash });
}

async function seedUser(db: Db): Promise<void> {
  const hash = await bcrypt.hash(USER.password, 10);
  await db.collection('users').insertOne({ ...USER, password: hash });
}

async function seedCategory(db: Db): Promise<ObjectId> {
  const { insertedId } = await db.collection('categories').insertOne({ ...CATEGORY });
  return insertedId;
}

async function seedProduct(db: Db, categoryId: ObjectId): Promise<ObjectId> {
  const { insertedId } = await db.collection('products').insertOne({
    ...SEED_PRODUCT,
    category: categoryId,
    shipping: false,
  });
  return insertedId;
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

async function goToCreateProductPage(page: Page): Promise<void> {
  await page.goto('/dashboard/admin/create-product');
  await expect(page.getByRole('heading', { name: 'Create Product' })).toBeVisible();
}

async function goToUpdateProductPage(page: Page, slug: string): Promise<void> {
  await page.goto(`/dashboard/admin/product/${slug}`);
  await expect(page.getByRole('heading', { name: 'Update Product' })).toBeVisible();
  // Wait for product data to be loaded into the form (useEffect + API call completes)
  await expect(page.getByPlaceholder('write a name')).not.toHaveValue('');
}

async function selectAntdOption(page: Page, select: ReturnType<Page['locator']>, option: string): Promise<void> {
  await select.click();
  await page.locator('.ant-select-item-option-content', { hasText: option }).click();
}

interface FormValues {
  name?:        string;
  description?: string;
  price?:       string;
  quantity?:    string;
  category?:    string;
  photo?:       boolean;
}

async function fillProductForm(page: Page, values: FormValues): Promise<void> {
  if (values.name !== undefined) {
    await page.getByPlaceholder('write a name').fill(values.name);
    await expect(page.getByPlaceholder('write a name')).toHaveValue(values.name);
  }
  if (values.description !== undefined) {
    await page.getByPlaceholder('write a description').fill(values.description);
    await expect(page.getByPlaceholder('write a description')).toHaveValue(values.description);
  }
  if (values.price !== undefined) {
    // Triple-click to select all then type, ensuring React's onChange fires correctly
    await page.getByPlaceholder('write a Price').click({ clickCount: 3 });
    await page.getByPlaceholder('write a Price').fill(values.price);
    await expect(page.getByPlaceholder('write a Price')).toHaveValue(values.price);
  }
  if (values.quantity !== undefined) {
    await page.getByPlaceholder('write a quantity').click({ clickCount: 3 });
    await page.getByPlaceholder('write a quantity').fill(values.quantity);
    await expect(page.getByPlaceholder('write a quantity')).toHaveValue(values.quantity);
  }
  if (values.category !== undefined) {
    await selectAntdOption(page, page.locator('.ant-select').first(), values.category);
  }
  if (values.photo) {
    await page.locator('input[type="file"]').setInputFiles({
      name:     'test-photo.png',
      mimeType: 'image/png',
      buffer:   TINY_PNG,
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Suite A: Create Product (27 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite A: Create Product', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    await seedCategory(db);
    await loginAs(page, ADMIN.email, ADMIN.password);
  });

  // ── A-1 / A-2: Success toast ──────────────────────────────────────────────

  test('A-1: shows success toast after creating product without photo', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Product Created Successfully')).toBeVisible();
  });

  test('A-2: shows success toast after creating product with photo', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Product Created Successfully')).toBeVisible();
  });

  // ── A-3 / A-4: Product saved in database ─────────────────────────────────

  test('A-3: product is saved in database with correct details (no photo)', async ({ page, db }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    const doc = await db.collection('products').findOne({ name: NEW_PRODUCT.name });
    expect(doc).not.toBeNull();
    expect(doc?.description).toBe(NEW_PRODUCT.description);
    expect(doc?.price).toBe(Number(NEW_PRODUCT.price));
    expect(doc?.quantity).toBe(Number(NEW_PRODUCT.quantity));
    expect(doc?.photo?.data).toBeUndefined();
  });

  test('A-4: product is saved in database with photo data when photo is uploaded', async ({ page, db }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    const doc = await db.collection('products').findOne({ name: NEW_PRODUCT.name });
    expect(doc).not.toBeNull();
    expect(doc?.photo?.data).toBeDefined();
    expect(doc?.photo?.contentType).toBe('image/png');
  });

  // ── A-5 / A-6: Visible on home page ──────────────────────────────────────

  test('A-5: created product is visible on home page (no photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  test('A-6: created product is visible on home page (with photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]').first()).toBeVisible();
  });

  // ── A-7 / A-8: Visible on category page ──────────────────────────────────

  test('A-7: created product is visible on category page (no photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  test('A-8: created product is visible on category page (with photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  // ── A-9: Visible on admin products page ──────────────────────────────────

  test('A-9: created product is visible on admin products page', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // App navigates to /dashboard/admin/products on success
    await page.waitForURL('/dashboard/admin/products');
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  // ── A-10 / A-11: Visible on product details page ─────────────────────────

  test('A-10: created product shows correct details on product details page (no photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto(`/product/${NEW_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${NEW_PRODUCT.name}`)).toBeVisible();
    await expect(page.getByText(`Description : ${NEW_PRODUCT.description}`)).toBeVisible();
  });

  test('A-11: created product shows photo on product details page (with photo)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await page.goto(`/product/${NEW_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${NEW_PRODUCT.name}`)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]')).toBeVisible();
  });

  // ── A-12..A-14: Product visible to regular user ───────────────────────────

  test('A-12: created product is visible to regular user on home page', async ({ page, db }) => {
    await seedUser(db);

    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  test('A-13: created product is visible to regular user on category page', async ({ page, db }) => {
    await seedUser(db);

    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(NEW_PRODUCT.name)).toBeVisible();
  });

  test('A-14: created product shows correct details to regular user on product details page (with photo)', async ({ page, db }) => {
    await seedUser(db);

    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
      photo:       true,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();
    await expect(page.getByText('Product Created Successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/product/${NEW_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${NEW_PRODUCT.name}`)).toBeVisible();
    await expect(page.getByText(`Description : ${NEW_PRODUCT.description}`)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]')).toBeVisible();
  });

  // ── A-15..A-23: Missing required fields ────────────────────────────────────

  test('A-15: shows error when all required fields are missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('A-16: shows "Name is Required" when only name is missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('A-17: shows "Description is Required" when only description is missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:     NEW_PRODUCT.name,
      price:    NEW_PRODUCT.price,
      quantity: NEW_PRODUCT.quantity,
      category: CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Description is Required')).toBeVisible();
  });

  test('A-18: shows "Price is Required" when only price is missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Price is Required')).toBeVisible();
  });

  test('A-19: shows "Category is Required" when only category is missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Category is Required')).toBeVisible();
  });

  test('A-20: shows "Quantity is Required" when only quantity is missing', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Quantity is Required')).toBeVisible();
  });

  test('A-21: shows "Name is Required" when name and price are both missing (pairwise)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      description: NEW_PRODUCT.description,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('A-22: shows "Description is Required" when description and category are both missing (pairwise)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:     NEW_PRODUCT.name,
      price:    NEW_PRODUCT.price,
      quantity: NEW_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Description is Required')).toBeVisible();
  });

  test('A-23: shows "Name is Required" when name, description and quantity are missing (triplet)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      price:    NEW_PRODUCT.price,
      category: CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  // ── A-24..A-27: Invalid field values ─────────────────────────────────────

  test('A-24: shows error for negative price', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       '-1',
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('A-25: shows error for zero price', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       '0',
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('A-26: shows error for negative price and negative quantity (pairwise invalid)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        NEW_PRODUCT.name,
      description: NEW_PRODUCT.description,
      price:       '-1',
      quantity:    '-5',
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // Price is checked before quantity in the switch — first error wins
    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('A-27: excessively long name is accepted (no max-length restriction)', async ({ page }) => {
    await goToCreateProductPage(page);
    await fillProductForm(page, {
      name:        'A'.repeat(501),
      description: NEW_PRODUCT.description,
      price:       NEW_PRODUCT.price,
      quantity:    NEW_PRODUCT.quantity,
      category:    CATEGORY.name,
    });
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // Long names are allowed — product should be created successfully
    await expect(page.getByText('Product Created Successfully')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// Suite B: Update Product (26 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite B: Update Product', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    const categoryId = await seedCategory(db);
    await seedProduct(db, categoryId);
    await loginAs(page, ADMIN.email, ADMIN.password);
    await goToUpdateProductPage(page, SEED_PRODUCT.slug);
  });

  // ── B-1 / B-2: Success toast ──────────────────────────────────────────────

  test('B-1: shows success toast after updating product without new photo', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Product updated successfully')).toBeVisible();
  });

  test('B-2: shows success toast after updating product with new photo', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Product updated successfully')).toBeVisible();
  });

  // ── B-3 / B-4: Database reflects updated values ───────────────────────────

  test('B-3: product is updated in database with correct details (no new photo)', async ({ page, db }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    const doc = await db.collection('products').findOne({ name: UPDATED_PRODUCT.name });
    expect(doc).not.toBeNull();
    expect(doc?.description).toBe(UPDATED_PRODUCT.description);
    expect(doc?.price).toBe(Number(UPDATED_PRODUCT.price));
    expect(doc?.quantity).toBe(Number(UPDATED_PRODUCT.quantity));

    const old = await db.collection('products').findOne({ name: SEED_PRODUCT.name });
    expect(old).toBeNull();
  });

  test('B-4: product is updated in database with photo data when new photo is uploaded', async ({ page, db }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    const doc = await db.collection('products').findOne({ name: UPDATED_PRODUCT.name });
    expect(doc).not.toBeNull();
    expect(doc?.photo?.data).toBeDefined();
    expect(doc?.photo?.contentType).toBe('image/png');
  });

  // ── B-5 / B-6: Visible on home page ──────────────────────────────────────

  test('B-5: updated product is visible on home page (no new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('B-6: updated product is visible on home page (with new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto('/');
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]').first()).toBeVisible();
  });

  // ── B-7 / B-8: Visible on category page ──────────────────────────────────

  test('B-7: updated product is visible on category page (no new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('B-8: updated product is visible on category page (with new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
  });

  // ── B-9: Visible on admin products page ──────────────────────────────────

  test('B-9: updated product is visible on admin products page', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    // App navigates to /dashboard/admin/products on success
    await page.waitForURL('/dashboard/admin/products');
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  // ── B-10 / B-11: Visible on product details page ─────────────────────────

  test('B-10: updated product shows correct details on product details page (no new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto(`/product/${UPDATED_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${UPDATED_PRODUCT.name}`)).toBeVisible();
    await expect(page.getByText(`Description : ${UPDATED_PRODUCT.description}`)).toBeVisible();
  });

  test('B-11: updated product shows photo on product details page (with new photo)', async ({ page }) => {
    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await page.goto(`/product/${UPDATED_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${UPDATED_PRODUCT.name}`)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]')).toBeVisible();
  });

  // ── B-12..B-14: Updated product visible to regular user ───────────────────

  test('B-12: updated product is visible to regular user on home page', async ({ page, db }) => {
    await seedUser(db);

    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('B-13: updated product is visible to regular user on category page', async ({ page, db }) => {
    await seedUser(db);

    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(UPDATED_PRODUCT.name)).toBeVisible();
  });

  test('B-14: updated product shows correct details to regular user on product details page (with photo)', async ({ page, db }) => {
    await seedUser(db);

    await fillProductForm(page, {
      name:        UPDATED_PRODUCT.name,
      description: UPDATED_PRODUCT.description,
      price:       UPDATED_PRODUCT.price,
      quantity:    UPDATED_PRODUCT.quantity,
      photo:       true,
    });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/product/${UPDATED_PRODUCT.slug}`);
    await expect(page.getByText(`Name : ${UPDATED_PRODUCT.name}`)).toBeVisible();
    await expect(page.getByText(`Description : ${UPDATED_PRODUCT.description}`)).toBeVisible();
    await expect(page.locator('img[src*="product-photo"]')).toBeVisible();
  });

  // ── B-15..B-22: Missing / cleared required fields ─────────────────────────

  test('B-15: shows error when all clearable required fields are empty', async ({ page }) => {
    await fillProductForm(page, { name: '', description: '', price: '', quantity: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('B-16: shows "Name is Required" when name is cleared', async ({ page }) => {
    await fillProductForm(page, { name: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('B-17: shows "Description is Required" when description is cleared', async ({ page }) => {
    await fillProductForm(page, { description: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Description is Required')).toBeVisible();
  });

  test('B-18: shows "Price is Required" when price is cleared', async ({ page }) => {
    await fillProductForm(page, { price: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Price is Required')).toBeVisible();
  });

  test('B-19: shows "Quantity is Required" when quantity is cleared', async ({ page }) => {
    await fillProductForm(page, { quantity: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Quantity is Required')).toBeVisible();
  });

  test('B-20: shows "Name is Required" when name and price are both cleared (pairwise)', async ({ page }) => {
    await fillProductForm(page, { name: '', price: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  test('B-21: shows "Description is Required" when description and quantity are cleared (pairwise)', async ({ page }) => {
    await fillProductForm(page, { description: '', quantity: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Description is Required')).toBeVisible();
  });

  test('B-22: shows "Name is Required" when name, description and quantity are cleared (triplet)', async ({ page }) => {
    await fillProductForm(page, { name: '', description: '', quantity: '' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Name is Required')).toBeVisible();
  });

  // ── B-23..B-26: Invalid field values ─────────────────────────────────────

  test('B-23: shows error for negative price during update', async ({ page }) => {
    await fillProductForm(page, { price: '-1' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('B-24: shows error for zero price during update', async ({ page }) => {
    await fillProductForm(page, { price: '0' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('B-25: shows error for negative price and negative quantity (pairwise invalid)', async ({ page }) => {
    await fillProductForm(page, { price: '-1', quantity: '-5' });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    // Price is checked before quantity in the switch — first error wins
    await expect(page.getByText('Price must be a positive number')).toBeVisible();
  });

  test('B-26: excessively long name is accepted during update (no max-length restriction)', async ({ page }) => {
    await fillProductForm(page, { name: 'A'.repeat(501) });
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    // Long names are allowed — product should be updated successfully
    await expect(page.getByText('Product updated successfully')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// Suite C: Delete Product (10 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Suite C: Delete Product', () => {

  test.beforeEach(async ({ page, db }) => {
    await clearDB(db);
    await seedAdmin(db);
    const categoryId = await seedCategory(db);
    await seedProduct(db, categoryId);
    await loginAs(page, ADMIN.email, ADMIN.password);
    await goToUpdateProductPage(page, SEED_PRODUCT.slug);
  });

  // ── C-1: Success toast ────────────────────────────────────────────────────

  test('C-1: shows success toast after deleting product', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();

    await expect(page.getByText('Product deleted successfully')).toBeVisible();
  });

  // ── C-2: Product removed from database ───────────────────────────────────

  test('C-2: product is removed from database after deletion', async ({ page, db }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Product deleted successfully')).toBeVisible();

    const doc = await db.collection('products').findOne({ name: SEED_PRODUCT.name });
    expect(doc).toBeNull();
  });

  // ── C-3..C-6: Deleted product not visible in any location (as admin) ──────

  test('C-3: deleted product is not visible on home page', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('/dashboard/admin/products');

    await page.goto('/');
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('C-4: deleted product is not visible on category page', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('/dashboard/admin/products');

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('C-5: deleted product is not visible on admin products page', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();

    await page.waitForURL('/dashboard/admin/products');
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('C-6: deleted product details page renders without the product name', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForURL('/dashboard/admin/products');

    await page.goto(`/product/${SEED_PRODUCT.slug}`);
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  // ── C-7 / C-8: Deleted product not visible to regular user ───────────────

  test('C-7: deleted product is not visible to regular user on home page', async ({ page, db }) => {
    await seedUser(db);

    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Product deleted successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  test('C-8: deleted product is not visible to regular user on category page', async ({ page, db }) => {
    await seedUser(db);

    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'Yes' }).click();
    await expect(page.getByText('Product deleted successfully')).toBeVisible();

    await logout(page);
    await loginAs(page, USER.email, USER.password);

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(SEED_PRODUCT.name)).not.toBeVisible();
  });

  // ── C-9 / C-10: Confirmation modal and cancellation ──────────────────────

  test('C-9: confirmation dialog appears with Yes/No buttons when DELETE PRODUCT is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();

    await expect(page.getByText('Are you sure you want to delete this product?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No' })).toBeVisible();
  });

  test('C-10: product is not deleted when confirmation is cancelled (No button)', async ({ page, db }) => {
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();
    await page.getByRole('button', { name: 'No' }).click();

    // Dialog should close
    await expect(page.getByText('Are you sure you want to delete this product?')).not.toBeVisible();

    // Product must still be in the database
    const doc = await db.collection('products').findOne({ name: SEED_PRODUCT.name });
    expect(doc).not.toBeNull();

    // Product must still appear on the admin products page
    await page.goto('/dashboard/admin/products');
    await expect(page.getByText(SEED_PRODUCT.name)).toBeVisible();
  });

});

