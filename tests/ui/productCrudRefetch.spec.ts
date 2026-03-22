// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)

import { test, expect, clearDB } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Db, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

const ADMIN = {
  name: "UI Admin",
  email: "ui-admin@test.com",
  password: "Admin123!",
  phone: 12345678,
  address: "1 Admin Street",
  answer: "admin",
  role: 1,
};

const CATEGORY = {
  name: "Electronics",
  slug: "electronics",
};

const SEEDED_PRODUCT = {
  name: "Seed Refetch Product",
  slug: "Seed-Refetch-Product",
  description: "Seeded product for update/delete route-hop checks",
  price: 120,
  quantity: 8,
};

async function seedAdmin(db: Db): Promise<void> {
  const hash = await bcrypt.hash(ADMIN.password, 10);
  await db.collection("users").insertOne({ ...ADMIN, password: hash });
}

async function seedCategory(db: Db): Promise<ObjectId> {
  const { insertedId } = await db.collection("categories").insertOne({ ...CATEGORY });
  return insertedId;
}

async function seedProduct(db: Db, categoryId: ObjectId): Promise<ObjectId> {
  const { insertedId } = await db.collection("products").insertOne({
    ...SEEDED_PRODUCT,
    category: categoryId,
    shipping: false,
  });
  return insertedId;
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email").fill(ADMIN.email);
  await page.getByPlaceholder("Enter Your Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL("/");
}

async function selectAntdOption(page: Page, selectIndex: number, optionText: string): Promise<void> {
  const select = page.locator(".ant-select").nth(selectIndex);
  await select.click();
  await page.locator(".ant-select-item-option-content", { hasText: optionText }).first().click();
}

async function createProductViaAdminUI(
  page: Page,
  values: { name: string; description: string; price: string; quantity: string; categoryName: string }
): Promise<void> {
  // Exercise the real create-product UI (no API mocking) to keep this as black-box E2E coverage.
  await page.goto("/dashboard/admin/create-product");
  await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

  await page.getByPlaceholder("write a name").fill(values.name);
  await page.getByPlaceholder("write a description").fill(values.description);
  await page.getByPlaceholder("write a Price").fill(values.price);
  await page.getByPlaceholder("write a quantity").fill(values.quantity);
  await selectAntdOption(page, 0, values.categoryName);
  await selectAntdOption(page, 1, "No");

  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
  await page.waitForURL("/dashboard/admin/products");
}

async function updateProductViaAdminUI(
  page: Page,
  productParam: string,
  values: { name: string; description: string; price: string; quantity: string; categoryName: string }
): Promise<void> {
  // Update page route expects the same param shape used by backend update endpoint (:pid).
  await page.goto(`/dashboard/admin/product/${productParam}`);
  await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();
  await expect(page.getByPlaceholder("write a name")).not.toHaveValue("");

  await page.getByPlaceholder("write a name").fill(values.name);
  await page.getByPlaceholder("write a description").fill(values.description);
  await page.getByPlaceholder("write a Price").click({ clickCount: 3 });
  await page.getByPlaceholder("write a Price").fill(values.price);
  await page.getByPlaceholder("write a quantity").click({ clickCount: 3 });
  await page.getByPlaceholder("write a quantity").fill(values.quantity);
  await selectAntdOption(page, 0, values.categoryName);

  await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
  await page.waitForURL("/dashboard/admin/products");
}

async function deleteProductViaAdminUI(page: Page, productParam: string): Promise<void> {
  // Wait for form hydration before delete to avoid racing the initial product fetch.
  await page.goto(`/dashboard/admin/product/${productParam}`);
  await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();
  await expect(page.getByPlaceholder("write a name")).not.toHaveValue("");

  await page.getByRole("button", { name: "DELETE PRODUCT" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.waitForURL("/dashboard/admin/products");
}

test.describe("Product CRUD route refetch and rerender", () => {
  test.setTimeout(45_000);

  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    await seedAdmin(db);
    await seedCategory(db);
  });

  // Chi Thanh, A0276229W - C-1: Verifies newly created product is visible across admin list, home, category, and details routes.
  test("create product then visible across pages after route hops", async ({ page, db }) => {
    const createdName = "UI Created Refetch Product";
    const createdDescription = "Created from Playwright and checked across routes";

    await loginAsAdmin(page);

    await createProductViaAdminUI(page, {
      name: createdName,
      description: createdDescription,
      price: "149",
      quantity: "12",
      categoryName: CATEGORY.name,
    });

    // Admin list is the immediate post-create route; this confirms action success and initial rerender.
    await expect(page.getByText(createdName)).toBeVisible();

    // Cross-page checks verify data is fetched/rendered consistently outside the originating page.
    await page.goto("/");
    await expect(page.getByText(createdName).first()).toBeVisible();

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(createdName).first()).toBeVisible();

    const createdDoc = await db.collection("products").findOne({ name: createdName });
    expect(createdDoc).not.toBeNull();

    // Product details fetches by backend product id in this app's current implementation.
    await page.goto(`/product/${createdDoc?._id}`);
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByText(`Name : ${createdName}`)).toBeVisible();
    await expect(page.getByText(`Description : ${createdDescription}`)).toBeVisible();

    // Route-hop again to assert state remains consistent after additional navigation.
    await page.goto("/");
    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(createdName).first()).toBeVisible();
  });

  // Chi Thanh, A0276229W - C-2: Verifies product updates propagate across all key routes and replace old values.
  test("update product then rerenders new values across pages after navigation", async ({ page, db }) => {
    const seededCategory = await db.collection("categories").findOne({ slug: CATEGORY.slug });
    expect(seededCategory?._id).toBeDefined();
    const categoryId = seededCategory!._id as ObjectId;
    await seedProduct(db, categoryId);

    const updatedName = "UI Updated Refetch Product";
    const updatedDescription = "Updated by admin and validated through multiple routes";

    await loginAsAdmin(page);

    const seededProduct = await db.collection("products").findOne({ slug: SEEDED_PRODUCT.slug });
    expect(seededProduct?._id).toBeDefined();

    await updateProductViaAdminUI(page, String(seededProduct!._id), {
      name: updatedName,
      description: updatedDescription,
      price: "299",
      quantity: "20",
      categoryName: CATEGORY.name,
    });

    // Assert replacement, not just presence: old name should disappear where lists rerender.
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByText(updatedName).first()).toBeVisible();
    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(updatedName).first()).toBeVisible();

    const updatedDoc = await db.collection("products").findOne({ name: updatedName });
    expect(updatedDoc).not.toBeNull();

    // Details page must reflect updated values after the update flow.
    await page.goto(`/product/${updatedDoc?._id}`);
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByText(`Name : ${updatedName}`)).toBeVisible();
    await expect(page.getByText(`Description : ${updatedDescription}`)).toBeVisible();
    await expect(page.getByText(`Name : ${SEEDED_PRODUCT.name}`)).toHaveCount(0);

    await page.goto("/");
    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(updatedName).first()).toBeVisible();
  });

  // Chi Thanh, A0276229W - C-3: Verifies deleted product remains absent across list and details routes after route hops.
  test("delete product then remains absent across pages after route hops", async ({ page, db }) => {
    const seededCategory = await db.collection("categories").findOne({ slug: CATEGORY.slug });
    expect(seededCategory?._id).toBeDefined();
    const categoryId = seededCategory!._id as ObjectId;
    await seedProduct(db, categoryId);

    await loginAsAdmin(page);

    const seededProduct = await db.collection("products").findOne({ slug: SEEDED_PRODUCT.slug });
    expect(seededProduct?._id).toBeDefined();

    await deleteProductViaAdminUI(page, String(seededProduct!._id));

    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);

    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);

    // Validate hard deletion in persistence layer, then assert absence across user-visible routes.
    const deletedDoc = await db.collection("products").findOne({ slug: SEEDED_PRODUCT.slug });
    expect(deletedDoc).toBeNull();

    await page.goto(`/product/${seededProduct!._id}`);
    await expect(page.getByText(`Name : ${SEEDED_PRODUCT.name}`)).toHaveCount(0);

    await page.goto("/");
    await page.goto(`/category/${CATEGORY.slug}`);
    await expect(page.getByText(SEEDED_PRODUCT.name)).toHaveCount(0);
  });
});

test.describe("Header cart count (without cart page navigation)", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const categoryId = await seedCategory(db);
    await seedProduct(db, categoryId);
  });

  // Chi Thanh, A0276229W - C-4: Verifies add-to-cart updates header badge count without requiring navigation to cart page.
  test("adds to cart from Home and updates header badge count without opening cart page", async ({ page }) => {
    await page.goto("/");

    // Requirement-specific check: verify header count increments, but intentionally never navigate to /cart.
    const badge = page.locator(".ant-badge-count").first();
    await expect(badge).toContainText("0");

    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(badge).toContainText("1");
    await expect(page).not.toHaveURL(/\/cart$/);
  });
});
