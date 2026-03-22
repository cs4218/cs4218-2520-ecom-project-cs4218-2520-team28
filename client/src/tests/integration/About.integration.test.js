// Ho Jin Han, A0266275W
// Integration Test for About Page

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "../../pages/About";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";

jest.mock("axios");

describe("About Integration Tests", () => {
  it("A.1 Should render About page with layout context correctly", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { success: true, category: [] },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <About />
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Assert Layout Header is rendered
      expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();

      // Assert About page main content is rendered (stable UI contract)
      const aboutImg = screen.getByRole("img", { name: /contactus/i });
      expect(aboutImg).toBeInTheDocument();
      expect(aboutImg).toHaveAttribute("src", expect.stringContaining("about.jpeg"));

      // Optional: the placeholder text currently on the page
      expect(screen.getByText(/add text/i)).toBeInTheDocument();
    });
  });
});
