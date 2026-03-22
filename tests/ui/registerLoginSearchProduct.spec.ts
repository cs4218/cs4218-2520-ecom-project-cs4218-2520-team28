// Foo Tzie Huang - A0262376Y
//
// AI Assistance: CodeMax (Claude Sonnet 4)
//
// Testing approach:
// - UI testing with Playwright using seeded database data for deterministic scenarios.
// - Scenario-based coverage of key user flows spanning multiple components.
// - Focused on validating observable frontend behaviour and page flow.
//
// Known application limitations reflected in tests:
// - ProductDetails.js passes the slug to get-product/:pid, but the controller uses findById()
//   which expects an ObjectId. This means product details only render when navigated via slug
//   if the backend is fixed. Tests use direct URL navigation with product IDs as a workaround.
// - Search.js "More Details" button has no onClick handler, so it does not navigate.
//   Tests verify the button is present but do not rely on it navigating.
// - AdminMenu.js has the "Users" NavLink commented out, so admin navigates directly to URL.
// - Login returns 404 for non-existent email, which causes axios to throw an error.
//   The frontend catch block shows "Something went wrong" instead of the server error message.
//
// What is tested:
// FTH-1: Register new user -> redirected to login page
// FTH-2: Register with existing email -> shows error
// FTH-3: Login with valid credentials -> redirected to home
// FTH-4: Register -> Login -> Verify user is logged in (full flow)
// FTH-5: Login with wrong password -> shows error
// FTH-6: Login with non-existent email -> shows error toast
// FTH-7: Admin can navigate to Users page and see "All Users" heading
// FTH-8: Clicking More Details on home page navigates to product details URL
// FTH-9: Product details page renders heading and product info when accessed with valid ID
// FTH-10: Clicking More Details on category page navigates to product details URL
// FTH-11: Category page shows products belonging to that category only
// FTH-12: Search for product by name -> results page shows matching products
// FTH-13: Search results page displays product cards with correct info and buttons
// FTH-14: Search with no matching keyword -> shows "No Products Found"
// FTH-15: Add product to cart from home page -> cart shows product
// FTH-16: Add product to cart from product details page -> cart shows product
// FTH-17: Full flow: Register -> Login -> Add product from home -> View cart with address

import { test, expect, clearDB } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Db, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

// ─────────────────────────────── Constants ───────────────────────────────────

const CATEGORY_ELECTRONICS = {
  name: "Electronics",
  slug: "electronics",
};

const CATEGORY_BOOKS = {
  name: "Books",
  slug: "books",
};

const PRODUCT_PHONE = {
  name: "Test Smartphone XYZ",
  slug: "Test-Smartphone-XYZ",
  description: "A high-end smartphone with amazing features for testing purposes",
  price: 799,
  quantity: 10,
  shipping: false,
};

const PRODUCT_LAPTOP = {
  name: "Test Laptop Pro",
  slug: "Test-Laptop-Pro",
  description: "Powerful laptop for development and testing workflows",
  price: 1499,
  quantity: 5,
  shipping: true,
};

const PRODUCT_BOOK = {
  name: "Test Programming Book",
  slug: "Test-Programming-Book",
  description: "A comprehensive guide to software testing and development",
  price: 49,
  quantity: 20,
  shipping: true,
};

const ADMIN_USER = {
  name: "UI Test Admin",
  email: "ui-test-admin@test.com",
  password: "Admin123!",
  phone: 91234567,
  address: "1 Admin Road",
  answer: "admin",
  role: 1,
};

const REGULAR_USER = {
  name: "UI Test User",
  email: "ui-test-user@test.com",
  password: "User123!",
  phone: 87654321,
  address: "42 Test Street",
  answer: "soccer",
  role: 0,
};

// ─────────────────────────────── Helpers ─────────────────────────────────────

async function seedCategory(db: Db, category: typeof CATEGORY_ELECTRONICS): Promise<ObjectId> {
  const { insertedId } = await db.collection("categories").insertOne({ ...category });
  return insertedId;
}

async function seedProduct(
  db: Db,
  product: typeof PRODUCT_PHONE,
  categoryId: ObjectId
): Promise<ObjectId> {
  const { insertedId } = await db.collection("products").insertOne({
    ...product,
    category: categoryId,
  });
  return insertedId;
}

async function seedUser(db: Db, user: typeof ADMIN_USER): Promise<ObjectId> {
  const hash = await bcrypt.hash(user.password, 10);
  const { insertedId } = await db.collection("users").insertOne({
    ...user,
    password: hash,
  });
  return insertedId;
}

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function registerUser(
  page: Page,
  user: {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    dob: string;
    answer: string;
  }
): Promise<void> {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Name").fill(user.name);
  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);
  await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
  await page.getByPlaceholder("Enter Your Address").fill(user.address);
  await page.getByPlaceholder("Enter Your DOB").fill(user.dob);
  await page.getByPlaceholder("What is Your Favorite sports").fill(user.answer);
  await page.getByRole("button", { name: "REGISTER" }).click();
}

// ──────────────────────── Registration & Login Tests ─────────────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Registration and Login UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
  });

  test("FTH-1: Register new user successfully -> redirected to login page", async ({
    page,
  }) => {
    await registerUser(page, {
      name: "New Test User",
      email: "newuser@test.com",
      password: "Password123!",
      phone: "91234567",
      address: "123 New Street",
      dob: "2000-01-15",
      answer: "basketball",
    });

    // Should redirect to login page after successful registration
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("FTH-2: Register with existing email -> shows error toast", async ({
    page,
    db,
  }) => {
    // Seed an existing user
    await seedUser(db, REGULAR_USER);

    await registerUser(page, {
      name: "Duplicate User",
      email: REGULAR_USER.email,
      password: "Password123!",
      phone: "98765432",
      address: "456 Dup Street",
      dob: "1999-05-20",
      answer: "tennis",
    });

    // Should show error message and stay on register page
    await expect(page.getByText(/already register/i)).toBeVisible({ timeout: 10000 });
  });

  test("FTH-3: Login with valid credentials -> redirected to home", async ({
    page,
    db,
  }) => {
    await seedUser(db, REGULAR_USER);

    await loginAs(page, REGULAR_USER.email, REGULAR_USER.password);

    // Should be on home page and show user name in nav
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(REGULAR_USER.name)).toBeVisible();
  });

  test("FTH-4: Full Register -> Login flow", async ({ page }) => {
    const newUser = {
      name: "Flow Test User",
      email: "flowtest@test.com",
      password: "FlowPass123!",
      phone: "81234567",
      address: "789 Flow Ave",
      dob: "1998-03-10",
      answer: "swimming",
    };

    // Step 1: Register
    await registerUser(page, newUser);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Step 2: Login with the newly registered credentials
    await page.getByPlaceholder("Enter Your Email").fill(newUser.email);
    await page.getByPlaceholder("Enter Your Password").fill(newUser.password);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Step 3: Verify logged in - should see user name on home page
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.getByText(newUser.name)).toBeVisible();
  });

  test("FTH-5: Login with wrong password -> shows error", async ({
    page,
    db,
  }) => {
    await seedUser(db, REGULAR_USER);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Enter Your Email").fill(REGULAR_USER.email);
    await page.getByPlaceholder("Enter Your Password").fill("WrongPassword!");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Server returns 200 with success:false → frontend shows server message via toast
    await expect(
      page.getByText(/invalid password/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("FTH-6: Login with non-existent email -> shows error toast", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Enter Your Email").fill("nonexistent@test.com");
    await page.getByPlaceholder("Enter Your Password").fill("SomePassword!");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Server returns 404 → axios throws → catch block shows generic error toast
    await expect(
      page.getByText(/something went wrong/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

// ──────────────────────── Admin Users Page Tests ─────────────────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Admin Users page UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
  });

  test("FTH-7: Admin can navigate to Users page and see All Users heading", async ({
    page,
    db,
  }) => {
    // Seed admin user
    await seedUser(db, ADMIN_USER);

    // Login as admin
    await loginAs(page, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate directly to admin users page
    // Note: The "Users" NavLink in AdminMenu.js is currently commented out,
    // so we navigate directly via URL instead of clicking a menu link
    await page.goto("/dashboard/admin/users", { waitUntil: "domcontentloaded" });

    // Verify we're on the users page with correct heading
    await expect(page).toHaveURL(/\/dashboard\/admin\/users/);
    await expect(page.getByRole("heading", { name: "All Users" })).toBeVisible();
  });
});

// ────────────────── Select Product from Home Page Tests ──────────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Select product from home page UI tests", () => {
  let phoneProductId: ObjectId;
  let laptopProductId: ObjectId;

  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const catId = await seedCategory(db, CATEGORY_ELECTRONICS);
    phoneProductId = await seedProduct(db, PRODUCT_PHONE, catId);
    laptopProductId = await seedProduct(db, PRODUCT_LAPTOP, catId);
  });

  test("FTH-8: Click More Details on home page -> navigates to product slug URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for products to load
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });

    // Find the product card and click More Details
    const productCard = page
      .locator(".card")
      .filter({ has: page.getByText(PRODUCT_PHONE.name) })
      .first();

    await productCard.getByRole("button", { name: /more details/i }).click();

    // Should navigate to product details page URL with slug
    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_PHONE.slug}`));

    // The ProductDetails component renders the "Product Details" heading
    await expect(page.getByText("Product Details")).toBeVisible();
  });

  test("FTH-9: Product details page renders product info when accessed with valid product ID", async ({
    page,
    db,
  }) => {
    // Look up the actual product from DB to get its ObjectId
    const product = await db.collection("products").findOne({ slug: PRODUCT_PHONE.slug });

    // Navigate directly using product ID (since ProductDetails.js calls
    // get-product/:pid and the controller uses findById, slug won't work as pid)
    // This tests that the ProductDetails page correctly renders product info
    // when the API returns valid data
    await page.goto(`/product/${product!._id}`, { waitUntil: "domcontentloaded" });

    // Verify product details are displayed
    await expect(page.getByText("Product Details")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(new RegExp(`Name : ${PRODUCT_PHONE.name}`))).toBeVisible();
    await expect(page.getByText(/Description :/)).toBeVisible();
    await expect(page.getByText(/Price :/)).toBeVisible();
    await expect(page.getByText(new RegExp(`Category : ${CATEGORY_ELECTRONICS.name}`))).toBeVisible();
  });
});

// ────────────────── Select Product from Category Page Tests ──────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Select product from category page UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const electronicsId = await seedCategory(db, CATEGORY_ELECTRONICS);
    const booksId = await seedCategory(db, CATEGORY_BOOKS);
    await seedProduct(db, PRODUCT_PHONE, electronicsId);
    await seedProduct(db, PRODUCT_LAPTOP, electronicsId);
    await seedProduct(db, PRODUCT_BOOK, booksId);
  });

  test("FTH-10: Navigate to category -> click More Details -> navigates to product slug URL", async ({
    page,
  }) => {
    // Navigate to the Electronics category page
    await page.goto(`/category/${CATEGORY_ELECTRONICS.slug}`, {
      waitUntil: "domcontentloaded",
    });

    // Verify category page shows correct info
    await expect(
      page.getByText(`Category - ${CATEGORY_ELECTRONICS.name}`)
    ).toBeVisible({ timeout: 10000 });

    // Wait for products
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });

    // Click More Details on the phone product
    const productCard = page
      .locator(".card")
      .filter({ has: page.getByText(PRODUCT_PHONE.name) })
      .first();

    await productCard.getByRole("button", { name: /more details/i }).click();

    // Should navigate to product details page URL with slug
    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_PHONE.slug}`));

    // The ProductDetails component renders the "Product Details" heading
    await expect(page.getByText("Product Details")).toBeVisible();
  });

  test("FTH-11: Category page shows only products belonging to that category", async ({
    page,
  }) => {
    // Navigate to Books category
    await page.goto(`/category/${CATEGORY_BOOKS.slug}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText(`Category - ${CATEGORY_BOOKS.name}`)
    ).toBeVisible({ timeout: 10000 });

    // Should show the book product
    await expect(page.getByText(PRODUCT_BOOK.name)).toBeVisible({ timeout: 10000 });

    // Should NOT show electronics products
    await expect(page.getByText(PRODUCT_PHONE.name)).not.toBeVisible();
    await expect(page.getByText(PRODUCT_LAPTOP.name)).not.toBeVisible();
  });
});

// ──────────────────────── Search Product Tests ───────────────────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Search product UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const catId = await seedCategory(db, CATEGORY_ELECTRONICS);
    await seedProduct(db, PRODUCT_PHONE, catId);
    await seedProduct(db, PRODUCT_LAPTOP, catId);
  });

  test("FTH-12: Search for product by name -> results page shows matching products", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Use the search bar in the header
    const searchInput = page.getByPlaceholder("Search");
    await searchInput.fill("Smartphone");
    await page.getByRole("button", { name: "Search" }).click();

    // Should navigate to search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText("Search Resuts")).toBeVisible();

    // Should show matching product
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });
  });

  test("FTH-13: Search results page displays product cards with correct info and buttons", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const searchInput = page.getByPlaceholder("Search");
    await searchInput.fill("Laptop");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search/);

    // Verify the search results display the product card with expected elements
    await expect(page.getByText(PRODUCT_LAPTOP.name)).toBeVisible({ timeout: 10000 });

    // Verify product card content: truncated description and price
    await expect(page.getByText(/Powerful laptop for developmen/)).toBeVisible();
    await expect(page.getByText(`$ ${PRODUCT_LAPTOP.price}`)).toBeVisible();

    // Verify product image is shown
    const productImg = page.locator(`img[alt="${PRODUCT_LAPTOP.name}"]`);
    await expect(productImg).toBeVisible();

    // Verify "More Details" and "ADD TO CART" buttons are present
    // Note: In Search.js, these buttons do NOT have onClick handlers.
    // They are rendered but non-functional (known app limitation).
    const productCard = page
      .locator(".card")
      .filter({ has: page.getByText(PRODUCT_LAPTOP.name) })
      .first();
    await expect(productCard.getByText("More Details")).toBeVisible();
    await expect(productCard.getByText("ADD TO CART")).toBeVisible();
  });

  test("FTH-14: Search with no matching keyword -> shows No Products Found", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const searchInput = page.getByPlaceholder("Search");
    await searchInput.fill("NonExistentProduct12345");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText("No Products Found")).toBeVisible({ timeout: 10000 });
  });
});

// ────────────────────────── Cart Flow Tests ──────────────────────────────────

// Foo Tzie Huang - A0262376Y
test.describe("Cart flow UI tests", () => {
  test.beforeEach(async ({ db }) => {
    await clearDB(db);
    const catId = await seedCategory(db, CATEGORY_ELECTRONICS);
    await seedProduct(db, PRODUCT_PHONE, catId);
    await seedProduct(db, PRODUCT_LAPTOP, catId);
  });

  test("FTH-15: Add product to cart from home page -> cart shows product", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });

    // Add product to cart from home page
    const productCard = page
      .locator(".card")
      .filter({ has: page.getByText(PRODUCT_PHONE.name) })
      .first();

    await productCard.getByRole("button", { name: /add to cart/i }).click();

    // Navigate to cart
    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    // Verify product is in cart
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible();
  });

  test("FTH-16: Add product to cart from product details page -> cart shows product", async ({
    page,
    db,
  }) => {
    // Look up product ID since ProductDetails.js's API call needs a valid ObjectId
    const product = await db.collection("products").findOne({ slug: PRODUCT_LAPTOP.slug });

    // Navigate to product details page using product ID
    await page.goto(`/product/${product!._id}`, { waitUntil: "domcontentloaded" });

    // Wait for product details to load
    await expect(page.getByText("Product Details")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(new RegExp(`Name : ${PRODUCT_LAPTOP.name}`))).toBeVisible();

    // Click ADD TO CART on product details page
    await page.getByRole("button", { name: /add to cart/i }).click();

    // Navigate to cart
    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    // Verify product is in cart
    await expect(page.getByText(PRODUCT_LAPTOP.name)).toBeVisible();
  });

  test("FTH-17: Full flow: Register -> Login -> Add to cart from home -> View cart with address", async ({
    page,
  }) => {
    const newUser = {
      name: "Cart Flow User",
      email: "cartflow@test.com",
      password: "CartFlow123!",
      phone: "92345678",
      address: "100 Cart Blvd",
      dob: "1995-06-15",
      answer: "football",
    };

    // Step 1: Register
    await registerUser(page, newUser);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Step 2: Login
    await page.getByPlaceholder("Enter Your Email").fill(newUser.email);
    await page.getByPlaceholder("Enter Your Password").fill(newUser.password);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.getByText(newUser.name)).toBeVisible();

    // Step 3: Search for a product
    const searchInput = page.getByPlaceholder("Search");
    await searchInput.fill("Smartphone");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });

    // Step 4: Go back to home and add product to cart from there
    // (Search.js buttons are non-functional — no onClick handler)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible({ timeout: 10000 });

    const productCard = page
      .locator(".card")
      .filter({ has: page.getByText(PRODUCT_PHONE.name) })
      .first();

    await productCard.getByRole("button", { name: /add to cart/i }).click();

    // Step 5: Go to cart and verify
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(PRODUCT_PHONE.name)).toBeVisible();
    await expect(page.getByText("Cart Summary")).toBeVisible();
    await expect(page.getByText(newUser.address)).toBeVisible();
  });
});
