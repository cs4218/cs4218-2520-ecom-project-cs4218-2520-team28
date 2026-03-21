// Foo Tzie Huang - A0262376Y
// AI-assisted unit tests generated with guidance from Claude (Anthropic)
//
// Test Coverage:
// 1. Component renders without crashing
// 2. Renders "All Users" heading
// 3. Renders AdminMenu component
// 4. Renders Layout with correct title prop ("Dashboard - All Users")
// 5. Renders the correct container structure (container-fluid, row, columns)
// 6. AdminMenu and heading are children of Layout

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter } from "react-router-dom";
import Users from "./Users";

// Mock AdminMenu to isolate component under test
jest.mock("../../components/AdminMenu", () => {
  return () => <div data-testid="admin-menu-mock">Admin Menu</div>;
});

// Mock Layout to render children and expose title prop
jest.mock("./../../components/Layout", () => {
  return ({ children, title }) => (
    <div data-testid="layout-mock" title={title}>
      {children}
    </div>
  );
});

describe("Users Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
  });

  it('should render the "All Users" heading', () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("All Users");
  });

  it("should render the AdminMenu component", () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByTestId("admin-menu-mock")).toBeInTheDocument();
    expect(screen.getByText("Admin Menu")).toBeInTheDocument();
  });

  it('should render Layout with correct title prop "Dashboard - All Users"', () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    const layout = screen.getByTestId("layout-mock");
    expect(layout).toHaveAttribute("title", "Dashboard - All Users");
  });

  it("should render the correct container structure", () => {
    // Arrange & Act
    const { container } = render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert - container-fluid wrapper
    const containerFluid = container.querySelector(".container-fluid");
    expect(containerFluid).toBeInTheDocument();

    // Assert - row inside container-fluid
    const row = container.querySelector(".row");
    expect(row).toBeInTheDocument();

    // Assert - col-md-3 for AdminMenu and col-md-9 for content
    const colMd3 = container.querySelector(".col-md-3");
    const colMd9 = container.querySelector(".col-md-9");
    expect(colMd3).toBeInTheDocument();
    expect(colMd9).toBeInTheDocument();
  });

  it("should render AdminMenu inside the col-md-3 column", () => {
    // Arrange & Act
    const { container } = render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    const colMd3 = container.querySelector(".col-md-3");
    expect(colMd3).toContainElement(screen.getByTestId("admin-menu-mock"));
  });

  it('should render "All Users" heading inside the col-md-9 column', () => {
    // Arrange & Act
    const { container } = render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    const colMd9 = container.querySelector(".col-md-9");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(colMd9).toContainElement(heading);
  });

  it("should render AdminMenu and heading as children of Layout", () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // Assert
    const layout = screen.getByTestId("layout-mock");
    expect(layout).toContainElement(screen.getByTestId("admin-menu-mock"));
    expect(layout).toContainElement(
      screen.getByRole("heading", { level: 1 })
    );
  });
});
