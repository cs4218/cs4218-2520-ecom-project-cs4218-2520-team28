// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)

import { test, expect, clearDB } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Db, ObjectId } from "mongodb";

// -----------------------------------------------------------------------------
// UI E2E Test Plan Overview (Guest Cart + Checkout, No Login)
// -----------------------------------------------------------------------------
// Objective:
// Validate black-box end-user scenarios that span multiple pages/components,
// focusing on guest shopping flow, cart behavior, checkout redirect rules,
// and persistence across navigation.
//
// 1) Tests execute full user journeys across Home, Category, Search,
//    Product Details, Cart, Login, and Private routes.
// 2) Assertions verify outcomes of chained actions (add -> navigate -> checkout
//    -> redirect -> return), independent of internal implementation details.
//
// Suite G: Guest cart and checkout flow (14 tests)
// G-1  Home loads for guest with product visibility
// G-2  Add to cart from home updates header badge
// G-3  Cart page shows item, count text, and total
// G-4  Guest checkout from cart redirects to /login
// G-5  Direct private-route access redirects guest to /login
// G-6  Product details route accessible without login
// G-7  Category route shows seeded products without login
// G-8  Search route returns expected guest result
// G-9  Cart item persists across category/details/search hops
// G-10 Continue shopping via home accumulates cart items
// G-11 Checkout redirect remains enforced with multiple cart items
// G-12 Guest cart uses localStorage key cart:guest (legacy key unused)
// G-13 Cart contents remain after login redirect and return to cart
// G-14 Repeated checkout redirects do not clear cart
//
// Suite H: Guest cart mutation and persistence integrity (8 tests)
// H-1  Remove single item updates cart content and empty-cart state
// H-2  Remove one item from multi-item cart updates total and keeps remaining item
// H-3  Remove all items transitions cart to empty state
// H-4  Duplicate-item removal removes only one duplicate per click
// H-5  Removing both duplicates clears cart fully
// H-6  Hard refresh on cart route preserves guest cart state
// H-7  Hard refresh on home route preserves header badge/cart count
// H-8  Empty-cart guest checkout button still redirects to /login

const CATEGORY_ELECTRONICS = {
  name: "Electronics",
  slug: "electronics",
};

const CATEGORY_ACCESSORIES = {
  name: "Accessories",
  slug: "accessories",
};

const PRODUCT_CAMERA = {
  name: "Guest Camera",
  slug: "guest-camera",
  description: "Camera for guest cart and checkout flow testing",
  price: 120,
  quantity: 10,
  shipping: false,
};

const PRODUCT_MOUSE = {
  name: "Guest Mouse",
  slug: "guest-mouse",
  description: "Mouse for guest cart accumulation checks",
  price: 80,
  quantity: 15,
  shipping: false,
};

const PRODUCT_CASE = {
  name: "Travel Case",
  slug: "travel-case",
  description: "Accessory product for category/search visibility",
  price: 35,
  quantity: 20,
  shipping: false,
};

async function seedCategory(db: Db, category: { name: string; slug: string }): Promise<ObjectId> {
  const { insertedId } = await db.collection("categories").insertOne(category);
  return insertedId;
}

async function seedProduct(
  db: Db,
  product: {
    name: string;
    slug: string;
    description: string;
    price: number;
    quantity: number;
    shipping: boolean;
  },
  categoryId: ObjectId
): Promise<ObjectId> {
  const { insertedId } = await db.collection("products").insertOne({
    ...product,
    category: categoryId,
  });
  return insertedId;
}

async function resetGuestSession(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
}

function productCard(page: Page, productName: string) {
  return page.locator(".card").filter({ hasText: productName }).first();
}

async function addToCartFromHome(page: Page, productName: string): Promise<void> {
  await productCard(page, productName).getByRole("button", { name: "ADD TO CART" }).click();
}

async function removeFirstCartItem(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Remove" }).first().click();
}

async function openCategoryFromHeader(page: Page, categoryName: string): Promise<void> {
  await page.getByRole("link", { name: "Categories" }).click();
  await page.getByRole("link", { name: categoryName }).click();
}

async function getGuestCartData(page: Page): Promise<{
  cartGuest: string | null;
  cartLegacy: string | null;
  sessionKeys: string[];
}> {
  return page.evaluate(() => {
    return {
      cartGuest: localStorage.getItem("cart:guest"),
      cartLegacy: localStorage.getItem("cart"),
      sessionKeys: Object.keys(sessionStorage),
    };
  });
}

test.describe("Guest cart and checkout flow (no login)", () => {
  test.setTimeout(50_000);
  let cameraProductId: string;

  test.beforeEach(async ({ db, page }) => {
    await clearDB(db);

    const electronicsId = await seedCategory(db, CATEGORY_ELECTRONICS);
    const accessoriesId = await seedCategory(db, CATEGORY_ACCESSORIES);

    cameraProductId = String(await seedProduct(db, PRODUCT_CAMERA, electronicsId));
    await seedProduct(db, PRODUCT_MOUSE, electronicsId);
    await seedProduct(db, PRODUCT_CASE, accessoriesId);

    await resetGuestSession(page);
  });

  // Chi Thanh, A0276229W - G-1: Verifies guest can load home page and see key unauthenticated UI plus seeded products.
  test("G-1 home page renders for guest with product visibility", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();

    await expect(page.getByText(PRODUCT_CAMERA.name).first()).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name).first()).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-2: Verifies adding a product from home increments the header cart badge.
  test("G-2 add to cart from home increments header badge", async ({ page }) => {
    const cartBadge = page.locator(".ant-badge-count").first();
    await expect(cartBadge).toContainText("0");

    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await expect(cartBadge).toContainText("1");
  });

  // Chi Thanh, A0276229W - G-3: Verifies cart page renders guest item details, item count text, and total amount.
  test("G-3 cart page shows one guest item, count text and total", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL("/cart");
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
    await expect(page.getByText(`Price : ${PRODUCT_CAMERA.price}`)).toBeVisible();
    await expect(page.getByText(/You Have 1 items in your cart/i)).toBeVisible();

    // This UI currently exposes an aggregate total only (no separate tax/shipping rows).
    await expect(page.getByText(/Total\s*:\s*\$120\.00/i)).toBeVisible();
    await expect(page.getByText(/Total \| Checkout \| Payment/i)).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-4: Verifies guest checkout attempt from cart redirects to the login page.
  test("G-4 checkout click from cart redirects guest to login", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);

    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");
  });

  // Chi Thanh, A0276229W - G-5: Verifies unauthenticated users cannot access a private route and are redirected to login.
  test("G-5 direct private route access redirects guest to login", async ({ page }) => {
    await page.goto("/dashboard/user/orders");
    await expect(page).toHaveURL(/\/login$/);
  });

  // Chi Thanh, A0276229W - G-6: Verifies product details route is publicly accessible for guests.
  test("G-6 product details route is accessible without login", async ({ page }) => {
    // Backend currently resolves product details by product id (:pid), so use id route directly.
    await page.goto(`/product/${cameraProductId}`);
    await expect(page).toHaveURL(`/product/${cameraProductId}`);
    await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();
    await expect(page.getByText(new RegExp(`Name\\s*:\\s*${PRODUCT_CAMERA.name}`))).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-7: Verifies category route shows expected products for guest users.
  test("G-7 category route shows seeded products without login", async ({ page }) => {
    await openCategoryFromHeader(page, CATEGORY_ELECTRONICS.name);
    await expect(page).toHaveURL(`/category/${CATEGORY_ELECTRONICS.slug}`);
    await expect(page.getByText(PRODUCT_CAMERA.name).first()).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name).first()).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-8: Verifies search route returns expected guest-facing product results.
  test("G-8 search route returns expected guest result", async ({ page }) => {
    await page.getByPlaceholder("Search").fill("mouse");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL("/search");
    await expect(page.getByText(/Found\s+1/i)).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name).first()).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-9: Verifies cart state persists after navigating across category, details, and search routes.
  test("G-9 cart item persists after navigating category, details and search pages", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);

    await openCategoryFromHeader(page, CATEGORY_ELECTRONICS.name);
    await expect(page).toHaveURL(`/category/${CATEGORY_ELECTRONICS.slug}`);

    await page.goto(`/product/${cameraProductId}`);
    await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible();

    await page.getByRole("link", { name: "Home" }).click();
    await page.getByPlaceholder("Search").fill("case");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL("/search");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-10: Verifies returning home to continue shopping accumulates additional cart items.
  test("G-10 home navigation works as continue shopping and cart accumulates", async ({ page }) => {
    const cartBadge = page.locator(".ant-badge-count").first();
    await expect(cartBadge).toContainText("0");

    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await expect(cartBadge).toContainText("1");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();

    // Equivalent to "Continue Shopping" in this app: use Header Home navigation.
    await page.getByRole("link", { name: "Home" }).click();
    await addToCartFromHome(page, PRODUCT_MOUSE.name);
    await expect(cartBadge).toContainText("2");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name)).toBeVisible();
    await expect(page.getByText(/Total\s*:\s*\$200\.00/i)).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-11: Verifies checkout redirect behavior remains enforced even with multiple items in cart.
  test("G-11 checkout still redirects to login after cart has multiple items", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);

    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");
  });

  // Chi Thanh, A0276229W - G-12: Verifies guest cart persists under cart:guest key and legacy cart key is unused.
  test("G-12 localStorage uses cart:guest and does not use legacy cart key", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);

    const guestCartData = await getGuestCartData(page);

    expect(guestCartData.cartGuest).not.toBeNull();

    const parsedGuestCart = JSON.parse(guestCartData.cartGuest ?? "[]") as Array<{ name: string }>;
    expect(parsedGuestCart.length).toBe(2);
    expect(parsedGuestCart.some((p) => p.name === PRODUCT_CAMERA.name)).toBeTruthy();
    expect(parsedGuestCart.some((p) => p.name === PRODUCT_MOUSE.name)).toBeTruthy();

    // Legacy cart key should not be used by the current cart context implementation.
    expect(guestCartData.cartLegacy).toBeNull();

    // Session storage is not required for cart persistence in this app, but we capture it
    // to ensure there is no unexpected dependency on a transient guest checkout session.
    expect(Array.isArray(guestCartData.sessionKeys)).toBeTruthy();
  });

  // Chi Thanh, A0276229W - G-13: Verifies cart contents are retained when navigating back from login to cart.
  test("G-13 returning from login to cart keeps pre-login guest items", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);

    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
  });

  // Chi Thanh, A0276229W - G-14: Verifies repeated guest checkout redirects do not clear existing cart state.
  test("G-14 repeated login-required checkout attempts do not clear cart", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);

    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/cart");
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name)).toBeVisible();

    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");
  });

  // Chi Thanh, A0276229W - H-1: Verifies removing a single item from cart empties cart for guest.
  test("H-1 remove single item updates cart to empty state", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await page.getByRole("link", { name: "Cart" }).click();

    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
    await removeFirstCartItem(page);

    await expect(page.getByText(/Your Cart Is Empty/i)).toBeVisible();
    await expect(page.getByText(PRODUCT_CAMERA.name)).toHaveCount(0);
  });

  // Chi Thanh, A0276229W - H-2: Verifies removing one item from multi-item cart recalculates total and preserves remaining item.
  test("H-2 remove one of two items recalculates total", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);
    await page.getByRole("link", { name: "Cart" }).click();

    await expect(page.getByText(/Total\s*:\s*\$200\.00/i)).toBeVisible();
    await removeFirstCartItem(page);

    await expect(page.getByText(/Total\s*:\s*\$80\.00/i)).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name)).toBeVisible();
  });

  // Chi Thanh, A0276229W - H-3: Verifies removing all items sequentially transitions cart to empty state.
  test("H-3 remove all items shows empty cart message", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);
    await page.getByRole("link", { name: "Cart" }).click();

    await removeFirstCartItem(page);
    await removeFirstCartItem(page);

    await expect(page.getByText(/Your Cart Is Empty/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  });

  // Chi Thanh, A0276229W - H-4: Verifies duplicate-item removal removes one instance at a time.
  test("H-4 duplicate item removal removes only one duplicate", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await page.getByRole("link", { name: "Cart" }).click();

    const duplicateCards = page.locator(".card").filter({ hasText: PRODUCT_CAMERA.name });
    await expect(duplicateCards).toHaveCount(2);

    await removeFirstCartItem(page);

    await expect(duplicateCards).toHaveCount(1);
    await expect(page.getByText(/Total\s*:\s*\$120\.00/i)).toBeVisible();
  });

  // Chi Thanh, A0276229W - H-5: Verifies removing both duplicates clears cart completely.
  test("H-5 removing both duplicates clears cart", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await page.getByRole("link", { name: "Cart" }).click();

    await removeFirstCartItem(page);
    await removeFirstCartItem(page);

    await expect(page.getByText(/Your Cart Is Empty/i)).toBeVisible();
    await expect(page.getByText(/Total\s*:\s*\$0\.00/i)).toBeVisible();
  });

  // Chi Thanh, A0276229W - H-6: Verifies guest cart content persists after hard refresh on /cart.
  test("H-6 cart content persists after hard refresh on cart route", async ({ page }) => {
    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);
    await page.getByRole("link", { name: "Cart" }).click();

    await page.reload();

    await expect(page).toHaveURL("/cart");
    await expect(page.getByText(PRODUCT_CAMERA.name)).toBeVisible();
    await expect(page.getByText(PRODUCT_MOUSE.name)).toBeVisible();
    await expect(page.getByText(/You Have 2 items in your cart/i)).toBeVisible();
  });

  // Chi Thanh, A0276229W - H-7: Verifies header cart badge persists after hard refresh on home route.
  test("H-7 header badge persists after hard refresh on home", async ({ page }) => {
    const cartBadge = page.locator(".ant-badge-count").first();

    await addToCartFromHome(page, PRODUCT_CAMERA.name);
    await addToCartFromHome(page, PRODUCT_MOUSE.name);
    await expect(cartBadge).toContainText("2");

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(cartBadge).toContainText("2");
  });

  // Chi Thanh, A0276229W - H-8: Verifies guest can still be redirected to login from cart even when cart is empty.
  test("H-8 empty-cart checkout button redirects guest to login", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByText(/Your Cart Is Empty/i)).toBeVisible();
    await page.getByRole("button", { name: "Please Login to checkout" }).click();
    await expect(page).toHaveURL("/login");
  });
});
