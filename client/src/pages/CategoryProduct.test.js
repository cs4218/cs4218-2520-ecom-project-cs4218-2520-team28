import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CategoryProduct from "./CategoryProduct";
import axios from "axios";

// Mock axios
jest.mock("axios");

// Mock Layout (so we don’t render full layout)
jest.mock("../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

// Mock react-router-dom
const mockNavigate = jest.fn();
let mockSlug = "electronics";

jest.mock("react-router-dom", () => ({
  useParams: () => ({ slug: mockSlug }),
  useNavigate: () => mockNavigate,
}));

describe("CategoryProduct Component", () => {

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches products by category on mount", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });
  });

  test("renders category name", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    expect(await screen.findByText(/Category - Electronics/i)).toBeInTheDocument();
  });

  test("renders products correctly", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  test("navigates to product detail when clicking More Details", async () => {
    axios.get.mockResolvedValue({ data: mockData });

    render(<CategoryProduct />);

    const button = await screen.findByText("More Details");

    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
  });

  test("handles empty product list", async () => {
    axios.get.mockResolvedValue({
      data: { products: [], category: { name: "Electronics" } },
    });

    render(<CategoryProduct />);

    expect(await screen.findByText(/0 result found/i)).toBeInTheDocument();
  });

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

  test("does not call API if slug is undefined", async () => {
    mockSlug = undefined;

    render(<CategoryProduct />);

    expect(axios.get).not.toHaveBeenCalled();
  });


});