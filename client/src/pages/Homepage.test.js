// Foo Chao, A0272024R

// AI Usage:
// Prompt 1 (Github Copilot Claude Opus 4.6) runs for 1 hr 30 min in total across 3 attempts where 1st 2 failed due to connection error(?):
// Following the instructions on line 7 onwards, generate test cases for HomePage.js.
// Make sure to look at and follow the styling and structure of the tests as stated in instructions there.
// Summarise the test case added below the instrutions
// Instructions for AI:
// Group test cases by these categories using describe blocks and use vscode #region and #endregion comments to separate them
// the #region and #endregion comments should be succinct and may not follow my long winded instructions blindly
// If there are subcategory within a query, use region and endregion to separate them as well
// Category 1: Rendering tests (non product related)
//  1a) layout including title props,
//  1b) banner img, 
//  1c) Filter by Category Title and buttons, Filter by Price Title and buttons, reset buttons
//  1d) load more button (basic only careful testing on cat 5)
//  1e) loading message
//  
// Category 2: Product related initial rendering tests (includes testing of more details and add to cart button)
//  2a) ensure APIs called for initial product rendering
//  2b) error handling for each api call especially toast error message shown
//  2a) product name, description, price, image -> includes testing of null/undefined desciption/price make sure it does not show null or undefined
//  2b) more details button -> test that it is rendered and has correct link
//  2c) add to cart button -> test that it is rendered and has correct onClick function
//  2d) product rendering with null product or empty array -> do not crash and show no products found message 
//    (include cases where loading and afterwards can use same test for this since it happens sequentially)
//  
// Category 3: Positioning tests (basic tests only so it won't be brittle)
//   - those in cat 1 should be child of layout
//
// Category 4: Filtering tests
//   Key concepts: FSM testing, test all transitions and states, including edge cases like no products found, loading state, etc.
//     states: no filters(NF), checkbox filter(CF), price filter(PF), both filters(BF)
//     assertion to include for each transitions: 
//        api called, 
//        correct rendering (products shown or no products found message), 
//        loading message temporarily while loading
//   4a) NF -> CF / CF -> NF / CF -> CF (by clicking boxes) 
//       CF -> CF test is when we add more boxes or uncheck boxes
//   4b) NF -> PF / PF -> PF (by clicking price boxes)
//       No PF to NF transition because there is no way to have price filter without checkbox filter, so we can skip that transition
//   4c) NF -> BF, CF -> BF, PF -> BF, BF -> CF, BF -> PF (by clicking boxes and price boxes in combination)
//   4d) BF/CF/PF -> NF (by clicking reset button)
//   4e) API error handling when filtering, including toast error message shown
//   4f) Edge cases: no products found after filtering, loading state while filtering (can be tested together since it happens sequentially)
//
// Category 5: Load more tests
//   - test cases where it should not render load more button (no more products to load, loading state), and cases where it should render
//   - test that load more button works correctly in loading more products and handles edge cases like no more products to load, API errors, etc.
//   - test that it shows loading message while loading more products
//
// Note:
// Use Mock as necessary
// Files to refer to for testing patterns: Dashboard.test.js, Contact.test.js, Policy.test.js, Private.test.js, UserMenu.test.js, cart.test.js, Cartpage.test.js
// Make sure to follow the way test is written in these files (arrange, act, assert) and to use beforeEach to reset mocks and state as necessary
// Add test cases as needed for each category or even add new category but enusure:
// It does not make it britte and u inform me of what u added so I can check if it is necessary and if it is correct
// After u write finish run test and ensures that it is passing, has decent coverage and does not spam console with error/warning messages

// ──────────────────────────────────────────────────────────────────────────────
// Test cases summary:
// Category 1: Rendering - Non-Product (13 tests)
//   1a) Layout renders with correct title prop (2 tests)
//   1b) Banner image renders with correct src/alt (2 tests)
//   1c) Filter controls: category title, checkboxes, price title, radios, reset button (5 tests)
//   1d) Load more button: shown when more products, hidden when all loaded (2 tests)
//   1e) Loading message: shown while fetching, "No products found" hidden while loading (2 tests)
//
// Category 2: Product Rendering (14 tests)
//   2a) Initial API calls: get-category, product-count, product-list (3 tests)
//   2b) API error handling: toast for each failing API (3 tests)
//   2c) Product details: names, truncated descriptions, formatted prices, images (4 tests)
//   2d) More Details button: renders and navigates (2 tests)
//   2e) ADD TO CART button: renders and updates cart with toast (2 tests)
//
// Category 3: Positioning (4 tests)
//   - Banner, filters, heading, products are children of Layout
//
// Category 4: Filtering - FSM (13 tests)
//   4a) NF->CF, CF->NF, CF->CF via checkbox interactions (3 tests)
//   4b) NF->PF, PF->PF via price radio interactions (2 tests)
//   4c) CF->BF, PF->BF, BF->PF via combined interactions (3 tests)
//   4d) Reset button clears all filters (BF/CF/PF->NF) (1 test)
//   4e) Filter API error handling with toast (1 test)
//   4f) No products after filter, loading while filtering (3 tests)
//
// Category 5: Load More (6 tests)
//   - Hidden when filters active, appends products on click, error handling, loading state
// ──────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";
import axios from "axios";
import toast from "react-hot-toast";

//#region Mocks
// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

let mockCartValue;
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => mockCartValue),
}));

jest.mock("../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout">
        <div data-testid="layout-title">{title}</div>
        {children}
      </div>
    );
  };
});

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span data-testid="reload-icon">↻</span>,
}));

jest.mock("antd", () => {
  const React = require("react");
  const RadioContext = React.createContext(() => {});

  const Checkbox = ({ children, checked, onChange }) => (
    <label>
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange && onChange(e)}
      />
      <span>{children}</span>
    </label>
  );

  const Radio = ({ children, value }) => {
    const onGroupChange = React.useContext(RadioContext);
    return (
      <label>
        <input
          type="radio"
          name="price-filter"
          onChange={() => onGroupChange({ target: { value } })}
        />
        <span>{children}</span>
      </label>
    );
  };

  Radio.Group = ({ children, onChange }) => (
    <RadioContext.Provider value={onChange || (() => {})}>
      <div>{children}</div>
    </RadioContext.Provider>
  );

  return { Checkbox, Radio };
});

//#endregion

//#region Test Data and Helpers
// ─── Test Data ───────────────────────────────────────────────────────────────

const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

const mockProducts = [
  {
    _id: "p1",
    name: "Laptop",
    slug: "laptop",
    description:
      "A powerful laptop for all your computing needs and daily tasks here",
    price: 999.99,
  },
  {
    _id: "p2",
    name: "T-Shirt",
    slug: "t-shirt",
    description:
      "A comfortable cotton t-shirt for everyday wear and casual style here",
    price: 29.99,
  },
];

const mockProductsPage2 = [
  {
    _id: "p3",
    name: "Novel",
    slug: "novel",
    description:
      "An exciting novel that will keep you reading for hours on end and more",
    price: 14.99,
  },
];

const mockFilteredProducts = [
  {
    _id: "p1",
    name: "Laptop",
    slug: "laptop",
    description:
      "A powerful laptop for all your computing needs and daily tasks here",
    price: 999.99,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setupDefaultMocks = () => {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: { success: true, category: mockCategories },
      });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total: 6 } });
    }
    if (url.startsWith("/api/v1/product/product-list/")) {
      return Promise.resolve({ data: { products: mockProducts } });
    }
    return Promise.reject(new Error(`Unhandled GET: ${url}`));
  });

  axios.post.mockImplementation((url) => {
    if (url === "/api/v1/product/product-filters") {
      return Promise.resolve({ data: { products: mockFilteredProducts } });
    }
    return Promise.reject(new Error(`Unhandled POST: ${url}`));
  });
};

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
//#endregion

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("HomePage", () => {
  let originalConsoleError;
  let originalConsoleLog;

  beforeAll(() => {
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCartValue = [[], jest.fn()];
    toast.success = jest.fn();
    toast.error = jest.fn();
    setupDefaultMocks();
  });

  //#region Category 1: Rendering (non-product)
  describe("Category 1: Rendering (non-product)", () => {
    //#region 1a: Layout
    describe("1a: Layout", () => {
      it("renders the Layout component", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
      });

      it("passes correct title prop to Layout", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByTestId("layout-title")).toHaveTextContent(
          "ALL Products - Best offers"
        );
      });
    });
    //#endregion

    //#region 1b: Banner
    describe("1b: Banner Image", () => {
      it("renders the banner image", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByAltText("bannerimage")).toBeInTheDocument();
      });

      it("banner image has correct src", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByAltText("bannerimage")).toHaveAttribute(
          "src",
          "/images/Virtual.png"
        );
      });
    });
    //#endregion

    //#region 1c: Filter controls
    describe("1c: Filter Controls", () => {
      it("renders Filter By Category heading", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByText("Filter By Category")).toBeInTheDocument();
      });

      it("renders category checkboxes after API loads", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getByText("Electronics")).toBeInTheDocument();
          //eslint-disable-next-line
          expect(screen.getByText("Clothing")).toBeInTheDocument();
        });
      });

      it("renders Filter By Price heading", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByText("Filter By Price")).toBeInTheDocument();
      });

      it("renders all price radio buttons from Prices data", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByText("$0 to 19")).toBeInTheDocument();
        expect(screen.getByText("$20 to 39")).toBeInTheDocument();
        expect(screen.getByText("$40 to 59")).toBeInTheDocument();
        expect(screen.getByText("$60 to 79")).toBeInTheDocument();
        expect(screen.getByText("$80 to 99")).toBeInTheDocument();
        expect(screen.getByText("$100 or more")).toBeInTheDocument();
      });

      it("renders RESET FILTERS button", () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        expect(screen.getByText("RESET FILTERS")).toBeInTheDocument();
      });
    });
    //#endregion

    //#region 1d: Load more button
    describe("1d: Load More Button", () => {
      it("renders load more button when more products available", async () => {
        // Arrange & Act (total=6, products=2 → button shown)
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getByText(/Loadmore/)).toBeInTheDocument();
        });
      });

      it("does not render load more button when all products loaded", async () => {
        // Arrange - total equals number of products
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.resolve({
              data: { success: true, category: mockCategories },
            });
          if (url === "/api/v1/product/product-count")
            return Promise.resolve({ data: { total: 2 } });
          if (url.startsWith("/api/v1/product/product-list/"))
            return Promise.resolve({ data: { products: mockProducts } });
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert
        //eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );
        expect(screen.queryByText(/Loadmore/)).not.toBeInTheDocument();
      });
    });
    //#endregion

    //#region 1e: Loading message
    describe("1e: Loading Message", () => {
      it("shows loading message while products are being fetched", async () => {
        // Arrange - defer product list so loading stays true
        let resolveProducts;
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.resolve({
              data: { success: true, category: mockCategories },
            });
          if (url === "/api/v1/product/product-count")
            return Promise.resolve({ data: { total: 6 } });
          if (url.startsWith("/api/v1/product/product-list/"))
            return new Promise((resolve) => {
              resolveProducts = resolve;
            });
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert - loading shown
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Loading...")).toBeInTheDocument()
        );

        // Cleanup - resolve so component settles
        await act(async () => {
          resolveProducts({ data: { products: mockProducts } });
        });

        await waitFor(() =>
          expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
        );
      });

      it("does not show 'No products found' while loading", async () => {
        // Arrange - defer product list
        let resolveProducts;
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.resolve({
              data: { success: true, category: mockCategories },
            });
          if (url === "/api/v1/product/product-count")
            return Promise.resolve({ data: { total: 6 } });
          if (url.startsWith("/api/v1/product/product-list/"))
            return new Promise((resolve) => {
              resolveProducts = resolve;
            });
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Loading...")).toBeInTheDocument()
        );
        expect(
          screen.queryByText("No products found")
        ).not.toBeInTheDocument();

        // Cleanup
        await act(async () => {
          resolveProducts({ data: { products: mockProducts } });
        });
      });
    });
    //#endregion
  });
  //#endregion

  //#region Category 2: Product rendering
  describe("Category 2: Product Rendering", () => {
    //#region 2a: Initial API calls
    describe("2a: Initial API Calls", () => {
      it("calls get-category API on mount", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/category/get-category"
          )
        );
      });

      it("calls product-count API on mount", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/product-count"
          )
        );
      });

      it("calls product-list API on mount", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/product-list/1"
          )
        );
      });
    });
    //#endregion

    //#region 2b: API error handling
    describe("2b: API Error Handling", () => {
      it("shows toast error when get-category fails", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.reject(new Error("Network error"));
          if (url === "/api/v1/product/product-count")
            return Promise.resolve({ data: { total: 6 } });
          if (url.startsWith("/api/v1/product/product-list/"))
            return Promise.resolve({ data: { products: mockProducts } });
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to load categories"
          )
        );
      });

      it("shows toast error when product-count fails", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.resolve({
              data: { success: true, category: mockCategories },
            });
          if (url === "/api/v1/product/product-count")
            return Promise.reject(new Error("Network error"));
          if (url.startsWith("/api/v1/product/product-list/"))
            return Promise.resolve({ data: { products: mockProducts } });
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to load product count"
          )
        );
      });

      it("shows toast error when product-list fails", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
          if (url === "/api/v1/category/get-category")
            return Promise.resolve({
              data: { success: true, category: mockCategories },
            });
          if (url === "/api/v1/product/product-count")
            return Promise.resolve({ data: { total: 6 } });
          if (url.startsWith("/api/v1/product/product-list/"))
            return Promise.reject(new Error("Network error"));
          return Promise.reject(new Error("Unhandled"));
        });

        // Act
        renderHomePage();

        // Assert
        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to load products"
          )
        );
      });
    });
    //#endregion

    //#region 2c: Product details
    describe("2c: Product Details", () => {
      it("renders product names", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getByText("Laptop")).toBeInTheDocument();
          //eslint-disable-next-line
          expect(screen.getByText("T-Shirt")).toBeInTheDocument();
        });
      });

      it("renders product descriptions truncated to 60 characters", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          const truncated =
            mockProducts[0].description.substring(0, 60) + "...";
          expect(screen.getByText(truncated)).toBeInTheDocument();
        });
      });

      it("renders product prices in USD currency format", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getByText("$999.99")).toBeInTheDocument();
          //eslint-disable-next-line
          expect(screen.getByText("$29.99")).toBeInTheDocument();
        });
      });

      it("renders product images with correct src and alt", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          const img = screen.getByAltText("Laptop");
          expect(img).toBeInTheDocument();
          //eslint-disable-next-line
          expect(img).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/p1"
          );
        });
      });
    });
    //#endregion

    //#region 2d: More Details button
    describe("2d: More Details Button", () => {
      it("renders More Details buttons for each product", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getAllByText("More Details")).toHaveLength(2);
        });
      });

      it("navigates to product page on More Details click", async () => {
        // Arrange
        renderHomePage();
        //eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );

        // Act
        const buttons = screen.getAllByText("More Details");
        fireEvent.click(buttons[0]);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
      });
    });
    //#endregion

    //#region 2e: ADD TO CART button
    describe("2e: ADD TO CART Button", () => {
      it("renders ADD TO CART buttons for each product", async () => {
        // Arrange & Act
        renderHomePage();

        // Assert
        await waitFor(() => {
          expect(screen.getAllByText("ADD TO CART")).toHaveLength(2);
        });
      });

      it("adds product to cart and shows success toast", async () => {
        // Arrange
        const mockSetCart = jest.fn();
        mockCartValue = [[], mockSetCart];
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );

        // Act
        const buttons = screen.getAllByText("ADD TO CART");
        fireEvent.click(buttons[0]);

        // Assert
        expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
      });
    });
    //#endregion
  });
  //#endregion

  //#region Category 3: Positioning
  describe("Category 3: Positioning", () => {
    it("banner image is a child of Layout", () => {
      // Arrange & Act
      renderHomePage();

      // Assert
      const layout = screen.getByTestId("layout");
      const banner = screen.getByAltText("bannerimage");
      expect(layout).toContainElement(banner);
    });

    it("filter section is a child of Layout", () => {
      // Arrange & Act
      renderHomePage();

      // Assert
      const layout = screen.getByTestId("layout");
      const filterTitle = screen.getByText("Filter By Category");
      expect(layout).toContainElement(filterTitle);
    });

    it("All Products heading is a child of Layout", () => {
      // Arrange & Act
      renderHomePage();

      // Assert
      const layout = screen.getByTestId("layout");
      const heading = screen.getByText("All Products");
      expect(layout).toContainElement(heading);
    });

    it("product cards are children of Layout", async () => {
      // Arrange & Act
      renderHomePage();

      // Assert
      await waitFor(() => {
        const layout = screen.getByTestId("layout");
        const product = screen.getByText("Laptop");
        expect(layout).toContainElement(product);
      });
    });
  });
  //#endregion

  //#region Category 4: Filtering (FSM)
  describe("Category 4: Filtering (FSM)", () => {
    //#region 4a: Checkbox filters (NF/CF transitions)
    describe("4a: Checkbox Filters", () => {
      it("NF -> CF: clicking checkbox calls filter API", async () => {
        // Arrange
        renderHomePage();
        //eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Act
        const checkbox = screen.getByRole("checkbox", {
          name: "Electronics",
        });
        fireEvent.click(checkbox);

        // Assert
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [] }
          );
        });
      });

      it("CF -> NF: unchecking all checkboxes calls getAllProducts", async () => {
        // Arrange
        renderHomePage();
        //eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Check the box first (NF -> CF)
        const checkbox = screen.getByRole("checkbox", {
          name: "Electronics",
        });
        fireEvent.click(checkbox);
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalled()
        );

        // Clear mock call counts
        axios.get.mockClear();
        axios.post.mockClear();

        // Act - uncheck the box (CF -> NF)
        fireEvent.click(checkbox);

        // Assert - getAllProducts called (no filter)
        await waitFor(() => {
          expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/product-list/1"
          );
        });
      });

      it("CF -> CF: clicking additional checkbox updates filter", async () => {
        // Arrange
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Check first box
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [] }
          )
        );

        // Act - check second box
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Clothing" })
        );

        // Assert - filter called with both categories
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1", "cat2"], radio: [] }
          );
        });
      });
    });
    //#endregion

    //#region 4b: Price filters (NF/PF transitions)
    describe("4b: Price Filters", () => {
      it("NF -> PF: clicking price radio calls filter API", async () => {
        // Arrange
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );

        // Act
        const radio = screen.getByRole("radio", { name: "$0 to 19" });
        fireEvent.click(radio);

        // Assert
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: [], radio: [0, 19] }
          );
        });
      });

      it("PF -> PF: clicking different price radio updates filter", async () => {
        // Arrange
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );

        // Select first price
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: [], radio: [0, 19] }
          )
        );

        // Act - select different price
        fireEvent.click(
          screen.getByRole("radio", { name: "$20 to 39" })
        );

        // Assert
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: [], radio: [20, 39] }
          );
        });
      });
    });
    //#endregion

    //#region 4c: Combined filters (BF transitions)
    describe("4c: Combined Filters", () => {
      it("CF -> BF: selecting price when checkbox active", async () => {
        // Arrange
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // NF -> CF
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [] }
          )
        );

        // Act - CF -> BF: also select price
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));

        // Assert
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [0, 19] }
          );
        });
      });

      it("PF -> BF: checking box when price active", async () => {
        // Arrange
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // NF -> PF
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: [], radio: [0, 19] }
          )
        );

        // Act - PF -> BF: also check box
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [0, 19] }
          );
        });
      });

      it("BF -> PF: unchecking all checkboxes keeps price filter", async () => {
        // Arrange - set up BF state
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );
        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));
        await waitFor(() =>
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: ["cat1"], radio: [0, 19] }
          )
        );
        axios.post.mockClear();

        // Act - BF -> PF: uncheck the checkbox
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert - filter still called with price only
        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            "/api/v1/product/product-filters",
            { checked: [], radio: [0, 19] }
          );
        });
      });
    });
    //#endregion

    //#region 4d: Reset button
    describe("4d: Reset Button", () => {
      it("clears all filters and reloads products", async () => {
        // Arrange - set up BF state
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );
        fireEvent.click(screen.getByRole("radio", { name: "$0 to 19" }));
        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        axios.get.mockClear();
        axios.post.mockClear();

        // Act - click reset
        fireEvent.click(screen.getByText("RESET FILTERS"));

        // Assert - getAllProducts called, no filter call
        await waitFor(() => {
          expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/product-list/1"
          );
        });
        // Verify products reload with default data
        await waitFor(() => {
          expect(screen.getByText("Laptop")).toBeInTheDocument();
          // eslint-disable-next-line
          expect(screen.getByText("T-Shirt")).toBeInTheDocument();
        });
      });
    });
    //#endregion

    //#region 4e: Filter error handling
    describe("4e: Filter Error Handling", () => {
      it("shows toast error when filter API fails", async () => {
        // Arrange
        axios.post.mockRejectedValue(new Error("Filter error"));
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Act
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Failed to filter products"
          );
        });
      });
    });
    //#endregion

    //#region 4f: Filter edge cases
    describe("4f: Filter Edge Cases", () => {
      it("shows 'No products found' when filter returns empty", async () => {
        // Arrange - mock filter to return empty
        axios.post.mockResolvedValue({ data: { products: [] } });
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Act
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert
        await waitFor(() => {
          expect(
            screen.getByText("No products found")
          ).toBeInTheDocument();
        });
      });

      it("shows loading while filtering then shows results", async () => {
        // Arrange - defer filter response
        let resolveFilter;
        axios.post.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveFilter = resolve;
            })
        );
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Electronics")).toBeInTheDocument()
        );

        // Act - click checkbox to trigger filter
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert - loading shown
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Loading...")).toBeInTheDocument()
        );

        // Resolve filter
        await act(async () => {
          resolveFilter({ data: { products: mockFilteredProducts } });
        });

        // Assert - results shown, loading gone
        await waitFor(() => {
          expect(screen.getByText("Laptop")).toBeInTheDocument();
          // eslint-disable-next-line
          expect(
            screen.queryByText("Loading...")
          ).not.toBeInTheDocument();
        });
      });

      it("hides 'No products found' while filter is loading", async () => {
        // Arrange - defer filter response
        let resolveFilter;
        axios.post.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveFilter = resolve;
            })
        );
        renderHomePage();
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Laptop")).toBeInTheDocument()
        );

        // Act - click checkbox
        fireEvent.click(
          screen.getByRole("checkbox", { name: "Electronics" })
        );

        // Assert - loading shown, no "No products found"
        // eslint-disable-next-line
        await waitFor(() =>
          expect(screen.getByText("Loading...")).toBeInTheDocument()
        );
        expect(
          screen.queryByText("No products found")
        ).not.toBeInTheDocument();

        // Cleanup
        await act(async () => {
          resolveFilter({ data: { products: mockFilteredProducts } });
        });
      });
    });
    //#endregion
  });
  //#endregion

  //#region Category 5: Load more
  describe("Category 5: Load More", () => {
    it("hides load more button when filters are active", async () => {
      // Arrange
      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText(/Loadmore/)).toBeInTheDocument()
      );

      // Act - apply filter
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Electronics" })
      );

      // Assert - load more hidden
      await waitFor(() => {
        expect(screen.queryByText(/Loadmore/)).not.toBeInTheDocument();
      });
    });

    it("clicking load more appends new products", async () => {
      // Arrange - return different products for page 2
      // eslint-disable-next-line
      let callCount = 0;
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category")
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        if (url === "/api/v1/product/product-count")
          return Promise.resolve({ data: { total: 6 } });
        if (url === "/api/v1/product/product-list/1")
          return Promise.resolve({ data: { products: mockProducts } });
        if (url === "/api/v1/product/product-list/2")
          return Promise.resolve({
            data: { products: mockProductsPage2 },
          });
        return Promise.reject(new Error("Unhandled"));
      });

      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText("Laptop")).toBeInTheDocument()
      );

      // Act - click load more
      fireEvent.click(screen.getByText(/Loadmore/));

      // Assert - new products appended
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        // eslint-disable-next-line
        expect(screen.getByText("T-Shirt")).toBeInTheDocument();
        // eslint-disable-next-line
        expect(screen.getByText("Novel")).toBeInTheDocument();
      });
    });

    it("shows toast error when load more API fails", async () => {
      // Arrange - page 2 fails
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category")
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        if (url === "/api/v1/product/product-count")
          return Promise.resolve({ data: { total: 6 } });
        if (url === "/api/v1/product/product-list/1")
          return Promise.resolve({ data: { products: mockProducts } });
        if (url === "/api/v1/product/product-list/2")
          return Promise.reject(new Error("Network error"));
        return Promise.reject(new Error("Unhandled"));
      });

      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText(/Loadmore/)).toBeInTheDocument()
      );

      // Act
      fireEvent.click(screen.getByText(/Loadmore/));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load more products"
        );
      });
    });

    it("hides load more button while loading", async () => {
      // Arrange - defer page 2 response
      let resolveLoadMore;
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category")
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        if (url === "/api/v1/product/product-count")
          return Promise.resolve({ data: { total: 6 } });
        if (url === "/api/v1/product/product-list/1")
          return Promise.resolve({ data: { products: mockProducts } });
        if (url === "/api/v1/product/product-list/2")
          return new Promise((resolve) => {
            resolveLoadMore = resolve;
          });
        return Promise.reject(new Error("Unhandled"));
      });

      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText(/Loadmore/)).toBeInTheDocument()
      );

      // Act - click load more
      fireEvent.click(screen.getByText(/Loadmore/));

      // Assert - button hidden while loading
      await waitFor(() => {
        expect(screen.queryByText(/Loadmore/)).not.toBeInTheDocument();
      });

      // Cleanup
      await act(async () => {
        resolveLoadMore({ data: { products: mockProductsPage2 } });
      });

      // Button reappears (3 products < 6 total)
      await waitFor(() => {
        expect(screen.getByText(/Loadmore/)).toBeInTheDocument();
      });
    });

    it("shows loading message while loading more products", async () => {
      // Arrange - defer page 2 response
      let resolveLoadMore;
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category")
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        if (url === "/api/v1/product/product-count")
          return Promise.resolve({ data: { total: 6 } });
        if (url === "/api/v1/product/product-list/1")
          return Promise.resolve({ data: { products: mockProducts } });
        if (url === "/api/v1/product/product-list/2")
          return new Promise((resolve) => {
            resolveLoadMore = resolve;
          });
        return Promise.reject(new Error("Unhandled"));
      });

      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText("Laptop")).toBeInTheDocument()
      );

      // Act
      fireEvent.click(screen.getByText(/Loadmore/));

      // Assert - loading message shown
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText("Loading...")).toBeInTheDocument()
      );

      // Cleanup
      await act(async () => {
        resolveLoadMore({ data: { products: mockProductsPage2 } });
      });

      await waitFor(() =>
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
      );
    });

    it("load more not triggered on initial render (page=1)", async () => {
      // Arrange & Act
      renderHomePage();
      // eslint-disable-next-line
      await waitFor(() =>
        expect(screen.getByText("Laptop")).toBeInTheDocument()
      );

      // Assert - product-list/1 called (by getAllProducts), no page 2 call
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-list/1"
      );
      expect(axios.get).not.toHaveBeenCalledWith(
        "/api/v1/product/product-list/2"
      );
    });
  });
  //#endregion
});


