// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Component rendering (product details, image, heading, price formatting)
// Test Coverage 2: API calls on mount (getProduct triggered by slug, getSimilarProduct chained)
// Test Coverage 3: Similar products section (list rendered, empty-state message)
// Test Coverage 4: Navigation ("More Details" button calls navigate with correct slug)
// Test Coverage 5: API error handling (getProduct error, getSimilarProduct error)
// Test Coverage 6: No fetch when slug is absent

// Prompt 1: Analyse the ProductDetails file and explain the behaviors of functions and components. Which variables are used? What are the expected outputs? 
// What are the side effects? What are the interactions between components and functions? What are the API calls made and when? What is rendered on the screen and when?
// Prompt 2: Write Jest unit tests for the file ProductDetails.js. The tests are to be written in ProductDetails.test.js
// Constraints:
// - Tests must follow Arrange–Act–Assert (AAA).
// - One behaviour per test. Split tests; do not combine multiple outcomes in one test.
// - Unit tests must run in isolation: do NOT hit real DB, do NOT use real network.
// - Use test doubles correctly:
//   - Use stubs to simulate DB return values (e.g., findOne resolves to null / existing doc).
//   - Use mocks/spies only when verifying that a collaborator was called is a true outcome.
// - Avoid brittle tests: do NOT assert internal implementation details that aren’t part of the externally observable behaviour.
// - Prioritise resistance to refactoring while maintaining protection against regressions.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import ProductDetails from "./ProductDetails";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("axios");

const mockNavigate = jest.fn();
let mockSlug = "test-product";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ slug: mockSlug }),
  useNavigate: () => mockNavigate,
}));

jest.mock("./../components/Layout", () =>
  ({ children }) => <div data-testid="layout">{children}</div>
);

jest.mock("../styles/ProductDetailsStyles.css", () => {}, { virtual: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

// Wraps render in act so all chained async state updates (including the
// getSimilarProduct call that fires after getProduct resolves) are fully
// flushed before any assertion runs, eliminating "not wrapped in act" warnings.
const renderAndSettle = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <ProductDetails />
      </MemoryRouter>
    );
  });
};

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockProduct = {
  _id: "prod-1",
  name: "Test Widget",
  description: "A really nice widget",
  price: 49.99,
  slug: "test-widget",
  category: { _id: "cat-1", name: "Gadgets" },
};

const mockRelated = [
  {
    _id: "prod-2",
    name: "Related Widget",
    description: "Another nice widget with a long description that should be truncated",
    price: 29.99,
    slug: "related-widget",
    category: { _id: "cat-1", name: "Gadgets" },
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProductDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSlug = "test-product";
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  // ── Coverage 1: Component rendering ────────────────────────────────────────

  describe("Component rendering", () => {
    beforeEach(() => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });
    });

    it("renders inside Layout", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    it('renders the "Product Details" heading', async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(
        screen.getByRole("heading", { name: /product details/i })
      ).toBeInTheDocument();
    });

    it("displays the product name after fetch", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/test widget/i)).toBeInTheDocument();
    });

    it("displays the product description after fetch", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/a really nice widget/i)).toBeInTheDocument();
    });

    it("displays the formatted product price after fetch", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert – price formatted as USD currency
      expect(screen.getByText(/\$49\.99/)).toBeInTheDocument();
    });

    it("displays the product category name after fetch", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/gadgets/i)).toBeInTheDocument();
    });

    it("renders the product image with correct src and alt", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      const img = screen.getByAltText("Test Widget");
      expect(img).toBeInTheDocument();
      expect(img.src).toContain(`/api/v1/product/product-photo/prod-1`);
    });

    it('renders the "ADD TO CART" button', async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(
        screen.getByRole("button", { name: /add to cart/i })
      ).toBeInTheDocument();
    });
  });

  // ── Coverage 2: API calls on mount ─────────────────────────────────────────

  describe("API calls on mount", () => {
    it("calls the get-product endpoint with the slug from params", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/get-product/test-product`
      );
    });

    it("calls the related-product endpoint with the correct pid and cid", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/related-product/prod-1/cat-1`
      );
    });

    it("does not call any API when slug is absent", async () => {
      // Arrange
      mockSlug = undefined;

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  // ── Coverage 3: Similar products section ───────────────────────────────────

  describe("Similar products section", () => {
    it('shows "No Similar Products found" when related list is empty', async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      // Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/no similar products found/i)).toBeInTheDocument();
    });

    it("does not show the empty-state message when related products exist", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert
      expect(
        screen.queryByText(/no similar products found/i)
      ).not.toBeInTheDocument();
    });

    it("renders the name of each related product", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText("Related Widget")).toBeInTheDocument();
    });

    it("renders the formatted price of each related product", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/\$29\.99/)).toBeInTheDocument();
    });

    it("truncates the description of each related product to 60 characters", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert – description is cut at 60 chars and followed by "..."
      const truncated = mockRelated[0].description.substring(0, 60) + "...";
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it("renders the image for each related product with correct src", async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert
      const img = screen.getByAltText("Related Widget");
      expect(img.src).toContain(`/api/v1/product/product-photo/prod-2`);
    });

    it('renders a "More Details" button for each related product', async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      // Act
      await renderAndSettle();

      // Assert
      expect(
        screen.getByRole("button", { name: /more details/i })
      ).toBeInTheDocument();
    });
  });

  // ── Coverage 4: Navigation ──────────────────────────────────────────────────

  describe("Navigation", () => {
    it('navigates to the related product slug when "More Details" is clicked', async () => {
      // Arrange
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelated } });

      await renderAndSettle();

      // Act
      await userEvent.click(screen.getByRole("button", { name: /more details/i }));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        `/product/${mockRelated[0].slug}`
      );
    });
  });

  // ── Coverage 5: API error handling ─────────────────────────────────────────

  describe("API error handling", () => {
    it("logs error and does not crash when getProduct fails", async () => {
      // Arrange
      const error = new Error("Network error");
      axios.get.mockRejectedValueOnce(error);

      // Act
      await renderAndSettle();

      // Assert – component stays mounted; error is logged
      expect(console.log).toHaveBeenCalledWith(error);
      expect(
        screen.getByRole("heading", { name: /product details/i })
      ).toBeInTheDocument();
    });

    it("logs error and does not crash when getSimilarProduct fails", async () => {
      // Arrange
      const error = new Error("Related API error");
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockRejectedValueOnce(error);

      // Act
      await renderAndSettle();

      // Assert – main product still renders; error is logged
      expect(console.log).toHaveBeenCalledWith(error);
      expect(screen.getByText(/test widget/i)).toBeInTheDocument();
    });
  });
});
