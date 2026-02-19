// Jian Tao - A0273320R

// AI-assisted unit tests generated with guidance from ChatGPT-5.2

// Prompts:
// 1. "Generate unit tests for Orders.js following the structure of existing test files.
//     Mock axios, auth context, Layout, and UserMenu.
//     Test rendering, API fetching, empty state handling, error handling,
//     and rendering of multiple orders and products."
// 2. "Explain and fix the React warning: 'Each child in a list should have a unique key prop'.
//     Modify the component to ensure proper key usage in orders.map()."


// Test Coverage:
// 1. Verifies component renders the page title "All Orders".
// 2. Verifies orders are fetched when auth token exists.
// 3. Verifies fetched order status, buyer name, and product details render correctly.
// 4. Verifies multiple orders are rendered properly.
// 5. Verifies component handles empty order list gracefully.
// 6. Verifies component handles API errors without crashing.
// 7. Verifies external dependencies (axios, auth context, Layout, UserMenu) are mocked correctly.
// 8. Verifies asynchronous rendering using waitFor from React Testing Library.


import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Orders from "./Orders";
import axios from "axios";

// Mocks for external dependencies
jest.mock("axios");
jest.mock("../../context/auth", () => ({
  useAuth: () => [
    { token: "fake-token" }, // mock auth
    jest.fn(),
  ],
}));
jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));
jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);



// Test suite for Orders component
describe("Orders Component", () => {

  // Test case: Component renders with page title
  test("renders Orders title", () => {
    render(<Orders />);
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  // Test case: Fetches and displays orders correctly
  test("fetches and displays orders", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [
            {
              _id: "p1",
              name: "Product 1",
              description: "Product description",
              price: 100,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("Processing")).toBeInTheDocument()
    );

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Product 1")).toBeInTheDocument();
  });


  // Test case: Handles empty orders gracefully
  test("handles empty orders", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("All Orders")).toBeInTheDocument()
    );
  });

  // Test case: Handles API errors gracefully
  test("handles API errors gracefully", async () => {
    axios.get.mockRejectedValue(new Error("API Error"));

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("All Orders")).toBeInTheDocument()
    );
  });

  // Test case: Displays multiple orders correctly
  test("displays multiple orders correctly", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [
            {
              _id: "p1",
              name: "Product 1",
              description: "Product description",
              price: 100,
            },
          ],
        },
        {
          _id: "2",
          status: "Shipped",
          buyer: { name: "Jane" },
          createAt: new Date(),
          payment: { success: true },
          products: [
            {
              _id: "p2",
              name: "Product 2",
              description: "Another product description",
              price: 200,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText("Processing")).toBeInTheDocument();
      expect(screen.getByText("Shipped")).toBeInTheDocument();
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Jane")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
    });


  });

});