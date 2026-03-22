// Ho Jin Han, A0266275W
// Integration Test for Layout Component
// Ensure Header, Footer, and Toaster are properly layered, and Helmet injects properly

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../../components/Layout";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import axios from "axios";

jest.mock("axios");

describe("Layout Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, "get").mockResolvedValue({
      data: { success: true, category: [] },
    });
  });

  const renderLayout = (props = {}) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <SearchProvider>
            <CartProvider>
              <Layout {...props}>
                <div data-testid="child-content">Child Content</div>
              </Layout>
            </CartProvider>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("L.1 Should render Layout with default title and children", async () => {
    const { container } = renderLayout();

    // Helmet/title updates can be async
    await waitFor(() => {
      expect(document.title).toBe("Ecommerce app - shop now");
    });

    // Synchronous assertions
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();

    // Footer text can be matched multiple times if not scoped, so scope to footer container
    const footer = container.querySelector(".footer");
    expect(footer).not.toBeNull();

    expect(within(footer).getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it("L.2 Should render Custom Title, Description, Keywords, Author via Helmet", async () => {
    renderLayout({
      title: "Custom Integration Title",
      description: "Custom Description",
      keywords: "integration, react, testing",
      author: "Jin Han",
    });

    await waitFor(() => {
      expect(document.title).toBe("Custom Integration Title");
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute("content", "Custom Description");

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    expect(metaKeywords).toHaveAttribute("content", "integration, react, testing");

    const metaAuthor = document.querySelector('meta[name="author"]');
    expect(metaAuthor).toHaveAttribute("content", "Jin Han");
  });
});
