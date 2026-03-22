// Ho Jin Han, A0266275W
// Integration Test for Header Component
// Testing integration with Auth, Cart, Category contexts and Router

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../../components/Header";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

describe("Header Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderHeader = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <Header />
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("H.1 Should render Header with default guest links", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    renderHeader();

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

  it("H.2 Should render Header with User name when logged in as User (Role 0)", async () => {
    // Mock the axios call for useCategory within Header
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    // Log user in
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Test User", role: 0 },
        token: "fake-jwt-token",
      })
    );

    renderHeader();

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.queryByText("Register")).not.toBeInTheDocument();
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("H.3 Should render Header with Admin dashboard link when logged in as Admin (Role 1)", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin Test", role: 1 },
        token: "admin-jwt-token",
      })
    );

    renderHeader();

    await waitFor(() => {
      expect(screen.getByText("Admin Test")).toBeInTheDocument();
      const dashboardLink = screen.getByRole('link', { name: "Dashboard" });
      expect(dashboardLink.getAttribute('href')).toBe('/dashboard/admin');
    });
  });

  it("H.4 Should handle logout properly from Header", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "To Logout", role: 0 },
        token: "some-token",
      })
    );

    renderHeader();

    await waitFor(() => {
      expect(screen.getByText("To Logout")).toBeInTheDocument();
    });

    // Click the name to open the dropdown
    const navDropdown = screen.getByText("To Logout");
    fireEvent.click(navDropdown);

    // Click logout
    const logoutBtn = screen.getByText("Logout");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
      expect(localStorage.getItem("auth")).toBeNull();
      // Should instantly revert to showing Register and Login
      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
      expect(screen.queryByText("To Logout")).not.toBeInTheDocument();
    });
  });

  it("H.5 Should render categories dynamically from useCategory hook", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({
      data: {
        success: true,
        category: [
          { _id: "1", name: "Electronics", slug: "electronics" },
          { _id: "2", name: "Books", slug: "books" },
        ],
      },
    });

    renderHeader();

    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();
    });
  });

  it("H.6 Should integrate with Cart hook and display 0 by default", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    renderHeader();

    await waitFor(() => {
      // The badge count uses the length of the cart array
      // So '0' is rendered within the Badge component
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
