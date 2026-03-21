// Jian Tao, A0273320R
//
// AI Assistance Declaration:
// Generative AI tool used: ChatGPT 5.2
//
// Purpose of AI usage:
// - Assisted in drafting the initial frontend integration test structure.
// - Helped suggest suitable test scenarios, mocking boundaries, and assertions.
// - All generated content was reviewed, edited, debugged, and validated before submission.
//
// What is tested:
// - Integration of the AdminOrders page with Layout, Header, Footer, and AdminMenu.
// - Conditional fetching of orders when an auth token is present.
// - Rendering of fetched order data in the orders table and product list.
// - Updating an order status through the dropdown and refetching updated orders.
// - Graceful handling of API fetch failure while keeping the page rendered.
//
// Testing approach:
// - Top-down frontend integration testing using Jest and React Testing Library.
//
// Why this approach was used:
// - AdminOrders is a page-level component that coordinates multiple child components.
// - A top-down approach is suitable because it starts from the main page component
//   and verifies how it interacts with its integrated child components.
// - External dependencies such as axios, context hooks, and selected third-party UI
//   components were mocked so that the test focuses on frontend integration behaviour
//   rather than backend/network or library internals.
//
// AI prompts used:
// Prompt 1:
// "Generate a frontend integration test for the React page component AdminOrders using
// Jest and React Testing Library. Use a top-down integration testing approach. Test the
// integration of AdminOrders with Layout, Header, Footer, and AdminMenu, while mocking
// only external boundaries such as axios, useAuth, useCart, useCategory, SearchInput,
// and Ant Design Select/Badge."
//
// Prompt 2:
// "Include test cases for: (1) rendering fetched orders successfully, (2) not fetching
// orders when auth token is missing, (3) updating order status and refetching orders,
// and (4) handling API fetch failure gracefully while keeping the page rendered."

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import AdminOrders from "../../pages/admin/AdminOrders";
import { useAuth } from "../../context/auth";
import { useCart } from "../../context/cart";
import useCategory from "../../hooks/useCategory";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../../hooks/useCategory", () => jest.fn());

// Keep Header real, but simplify unrelated child dependency
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input">SearchInput</div>
));

// Simplify toaster
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock antd lightly, but preserve integration intent of this page
jest.mock("antd", () => {
  const React = require("react");

  const MockSelect = ({ defaultValue, onChange, children }) => {
    const [value, setValue] = React.useState(defaultValue);

    React.useEffect(() => {
      setValue(defaultValue);
    }, [defaultValue]);

    return (
      <select
        aria-label="order-status"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
      >
        {children}
      </select>
    );
  };

  MockSelect.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );

  const MockBadge = ({ count, children }) => (
    <div>
      <span data-testid="cart-count">{count}</span>
      {children}
    </div>
  );

  return {
    Select: MockSelect,
    Badge: MockBadge,
  };
});

describe("AdminOrders frontend integration tests", () => {
  const setAuthMock = jest.fn();
  const setCartMock = jest.fn();

  const sampleOrders = [
    {
      _id: "order1",
      status: "Pending",
      buyer: { name: "Alice Buyer" },
      createdAt: "2026-03-18T10:00:00.000Z",
      payment: { success: true },
      products: [
        {
          _id: "p1",
          name: "Gaming Mouse",
          description: "A precise gaming mouse with RGB lighting and macro buttons",
          price: 129,
        },
        {
          _id: "p2",
          name: "Mechanical Keyboard",
          description: "A clicky keyboard with hot swappable switches",
          price: 199,
        },
      ],
    },
  ];

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue([
      {
        token: "admin-token",
        user: { name: "Admin Jane", role: 1 },
      },
      setAuthMock,
    ]);

    useCart.mockReturnValue([[{ _id: "c1" }, { _id: "c2" }], setCartMock]);

    useCategory.mockReturnValue([
      { slug: "electronics", name: "Electronics" },
      { slug: "books", name: "Books" },
    ]);
  });

  // Jian Tao, A0273320R
  it("renders AdminOrders together with Layout, Header, AdminMenu and fetched order data", async () => {
    axios.get.mockResolvedValueOnce({ data: sampleOrders });

    renderPage();

    // Page-level content
    expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();

    // Layout + child components integration
    expect(screen.getByText(/virtual vault/i)).toBeInTheDocument(); // Header
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument(); // AdminMenu
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument(); // Footer

    // Header integration with hooks
    expect(screen.getByText("Admin Jane")).toBeInTheDocument();
    expect(screen.getByTestId("cart-count")).toHaveTextContent("2");
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    // Orders rendered from API response
    expect(await screen.findByText("Alice Buyer")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Gaming Mouse")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Price : 129")).toBeInTheDocument();
    expect(screen.getByText("Price : 199")).toBeInTheDocument();

    // Verifies your createdAt fix indirectly
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
  });

  // Jian Tao, A0273320R
  it("does not fetch orders when auth token is missing", () => {
    useAuth.mockReturnValue([
      {
        token: "",
        user: { name: "Admin Jane", role: 1 },
      },
      setAuthMock,
    ]);

    renderPage();

    expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Jian Tao, A0273320R
  it("updates order status and refetches orders after the admin changes the status", async () => {
    axios.get.mockResolvedValueOnce({ data: sampleOrders });
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({
      data: [{ ...sampleOrders[0], status: "Shipped" }],
    });

    renderPage();

    expect(await screen.findByText("Alice Buyer")).toBeInTheDocument();

    const statusSelect = screen.getByLabelText("order-status");
    expect(statusSelect).toHaveValue("Pending");

    fireEvent.change(statusSelect, { target: { value: "Shipped" } });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order1",
        { status: "Shipped" }
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByLabelText("order-status")).toHaveValue("Shipped");
  });

  // Jian Tao, A0273320R
  it("keeps the page rendered when fetching orders fails and logs the error", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const error = new Error("Network error");

    axios.get.mockRejectedValueOnce(error);

    renderPage();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();
    expect(screen.getByText(/admin panel/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});