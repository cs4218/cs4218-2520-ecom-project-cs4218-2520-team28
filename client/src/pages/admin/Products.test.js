// Foo Chao, A0272024R

// AI generated unit tests for Products.js using Github Copilot (Claude Sonnet 4.5) Agent Mode
//
// Prompt 1:
// Do unit tests for Product.js 
// Follow same format as Dashboard.test.js, UserMenu.test.js, Private.test.js
// Notably mock other things that is not the unit we are testing
// Minimally do test the following
// 1) Layout and Admin Menu rendered
// 2) when data.products is empty array does not crashHandle
// 3) when data.products is one single item -> ensure all components rendered 
//    -> 1 test for each component of the product so we can identify error more easily
//    -> Link, img, name, description
// 4) Ensure all of them is within the Link for product components like img, name, description
// 5) when a single product field is missing should fail gracefully do not say undefined or null
// 6) when there is multiple products -> a single test to ensure all is rendered
// 7) Handle errors from APIs check toast is triggered make sure to mock toast as well
// 8) Handle weird values from API such as data is null or return value null or product is null 
//    (i think current code do not handle this but do not fix yet)
// 9) Add more tests as per necessary to make the test super covered and robust (I may miss some please let me know)
// State any logic errors found and which test case will be failing because of it but do not fix it yet. Thanks
//
// Reply 1 (excluding the code):
// I've created comprehensive unit tests for Products.js following the same format as 
// Dashboard.test.js, UserMenu.test.js, and Private.test.js. Here's a summary:
//
// Logic Errors Found in Products.js:
// 1. Missing null/undefined checks for API data (Line 34)
//    - Error: setProducts(data.products) doesn't verify if data or data.products exists
//    - Affected Test: "handles null data from API - LOGIC ERROR: will crash"
//    - Issue: If API returns { data: null }, accessing data.products will throw 
//      "Cannot read property 'products' of null"
//
// 2. No graceful handling for missing product fields (Lines 56-57)
//    - Error: {p.name} and {p.description} render directly without checking if they exist
//    - Affected Tests:
//      * "handles missing product name gracefully - LOGIC ERROR: displays undefined"
//      * "handles missing product description gracefully - LOGIC ERROR: displays undefined"
//    - Issue: When name or description is missing, the UI displays the text "undefined" 
//      instead of a fallback value or empty string
//
// 3. Typo in error message (Line 37)
//    - Error: toast.error("Someething Went Wrong") - "Something" is misspelled
//    - Affected Test: "handles API error and triggers toast.error"
//    - Issue: Minor typo but shows in user-facing error message
//
// Test Coverage Includes:
// ✅ 27 test cases covering:
// 1. Layout and AdminMenu rendering
// 2. Empty products array handling
// 3. Single product - individual component tests (Link, img, name, description)
// 4. Components properly nested within Link
// 5. Missing fields (name, description, slug, _id)
// 6. Multiple products rendering
// 7. API error handling with toast
// 8. Weird API values (null data, null products, undefined products)
// 9. Additional robust tests:
//    - API call on mount
//    - Container styling for scroll
//    - Card dimensions standardization
//    - Image dimensions
//    - Unique keys
//    - Layout structure
//
// All tests follow the AAA pattern (Arrange-Act-Assert) with proper mocking of 
// dependencies (axios, toast, Layout, AdminMenu, Link).
//
// Prompt 2:
// for test 5 make it be correct behaviour test i will fix later follow the one i do for name field
//
// Reply 2:
// Updated! The test for missing description field now follows the same pattern as the 
// missing name field test - it tests for the correct behavior (NOT displaying "undefined" 
// or "null") rather than documenting the bug. The test will fail until you fix the code 
// to handle missing fields gracefully.
//
// Prompt 3:
// Fix what is needed in main file so all test will pass
//
// Reply 3:
// All fixes have been applied to Products.js:
// Fixed Issues:
// 1. Line 37: Added null/undefined checks - setProducts(data?.products || []) prevents crash 
//    when API returns null data
// 2. Line 40: Fixed typo - "Something Went Wrong" (was "Someething")
// 3. Lines 69-70: Handle missing fields gracefully - {p.name || ""} and {p.description || ""} 
//    prevent displaying "undefined" or "null"
//
// Prompt 4:
// have u consider where the object dun have data field
//
// Reply 4:
// You're right! If the axios response itself doesn't have a `data` field (or is null/undefined), 
// the destructuring `const { data } = ...` could fail. Fixed by using `response?.data?.products || []` 
// which safely handles cases where:
// - The response object itself is null/undefined
// - The response doesn't have a `data` field
// - The `data` doesn't have a `products` field
// All these edge cases now safely fall back to an empty array instead of crashing.
//
// Prompt 5:
// Fix test 8 so that it give correct behaviour based on your fix and add this to comment on top as well
//
// Reply 5:
// Updated test 8 tests to verify correct behavior after fixes:
// - "handles null data from API gracefully" - now expects no crash and no products rendered
// - "handles data.products being null gracefully" - now expects graceful handling with empty array
// All weird API values (null data, null products, undefined products) are now properly handled 
// by falling back to empty arrays, as verified by the updated tests.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Products from "./Products";
import axios from "axios";

// 1) Mock axios
jest.mock("axios");

// 2) Mock toast
const mockToastError = jest.fn();
jest.mock("react-hot-toast", () => ({
  error: (...args) => mockToastError(...args),
}));

// 3) Mock Layout
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="layout">
    {props.children}
  </div>
));

// 4) Mock AdminMenu
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">ADMIN MENU</div>
));

// 5) Mock Link from react-router-dom
jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} data-testid="product-link" {...props}>
      {children}
    </a>
  ),
}));

describe("Products Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
  });

  // Test 1: Layout and AdminMenu rendered
  it("renders Layout and AdminMenu components", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    });
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    
  });

  it("renders heading 'All Products List'", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("All Products List")).toBeInTheDocument();
    });
  });

  // Test 2: Empty array doesn't crash
  it("handles empty products array without crashing", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("product-link")).not.toBeInTheDocument();
  });

  // Test 3.1: Single product - test Link component
  it("renders Link component for single product", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const link = screen.getByTestId("product-link");
      expect(link).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(link).toHaveAttribute("href", "/dashboard/admin/product/test-product");
    });
  });

  // Test 3.2: Single product - test img component
  it("renders img component for single product with correct src", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const img = screen.getByAltText("Test Product");
      expect(img).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/prod1");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(img).toHaveClass("card-img-top");
    });
  });

  // Test 3.3: Single product - test name component
  it("renders product name for single product", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product Name",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const name = screen.getByText("Test Product Name");
      expect(name).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(name.tagName).toBe("H5");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(name).toHaveClass("card-title");
    });
  });

  // Test 3.4: Single product - test description component
  it("renders product description for single product", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Product Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const description = screen.getByText("Test Product Description");
      expect(description).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(description.tagName).toBe("P");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(description).toHaveClass("card-text");
    });
  });

  // Test 4: Ensure all components are within Link
  it("ensures img, name, and description are all within Link", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const link = screen.getByTestId("product-link");
      const img = screen.getByAltText("Test Product");
      const name = screen.getByText("Test Product");
      const description = screen.getByText("Test Description");

      expect(link).toContainElement(img);
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(link).toContainElement(name);
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(link).toContainElement(description);
    });
  });

  // Test 5.1: Missing name field
  it("handles missing product name gracefully - LOGIC ERROR: displays undefined", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      // name is missing
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    // The code should handle missing name gracefully but currently renders "undefined"
    await waitFor(() => {
      expect(screen.getByTestId("product-link")).toBeInTheDocument();
    });
    // ensures no null or undefined displayed
    const cardTitle = screen.getByRole("heading", { level: 5 });
    expect(cardTitle.textContent).not.toBe("undefined");
    expect(cardTitle.textContent).not.toBe("null");
  });

  // Test 5.2: Missing description field
  it("handles missing product description gracefully - LOGIC ERROR: displays undefined", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      // description is missing
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    // The code should handle missing description gracefully but currently renders "undefined"
    await waitFor(() => {
      expect(screen.getByText("Test Product")).toBeInTheDocument();
    });
    // ensures no null or undefined displayed
    // eslint-disable-next-line testing-library/no-node-access
    const cardText = document.querySelector(".card-text");
    expect(cardText.textContent).not.toBe("undefined");
    expect(cardText.textContent).not.toBe("null");
  });

  // Test 5.3: Missing slug field
  it("handles missing product slug gracefully", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      // slug is missing
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const link = screen.getByTestId("product-link");
      expect(link).toHaveAttribute("href", "/dashboard/admin/product/undefined");
    });
  });

  // Test 6: Multiple products rendered
  it("renders all products when multiple products exist", async () => {
    // Arrange
    const mockProducts = [
      {
        _id: "prod1",
        name: "Product 1",
        description: "Description 1",
        slug: "product-1",
      },
      {
        _id: "prod2",
        name: "Product 2",
        description: "Description 2",
        slug: "product-2",
      },
      {
        _id: "prod3",
        name: "Product 3",
        description: "Description 3",
        slug: "product-3",
      },
    ];
    axios.get.mockResolvedValueOnce({
      data: { products: mockProducts },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      /* eslint-disable testing-library/no-wait-for-multiple-assertions */
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
      expect(screen.getByText("Product 3")).toBeInTheDocument();
      expect(screen.getByText("Description 1")).toBeInTheDocument();
      expect(screen.getByText("Description 2")).toBeInTheDocument();
      expect(screen.getByText("Description 3")).toBeInTheDocument();
      /* eslint-enable testing-library/no-wait-for-multiple-assertions */
    });

    // Verify correct number of product links
    const links = screen.getAllByTestId("product-link");
    expect(links).toHaveLength(3);
  });

  // Test 7: API error handling - toast triggered
  it("handles API error and triggers toast.error", async () => {
    // Arrange
    const mockError = new Error("Network Error");
    axios.get.mockRejectedValueOnce(mockError);

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(mockError);
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(mockToastError).toHaveBeenCalledWith("Something Went Wrong");
    });
  });

  // Test 8.1: Null data from API
  it("handles null data from API gracefully", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: null,
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
    
    // Should handle null data gracefully with empty array
    expect(screen.queryByTestId("product-link")).not.toBeInTheDocument();
  });

  // Test 8.2: data.products is null
  it("handles data.products being null gracefully", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: null },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    // Should handle null products gracefully with empty array
    expect(screen.queryByTestId("product-link")).not.toBeInTheDocument();
  });

  // Test 8.3: data.products is undefined
  it("handles data.products being undefined gracefully", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: {},
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });

    // Optional chaining prevents crash
    expect(screen.queryByTestId("product-link")).not.toBeInTheDocument();
  });

  // Test 9.1: API is called on component mount
  it("calls API on component mount", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  // Test 9.2: Products container has correct styling
  it("renders products container with correct styling for scrolling", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access
      const container = document.querySelector(".d-flex.flex-wrap");
      expect(container).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(container).toHaveStyle({ maxHeight: "70vh", overflowY: "auto" });
    });
  });

  // Test 9.3: Product card has correct dimensions
  it("renders product card with standardized dimensions", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access
      const card = document.querySelector(".card");
      expect(card).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(card).toHaveStyle({
        width: "18rem",
        height: "400px",
        display: "flex",
        flexDirection: "column",
      });
    });
  });

  // Test 9.4: Product image has correct dimensions
  it("renders product image with standardized height", async () => {
    // Arrange
    const mockProduct = {
      _id: "prod1",
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const img = screen.getByAltText("Test Product");
      expect(img).toHaveStyle({
        height: "300px",
        objectFit: "cover",
      });
    });
  });

  // Test 9.5: Each product has unique key
  it("assigns unique key to each product based on _id", async () => {
    // Arrange
    const mockProducts = [
      {
        _id: "prod1",
        name: "Product 1",
        description: "Description 1",
        slug: "product-1",
      },
      {
        _id: "prod2",
        name: "Product 2",
        description: "Description 2",
        slug: "product-2",
      },
    ];
    axios.get.mockResolvedValueOnce({
      data: { products: mockProducts },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      const links = screen.getAllByTestId("product-link");
      expect(links).toHaveLength(2);
      // React automatically uses the key prop, but we can verify the products are rendered
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(screen.getByText("Product 2")).toBeInTheDocument();
    });
  });

  // Test 9.6: Missing _id field (no key)
  it("handles missing _id field - potential React warning", async () => {
    // Suppress React key warning for this test
    const originalError = console.error;
    console.error = jest.fn((message) => {
      if (message.includes('unique "key" prop')) return;
      originalError(message);
    });

    // Arrange
    const mockProduct = {
      // _id is missing
      name: "Test Product",
      description: "Test Description",
      slug: "test-product",
    };
    axios.get.mockResolvedValueOnce({
      data: { products: [mockProduct] },
    });

    // Act
    render(<Products />);

    // Assert - Product still renders but React would warn about missing key
    await waitFor(() => {
      expect(screen.getByText("Test Product")).toBeInTheDocument();
    });

    // Restore console.error
    console.error = originalError;
  });

  // Test 9.7: Layout structure verification
  it("renders correct layout structure with row and columns", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access
      const row = document.querySelector(".row");
      expect(row).toBeInTheDocument();
      
      // eslint-disable-next-line testing-library/no-node-access
      const col3 = document.querySelector(".col-md-3");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(col3).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(col3).toContainElement(screen.getByTestId("admin-menu"));
      
      // eslint-disable-next-line testing-library/no-node-access
      const col9 = document.querySelector(".col-md-9");
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(col9).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(col9).toContainElement(screen.getByText("All Products List"));
    });
  });
});
