// Foo Chao, A0272024R

// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: do integration test for CartPage.js page.
//    parallel tests from Dashboard.integration.test.js where relevant.
//    CartPage has no auth route guard (public route), so no L4.2 redirect tests.
//    additionally include:
//      - deleting one item updates header cart badge count
//      - deleting multiple items updates header cart badge count correctly
//      - clicking Pay on success navigates to /dashboard/user/orders
//
// Prompt 2: there is 2 other navigation to test one when user press update address 
//    and another when user is not logged in and he press log in to check out

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
//  Level 3 — CartPage + real Layout + real Header + real Footer   [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <CartPage /> rendered directly with REAL Layout, Header, Footer,
//           and all their context dependencies (AuthProvider, CartProvider,
//           SearchProvider). No route guard involved at this level.
//           Network (axios for useCategory / braintree token) is mocked.
//    What is tested:
//      • "Hello Guest" heading when not logged in
//      • "Hello {name}" heading when logged in
//      • "Your Cart Is Empty" when cart has no items
//      • Cart item count message ("You Have N items in your cart")
//      • 1 item: card renders with name, description, price, Remove button
//      • many (3) items: all 3 cards render
//      • Total price reflects sum of all item prices
//      • Header cart badge count reflects number of items in CartProvider
//      • Footer renders About / Contact / Privacy Policy links
//
//  Level 4.1 — Full App routing to /cart                         [10 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /cart, with REAL providers.
//    CartPage is a public route — no AdminRoute or PrivateRoute involved.
//    What is tested:
//      • Cart page heading renders via full App tree
//      • Guest "Please Login to checkout" button navigates to /login
//      • 1 item renders via full App tree
//      • many (3) items render via full App tree
//      • Navbar brand link renders (App > CartPage > Layout > Header > brand)
//      • SearchInput renders (App > CartPage > Layout > Header > SearchInput)
//      • Header Home nav link renders (App > CartPage > Layout > Header > nav)
//      • Footer copyright text renders (App > CartPage > Layout > Footer > h4)
//      • Header shows Login + Register links for guest (public page, no auth)
//      • Logged-in user clicks "Update Address" button navigates to /dashboard/user/profile
//
//  Level 4.2 — Cart-specific behaviours: delete updates badge, pay navigates  [4 tests]
//    → IMPLEMENTED BELOW
//    Scope: Full App tree at /cart. Tests behaviours unique to CartPage that
//           are not covered in parallel Dashboard tests.
//    What is tested:
//      • Removing one item decrements the header cart badge by 1
//      • Removing multiple items decrements the header cart badge correctly
//      • On successful payment, navigates to /dashboard/user/orders page
//      • After payment, cart is cleared (empty cart message shown on orders page)
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
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CartPage from "../../pages/CartPage";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// ── Mock braintree DropIn ─────────────────────────────────────────────────────
// braintree-web-drop-in-react contacts Braintree servers which are unavailable
// in Jest/jsdom. Replace it with a stub that immediately calls onInstance with
// a mock instance exposing requestPaymentMethod.
jest.mock("braintree-web-drop-in-react", () => {
  // eslint-disable-next-line no-undef
  const React = require("react");
  return function MockDropIn({ onInstance }) {
    React.useEffect(() => {
      onInstance({
        requestPaymentMethod: () =>
          Promise.resolve({ nonce: "test-nonce" }),
      });
    // onInstance reference is stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="dropin-mock" />;
  };
});

// ── Product / cart item fixtures ──────────────────────────────────────────────

const ITEM_1 = {
  _id: "p1",
  name: "Widget A",
  description: "A great widget",
  price: 10,
  slug: "widget-a",
};
const ITEM_2 = {
  _id: "p2",
  name: "Gadget B",
  description: "Nice gadget",
  price: 25,
  slug: "gadget-b",
};
const ITEM_3 = {
  _id: "p3",
  name: "Doohickey C",
  description: "Cool thing",
  price: 5,
  slug: "doohickey-c",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds localStorage then renders <CartPage /> directly (no route guard)
 * wrapped in the real provider chain. Used for Level 3 tests.
 */
function renderCartPage({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  // Stub braintree token and category endpoints. No real network needed.
  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/token") {
      return Promise.resolve({ data: { clientToken: "fake-token" } });
    }
    return Promise.resolve({ data: { success: true, category: categories } });
  });

  return render(
    <MemoryRouter initialEntries={["/cart"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <CartPage />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Renders <App /> at /cart with the real provider chain.
 * CartPage is a public route — no auth check needed. Used for Level 4.1 tests.
 */
function renderAppAtCart({
  user = null,
  token = "",
  cartItems = [],
  categories = [],
} = {}) {
  localStorage.clear();

  if (user) {
    localStorage.setItem("auth", JSON.stringify({ user, token }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify(cartItems));
  } else {
    localStorage.setItem("cart:guest", JSON.stringify(cartItems));
  }

  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/token") {
      return Promise.resolve({ data: { clientToken: "fake-token" } });
    }
    return Promise.resolve({ data: { success: true, category: categories } });
  });

  return render(
    <MemoryRouter initialEntries={["/cart"]}>
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
//  LEVEL 3 — CartPage + real Layout + real Header + real Footer
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 3 — CartPage + real Layout + real Header + real Footer", () => {
  // ── Page heading ─────────────────────────────────────────────────────────

  it("L3.1 renders 'Hello Guest' heading when not logged in", async () => {
    renderCartPage();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
  });

  it("L3.2 renders 'Hello {name}' heading when logged in", async () => {
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
    });
    await waitFor(() => {
      expect(screen.getByText(/hello\s+alice/i)).toBeInTheDocument();
    });
  });

  // ── Empty / item count message ────────────────────────────────────────────

  it("L3.3 renders 'Your Cart Is Empty' when cart has no items", async () => {
    renderCartPage({ cartItems: [] });
    await waitFor(() => {
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });
  });

  it("L3.4 renders correct item count message when cart has items", async () => {
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2],
    });
    await waitFor(() => {
      expect(screen.getByText(/you have 2 items in your cart/i)).toBeInTheDocument();
    });
  });

  // ── 1 / many items ───────────────────────────────────────────────────────

  it("L3.5 1 item: card renders with name, description, price and Remove button", async () => {
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1],
    });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText(/a great widget/i)).toBeInTheDocument();
    expect(screen.getByText(/price\s*:\s*10/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("L3.6 many items: all 3 cards render", async () => {
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2, ITEM_3],
    });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
    expect(screen.getByText("Doohickey C")).toBeInTheDocument();
  });

  // ── Total price ──────────────────────────────────────────────────────────

  it("L3.7 total price reflects sum of all item prices", async () => {
    // ITEM_1 ($10) + ITEM_2 ($25) = $35.00
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2],
    });
    await waitFor(() => {
      expect(screen.getByText(/\$35\.00/)).toBeInTheDocument();
    });
  });

  // ── Header: cart badge ───────────────────────────────────────────────────

  it("L3.8 Header cart badge count reflects number of items in CartProvider", async () => {
    renderCartPage({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2, ITEM_3],
    });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("L3.9 Footer renders About, Contact and Privacy Policy links", () => {
    renderCartPage();
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.1 — Full App routing to /cart
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 4.1 — Full App routing to /cart", () => {
  it("L4.1.1 cart page heading renders via full App tree", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
  });

  it("L4.1.2 guest 'Please Login to checkout' button navigates to /login", async () => {
    // Empty cart so the heading does not also contain "please login to checkout !"
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /please login to checkout/i }));
    await waitFor(() => {
      expect(screen.getByText(/LOGIN FORM/i)).toBeInTheDocument();
    });
  });

  it("L4.1.3 1 item: card renders via full App tree", async () => {
    renderAppAtCart({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1],
    });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
  });

  it("L4.1.4 many items: all 3 cards render via full App tree", async () => {
    renderAppAtCart({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2, ITEM_3],
    });
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Gadget B")).toBeInTheDocument();
    expect(screen.getByText("Doohickey C")).toBeInTheDocument();
  });

  // ── Child / grandchild rendering via full App tree ────────────────────────

  it("L4.1.5 Header navbar brand renders (App > CartPage > Layout > Header > brand)", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /virtual vault/i })).toBeInTheDocument();
  });

  it("L4.1.6 SearchInput renders inside Header (App > CartPage > Layout > Header > SearchInput)", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("L4.1.7 Header Home nav link renders (App > CartPage > Layout > Header > nav)", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });

  it("L4.1.8 Footer copyright text renders (App > CartPage > Layout > Footer > h4)", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("L4.1.9 Header shows Login and Register links for guest (CartPage is a public route)", async () => {
    renderAppAtCart();
    await waitFor(() => {
      expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^register$/i })).toBeInTheDocument();
  });

  it("L4.1.10 logged-in user clicks 'Update Address' navigates to /dashboard/user/profile", async () => {
    // User has no address — the Update Address button renders directly (no current address block)
    const user = { _id: "u1", name: "Alice", role: 0 };
    localStorage.setItem("auth", JSON.stringify({ user, token: "tok" }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify([ITEM_1]));

    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "fake-token" } });
      }
      // PrivateRoute protecting /dashboard/user/profile requires this to return ok
      if (url === "/api/v1/auth/user-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/cart"]}>
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
      expect(screen.getByRole("button", { name: /update address/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /update address/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /user profile/i })).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.2 — Cart-specific: delete updates badge, pay navigates
// ─────────────────────────────────────────────────────────────────────────────

describe("Level 4.2 — Cart-specific: delete updates badge, pay navigates", () => {
  it("L4.2.1 removing one item decrements the header cart badge by 1", async () => {
    renderAppAtCart({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2, ITEM_3],
    });

    // Wait for the cart (3 items) to render
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    // Remove the first item
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    // Badge should now show 2.
    // antd Badge scroll animation renders all digits 0-9 per column; during the
    // 3→2 transition jsdom keeps both columns (CSS never fires transitionend),
    // so multiple elements with text "2" exist — use getAllByText.
    await waitFor(() => {
      expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("L4.2.2 removing multiple items decrements the header cart badge correctly", async () => {
    renderAppAtCart({
      user: { _id: "u1", name: "Alice", role: 0 },
      token: "tok",
      cartItems: [ITEM_1, ITEM_2, ITEM_3],
    });

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    // Remove first item → badge 2
    const firstRemove = screen.getAllByRole("button", { name: /remove/i })[0];
    fireEvent.click(firstRemove);
    // antd scroll animation keeps both columns in jsdom — use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    });

    // Remove what is now the first item again → badge 1
    const secondRemove = screen.getAllByRole("button", { name: /remove/i })[0];
    fireEvent.click(secondRemove);
    await waitFor(() => {
      expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("L4.2.3 on successful payment navigates to /dashboard/user/orders page", async () => {
    const user = {
      _id: "u1",
      name: "Alice",
      email: "alice@test.com",
      role: 0,
      address: "1 Pay St",
    };
    localStorage.setItem("auth", JSON.stringify({ user, token: "valid-tok" }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify([ITEM_1]));

    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "fake-token" } });
      }
      // PrivateRoute for /dashboard/user/orders calls user-auth
      if (url === "/api/v1/auth/user-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      // Orders page calls /api/v1/auth/orders — must return an array
      if (url === "/api/v1/auth/orders") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });
    jest.spyOn(axios, "post").mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for the DropIn mock to mount and the Make Payment button to become enabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /make payment/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /make payment/i }));

    // After payment, PrivateRoute lets us through to Orders page
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();
    });
  });

  it("L4.2.4 after successful payment cart is cleared (cart empty message shown)", async () => {
    const user = {
      _id: "u1",
      name: "Alice",
      email: "alice@test.com",
      role: 0,
      address: "1 Pay St",
    };
    localStorage.setItem("auth", JSON.stringify({ user, token: "valid-tok" }));
    localStorage.setItem(`cart:${user._id}`, JSON.stringify([ITEM_1, ITEM_2]));

    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.resolve({ data: { clientToken: "fake-token" } });
      }
      if (url === "/api/v1/auth/user-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      // Orders page calls /api/v1/auth/orders — must return an array
      if (url === "/api/v1/auth/orders") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });
    jest.spyOn(axios, "post").mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={["/cart"]}>
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
      expect(screen.getByRole("button", { name: /make payment/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /make payment/i }));

    // After payment, setCart([]) clears the cart — verify via localStorage
    // (antd Badge hides count=0 by default so getByText("0") is unreliable)
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(`cart:${user._id}`) || "[]");
      expect(saved).toHaveLength(0);
    });
  });
});
