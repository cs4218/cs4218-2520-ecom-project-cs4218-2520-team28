import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import App from "../../App";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)
// Integration tests for ProductDetails page through real app routing.
// Scope:
// 1) Slug-based product fetch and state-driven rendering
// 2) Chained similar-product fetch using fetched product/category ids
// 3) Similar product cards, images, and More Details navigation
// 4) Route slug updates triggering re-render/fetch
// 5) Error paths (product missing or request failure) without crashes

jest.mock("axios");

const PRODUCT_ALPHA = {
  _id: "prod-alpha",
  name: "Alpha Phone",
  description: "Flagship alpha phone",
  price: 1199,
  slug: "alpha-phone",
  category: {
    _id: "cat-phones",
    name: "Phones",
  },
};

const PRODUCT_BETA = {
  _id: "prod-beta",
  name: "Beta Tablet",
  description: "Premium beta tablet",
  price: 899,
  slug: "alpha-lite",
  category: {
    _id: "cat-tablets",
    name: "Tablets",
  },
};

const RELATED_FOR_ALPHA = [
  {
    _id: "rel-1",
    name: "Alpha Lite",
    description: "Compact companion device for alpha ecosystem",
    price: 499,
    slug: "alpha-lite",
  },
  {
    _id: "rel-2",
    name: "Alpha Max",
    description: "Larger model with high-end battery and cameras",
    price: 1499,
    slug: "alpha-max",
  },
];

const RELATED_FOR_BETA = [
  {
    _id: "rel-3",
    name: "Beta Case",
    description: "Protective beta accessory with magnetic lock",
    price: 79,
    slug: "beta-case",
  },
];

function renderAppAtProductDetails(slug = PRODUCT_ALPHA.slug) {
  return render(
    <MemoryRouter
      initialEntries={[`/product/${slug}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <App />
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function setupAxiosForProductDetailsSuccess() {
  axios.get.mockImplementation((url) => {
    if (url === `/api/v1/product/get-product/${PRODUCT_ALPHA.slug}`) {
      return Promise.resolve({ data: { product: PRODUCT_ALPHA } });
    }

    if (
      url ===
      `/api/v1/product/related-product/${PRODUCT_ALPHA._id}/${PRODUCT_ALPHA.category._id}`
    ) {
      return Promise.resolve({ data: { products: RELATED_FOR_ALPHA } });
    }

    if (url === `/api/v1/product/get-product/${PRODUCT_BETA.slug}`) {
      return Promise.resolve({ data: { product: PRODUCT_BETA } });
    }

    if (
      url ===
      `/api/v1/product/related-product/${PRODUCT_BETA._id}/${PRODUCT_BETA.category._id}`
    ) {
      return Promise.resolve({ data: { products: RELATED_FOR_BETA } });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { success: true, category: [] } });
    }

    if (url.startsWith("/api/v1/product/product-category/")) {
      return Promise.resolve({
        data: { category: { name: "Phones" }, products: [] },
      });
    }

    if (url === "/api/v1/product/get-product") {
      return Promise.resolve({ data: { products: [] } });
    }

    return Promise.resolve({ data: { success: true } });
  });

  axios.post.mockResolvedValue({ data: { success: true } });
  axios.put.mockResolvedValue({ data: { success: true } });
  axios.delete.mockResolvedValue({ data: { success: true } });
}

describe("ProductDetails integration (top-down)", () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeAll(() => {
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation((msg, ...args) => {
        if (typeof msg === "string" && msg.includes("not wrapped in act")) {
          return;
        }
        process.stderr.write([msg, ...args].map(String).join(" ") + "\n");
      });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    localStorage.clear();
  });

  test("loads by slug, fetches product then related products, and renders product/photo details", async () => {
    setupAxiosForProductDetailsSuccess();

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/get-product/${PRODUCT_ALPHA.slug}`
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/related-product/${PRODUCT_ALPHA._id}/${PRODUCT_ALPHA.category._id}`
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
      expect(screen.getByText(`Name : ${PRODUCT_ALPHA.name}`)).toBeInTheDocument();
      expect(screen.getByText(`Description : ${PRODUCT_ALPHA.description}`)).toBeInTheDocument();
      expect(screen.getByText(`Category : ${PRODUCT_ALPHA.category.name}`)).toBeInTheDocument();
      expect(screen.getByText(/\$1,199\.00/)).toBeInTheDocument();
    });

    const primaryImage = screen.getByAltText(PRODUCT_ALPHA.name);
    expect(primaryImage).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${PRODUCT_ALPHA._id}`
    );
  });

  test("renders similar product cards with images and More Details buttons", async () => {
    setupAxiosForProductDetailsSuccess();

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await waitFor(() => {
      expect(screen.getByText(/similar products/i)).toBeInTheDocument();
      expect(screen.getByText("Alpha Lite")).toBeInTheDocument();
      expect(screen.getByText("Alpha Max")).toBeInTheDocument();
    });

    const cardImages = screen.getAllByRole("img");
    const relatedImg1 = cardImages.find((img) => img.getAttribute("alt") === "Alpha Lite");
    const relatedImg2 = cardImages.find((img) => img.getAttribute("alt") === "Alpha Max");

    expect(relatedImg1).toHaveAttribute("src", `/api/v1/product/product-photo/rel-1`);
    expect(relatedImg2).toHaveAttribute("src", `/api/v1/product/product-photo/rel-2`);

    const moreDetailButtons = screen.getAllByRole("button", { name: /more details/i });
    expect(moreDetailButtons).toHaveLength(2);
  });

  test("clicking More Details updates slug route and re-renders with new product data", async () => {
    setupAxiosForProductDetailsSuccess();

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await screen.findByText("Alpha Lite");

    const alphaLiteCard = screen
      .getByText("Alpha Lite")
      .closest(".card");

    fireEvent.click(
      within(alphaLiteCard).getByRole("button", { name: /more details/i })
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/get-product/${PRODUCT_BETA.slug}`
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Name\s*:\s*Beta Tablet/i)).toBeInTheDocument();
      expect(screen.getByText(/Description\s*:\s*Premium beta tablet/i)).toBeInTheDocument();
      expect(screen.getByText(/\$899\.00/)).toBeInTheDocument();
    });
  });

  test("shows no-similar-products message when related products array is empty", async () => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/get-product/${PRODUCT_ALPHA.slug}`) {
        return Promise.resolve({ data: { product: PRODUCT_ALPHA } });
      }
      if (
        url ===
        `/api/v1/product/related-product/${PRODUCT_ALPHA._id}/${PRODUCT_ALPHA.category._id}`
      ) {
        return Promise.resolve({ data: { products: [] } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await waitFor(() => {
      expect(screen.getByText(/no similar products found/i)).toBeInTheDocument();
    });
  });

  test("handles product fetch failure without crashing page", async () => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/get-product/${PRODUCT_ALPHA.slug}`) {
        return Promise.reject(new Error("network failed"));
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    });
  });

  test("handles product-not-found response path without crashing", async () => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/get-product/${PRODUCT_ALPHA.slug}`) {
        return Promise.resolve({ data: { product: undefined } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtProductDetails(PRODUCT_ALPHA.slug);

    await waitFor(() => {
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
      expect(screen.getByText(/no similar products found/i)).toBeInTheDocument();
    });
  });
});
