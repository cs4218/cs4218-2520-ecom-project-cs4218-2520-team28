// Foo Chao, A0272024R

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "./Dashboard";

// 1) Mock useAuth hook (module path must match Private.js)
let mockAuthValue = [{}, jest.fn()]; // Mutable value that can be changed between renders
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => mockAuthValue),
}));

// 2) Mock Layout
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="layout">
    <div>Layout Title: {props.title}</div>
    {props.children}
  </div>
));

// 3) Mock UserMenu
jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu">USER MENU</div>
));

describe("User Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user dashboard with layout and user menu", () => {
    // Arrange -> Mock useAuth to return user info
    mockAuthValue = [
      {
        user: {
          name: "John Doe",
          email: "john.doe@gmail.com",
          address: "123 Main St",
        },
      },
      jest.fn(),
    ];

    // Act -> Render
    render(<Dashboard />);

    // Assert -> Check presence of layout and user menu
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("displays user information correctly", () => {
    // Arrange -> Mock useAuth to return user info
    mockAuthValue = [
      {
        user: {
          name: "John Doe",
          email: "john.doe@gmail.com",
          address: "123 Main St",
        },
      },
      jest.fn(),
    ];

    // Act -> Render
    render(<Dashboard />);

    // Assert -> Check user information is displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john.doe@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("Layout contains correct title prop", () => {
    // Arrange -> Mock useAuth to return user info
    mockAuthValue = [
      {
        user: {
          name: "John Doe",
          email: "john.doe@gmail.com",
          address: "123 Main St",
        },
      },
      jest.fn(),
    ];

    // Act -> Render
    render(<Dashboard />);

    // Assert -> Check Layout title prop
    expect(screen.getByTestId("layout")).toHaveTextContent("Layout Title: Dashboard - Ecommerce App");
  });

  it("Layout contains child elements", () => {
    // Arrange -> Mock useAuth to return user info
    mockAuthValue = [
      {
        user: {
          name: "John Doe",
          email: "john.doe@gmail.com",
          address: "123 Main St",
        },
      },
      jest.fn(),
    ];

    // Act -> Render
    render(<Dashboard />);

    // Assert -> Check Layout has child elements
    const layout = screen.getByTestId("layout");
    expect(layout).toContainElement(screen.getByText("John Doe"));
    expect(layout).toContainElement(screen.getByText("john.doe@gmail.com"));
    expect(layout).toContainElement(screen.getByText("123 Main St"));
    expect(layout).toContainElement(screen.getByTestId("user-menu"));
  });


  it("handles missing user email gracefully", () => {
    // Arrange -> Mock useAuth to return incomplete user info
    mockAuthValue = [
      {
        user: {
          name: "Jane Doe",
          // email is missing
          address: "456 Elm St",
        },
      },
      jest.fn(),
    ];

    // Act -> Render
    render(<Dashboard />);
    // Assert -> Check available user information is displayed
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("456 Elm St")).toBeInTheDocument();
    // Assert -> Check missing email does not cause error (not rendered)
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    expect(screen.queryByTestId("null")).not.toBeInTheDocument();
  });

  it("handles no user info gracefully", () => {
    // Arrange -> Mock useAuth to return no user info
    mockAuthValue = [
      {
        // user is missing
      },
      jest.fn(),
    ];
    // Act -> Render
    render(<Dashboard />);

    // Assert -> Check that no user info is displayed
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    expect(screen.queryByTestId("null")).not.toBeInTheDocument();
  });

  it("updates displayed user info when all user info changes", async () => {
    // Arrange -> Initial user info
    mockAuthValue = [
      {
        user: {
          name: "Initial User",
          email: "init.user@test.com",
          address: "Initial Address",
        },
      },
      jest.fn(),
    ];

    // Render
    const { rerender } = render(<Dashboard />);
    // Ensures Initial info displayed before update
    expect(screen.getByText("Initial User")).toBeInTheDocument();
    expect(screen.getByText("init.user@test.com")).toBeInTheDocument();
    expect(screen.getByText("Initial Address")).toBeInTheDocument();

    // Act -> Update mockAuthValue to new user info
    mockAuthValue = [
      {
        user: {
          name: "Updated User",
          email: "updated.user@test.com",
          address: "Updated Address",
        },
      },
      jest.fn(),
    ];

    // Rerender with updated auth context
    rerender(<Dashboard />);

    // Assert -> New info displayed
    await waitFor(() => {
      expect(screen.getByText("Updated User")).toBeInTheDocument();
    });
    expect(screen.getByText("updated.user@test.com")).toBeInTheDocument();
    expect(screen.getByText("Updated Address")).toBeInTheDocument();
  });

  it("updates displayed user info when partial user info changes", async () => {
    // Arrange -> Initial user info
    mockAuthValue = [
      {
        user: {
          name: "Partial Initial",
          email: "partial.initial@test.com",
          address: "Partial Address",
        },
      },
      jest.fn(),
    ];

    // Render
    const { rerender } = render(<Dashboard />);
    // Ensures Initial info displayed before update
    expect(screen.getByText("Partial Initial")).toBeInTheDocument();
    expect(screen.getByText("partial.initial@test.com")).toBeInTheDocument();
    expect(screen.getByText("Partial Address")).toBeInTheDocument();

    // Act -> Update mockAuthValue to new partial user info -> only name changed
    mockAuthValue = [
      {
        user: {
          name: "Partial Updated",
          email: "partial.initial@test.com",
          address: "Partial Address",
        },
      },
      jest.fn(),
    ];

    // Rerender with updated auth context
    rerender(<Dashboard />);

    // Assert -> New info displayed
    await waitFor(() => {
      expect(screen.getByText("Partial Updated")).toBeInTheDocument();
    });
    expect(screen.getByText("partial.initial@test.com")).toBeInTheDocument();
    expect(screen.getByText("Partial Address")).toBeInTheDocument();
  });

});
