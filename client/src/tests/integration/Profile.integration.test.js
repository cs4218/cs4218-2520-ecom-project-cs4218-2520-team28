// Ho Jin Han, A0266275W
// Integration Test for Profile Page
// Ensure Auth integration, UserMenu navigation, and profile update API connectivity

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "../../pages/user/Profile";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

describe("Profile Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderProfile = () => {
    return render(
      <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <Profile />
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("P.1 Should display user profile fields initialized from auth context", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "User Profile Test", email: "pro@file.com", phone: "11223344", address: "Profile Street", role: 0 },
        token: "tok",
      })
    );

    renderProfile();

    await waitFor(() => {
      expect(screen.getByDisplayValue("User Profile Test")).toBeInTheDocument();
      expect(screen.getByDisplayValue("pro@file.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("11223344")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Profile Street")).toBeInTheDocument();
    });
  });

  it("P.2 Should update profile and trigger success toast and localStorage update", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    // Simulate successful API update
    jest.spyOn(axios, "put").mockResolvedValue({
      data: {
        success: true,
        updatedUser: {
          name: "New Profile Test",
          email: "pro@file.com",
          phone: "99999999",
          address: "New Profile Street",
          role: 0,
        },
      }
    });

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "User Profile Test", email: "pro@file.com", phone: "11223344", address: "Profile Street", role: 0 },
        token: "tok",
      })
    );

    renderProfile();

    await waitFor(() => {
      expect(screen.getByDisplayValue("User Profile Test")).toBeInTheDocument();
    });

    // Update input fields
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), { target: { value: "New Profile Test" } });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), { target: { value: "99999999" } });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), { target: { value: "New Profile Street" } });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), { target: { value: "newpass" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "UPDATE" }));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
        name: "New Profile Test",
        email: "pro@file.com",
        password: "newpass",
        phone: "99999999",
        address: "New Profile Street",
      });
      expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
      
      const ls = JSON.parse(localStorage.getItem("auth"));
      expect(ls.user.name).toBe("New Profile Test");
      expect(ls.user.phone).toBe("99999999");
    });
  });

  it("P.3 Should display toast error when API returns error", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    // Simulate API update returning custom error field
    jest.spyOn(axios, "put").mockResolvedValue({
      data: {
        error: "Password is required and 6 character long",
      }
    });

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "User", email: "u@u.com", phone: "111", address: "Add", role: 0 },
        token: "tok",
      })
    );

    renderProfile();

    await waitFor(() => {
      expect(screen.getByDisplayValue("User")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "UPDATE" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Password is required and 6 character long");
    });
  });

  it("P.4 Should display generic toast error on network or 500 error", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });
    
    jest.spyOn(axios, "put").mockRejectedValue(new Error("Network Error"));

    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "User", email: "u@u.com", phone: "111", address: "Add", role: 0 },
        token: "tok",
      })
    );

    renderProfile();

    await waitFor(() => {
      expect(screen.getByDisplayValue("User")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "UPDATE" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
