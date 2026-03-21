// Jian Tao, A0273320R
//
// AI Assistance: ChatGPT (guidance and refinement only)
//
// Brief prompts used:
// 1. Review my Playwright checkout and orders UI tests for redundancy, coverage, and flaky cases.
// 2. Suggest an additional UI test for successful checkout leading to the orders page.
// 3. Help refine assertions for cart, checkout eligibility, payment flow, and orders page rendering.
//
// Testing approach:
// - UI testing with Playwright using seeded database data for deterministic user, product, cart, and order scenarios.
// - Scenario-based coverage of key user flows from guest checkout blocking, logged-in checkout readiness, cart updates,
//   payment attempts, and navigation to the user orders page.
// - Focused on validating observable frontend behaviour and page flow rather than internal implementation details.
//
// What is tested:
// JT-C1: guest user with cart item is prompted to login before checkout
// JT-C2: logged-in user without address cannot proceed to checkout
// JT-C3: logged-in user with address can view cart summary and checkout section
// JT-C4: user can remove an item from cart before checkout
// JT-C5: removing one duplicate cart item keeps the remaining duplicate
// JT-C6: logged-in user can open dashboard orders page from dashboard menu
// JT-C7: orders page shows seeded order details correctly
// JT-C8: checkout-ready user can see payment section on cart page
// JT-C9: clicking make payment without completing payment details keeps user on cart page
// JT-C10: successful payment redirects user to orders page
// JT-C11: user can revisit orders page and still see seeded purchased item
// JT-C12: payment is blocked when CVV is missing
// JT-C13: payment is blocked when expiry is missing
// JT-C14: payment is blocked when card number is missing
// JT-C15: payment is blocked when card number is invalid
// JT-C16: payment is blocked when expiry is invalid
// JT-C17: successful checkout shows the correct purchased item count on the orders page

import { test, expect, clearDB } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Db, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

// ─────────────────────────────── Constants ───────────────────────────────────

const CATEGORY = {
  name: "Electronics",
  slug: "electronics",
};

const PRODUCT = {
  name: "Checkout Test Product",
  slug: "Checkout-Test-Product",
  description: "Product used for checkout and orders UI testing",
  price: 199,
  quantity: 10,
};

const USER_NO_ADDRESS = {
  name: "Checkout User No Address",
  email: "checkout-no-address@test.com",
  password: "User123!",
  phone: 87654321,
  address: "",
  answer: "user",
  role: 0,
};

const USER_WITH_ADDRESS = {
  name: "Checkout User",
  email: "checkout-user@test.com",
  password: "User123!",
  phone: 87654321,
  address: "123 Test Street",
  answer: "user",
  role: 0,
};

// ─────────────────────────────── Helpers ─────────────────────────────────────

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

async function seedCategory(db: Db): Promise<ObjectId> {
  const { insertedId } = await db.collection("categories").insertOne(CATEGORY);
  return insertedId;
}

async function seedProduct(db: Db, categoryId: ObjectId): Promise<ObjectId> {
  const { insertedId } = await db.collection("products").insertOne({
    ...PRODUCT,
    category: categoryId,
    shipping: false,
  });
  return insertedId;
}

async function seedUser(db: Db, user: typeof USER_WITH_ADDRESS): Promise<ObjectId> {
  const hash = await bcrypt.hash(user.password, 10);
  const { insertedId } = await db.collection("users").insertOne({
    ...user,
    password: hash,
  });
  return insertedId;
}

async function seedOrder(
  db: Db,
  buyerId: ObjectId,
  productId: ObjectId,
  status = "Processing",
  paymentSuccess = true
): Promise<void> {
  await db.collection("orders").insertOne({
    products: [productId],
    payment: { success: paymentSuccess },
    buyer: buyerId,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function addProductToCartFromHome(page: Page, productName: string): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(productName)).toBeVisible();

  const productCard = page.locator(".card").filter({
    has: page.getByText(productName),
  }).first();

  await productCard.getByRole("button", { name: /add to cart/i }).click();
}

async function goToCart(page: Page): Promise<void> {
  await page.goto("/cart", { waitUntil: "domcontentloaded" });
}

async function openCardPaymentSection(page: Page): Promise<void> {
  const payingWithCardButton = page.getByRole("button", { name: /paying with card/i });
  if (await payingWithCardButton.count()) {
    await payingWithCardButton.click();
  }

  await expect(page.locator('iframe[name="braintree-hosted-field-number"]')).toBeAttached();
  await expect(page.locator('iframe[name="braintree-hosted-field-expirationDate"]')).toBeAttached();
  await expect(page.locator('iframe[name="braintree-hosted-field-cvv"]')).toBeAttached();
}

async function enterBraintreeFields(
  page: Page,
  {
    cardNumber,
    expiry,
    cvv,
  }: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  }
): Promise<void> {
  await openCardPaymentSection(page);

  const cardNumberBox = page
    .locator('iframe[name="braintree-hosted-field-number"]')
    .contentFrame()
    .getByRole("textbox", { name: /credit card number/i });

  const expiryBox = page
    .locator('iframe[name="braintree-hosted-field-expirationDate"]')
    .contentFrame()
    .getByRole("textbox", { name: /expiration date/i });

  const cvvBox = page
    .locator('iframe[name="braintree-hosted-field-cvv"]')
    .contentFrame()
    .getByRole("textbox", { name: /cvv/i });

  if (cardNumber !== undefined) {
    await cardNumberBox.click({ force: true });
    await cardNumberBox.fill(cardNumber, { force: true });
  }

  if (expiry !== undefined) {
    await expiryBox.click({ force: true });
    await expiryBox.fill(expiry, { force: true });
  }

  if (cvv !== undefined) {
    await cvvBox.click({ force: true });
    await cvvBox.fill(cvv, { force: true });
  }
}

// ─────────────────────────── Checkout / Orders UI ────────────────────────────

test.describe("Jian Tao checkout and orders UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const categoryId = await seedCategory(db);
    await seedProduct(db, categoryId);
  });

  test("JT-C1: guest user with cart item is prompted to login before checkout", async ({ page }) => {
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByRole("button", { name: /please login to checkout/i })).toBeVisible();
    await expect(page.getByText("Cart Summary")).toBeVisible();
  });

  test("JT-C2: logged-in user without address cannot proceed to checkout", async ({ page, db }) => {
    await seedUser(db, USER_NO_ADDRESS);

    await loginAs(page, USER_NO_ADDRESS.email, USER_NO_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByRole("button", { name: /update address/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /please login to checkout/i })).not.toBeVisible();
    // If payment section appears, payment should not be actionable without address
    const makePaymentButton = page.getByRole("button", { name: /make payment/i });
    if (await makePaymentButton.count()) {
      await expect(makePaymentButton).toBeDisabled();
    }
  });

  test("JT-C3: logged-in user with address can view cart summary and checkout section", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(USER_WITH_ADDRESS.address)).toBeVisible();
    await expect(page.getByText(/total \| checkout \| payment/i)).toBeVisible();
    await expect(page.getByText(`Total : ${formatUsd(PRODUCT.price)}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /please login to checkout/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /update address/i })).toBeVisible();
  });

  test("JT-C4: user can remove an item from cart before checkout", async ({ page }) => {
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toBeVisible();

    await page.getByRole("button", { name: /remove/i }).click();

    await expect(page.getByText(PRODUCT.name)).not.toBeVisible();
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test("JT-C5: removing one duplicate cart item keeps the remaining duplicate", async ({ page }) => {
    await addProductToCartFromHome(page, PRODUCT.name);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toHaveCount(2);
    await expect(page.getByText(`Total : ${formatUsd(PRODUCT.price * 2)}`)).toBeVisible();

    await page.getByRole("button", { name: /remove/i }).first().click();

    await expect(page.getByText(PRODUCT.name)).toHaveCount(1);
    await expect(page.getByText(`Total : ${formatUsd(PRODUCT.price)}`)).toBeVisible();
  });

  test("JT-C6: logged-in user can open dashboard orders page from dashboard menu", async ({ page, db }) => {
    const userId = await seedUser(db, USER_WITH_ADDRESS);
    const product = await db.collection("products").findOne({ slug: PRODUCT.slug });

    await seedOrder(db, userId, product!._id);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);

    await page.goto("/dashboard/user", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Orders", exact: true }).click();

    await expect(page).toHaveURL("/dashboard/user/orders");
    await expect(page.getByText("All Orders")).toBeVisible();
  });

  test("JT-C7: orders page shows seeded order details correctly", async ({ page, db }) => {
    const userId = await seedUser(db, USER_WITH_ADDRESS);
    const product = await db.collection("products").findOne({ slug: PRODUCT.slug });

    await seedOrder(db, userId, product!._id, "Processing", true);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await page.goto("/dashboard/user/orders", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("All Orders")).toBeVisible();
    await expect(page.getByText("Processing")).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C8: checkout-ready user can see payment section on cart page", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(USER_WITH_ADDRESS.address)).toBeVisible();
    await expect(page.getByText(`Total : ${formatUsd(PRODUCT.price)}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /make payment/i })).toBeVisible();

    await expect(page.locator('iframe[name="braintree-hosted-field-number"]')).toBeAttached();
    await expect(page.locator('iframe[name="braintree-hosted-field-expirationDate"]')).toBeAttached();
    await expect(page.locator('iframe[name="braintree-hosted-field-cvv"]')).toBeAttached();
  });

  test("JT-C9: clicking make payment without completing payment details keeps user on cart page", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText("Cart Summary")).toBeVisible();

    const makePaymentButton = page.getByRole("button", { name: /make payment/i });
    await expect(makePaymentButton).toBeVisible();
    await makePaymentButton.click();

    await expect(page).toHaveURL("/cart");
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });


  test("JT-C10: successful payment redirects user to orders page", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111111");

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("12/30");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await page.waitForURL("**/dashboard/user/orders", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /all orders/i })).toBeVisible();
  });


  test("JT-C11: user can revisit orders page and still see seeded purchased item", async ({ page, db }) => {
    const userId = await seedUser(db, USER_WITH_ADDRESS);
    const product = await db.collection("products").findOne({ slug: PRODUCT.slug });

    await seedOrder(db, userId, product!._id, "Processing", true);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);

    await page.goto("/dashboard/user", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Orders", exact: true }).click();

    await expect(page).toHaveURL("/dashboard/user/orders");
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();
  });


  test("JT-C12: payment is blocked when CVV is missing", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111111");

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("12/30");

    await page.getByRole("button", { name: /make payment/i }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C13: payment is blocked when expiry is missing", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111111");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C14: payment is blocked when card number is missing", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("12/30");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C15: payment is blocked when card number is invalid", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111112");

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("12/30");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C16: payment is blocked when expiry is invalid", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111111");

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("01/20");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(PRODUCT.name)).toBeVisible();
  });

  test("JT-C17: successful checkout shows the correct purchased item count on the orders page", async ({ page, db }) => {
    await seedUser(db, USER_WITH_ADDRESS);

    await loginAs(page, USER_WITH_ADDRESS.email, USER_WITH_ADDRESS.password);

    await addProductToCartFromHome(page, PRODUCT.name);
    await addProductToCartFromHome(page, PRODUCT.name);
    await goToCart(page);

    await expect(page.getByText(PRODUCT.name)).toHaveCount(2);
    await expect(page.getByText(`Total : ${formatUsd(PRODUCT.price * 2)}`)).toBeVisible();

    await page.getByRole("button", { name: /paying with card/i }).click();

    await page
      .locator('iframe[name="braintree-hosted-field-number"]')
      .contentFrame()
      .getByRole("textbox", { name: /credit card number/i })
      .fill("4111111111111111");

    await page
      .locator('iframe[name="braintree-hosted-field-expirationDate"]')
      .contentFrame()
      .getByRole("textbox", { name: /expiration date/i })
      .fill("12/30");

    await page
      .locator('iframe[name="braintree-hosted-field-cvv"]')
      .contentFrame()
      .getByRole("textbox", { name: /cvv/i })
      .fill("123");

    await page.getByRole("button", { name: /make payment/i }).click();

    await page.waitForURL("**/dashboard/user/orders", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /all orders/i })).toBeVisible();

    await expect(page.getByText(PRODUCT.name)).toHaveCount(2);
  });

});