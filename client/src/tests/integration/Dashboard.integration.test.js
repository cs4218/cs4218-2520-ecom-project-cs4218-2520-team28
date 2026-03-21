// Foo Chao, A0272024R

// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: do integration test for Dashboard page.
//    it should contains all parallel tests from policy page and contact page if relevant which should be.
//    for level 4, split it to 4.1 and 4.2 where 4.1 focus on not having to cross page i.e those parallel
//    tests to contact page (private.js do not kick user out). 4.2 will be additional tests due to private
//    kicking user out, it need to test user are kicked out to private and brief test on whether the main
//    components of login are there with toast given
//    (note only brief checks for login components so it is not brittle)

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
//  Level 3 — Dashboard + real Layout + real Header + real Footer   [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <Dashboard /> rendered directly with REAL Layout, Header, Footer,
//           and all their context dependencies (AuthProvider, CartProvider,
//           SearchProvider). PrivateRoute is NOT involved at this level.
//           Network (axios) is mocked at the boundary.
//    What is tested:
//      • Page content: user name, email, address in the info card
//      • UserMenu: Profile and Orders NavLinks render
//      • document.title via react-helmet
//      • Header integration: user name + Dashboard href when logged in (role 0),
//        admin Dashboard href (role 1), category list via mocked axios
//      • Cart badge count reflects CartProvider items
//      • Footer integration: About / Contact / Privacy Policy links present
//
//  Level 4.1 — Full App routing to /dashboard/user, PrivateRoute passes  [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /dashboard/user, user is authenticated,
//           /api/v1/auth/user-auth returns ok:true so PrivateRoute renders Outlet.
//           Parallel to Contact/Policy Level 4 tests (no cross-page PrivateRoute
//           concern here).
//    What is tested:
//      • Route renders Dashboard content (UserMenu + user card)
//      • Header shows user name + /dashboard/user link
//      • Footer Contact link navigates to /contact (cross-page routing)
//      • After navigating away, Dashboard card content is gone
//      • Navbar brand link (App > Dashboard > Layout > Header > brand)
//      • SearchInput renders (App > … > Header > SearchInput > input)
//      • Header Home nav link renders (App > … > Header > nav)
//      • Footer copyright text (App > … > Layout > Footer > h4)
//      • document.title via full Helmet chain
//
//  Level 4.2 — PrivateRoute kicks out unauthenticated / expired users  [4 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /dashboard/user with no token or an
//           expired/invalid token. PrivateRoute fires <Spinner path="login"/>
//           which counts down 3 s then navigates to /login.
//    What is tested:
//      • No token: Spinner countdown text is visible before the redirect
//      • No token: after countdown, /login renders with LOGIN FORM heading
//        and key inputs (brief — not brittle)
//      • Expired/invalid token: after countdown, /login renders with the same
//        brief login component checks
//      • Expired/invalid token: toast "Session expired. Please login again."
//        is visible on the /login page (toast is queued in react-hot-toast's
//        global store when PrivateRoute's catch fires; Login's Layout renders
//        <Toaster/> which picks up the queued toast on mount)
//
// ────────────────────────────────────────────────────────────────────────────
//  TOTAL: 22 test cases
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
import Dashboard from "../../pages/user/Dashboard";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// Chi Thanh, A0276229W
// Mock Bi icons as simple components so integration tests avoid runtime icon-render errors.
jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span aria-hidden="true" data-testid="bi-mail-send" />,
  BiPhoneCall: () => <span aria-hidden="true" data-testid="bi-phone-call" />,
  BiSupport: () => <span aria-hidden="true" data-testid="bi-support" />,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Seeds localStorage with auth and cart state, then renders <Dashboard />
 * directly (bypassing PrivateRoute) wrapped in the real provider chain.
 * Used for Level 3 tests.
 */
function renderDashboard({
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

  jest.spyOn(axios, "get").mockResolvedValue({
    data: { success: true, category: categories },
  });

  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Dashboard />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Renders <App /> at /dashboard/user with the real provider chain.
 * Mocks axios.get to return ok:true for the PrivateRoute auth check so that
 * the Dashboard renders (rather than redirecting to /login).
 * Used for Level 4.1 tests.
 */
function renderAppAtDashboard({
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

  // PrivateRoute calls /api/v1/auth/user-auth with a valid token and expects
  // { ok: true }. All other GET calls (e.g., useCategory) get the categories.
  jest.spyOn(axios, "get").mockImplementation((url) => {
    if (url === "/api/v1/auth/user-auth") {
      return Promise.resolve({ data: { ok: true } });
    }
    return Promise.resolve({ data: { success: true, category: categories } });
  });

  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
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

// ── Setup / Teardown ─────────────────────────────────────────────────────────

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
      if (
        typeof msg === "string" &&
        msg.includes("not wrapped in act")
      ) {
        return;
      }
      process.stderr.write(
        [msg, ...args].map(String).join(" ") + "\n"
      );
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
//  LEVEL 3 — Dashboard + real Layout + real Header + real Footer
// ─────────────────────────────────────────────────────────────────────────────

// Shared user fixture for L3 tests
const L3_USER = {
  _id: "u1",
  name: "Test User",
  email: "test@test.com",
  address: "123 Test St",
  role: 0,
};

describe("Level 3 — Dashboard + real Layout + real Header + real Footer", () => {
  // ── Page content: user info card ─────────────────────────────────────────

  it("L3.1 user card renders user name from auth context", async () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    await waitFor(() => {
      // Name also appears in Header dropdown; assert at least one occurrence
      expect(screen.getAllByText("Test User").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("L3.2 user card renders user email from auth context", async () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    await waitFor(() => {
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });
  });

  it("L3.3 user card renders user address from auth context", async () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    await waitFor(() => {
      expect(screen.getByText("123 Test St")).toBeInTheDocument();
    });
  });

  // ── UserMenu ─────────────────────────────────────────────────────────────

  it("L3.4 UserMenu renders Profile and Orders NavLinks", () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    expect(screen.getByRole("link", { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^orders$/i })).toBeInTheDocument();
  });

  // ── document.title ───────────────────────────────────────────────────────

  it("L3.5 sets document title to 'Dashboard - Ecommerce App'", async () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    await waitFor(() => {
      expect(document.title).toBe("Dashboard - Ecommerce App");
    });
  });

  // ── Header: logged-in as regular user ────────────────────────────────────

  it("L3.6 Header shows user name and /dashboard/user link, badge shows item count", async () => {
    renderDashboard({
      user: { _id: "u2", name: "Badge User", role: 0 },
      token: "tok",
      cartItems: [{ _id: "p1" }, { _id: "p2" }],
    });
    await waitFor(() => {
      expect(screen.getAllByText("Badge User").length).toBeGreaterThanOrEqual(1);
    });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  // ── Header: logged-in as admin ───────────────────────────────────────────

  it("L3.7 Header Dashboard link points to /dashboard/admin for admin user (role 1)", async () => {
    renderDashboard({
      user: { _id: "a1", name: "Admin User", role: 1 },
      token: "admintok",
    });
    await waitFor(() => {
      expect(screen.getAllByText("Admin User").length).toBeGreaterThanOrEqual(1);
    });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
  });

  // ── Header: categories dropdown ──────────────────────────────────────────

  it("L3.8 Header shows category from useCategory in dropdown after axios resolves", async () => {
    renderDashboard({
      user: L3_USER,
      token: "tok",
      categories: [{ name: "Clothing", slug: "clothing" }],
    });
    await waitFor(() => {
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("L3.9 Footer renders About, Contact and Privacy Policy links", () => {
    renderDashboard({ user: L3_USER, token: "tok" });
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.1 — Full App routing to /dashboard/user (PrivateRoute passes)
// ─────────────────────────────────────────────────────────────────────────────

// Shared auth fixture for L4.1 tests
const L4_USER = {
  _id: "u1",
  name: "Dash User",
  email: "dash@test.com",
  address: "456 Dash Ave",
  role: 0,
};

describe("Level 4.1 — Full App routing to /dashboard/user (PrivateRoute passes)", () => {
  it("L4.1.1 route renders Dashboard with UserMenu and user card content", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    // Email is unique to the user card (not shown in Header)
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    // UserMenu links are children of Dashboard via Layout
    expect(screen.getByRole("link", { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^orders$/i })).toBeInTheDocument();
  });

  it("L4.1.2 Header shows user name and /dashboard/user link when logged in", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getAllByText("Dash User").length).toBeGreaterThanOrEqual(1);
    });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
  });

  it("L4.1.3 clicking Footer Contact link navigates to /contact page", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("link", { name: /^contact$/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
  });

  it("L4.1.4 after navigating to /contact via Footer link, Dashboard card content is gone", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("link", { name: /^contact$/i }));
    await waitFor(() => {
      // Email was only in the user card — confirms Dashboard is unmounted
      expect(screen.queryByText("dash@test.com")).not.toBeInTheDocument();
    });
  });

  // ── Child / grandchild rendering via full App tree ────────────────────────
  // These tests verify the deep component chain
  // App → PrivateRoute (passes) → Dashboard → Layout → Header/Footer and their
  // own children are all correctly mounted when the route is reached.

  it("L4.1.5 Header navbar brand renders (App > Dashboard > Layout > Header > brand)", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /virtual vault/i })).toBeInTheDocument();
  });

  it("L4.1.6 SearchInput form renders inside Header (App > Dashboard > Layout > Header > SearchInput)", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("L4.1.7 Header Home nav link renders (App > Dashboard > Layout > Header > nav)", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });

  it("L4.1.8 Footer copyright text renders (App > Dashboard > Layout > Footer > h4)", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(screen.getByText("dash@test.com")).toBeInTheDocument();
    });
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("L4.1.9 document.title is 'Dashboard - Ecommerce App' via full App > PrivateRoute > Dashboard > Layout > Helmet chain", async () => {
    renderAppAtDashboard({ user: L4_USER, token: "valid-tok" });
    await waitFor(() => {
      expect(document.title).toBe("Dashboard - Ecommerce App");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4.2 — PrivateRoute redirects unauthenticated / expired users to /login
// ─────────────────────────────────────────────────────────────────────────────
//
// Spinner.js counts down from 3 to 0 (1 s per tick) before calling navigate().
// We use jest.useFakeTimers() so that advanceTimersByTime(3500) triggers the
// full countdown instantly without slowing down the test suite.
// The toast is called in PrivateRoute's catch block (before Spinner renders).
// react-hot-toast's global store holds the queued toast; Login's Layout renders
// <Toaster/> which reads the store on mount and displays the pre-existing toast.

describe("Level 4.2 — PrivateRoute redirects unauthenticated / expired users to /login", () => {
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
      <MemoryRouter initialEntries={["/dashboard/user"]}>
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

    // Spinner should be showing its countdown message
    expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
  });

  it("L4.2.2 no token: after Spinner countdown, /login renders with LOGIN FORM and key inputs", async () => {
    localStorage.clear();
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { success: true, category: [] },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user"]}>
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

    // Login page should now be rendered — brief, non-brittle checks
    expect(screen.getByText(/LOGIN FORM/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
  });

  it("L4.2.3 expired/invalid token: after Spinner countdown, /login renders with LOGIN FORM and key inputs", async () => {
    const expiredUser = { _id: "u1", name: "Expired User", role: 0 };
    localStorage.setItem("auth", JSON.stringify({ user: expiredUser, token: "expired-tok" }));

    // /api/v1/auth/user-auth → 401 (triggers PrivateRoute's catch block)
    // other axios.get calls (useCategory) → resolve normally
    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/auth/user-auth") {
        return Promise.reject(new Error("Request failed with status code 401"));
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user"]}>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Flush the Promise chain so PrivateRoute's catch block fires (setOk, setAuth,
    // localStorage.removeItem, toast.error) before advancing the Spinner countdown
    await act(async () => {
      await Promise.resolve(); // let useEffect run + axios rejection propagate
      await Promise.resolve(); // complete the catch block's state updates
      jest.advanceTimersByTime(3500); // Spinner counts down → navigate('/login')
      await Promise.resolve(); // flush Login render + Toaster subscription
    });

    // Brief, non-brittle Login page checks
    expect(screen.getByText(/LOGIN FORM/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
  });

  it("L4.2.4 expired/invalid token: toast 'Session expired. Please login again.' is visible after redirect", async () => {
    const expiredUser = { _id: "u1", name: "Expired User", role: 0 };
    localStorage.setItem("auth", JSON.stringify({ user: expiredUser, token: "expired-tok" }));

    jest.spyOn(axios, "get").mockImplementation((url) => {
      if (url === "/api/v1/auth/user-auth") {
        return Promise.reject(new Error("Request failed with status code 401"));
      }
      return Promise.resolve({ data: { success: true, category: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user"]}>
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
    // The toast is queued in react-hot-toast's global store when the catch
    // block fires. Login's Layout renders <Toaster/> which reads the store on
    // mount, picking up the already-queued "Session expired" toast.
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

    // react-hot-toast may render the toast in multiple portal containers;
    // use getAllByText so the assertion doesn't fail when there is more than one.
    expect(
      screen.getAllByText("Session expired. Please login again.").length
    ).toBeGreaterThanOrEqual(1);
  });
});
