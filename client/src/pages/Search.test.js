// Foo Tzie Huang - A0262376Y
// AI-assisted unit tests generated with guidance from Claude (Anthropic)
//
// Test Coverage:
// 1. Renders "Search Resuts" heading (preserving source typo)
// 2. Shows "No Products Found" when results array is empty
// 3. Shows "Found X" when results are present
// 4. Renders product cards with correct name, description, price
// 5. Renders product images with correct src and alt
// 6. Renders "More Details" and "ADD TO CART" buttons for each product
// 7. Renders Layout with title "Search results"
// 8. Handles empty results array without crashing

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Search from "./Search";
import { useSearch } from "../context/search";

// Mock the search context
jest.mock("../context/search", () => ({
  useSearch: jest.fn(),
}));

// Mock Layout to render children and expose title prop
jest.mock("./../components/Layout", () => {
  return ({ children, title }) => (
    <div data-testid="layout-mock" title={title}>
      {children}
    </div>
  );
});

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockProducts = [
  {
    _id: "p1",
    name: "Laptop",
    description: "A powerful laptop for all your computing needs",
    price: 999.99,
  },
  {
    _id: "p2",
    name: "T-Shirt",
    description: "A comfortable cotton t-shirt for daily wear",
    price: 29.99,
  },
];

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("Search Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering with empty results", () => {
    beforeEach(() => {
      useSearch.mockReturnValue([{ keyword: "", results: [] }, jest.fn()]);
    });

    it("should render without crashing when results are empty", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
    });

    it('should render the "Search Resuts" heading (with source typo)', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Search Resuts");
    });

    it('should show "No Products Found" when results array is empty', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.getByText("No Products Found")).toBeInTheDocument();
    });

    it('should render Layout with title "Search results"', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toHaveAttribute("title", "Search results");
    });

    it("should not render any product cards when results are empty", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.queryByText("More Details")).not.toBeInTheDocument();
      expect(screen.queryByText("ADD TO CART")).not.toBeInTheDocument();
    });
  });

  describe("Rendering with products", () => {
    beforeEach(() => {
      useSearch.mockReturnValue([
        { keyword: "test", results: mockProducts },
        jest.fn(),
      ]);
    });

    it('should show "Found 2" when two products are in results', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.getByText("Found 2")).toBeInTheDocument();
    });

    it("should render product names", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("T-Shirt")).toBeInTheDocument();
    });

    it("should render truncated product descriptions (first 30 characters)", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const truncatedDesc1 =
        mockProducts[0].description.substring(0, 30) + "...";
      const truncatedDesc2 =
        mockProducts[1].description.substring(0, 30) + "...";
      expect(screen.getByText(truncatedDesc1)).toBeInTheDocument();
      expect(screen.getByText(truncatedDesc2)).toBeInTheDocument();
    });

    it("should render product prices", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      expect(screen.getByText(/\$ 999.99/)).toBeInTheDocument();
      expect(screen.getByText(/\$ 29.99/)).toBeInTheDocument();
    });

    it("should render product images with correct src and alt", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const laptopImg = screen.getByAltText("Laptop");
      expect(laptopImg).toBeInTheDocument();
      expect(laptopImg).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/p1"
      );

      const shirtImg = screen.getByAltText("T-Shirt");
      expect(shirtImg).toBeInTheDocument();
      expect(shirtImg).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/p2"
      );
    });

    it('should render "More Details" button for each product', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const moreDetailsButtons = screen.getAllByText("More Details");
      expect(moreDetailsButtons).toHaveLength(2);
    });

    it('should render "ADD TO CART" button for each product', () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      expect(addToCartButtons).toHaveLength(2);
    });

    it("should render product cards as children of Layout", () => {
      // Arrange & Act
      render(<Search />);

      // Assert
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toContainElement(screen.getByText("Laptop"));
      expect(layout).toContainElement(screen.getByText("T-Shirt"));
    });
  });

  describe("Rendering with a single product", () => {
    it('should show "Found 1" when one product is in results', () => {
      // Arrange
      useSearch.mockReturnValue([
        { keyword: "laptop", results: [mockProducts[0]] },
        jest.fn(),
      ]);

      // Act
      render(<Search />);

      // Assert
      expect(screen.getByText("Found 1")).toBeInTheDocument();
    });
  });

  describe("Container structure", () => {
    it("should render the correct container and text-center structure", () => {
      // Arrange
      useSearch.mockReturnValue([{ keyword: "", results: [] }, jest.fn()]);

      // Act
      const { container } = render(<Search />);

      // Assert
      const containerDiv = container.querySelector(".container");
      expect(containerDiv).toBeInTheDocument();

      const textCenter = container.querySelector(".text-center");
      expect(textCenter).toBeInTheDocument();
    });

    it("should render the flex wrap container for product cards", () => {
      // Arrange
      useSearch.mockReturnValue([
        { keyword: "test", results: mockProducts },
        jest.fn(),
      ]);

      // Act
      const { container } = render(<Search />);

      // Assert
      const flexWrap = container.querySelector(".d-flex.flex-wrap.mt-4");
      expect(flexWrap).toBeInTheDocument();
    });
  });
});
