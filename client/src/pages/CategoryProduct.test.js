// Chi Thanh, A0276229W

// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Component rendering (Layout, category heading, result count)
// Test Coverage 2: API call on mount (correct endpoint with slug, skipped when slug absent)
// Test Coverage 3: Product list rendering (name, price, truncated description, image)
// Test Coverage 4: Navigation ("More Details" button navigates to correct product slug)
// Test Coverage 5: Empty product list (zero result count, no product cards)
// Test Coverage 6: API error handling (logs error, component stays mounted)

// Prompt 1: Analyse the CategoryProduct file and explain the behaviors of functions and components. Which variables are used? What are the expected outputs? 
// What are the side effects? What are the interactions between components and functions? What are the API calls made and when? What is rendered on the screen and when?
// Prompt 2: Write Jest unit tests for the file CategoryProduct.js. The tests are to be written in CategoryProduct.test.js
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
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("axios");

const mockNavigate = jest.fn();
let mockSlug = "electronics";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ slug: mockSlug }),
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/Layout", () =>
  ({ children }) => <div data-testid="layout">{children}</div>
);

jest.mock("../styles/CategoryProductStyles.css", () => {}, { virtual: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

// Wraps render + all async state updates inside act so every chained
// promise (setProducts, setCategory) is flushed before assertions run,
// preventing "not wrapped in act" warnings.
const renderAndSettle = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <CategoryProduct />
      </MemoryRouter>
    );
  });
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockCategory = { _id: "cat-1", name: "Electronics" };

const mockProducts = [
  {
    _id: "prod-1",
    name: "Laptop",
    description: "A powerful laptop for all your computing needs and more text",
    price: 999.99,
    slug: "laptop",
  },
  {
    _id: "prod-2",
    name: "Phone",
    description: "A sleek smartphone with cutting-edge features and great battery",
    price: 499.5,
    slug: "phone",
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CategoryProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSlug = "electronics";
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });


  describe("Component rendering", () => {
    beforeEach(() => {
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });
    });

    it("renders inside Layout", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    it("displays the category name in the heading", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(
        screen.getByRole("heading", { name: /category - electronics/i })
      ).toBeInTheDocument();
    });

    it("displays the correct product result count", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/2 result found/i)).toBeInTheDocument();
    });
  });


  describe("API call on mount", () => {
    it("calls the product-category endpoint with the slug from params", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: [], category: mockCategory },
      });

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/product-category/electronics`
      );
    });

    it("calls the API exactly once on mount", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: [], category: mockCategory },
      });

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("does not call the API when slug is absent", async () => {
      // Arrange
      mockSlug = undefined;

      // Act
      await renderAndSettle();

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
    });
  });


  describe("Product list rendering", () => {
    beforeEach(() => {
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });
    });

    it("renders the name of each product", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
    });

    it("renders the formatted price of each product", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText("$999.99")).toBeInTheDocument();
      expect(screen.getByText("$499.50")).toBeInTheDocument();
    });

    it("truncates each product description to 60 characters", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      const truncated = mockProducts[0].description.substring(0, 60) + "...";
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it("renders the product image with the correct src", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      const img = screen.getByAltText("Laptop");
      expect(img.src).toContain("/api/v1/product/product-photo/prod-1");
    });

    it('renders a "More Details" button for each product', async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      const buttons = screen.getAllByRole("button", { name: /more details/i });
      expect(buttons).toHaveLength(mockProducts.length);
    });
  });


  describe("Navigation", () => {
    it('navigates to the correct product page when "More Details" is clicked', async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });
      await renderAndSettle();

      // Act
      const [firstButton] = screen.getAllByRole("button", {
        name: /more details/i,
      });
      fireEvent.click(firstButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        `/product/${mockProducts[0].slug}`
      );
    });

    it("navigates to the correct slug for a second product card", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });
      await renderAndSettle();

      // Act
      const buttons = screen.getAllByRole("button", { name: /more details/i });
      fireEvent.click(buttons[1]);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        `/product/${mockProducts[1].slug}`
      );
    });
  });


  describe("Empty product list", () => {
    beforeEach(() => {
      axios.get.mockResolvedValueOnce({
        data: { products: [], category: mockCategory },
      });
    });

    it("shows 0 result count when there are no products", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
    });

    it("renders no product cards when the list is empty", async () => {
      // Arrange / Act
      await renderAndSettle();

      // Assert
      expect(
        screen.queryByRole("button", { name: /more details/i })
      ).not.toBeInTheDocument();
    });
  });


  describe("API error handling", () => {
    it("logs the error when the API call fails", async () => {
      // Arrange
      const error = new Error("Network error");
      axios.get.mockRejectedValueOnce(error);

      // Act
      await renderAndSettle();

      // Assert
      expect(console.log).toHaveBeenCalledWith(error);
    });

    it("keeps the component mounted when the API call fails", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      // Act
      await renderAndSettle();

      // Assert – heading still present, no crash
      expect(screen.getByText(/category -/i)).toBeInTheDocument();
    });

    it("shows zero results when the API call fails", async () => {
      // Arrange
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      // Act
      await renderAndSettle();

      // Assert – state stays at initial [], so 0 results
      expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
    });
  });
});
