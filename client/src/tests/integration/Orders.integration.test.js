// Jian Tao, A0273320R
// AI Declaration:
// Generative AI tool used: ChatGPT
//
// AI was used to assist in drafting, structuring, and refining this frontend
// integration test for the Orders page.
//
// The AI assistance included:
// 1. Suggesting a suitable testing strategy for this component.
// 2. Recommending a top-down frontend integration approach.
// 3. Proposing relevant test scenarios based on the component behavior.
// 4. Generating an initial Jest + React Testing Library test structure.
// 5. Helping debug failing test assertions and asynchronous rendering issues.
//
// What is tested in this file:
// - Whether the Orders page fetches orders when an auth token is present.
// - Whether fetched order data is rendered correctly.
// - Whether createdAt is used correctly for date rendering.
// - Whether payment status, quantity, and product information are displayed.
// - Whether the page avoids fetching orders when no token is present.
// - Whether the page handles API failure gracefully without crashing.
//
// Testing approach used:
// - Top-down frontend integration testing.
//
// Why this approach was used:
// - The Orders page depends on multiple connected frontend parts such as
//   Layout, Header, Footer, routing, authentication state, and API calls.
// - A top-down integration approach is suitable because it tests the page
//   from the user-facing level while mocking only external dependencies
//   such as axios and custom hooks.
// - This allows the test to verify component interaction and rendered output
//   in a realistic but controlled way.
//
// The AI-generated content was not submitted directly without review.
// I manually reviewed, edited, and adapted the generated code and explanations
// to match my project structure, imports, mocks, expected outputs, and actual
// frontend behavior.

import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import Orders from "../../pages/user/Orders";
import { useAuth } from "../../context/auth";
import { useCart } from "../../context/cart";
import useCategory from "../../hooks/useCategory";

// ---- mocks ----
jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// reduce noise from unrelated child components
jest.mock("../../components/UserMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

jest.mock("../../components/Form/SearchInput", () => ({
  __esModule: true,
  default: () => <div data-testid="search-input">Search Input</div>,
}));

// make time rendering deterministic so we can verify createdAt is used
jest.mock("moment", () =>
  jest.fn((value) => ({
    fromNow: () => `fromNow:${value}`,
  }))
);

describe("Orders page frontend integration tests", () => {
  const mockSetAuth = jest.fn();

  const mockOrders = [
    {
      _id: "order1",
      status: "Processing",
      buyer: { name: "Jian Tao" },
      createdAt: "2026-03-18T10:00:00.000Z",
      payment: { success: true },
      products: [
        {
          _id: "p1",
          name: "MacBook Pro",
          description: "Apple laptop for software engineering and development",
          price: 1999,
        },
        {
          _id: "p2",
          name: "Mechanical Keyboard",
          description: "Tactile keyboard for coding and productivity use",
          price: 149,
        },
      ],
    },
    {
      _id: "order2",
      status: "Delivered",
      buyer: { name: "Jian Tao" },
      createdAt: "2026-03-17T08:30:00.000Z",
      payment: { success: false },
      products: [
        {
          _id: "p3",
          name: "Gaming Mouse",
          description: "Ergonomic mouse with programmable buttons",
          price: 89,
        },
      ],
    },
  ];

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue([
      {
        user: { name: "Jian Tao", role: 0 },
        token: "valid-token",
      },
      mockSetAuth,
    ]);

    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([
      { name: "Electronics", slug: "electronics" },
      { name: "Accessories", slug: "accessories" },
    ]);

    axios.get.mockResolvedValue({ data: mockOrders });
  });

  it("should fetch orders when auth token exists and render the page with layout", async () => {
    renderPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();

    expect(screen.getByText("All Orders")).toBeInTheDocument();
    expect(screen.getByText(/Virtual Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();

    expect(screen.getAllByText("Jian Tao").length).toBeGreaterThan(0);
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    expect(screen.getByText("Gaming Mouse")).toBeInTheDocument();

    expect(screen.getByText("Price : 1999")).toBeInTheDocument();
    expect(screen.getByText("Price : 149")).toBeInTheDocument();
    expect(screen.getByText("Price : 89")).toBeInTheDocument();
  });

  it("should use createdAt to render the order date", async () => {
    renderPage();

    expect(
      await screen.findByText("fromNow:2026-03-18T10:00:00.000Z")
    ).toBeInTheDocument();

    expect(
      screen.getByText("fromNow:2026-03-17T08:30:00.000Z")
    ).toBeInTheDocument();
  });

  it("should render truncated product descriptions", async () => {
    renderPage();

    expect(await screen.findByText("MacBook Pro")).toBeInTheDocument();

    expect(
      screen.getByText("Apple laptop for software engi")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Tactile keyboard for coding an")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Ergonomic mouse with programma")
    ).toBeInTheDocument();
  });

  it("should not fetch orders when auth token is missing", () => {
    useAuth.mockReturnValue([
      {
        user: null,
        token: "",
      },
      mockSetAuth,
    ]);

    renderPage();

    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  it("should handle API failure gracefully", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("Network error"));

    renderPage();

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });

    // page still renders, just without order data
    expect(screen.getByText("All Orders")).toBeInTheDocument();

    logSpy.mockRestore();
  });
});