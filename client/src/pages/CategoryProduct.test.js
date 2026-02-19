import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CategoryProduct from "./CategoryProduct";
import axios from "axios";

// Jian Tao - A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// Test Coverage:
// - Successful API call and rendering of products
// - Rendering of category name from API response
// - Rendering of product name and formatted price
// - Navigation to product details page on button click
// - Handling empty product list response
// - Error handling when API request fails
// - Conditional branch where slug is undefined and API is not called
//
// Prompt 1: How should I test this CategoryProduct component?
// Prompt 2: Why is my branch coverage only 50% and how can I increase it?
// Prompt 3: How should I properly test the error handling branch?
// Prompt 4: Why is my test causing an invalid hook call error and how do I fix it?




// Jian Tao - A0273320R
// Mock external dependencies to isolate CategoryProduct component logic
// Mock axios to simulate API responses without making real HTTP requests
jest.mock("axios");
// Mock Layout component to avoid rendering full layout structure during tests
jest.mock("../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));
// Mock react-router-dom hooks to control route parameters and navigation behavior
// mockSlug variable allows dynamic testing of slug-present and slug-absent branches
const mockNavigate = jest.fn();
let mockSlug = "electronics";
jest.mock("react-router-dom", () => ({
  useParams: () => ({ slug: mockSlug }),
  useNavigate: () => mockNavigate,
}));

// Jian Tao - A0273320R
// Test suite for CategoryProduct component
// Covers API calls, rendering logic, navigation behavior, and branch conditions
describe("CategoryProduct Component", () => {

  // Mock API response data used for successful test scenarios
  const mockData = {
    products: [
      {
        _id: "1",
        name: "Laptop",
        price: 1000,
        description: "High performance laptop",
        slug: "laptop",
      },
    ],
    category: {
      name: "Electronics",
    },
  };

  // Reset mocks before each test to prevent cross-test interference
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Coverage: Verify API is called with correct category slug on component mount
  test("fetches products by category on mount", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });
  });

  // Test Coverage: Verify category name is rendered correctly from API response
  test("renders category name", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    expect(await screen.findByText(/Category - Electronics/i)).toBeInTheDocument();
  });

  // Test Coverage: Verify product name and formatted price are rendered correctly
  test("renders products correctly", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  // Test Coverage: Verify navigation to product detail page when "More Details" is clicked
  test("navigates to product detail when clicking More Details", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    const button = await screen.findByText("More Details");

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
  });

  // Test Coverage: Verify component handles empty product list correctly
  test("handles empty product list", async () => {
    axios.get.mockResolvedValue({
      data: { products: [], category: { name: "Electronics" } },
    });

    render(<CategoryProduct />);

    expect(await screen.findByText(/0 result found/i)).toBeInTheDocument();
  });

  // Test Coverage: Verify error handling branch when API request fails
  // Spy on console.log to ensure catch block is executed
  test("handles API errors gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    axios.get.mockRejectedValue(new Error("API Error"));

    render(<CategoryProduct />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  // Test Coverage: Verify API is not called when slug parameter is undefined
  // Covers false branch of conditional: if (params?.slug)
  test("does not call API if slug is undefined", async () => {
    mockSlug = undefined;

    render(<CategoryProduct />);

    expect(axios.get).not.toHaveBeenCalled();
  });


});