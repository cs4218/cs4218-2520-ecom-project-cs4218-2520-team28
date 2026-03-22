// Ho Jin Han, A0266275W
// Integration Test: Header dropdown toggle should be a real button (not NavLink without `to`)

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../../components/Header";

jest.mock("../../components/Form/SearchInput", () => () => <div data-testid="search" />);
jest.mock("../../hooks/useCategory", () => () => []);

jest.mock("../../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../../context/auth", () => ({
  useAuth: () => [
    { user: { name: "Integration Admin", role: 1 }, token: "tok" },
    jest.fn(),
  ],
}));

describe("Header Dropdown Toggle Integration", () => {
  it("HD.1 renders user dropdown toggle as a BUTTON (bug fix verification)", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // This fails on the buggy version because there was no button with username
    const toggle = screen.getByRole("button", { name: /integration admin/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("data-bs-toggle", "dropdown");
  });
});
