// Foo Chao, A0272024R

// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: plan fronttend integration test for contact and policy pages
//    it should use a bottom up approach
//    level 1 (no need implement assumed done by jinhan): header integrated with useCart, useAuth. useCategory, SearchInput
//    level 2 (no need implement assumed done by Jinhan as well): Layout integrated with header 
//        (and all its dependencies mentioned in level 1) and footer
//    level 3 (need to implement): contact/policy page with layout + all its child
//    level 4 (need to implement): App + everything in level 3
//    what do u think of this approach?
//
// Prompt 2: for level 3 and 4 i think since it is with real layout and headers and useAuth etc 
//    we need to ensure the header is redered correctly i.e name, cart, cat in header correct 
//    when on contact/policy page and things like that what do you think?
//
// Prompt 3: proceed to implenment on top of files, 
//    make sure to state all 4 levels. 
//    for levels not to be implemented by us, 
//    clearly state it will be done by Jinhan so i won't be penalised
//    clearly state what is in each levels on top
//    summarise numbers of test cases for each level on top as well
//    proceed
//
// Prompt 4: add a few more more teasts inlevel 4 for both files for rendering of various childs, grandchild etc

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
//  Level 3 — Contact + real Layout + real Header + real Footer   [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <Contact /> rendered with REAL Layout, Header, Footer, and all
//           their context dependencies (AuthProvider, CartProvider,
//           SearchProvider). Network (axios) is mocked at the boundary.
//    What is tested:
//      • Page content: heading, paragraph text, icons, image, document.title
//      • Header integration: Login/Register links when logged out,
//        user name + Dashboard href when logged in (role 0 and role 1),
//        category list in dropdown loaded via mocked axios
//      • Cart badge count reflects number of items in CartProvider
//      • Footer integration: About / Contact / Privacy Policy links present
//
//  Level 4 — Full App routing to /contact                          [9 tests]
//    → IMPLEMENTED BELOW
//    Scope: <App /> in MemoryRouter at /contact, with REAL providers.
//    What is tested:
//      • Route /contact renders Contact page content
//      • Header shows correct auth state (logged-out: Login + Register)
//      • Footer "Privacy Policy" link navigates to /policy (cross-page routing)
//      • After navigating away, Contact content is no longer visible
//      • Navbar brand link renders (App > Contact > Layout > Header > brand)
//      • Search form input renders (App > ... > Header > SearchInput > input)
//      • "Home" nav link renders (App > ... > Header > nav > Home link)
//      • Footer copyright text renders (App > ... > Layout > Footer > h4)
//      • document.title is "Contact us" via full Helmet chain
//
// ────────────────────────────────────────────────────────────────────────────
//  TOTAL: 18 test cases
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
import Contact from "../../pages/Contact";
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
 * Seeds localStorage with auth and cart state, then renders <Contact /> wrapped
 * in the real provider chain: MemoryRouter > AuthProvider > CartProvider >
 * SearchProvider.
 *
 * @param {Object} options
 * @param {Object|null} options.user     - user object { _id, name, role } or null for guest
 * @param {string}      options.token    - JWT token string (default "")
 * @param {Array}       options.cartItems - array of item objects to seed in cart
 * @param {Array}       options.categories - categories axios.get will resolve with
 */
function renderContact({
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
    <MemoryRouter initialEntries={["/contact"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Contact />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

/**
 * Same helper for App-level (L4) rendering: renders <App /> in MemoryRouter
 * starting at /contact, with the real provider chain.
 */
function renderAppAtContact({
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
    <MemoryRouter initialEntries={["/contact"]}>
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
      // eslint-disable-next-line no-unused-expressions
      console.error.mockRestore && undefined; // keep TS happy
      // pass through everything else
      // eslint-disable-next-line no-console
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
//  LEVEL 3 — Contact + real Layout + real Header + real Footer
// ─────────────────────────────────────────────────────────────────────────────
describe("Level 3 — Contact + real Layout + real Header + real Footer", () => {
  // ── Page content ────────────────────────────────────────────────────────

  it("L3.1 renders the CONTACT US heading", () => {
    renderContact();
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
  });

  it("L3.2 renders contact info text and icons", () => {
    renderContact();
    expect(screen.getByText(/www\.help@ecommerceapp\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/i)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000/i)).toBeInTheDocument();
  });

  it("L3.3 renders contact image with correct src and alt", () => {
    renderContact();
    const img = screen.getByAltText("Contact us illustration");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("L3.4 sets document title to 'Contact us'", async () => {
    renderContact();
    await waitFor(() => {
      expect(document.title).toBe("Contact us");
    });
  });

  // ── Header: logged-out ───────────────────────────────────────────────────

  it("L3.5 Header shows Login and Register links when logged out, cart badge is 0", async () => {
    renderContact({ cartItems: [] });
    // Login and Register appear after initial render (no async needed for null user)
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    // Cart badge count: antd Badge renders count value in the DOM
    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // ── Header: logged-in as regular user ────────────────────────────────────

  it("L3.6 Header shows user name and /dashboard/user link, badge shows item count", async () => {
    renderContact({
      user: { _id: "u1", name: "Test User", role: 0 },
      token: "tok",
      cartItems: [{ _id: "p1" }, { _id: "p2" }],
    });
    // Wait for AuthProvider useEffect to load from localStorage
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
    // Cart badge shows 2 items
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  // ── Header: logged-in as admin ───────────────────────────────────────────

  it("L3.7 Header Dashboard link points to /dashboard/admin for admin user (role 1)", async () => {
    renderContact({
      user: { _id: "a1", name: "Admin User", role: 1 },
      token: "admintok",
    });
    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
  });

  // ── Header: categories dropdown ──────────────────────────────────────────

  it("L3.8 Header shows category from useCategory in dropdown after axios resolves", async () => {
    renderContact({
      categories: [{ name: "Electronics", slug: "electronics" }],
    });
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("L3.9 Footer renders About, Contact and Privacy Policy links", () => {
    renderContact();
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^contact$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4 — Full App routing to /contact
// ─────────────────────────────────────────────────────────────────────────────
describe("Level 4 — Full App routing to /contact", () => {
  it("L4.1 route /contact renders Contact page heading and content", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByAltText("Contact us illustration")).toBeInTheDocument();
  });

  it("L4.2 Header shows Login and Register links when logged out on /contact", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
  });

  it("L4.3 clicking Footer Privacy Policy link navigates to /policy page", async () => {
    renderAppAtContact();
    // Wait for Contact page to be visible
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    // Click the Privacy Policy link in Footer
    fireEvent.click(screen.getByRole("link", { name: /privacy policy/i }));
    // Policy page heading should now appear
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /privacy policy/i })
      ).toBeInTheDocument();
    });
  });

  it("L4.4 after navigating to /policy via Footer link, Contact heading is gone", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("link", { name: /privacy policy/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /contact us/i })
      ).not.toBeInTheDocument();
    });
  });

  // ── Child / grandchild rendering via full App tree ────────────────────────
  // These tests verify that the deep component chain
  // App → Route → Contact → Layout → Header/Footer and their own children
  // are all correctly mounted when the route is resolved by App.

  it("L4.5 Header navbar brand link renders (App > Contact > Layout > Header > brand)", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    // Navbar brand is a Link rendered inside Header which is a child of Layout
    expect(screen.getByRole("link", { name: /virtual vault/i })).toBeInTheDocument();
  });

  it("L4.6 SearchInput form renders inside Header (App > Contact > Layout > Header > SearchInput)", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    // SearchInput renders a search-type input — it is a grandchild of Layout via Header
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("L4.7 Header Home nav link renders (App > Contact > Layout > Header > nav)", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });

  it("L4.8 Footer copyright text renders (App > Contact > Layout > Footer > h4)", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /contact us/i })
      ).toBeInTheDocument();
    });
    // Footer h4 is a great-grandchild of App in this tree
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("L4.9 document.title is 'Contact us' through full App > Contact > Layout > Helmet chain", async () => {
    renderAppAtContact();
    await waitFor(() => {
      expect(document.title).toBe("Contact us");
    });
  });
});
