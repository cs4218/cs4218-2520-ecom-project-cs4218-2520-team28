// Ho Jin Han, A0266275W
// Integration Test for Pagenotfound Page

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Pagenotfound from "../../pages/Pagenotfound";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";

jest.mock("axios");

describe("Pagenotfound Integration Tests", () => {
  it("PNF.1 Should navigate to Home when pressing Go Back", async () => {
    jest.spyOn(axios, "get").mockResolvedValue({ data: { success: true, category: [] } });

    render(
      <MemoryRouter initialEntries={["/some-random-broken-path"]}>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <Routes>
                <Route path="/some-random-broken-path" element={<Pagenotfound />} />
                <Route path="/" element={<div data-testid="test-home-page">Home Loaded</div>} />
              </Routes>
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("404")).toBeInTheDocument();
      expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("link", { name: "Go Back" }));

    await waitFor(() => {
      expect(screen.getByTestId("test-home-page")).toBeInTheDocument();
    });
  });
});
