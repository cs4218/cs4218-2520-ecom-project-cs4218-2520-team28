// Foo Chao, A0272024R

// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: do integration test for Products.js page.
//    parallel tests from Dashboard.integration.test.js.
//    main differences:
//      - uses AdminRoute (checks /api/v1/auth/admin-auth) not PrivateRoute
//      - renders product cards (name, description, image) not user info card
//      - test 0, 1, many products rendering
//    additionally in L4.2: clicking a product card navigates to UpdateProduct page

// ────────────────────────────────────────────────────────────────────────────
//  TEST LEVEL OVERVIEW
// ────────────────────────────────────────────────────────────────────────────
//
//  Level 1 — Header integration tests (useAuth + useCart + useCategory + SearchInput)
//    → DONE BY JINHAN
//    Scope: Header component in isolation; all context hooks and child
//           components (SearchInput, antd Badge) are mocked.
//
//  Level 2 — Layout integration tests (Header + Footer as children inside Layout)
//    → DONE BY JINHAN
//    Scope: Layout component in isolation; Header, Footer, and Toaster are
//           mocked. Tests verify Layout's own Helmet logic and slot rendering.
//
//  Level 3 — Products + real Layout + real Header + real Footer   [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <Products /> rendered directly with REAL Layout, Header, Footer,
//           and all their context dependencies (AuthProvider, CartProvider,
//           SearchProvider). AdminRoute is NOT involved at this level.
//           Network (axios) is mocked at the boundary.
//    What is tested:
//      • Page heading "All Products List" renders
//      • 0 products: no product images (empty list)
//      • 1 product: card with name and description renders
//      • many (3) products: all 3 card names render
//      • AdminMenu renders Admin Panel heading and key nav links
//      • Header shows admin name + /dashboard/admin link for role 1 user
//      • Cart badge count reflects number of items in CartProvider
//      • Header categories dropdown populated via mocked axios
//      • Footer renders About / Contact / Privacy Policy links
//
//  Level 4.1 — Full App routing to /dashboard/admin/products, AdminRoute passes  [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /dashboard/admin/products, user is an
//           authenticated admin, /api/v1/auth/admin-auth returns ok:true so
//           AdminRoute renders Outlet. Parallel to Dashboard Level 4.1 tests.
//    What is tested:
//      • Route renders Products page with AdminMenu and product list heading
//      • 0 products: heading renders and no product images in the DOM
//      • 1 product: card renders via full App tree
//      • many (3) products: all 3 card names render via full App tree
//      • Navbar brand link renders (App > Products > Layout > Header > brand)
//      • SearchInput renders (App > Products > Layout > Header > SearchInput)
//      • Header Home nav link renders (App > Products > Layout > Header > nav)
//      • Footer copyright text renders (App > Products > Layout > Footer > h4)
//      • Header shows admin name + /dashboard/admin link via full App tree
//
//  Level 4.2 — AdminRoute redirects + product click navigates to UpdateProduct  [5 tests]
//    → IMPLEMENTED BELOW
//    Scope: AdminRoute redirect scenarios (no token / expired token) plus
//           cross-page navigation (product card click → UpdateProduct page).
//    What is tested:
//      • No token: Spinner countdown text visible before redirect
//      • No token: after Spinner countdown, /login renders with LOGIN FORM
//      • Expired/invalid token: after countdown, /login renders with key inputs
//      • Expired/invalid token: toast "Session expired. Please login again." visible
//      • Clicking a product card navigates to /dashboard/admin/product/:slug
//        (UpdateProduct page renders with "Update Product" heading)
//
// ────────────────────────────────────────────────────────────────────────────
//  TOTAL: 23 test cases
// ────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "../../pages/admin/Products";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// ── Product fixtures ──────────────────────────────────────────────────────────

const PRODUCT_1 = {
  _id: "p1",
  name: "Widget A",
  description: "A great widget",
  slug: "widget-a",
};
const PRODUCT_2 = {
  _id: "p2",
  name: "Gadget B",
  description: "Nice gadget",
  slug: "gadget-b",
};
const PRODUCT_3 = {
  _id: "p3",
  name: "Doohickey C",
  description: "Cool thing",
  slug: "doohickey-c",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds localStorage then renders <Products /> directly (bypassing AdminRoute)
 * wrapped in the real provider chain. Used for Level 3 tests.
 */
function renderProducts({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
  products = [],
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/product/get-product") {
      return Promise.resolve({ data: { products } });
    }
    return Promise.resolve({ data: { success: true, category: categories } });
  });

  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Products />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Renders <App /> at /dashboard/admin/products with the real provider chain.
 * Mocks axios to return ok:true for AdminRoute's auth check so that
 * Products renders (rather than redirecting to /login). Used for Level 4.1 tests.
 */
function renderAppAtProducts({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
  products = [],
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  // AdminRoute calls /api/v1/auth/admin-auth with a valid admin token and expects
  // { ok: true }. Products.js calls /api/v1/product/get-product. All other GET
  // calls (e.g., useCategory) return the categories list.
  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/auth/admin-auth") {
      return Promise.resolve({ data: { ok: true } });
    }
    if (url === "/api/v1/product/get-product") {
      return Promise.resolve({ data: { products } });
    }
    return Promise.resolve({ data: { success: true, category: categories } });
  });

  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <App />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

// The real Header always fires useCategory (axios.get → setCategories) in a
// useEffect. In tests that don't await the mock resolution, React emits an
// "not wrapped in act()" warning. This is an expected testing-environment
// artifact of using the real component tree — not a code bug — so we filter
// it out here rather than polluting every test with an extra waitFor.
let consoleErrorSpy;
beforeAll(() => {
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((msg, ...args) => {
      if (typeof msg === "string" && msg.includes("not wrapped in act")) {
        return;
      }
      process.stderr.write([msg, ...args].map(String).join(" ") + "\n");
    });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  // clearAllMocks resets call history but keeps mock implementations active,
  // so the consoleErrorSpy installed in beforeAll stays in effect.
  jest.clearAllMocks();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 3 — Products + real Layout + real Header + real Footer
// ─────────────────────────────────────────────────────────────────────────────

// Shared admin user fixture for L3 tests
const L3_ADMIN = {
  _id: "a1",
  name: "Admin User",
  email: "admin@test.com",
  role: 1,
};

describe("Level 3 — Products + real Layout + real Header + real Footer", () => {
  // ── Page heading ─────────────────────────────────────────────────────────

  it("L3.1 renders 'All Products List' heading", async () => {
    renderProducts({ user: L3_ADMIN, token: "tok" });
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products list/i })
      ).toBeInTheDocument();
    });
  });

  // ── 0 / 1 / many products ────────────────────────────────────────────────

  it("L3.2 renders no product images when product list is empty", async () => {
    renderProducts({ user: L3_ADMIN, token: "tok", products: [] });
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products list/i })
      ).toBeInTheDocument();
    });
    // Product cards each render <img alt={p.name}> — none should be present
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("L3.3 renders one product card with name and description", async () => {
    renderProducts({ user: L3_ADMIN, token: "tok", products: [PRODUCT_1] });
    await waitFor(() => {
      expect(screen.getByAltText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Widget A")).toBeInTheDocument();
    expect(screen.getByText("A great widget")).toBeInTheDocument();
  });

  it("L3.4 renders all cards when multiple products are returned", async () => {
    renderProducts({
      user: L3_ADMIN,
      token: "tok",
      products: [PRODUCT_1, PRODUCT_2, PRODUCT_3],
    });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
    expect(screen.getByText("Doohickey C")).toBeInTheDocument();
  });

  // ── AdminMenu ────────────────────────────────────────────────────────────

  it("L3.5 AdminMenu renders Admin Panel heading and key nav links", () => {
    renderProducts({ user: L3_ADMIN, token: "tok" });
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create product/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^products$/i })
    ).toBeInTheDocument();
  });

  // ── Header: admin user ───────────────────────────────────────────────────

  it("L3.6 Header shows admin name and /dashboard/admin link for role-1 user", async () => {
    renderProducts({ user: L3_ADMIN, token: "tok" });
    await waitFor(() => {
      expect(
        screen.getAllByText("Admin User").length
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toHaveAttribute("href", "/dashboard/admin");
  });

  // ── Cart badge ───────────────────────────────────────────────────────────

  it("L3.7 cart badge count reflects number of items in CartProvider", async () => {
    renderProducts({
      user: L3_ADMIN,
      token: "tok",
      cartItems: [{ _id: "x1" }, { _id: "x2" }, { _id: "x3" }],
    });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  // ── Header: categories ───────────────────────────────────────────────────

  it("L3.8 Header shows category list loaded via mocked axios", async () => {
    renderProducts({
      user: L3_ADMIN,
      token: "tok",
      categories: [{ name: "Electronics", slug: "electronics" }],
    });
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("L3.9 Footer renders About, Contact and Privacy Policy links", () => {
    renderProducts({ user: L3_ADMIN, token: "tok" });
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^contact$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /privacy policy/i })
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.1 — Full App routing to /dashboard/admin/products (AdminRoute passes)
// ─────────────────────────────────────────────────────────────────────────────

// Shared admin fixture for L4.1 tests
const L4_ADMIN = {
  _id: "a1",
  name: "App Admin",
  email: "appadmin@test.com",
  role: 1,
};

describe(
  "Level 4.1 — Full App routing to /dashboard/admin/products (AdminRoute passes)",
  () => {
    it("L4.1.1 route renders Products page with AdminMenu and product list heading", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
    });

    it("L4.1.2 0 products: heading renders and no product images in the DOM", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok", products: [] });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(screen.queryAllByRole("img")).toHaveLength(0);
    });

    it("L4.1.3 1 product: card renders via full App tree", async () => {
      renderAppAtProducts({
        user: L4_ADMIN,
        token: "admin-tok",
        products: [PRODUCT_1],
      });
      await waitFor(() => {
        expect(screen.getByAltText("Widget A")).toBeInTheDocument();
      });
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    it("L4.1.4 many products: all 3 card names render via full App tree", async () => {
      renderAppAtProducts({
        user: L4_ADMIN,
        token: "admin-tok",
        products: [PRODUCT_1, PRODUCT_2, PRODUCT_3],
      });
      await waitFor(() => {
        expect(screen.getByText("Widget A")).toBeInTheDocument();
      });
      expect(screen.getByText("Gadget B")).toBeInTheDocument();
      expect(screen.getByText("Doohickey C")).toBeInTheDocument();
    });

    // ── Child / grandchild rendering via full App tree ──────────────────────
    // These tests verify the deep component chain
    // App → AdminRoute (passes) → Products → Layout → Header/Footer and their
    // own children are all correctly mounted when the route is reached.

    it("L4.1.5 Header navbar brand renders (App > Products > Layout > Header > brand)", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("link", { name: /virtual vault/i })
      ).toBeInTheDocument();
    });

    it("L4.1.6 SearchInput renders inside Header (App > Products > Layout > Header > SearchInput)", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    });

    it("L4.1.7 Header Home nav link renders (App > Products > Layout > Header > nav)", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("link", { name: /^home$/i })
      ).toBeInTheDocument();
    });

    it("L4.1.8 Footer copyright text renders (App > Products > Layout > Footer > h4)", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /all products list/i })
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    });

    it("L4.1.9 Header shows admin name and /dashboard/admin link via full App tree", async () => {
      renderAppAtProducts({ user: L4_ADMIN, token: "admin-tok" });
      await waitFor(() => {
        expect(
          screen.getAllByText("App Admin").length
        ).toBeGreaterThanOrEqual(1);
      });
      expect(
        screen.getByRole("link", { name: /dashboard/i })
      ).toHaveAttribute("href", "/dashboard/admin");
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.2 — AdminRoute redirects + product click navigates to UpdateProduct
// ─────────────────────────────────────────────────────────────────────────────
//
// Spinner.js counts down from 3 to 0 (1 s per tick) before calling navigate().
// We use jest.useFakeTimers() so that advanceTimersByTime(3500) triggers the
// full countdown instantly without slowing down the test suite.
// The toast is called in AdminRoute's catch block (before Spinner renders).
// react-hot-toast's global store holds the queued toast; Login's Layout renders
// <Toaster/> which reads the store on mount and displays the pre-existing toast.

describe(
  "Level 4.2 — AdminRoute redirects + product click → UpdateProduct",
  () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
      // react-hot-toast uses a global store; dismiss all toasts between tests so
      // that queued toasts from one test don't appear in the next test.
      toast.dismiss();
    });

    it("L4.2.1 no token: Spinner countdown text is visible before redirect completes", async () => {
      localStorage.clear();
      jest.spyOn(axios, "get").mockResolvedValue({
        data: { success: true, category: [] },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <App />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Advance only 500 ms — countdown is still in progress
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
    });

    it("L4.2.2 no token: after Spinner countdown, /login renders with LOGIN FORM and key inputs", async () => {
      localStorage.clear();
      jest.spyOn(axios, "get").mockResolvedValue({
        data: { success: true, category: [] },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <App />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Advance past the full 3-second countdown
      await act(async () => {
        jest.advanceTimersByTime(3500);
      });

      expect(screen.getByText(/LOGIN FORM/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i)
      ).toBeInTheDocument();
    });

    it("L4.2.3 expired/invalid token: after Spinner countdown, /login renders with LOGIN FORM and key inputs", async () => {
      const expiredAdmin = { _id: "a1", name: "Expired Admin", role: 1 };
      localStorage.setItem(
        "auth",
        JSON.stringify({ user: expiredAdmin, token: "expired-tok" })
      );

      // /api/v1/auth/admin-auth → 401 (triggers AdminRoute's catch block)
      // other axios.get calls (useCategory) → resolve normally
      jest.spyOn(axios, "get").mockImplementation((url) => {
        if (url === "/api/v1/auth/admin-auth") {
          return Promise.reject(
            new Error("Request failed with status code 401")
          );
        }
        return Promise.resolve({ data: { success: true, category: [] } });
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <App />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Flush the Promise chain so AdminRoute's catch block fires (setOk, setAuth,
      // localStorage.removeItem, toast.error) before advancing the Spinner countdown
      await act(async () => {
        await Promise.resolve(); // let useEffect run + axios rejection propagate
        await Promise.resolve(); // complete the catch block's state updates
        jest.advanceTimersByTime(3500); // Spinner counts down → navigate('/login')
        await Promise.resolve(); // flush Login render + Toaster subscription
      });

      expect(screen.getByText(/LOGIN FORM/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your email/i)
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter your password/i)
      ).toBeInTheDocument();
    });

    it("L4.2.4 expired/invalid token: toast 'Session expired. Please login again.' is visible after redirect", async () => {
      const expiredAdmin = { _id: "a1", name: "Expired Admin", role: 1 };
      localStorage.setItem(
        "auth",
        JSON.stringify({ user: expiredAdmin, token: "expired-tok" })
      );

      jest.spyOn(axios, "get").mockImplementation((url) => {
        if (url === "/api/v1/auth/admin-auth") {
          return Promise.reject(
            new Error("Request failed with status code 401")
          );
        }
        return Promise.resolve({ data: { success: true, category: [] } });
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <App />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Same flush-then-advance pattern as L4.2.3.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(3500);
        await Promise.resolve();
      });

      // Extra flush for the Toaster to process the queued store state
      await act(async () => {
        await Promise.resolve();
      });

      expect(
        screen.getAllByText("Session expired. Please login again.").length
      ).toBeGreaterThanOrEqual(1);
    });

  }
);

// L4.2.5 is in its own describe block (no fake timers) because
// @testing-library/dom's waitFor timeout handler throws a TypeError when
// fake timers are active, causing false CI failures regardless of timeout value.
describe(
  "Level 4.2.5 — product click → UpdateProduct (real timers)",
  () => {
    afterEach(() => {
      toast.dismiss();
    });

    it("L4.2.5 clicking a product card navigates to UpdateProduct page", async () => {
      const adminUser = { _id: "a1", name: "Admin User", role: 1 };
      localStorage.setItem(
        "auth",
        JSON.stringify({ user: adminUser, token: "valid-tok" })
      );

      jest.spyOn(axios, "get").mockImplementation((url) => {
        if (url === "/api/v1/auth/admin-auth") {
          return Promise.resolve({ data: { ok: true } });
        }
        if (url === "/api/v1/product/get-product") {
          return Promise.resolve({ data: { products: [PRODUCT_1] } });
        }
        // UpdateProduct loads the single product by slug and categories
        if (url.includes(PRODUCT_1.slug)) {
          return Promise.resolve({
            data: { product: { ...PRODUCT_1, category: { _id: "cat-1", name: "Electronics" } } },
          });
        }
        return Promise.resolve({ data: { success: true, category: [] } });
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <App />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for the product card to appear (img alt = product name)
      await waitFor(() => {
        expect(screen.getByAltText("Widget A")).toBeInTheDocument();
      }, { timeout: 10000 });

      // Click the product image — the click bubbles up to the wrapping Link
      fireEvent.click(screen.getByAltText("Widget A"));

      // UpdateProduct page should now be rendered
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /update product/i })
        ).toBeInTheDocument();
      }, { timeout: 10000 });
    }, 30000);
  }
);
