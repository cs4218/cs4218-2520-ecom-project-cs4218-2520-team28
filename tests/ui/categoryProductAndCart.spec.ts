// Jian Tao, A0273320R
// AI Assistance: ChatGPT 5.4 Thinking
//
// Prompts used:
// 1. Help me design Playwright UI tests for my assigned flow: home page / categories / product details / add to cart / cart.
// 2. Help me refine selectors, seeded test data, and assertions for multi-page end-to-end user scenarios.
// 3. Help me reorganise the test cases and summarise what is tested.
//
// What is tested:
// - Home page product visibility
// - Home page direct add-to-cart flow
// - Navbar category navigation
// - All Categories page navigation
// - Category page to Product Details navigation
// - Product Details add-to-cart flow
// - Cart persistence after reload
// - Adding multiple products into cart
//
// Approach:
// - Playwright end-to-end black-box UI testing
// - Tests simulate real user navigation across Home, Categories, Product Details, and Cart pages
// - Test data is seeded into the test database before each test for repeatable execution

import { test, expect, clearDB } from "./fixtures";

const ELECTRONICS_CATEGORY = {
  name: "Electronics",
  slug: "electronics",
};

const BOOKS_CATEGORY = {
  name: "Books",
  slug: "books",
};

const FASHION_CATEGORY = {
  name: "Fashion",
  slug: "fashion",
};

const PRODUCT_1 = {
  name: "Jian Tao Playwright Product",
  slug: "Jian-Tao-Playwright-Product",
  description: "Product used for category to cart UI testing",
  price: 199,
  quantity: 10,
};

const PRODUCT_2 = {
  name: "Jian Tao Second Product",
  slug: "Jian-Tao-Second-Product",
  description: "Second product used for multi-item cart UI testing",
  price: 299,
  quantity: 8,
};

const PRODUCT_3 = {
  name: "Books Test Product",
  slug: "Books-Test-Product",
  description: "Book product for category page coverage",
  price: 49,
  quantity: 15,
};

test.describe("Jian Tao UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);

    const electronicsResult = await db.collection("categories").insertOne(ELECTRONICS_CATEGORY);
    const booksResult = await db.collection("categories").insertOne(BOOKS_CATEGORY);
    await db.collection("categories").insertOne(FASHION_CATEGORY);

    await db.collection("products").insertMany([
      {
        ...PRODUCT_1,
        category: electronicsResult.insertedId,
        shipping: false,
      },
      {
        ...PRODUCT_2,
        category: electronicsResult.insertedId,
        shipping: false,
      },
      {
        ...PRODUCT_3,
        category: booksResult.insertedId,
        shipping: false,
      },
    ]);
  });

  test("JT-1: user can see all seeded products on the home page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_2.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_3.name)).toBeVisible();
  });

  test("JT-2: user can add product to cart directly from home page and see it in cart", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();

    const homeProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_1.name),
    }).first();

    await homeProductCard.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
  });

  test("JT-3: user can go from navbar categories to category page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/category/${ELECTRONICS_CATEGORY.slug}$`));
    await expect(page.getByText(`Category - ${ELECTRONICS_CATEGORY.name}`)).toBeVisible();
    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_2.name)).toBeVisible();
  });

  test("JT-4: user can go from home page to all categories page and enter a specific category", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: "All Categories", exact: true }).click();

    await expect(page).toHaveURL(/\/categories$/);

    await expect(page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: BOOKS_CATEGORY.name, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: FASHION_CATEGORY.name, exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/category/${ELECTRONICS_CATEGORY.slug}$`));
    await expect(page.getByText(`Category - ${ELECTRONICS_CATEGORY.name}`)).toBeVisible();
    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_2.name)).toBeVisible();
  });

  test("JT-5: user can go from category page to product details page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    await expect(page.getByText(`Category - ${ELECTRONICS_CATEGORY.name}`)).toBeVisible();
    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();

    const firstProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_1.name),
    }).first();

    await firstProductCard.getByRole("button", { name: /more details/i }).click();

    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_1.slug}$`));
    await expect(page.getByText(`Name : ${PRODUCT_1.name}`)).toBeVisible();
    await expect(page.getByText(`Description : ${PRODUCT_1.description}`)).toBeVisible();
  });

  test("JT-6: user can go from category page to product details, add to cart, and see it in cart", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();

    const firstProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_1.name),
    }).first();

    await firstProductCard.getByRole("button", { name: /more details/i }).click();

    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_1.slug}$`));

    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
  });

  test("JT-7: product stays in cart after reload", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    const firstProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_1.name),
    }).first();

    await firstProductCard.getByRole("button", { name: /more details/i }).click();
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
  });

  test("JT-8: user can add two products from the same category into cart and see both in cart", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: "Categories", exact: true }).click();
    await page.getByRole("link", { name: ELECTRONICS_CATEGORY.name, exact: true }).click();

    const firstProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_1.name),
    }).first();

    await firstProductCard.getByRole("button", { name: /more details/i }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_1.slug}$`));
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto(`/category/${ELECTRONICS_CATEGORY.slug}`, { waitUntil: "domcontentloaded" });

    const secondProductCard = page.locator(".card").filter({
      has: page.getByText(PRODUCT_2.name),
    }).first();

    await secondProductCard.getByRole("button", { name: /more details/i }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_2.slug}$`));
    await page.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_1.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_2.name)).toBeVisible();
  });
});