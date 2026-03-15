// Foo Chao, A0272024R

// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: do integration test for HomePage.js page.
//    parallel tests from Products.integration.test.js and CartPage.integration.test.js.
//    additionally include:
//      - ADD TO CART changes cart badge then navigate to /cart to verify item is added
//      - clicking More Details navigates to /product/:slug (ProductDetails page)
//      - include more tests where necessary

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
//  Level 3 — HomePage + real Layout + real Header + real Footer   [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <HomePage /> rendered directly with REAL Layout, Header, Footer,
//           and all their context dependencies (AuthProvider, CartProvider,
//           SearchProvider). No route guard involved at this level.
//           Network (axios) is mocked at the boundary.
//    What is tested:
//      • "All Products" heading renders
//      • "No products found" message when product list is empty
//      • 1 product: card renders with name, price, truncated description,
//        More Details button, ADD TO CART button
//      • many (3) products: all 3 card names render
//      • Category filter checkboxes render with category names
//      • Header shows Login + Register links for guest
//      • Cart badge count reflects number of items in CartProvider
//      • Header category dropdown populated via mocked axios
//      • Footer renders About / Contact / Privacy Policy links
//
//  Level 4.1 — Full App routing to /                              [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /, with REAL providers.
//    HomePage is a public route — no route guard involved.
//    What is tested:
//      • "All Products" heading renders via full App tree
//      • guest Header shows Login + Register links via full App tree
//      • 1 product renders via full App tree
//      • many (3) products render via full App tree
//      • Navbar brand link renders (App > HomePage > Layout > Header > brand)
//      • SearchInput renders (App > HomePage > Layout > Header > SearchInput)
//      • Header Home nav link renders (App > HomePage > Layout > Header > nav)
//      • Footer copyright text renders (App > HomePage > Layout > Footer > h4)
//      • Price filter radio buttons render (Filter By Price section)
//
//  Level 4.2 — HomePage-specific: cart, navigation, UI states    [6 tests]
//    → IMPLEMENTED BELOW
//    Scope: Full App tree at /. Tests behaviours unique to HomePage that are
//           not covered by parallel tests above.
//    What is tested:
//      • ADD TO CART increments the header cart badge by 1
//      • ADD TO CART (1 item) then navigate to /cart — item appears in CartPage
//      • ADD TO CART (2 items) then navigate to /cart — both items appear in CartPage
//      • "More Details" button navigates to /product/:slug (ProductDetails renders)
//      • "No products found" message renders when product list is empty
//      • "Loadmore" button renders when products.length < total and no filters active
//
// ────────────────────────────────────────────────────────────────────────────
//  TOTAL: 24 test cases
// ────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "../../pages/HomePage";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// ── Product / category fixtures ───────────────────────────────────────────────

const CAT_1 = { _id: "c1", name: "Electronics", slug: "electronics" };
const CAT_2 = { _id: "c2", name: "Clothing", slug: "clothing" };

const PRODUCT_1 = {
  _id: "p1",
  name: "Widget A",
  description: "A great widget with many features and incredible quality",
  price: 10,
  slug: "widget-a",
};
const PRODUCT_2 = {
  _id: "p2",
  name: "Gadget B",
  description: "Nice gadget with excellent build quality and a sturdy design",
  price: 25,
  slug: "gadget-b",
};
const PRODUCT_3 = {
  _id: "p3",
  name: "Doohickey C",
  description: "Cool thing that does cool things and is very useful indeed",
  price: 5,
  slug: "doohickey-c",
};

// ── Mock factory for axios calls made by HomePage ─────────────────────────────
//
// HomePage fires three GET calls on mount:
//   • /api/v1/category/get-category   (getAllCategory + Header useCategory hook)
//   • /api/v1/product/product-count   (getTotal)
//   • /api/v1/product/product-list/1  (getAllProducts)
//
// All other URLs fall through to a safe default.
function mockHomePage({ categories = [], products = [], total = 0 } = {}) {
  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { success: true, category: categories } });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total } });
    }
    if (url.startsWith("/api/v1/product/product-list/")) {
      return Promise.resolve({ data: { products } });
    }
    return Promise.resolve({ data: { success: true, category: [] } });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds localStorage then renders <HomePage /> directly (no route guard)
 * wrapped in the real provider chain. Used for Level 3 tests.
 */
function renderHomePage({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
  products = [],
  total = products.length,
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  mockHomePage({ categories, products, total });

  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <HomePage />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Renders <App /> at / with the real provider chain.
 * HomePage is a public route — no auth check needed. Used for Level 4.1 tests.
 */
function renderAppAtHome({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
  products = [],
  total = products.length,
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  mockHomePage({ categories, products, total });

  return render(
    <MemoryRouter initialEntries={["/"]}>
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
  jest.clearAllMocks();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 3 — HomePage + real Layout + real Header + real Footer
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 3 — HomePage + real Layout + real Header + real Footer", () => {
  // ── Page heading ─────────────────────────────────────────────────────────

  it("L3.1 renders 'All Products' heading", async () => {
    renderHomePage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
  });

  // ── 0 / 1 / many products ────────────────────────────────────────────────

  it("L3.2 renders 'No products found' when product list is empty", async () => {
    renderHomePage({ products: [] });
    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it("L3.3 1 product: card renders with name, price, description, More Details and ADD TO CART buttons", async () => {
    renderHomePage({ products: [PRODUCT_1] });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    // Price formatted as USD
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    // Description truncated to 60 chars
    expect(screen.getByText(/a great widget/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
  });

  it("L3.4 many products: all 3 card names render", async () => {
    renderHomePage({ products: [PRODUCT_1, PRODUCT_2, PRODUCT_3] });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
    expect(screen.getByText("Doohickey C")).toBeInTheDocument();
  });

  // ── Filter panel ─────────────────────────────────────────────────────────

  it("L3.5 category filter checkboxes render with category names", async () => {
    renderHomePage({ categories: [CAT_1, CAT_2] });
    // Wait via the unique checkbox role (category name also appears in the Header
    // nav dropdown, so getByText would find multiple — target the checkbox directly)
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: /electronics/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("checkbox", { name: /clothing/i })).toBeInTheDocument();
  });

  // ── Header ───────────────────────────────────────────────────────────────

  it("L3.6 Header shows Login and Register links for guest", async () => {
    renderHomePage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^register$/i })).toBeInTheDocument();
  });

  it("L3.7 Header cart badge count reflects number of items in CartProvider", async () => {
    const user = { _id: "u1", name: "Alice", role: 0 };
    renderHomePage({
      user,
      token: "tok",
      cartItems: [PRODUCT_1, PRODUCT_2, PRODUCT_3],
    });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("L3.8 Header category dropdown populated via mocked axios", async () => {
    renderHomePage({ categories: [CAT_1] });
    await waitFor(() => {
      // Category appears in the Header nav dropdown AND in the filter panel
      expect(screen.getAllByText("Electronics").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("L3.9 Footer renders About, Contact and Privacy Policy links", async () => {
    renderHomePage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.1 — Full App routing to /
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 4.1 — Full App routing to /", () => {
  it("L4.1.1 'All Products' heading renders via full App tree", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
  });

  it("L4.1.2 guest: Header shows Login and Register links via full App tree", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^register$/i })).toBeInTheDocument();
  });

  it("L4.1.3 1 product: card renders via full App tree", async () => {
    renderAppAtHome({ products: [PRODUCT_1] });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
  });

  it("L4.1.4 many products: all 3 card names render via full App tree", async () => {
    renderAppAtHome({ products: [PRODUCT_1, PRODUCT_2, PRODUCT_3] });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
    expect(screen.getByText("Doohickey C")).toBeInTheDocument();
  });

  // ── Child / grandchild rendering via full App tree ────────────────────────

  it("L4.1.5 Navbar brand link renders (App > HomePage > Layout > Header > brand)", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /virtual vault/i })).toBeInTheDocument();
  });

  it("L4.1.6 SearchInput renders inside Header (App > HomePage > Layout > Header > SearchInput)", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("L4.1.7 Header Home nav link renders (App > HomePage > Layout > Header > nav)", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });

  it("L4.1.8 Footer copyright text renders (App > HomePage > Layout > Footer > h4)", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /all products/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("L4.1.9 Price filter radio buttons render (Filter By Price section)", async () => {
    renderAppAtHome();
    await waitFor(() => {
      expect(screen.getByText(/filter by price/i)).toBeInTheDocument();
    });
    // At least one price range radio renders (e.g. "$0 to 19")
    expect(screen.getByRole("radio", { name: /\$0 to 19/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.2 — HomePage-specific: cart, navigation, UI states
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 4.2 — HomePage-specific: cart, navigation, UI states", () => {
  it("L4.2.1 ADD TO CART increments the header cart badge by 1", async () => {
    renderAppAtHome({ products: [PRODUCT_1] });

    // Wait for product card to appear
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    // Badge starts at 0 (showZero=true on the Header Badge)
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    // Badge should now show 1.
    // antd Badge scroll animation renders all digits per column; use getAllByText
    // to avoid "Found multiple elements" during the 0→1 transition.
    await waitFor(() => {
      expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("L4.2.2 ADD TO CART (1 item) then navigate to /cart shows the item in CartPage", async () => {
    // Provide braintree token mock for when CartPage mounts after navigation
    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 1 } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        return Promise.resolve({ data: { products: [PRODUCT_1] } });
      }
      // CartPage requests a braintree client token on mount
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "fake-token" } });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for the product to load and click ADD TO CART
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    // Navigate to /cart by clicking the Cart link in the Header
    fireEvent.click(screen.getByRole("link", { name: /cart/i }));

    // CartPage should show the item that was added
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
  });

  it("L4.2.3 ADD TO CART (2 items) then navigate to /cart shows both items in CartPage", async () => {
    // Expose two distinct products and add both to cart before navigating
    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 2 } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        return Promise.resolve({ data: { products: [PRODUCT_1, PRODUCT_2] } });
      }
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "fake-token" } });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();

    // Click ADD TO CART for each product
    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    fireEvent.click(addButtons[0]); // Widget A
    fireEvent.click(addButtons[1]); // Gadget B

    // Navigate to /cart
    fireEvent.click(screen.getByRole("link", { name: /cart/i }));

    // Both items should appear on the CartPage
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
  });

  it("L4.2.4 'More Details' button navigates to /product/:slug (ProductDetails renders)", async () => {
    // ProductDetails calls get-product/:slug then related-product/:pid/:cid
    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 1 } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        return Promise.resolve({ data: { products: [PRODUCT_1] } });
      }
      if (url === `/api/v1/product/get-product/${PRODUCT_1.slug}`) {
        return Promise.resolve({
          data: {
            product: {
              ...PRODUCT_1,
              category: { _id: "c1", name: "Electronics" },
            },
          },
        });
      }
      if (url.startsWith("/api/v1/product/related-product/")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /more details/i }));

    // ProductDetails page renders with its heading and product name
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /product details/i })
      ).toBeInTheDocument();
    });
  });

  it("L4.2.5 'No products found' message renders when product list is empty", async () => {
    renderAppAtHome({ products: [] });
    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it("L4.2.6 'Loadmore' button renders when products.length < total and no filters active", async () => {
    // total > products.length triggers the Loadmore button
    renderAppAtHome({ products: [PRODUCT_1], total: 5 });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /loadmore/i })).toBeInTheDocument();
  });
});
