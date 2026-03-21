// Ho Jin Han, A0266275W
// Integration Test for Admin Dashboard

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../../pages/admin/AdminDashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";

jest.mock("axios");

describe("AdminDashboard Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderAdminDashboard = () => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <AdminDashboard />
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("AD.1 Should display admin details from auth context and render Admin Menu", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { success: true, category: [] },
    });

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: {
          name: "Integration Admin",
          email: "admin@test.com",
          phone: "66677788",
          role: 1,
        },
        token: "admin-tok",
      })
    );

    renderAdminDashboard();

    await waitFor(() => {
      // Verify AdminMenu options (match actual DOM)
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      expect(screen.getByText("Create Category")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();

      // Verify Admin details on Dashboard
      expect(screen.getByText(/Admin Name/i)).toHaveTextContent("Integration Admin");
      expect(screen.getByText(/Admin Email/i)).toHaveTextContent("admin@test.com");
      expect(screen.getByText(/Admin Contact/i)).toHaveTextContent("66677788");
    });
  });
});
