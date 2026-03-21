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
// Integration tests for CategoryProduct page through real app routing.
// Scope:
// 1) Slug-based category/product fetch on mount
// 2) Category heading and count rendering
// 3) Product card grid rendering (image, name, price, description)
// 4) Price/description fallback behaviors and safe category optional chaining
// 5) Navigation to ProductDetails and silent error handling

jest.mock("axios");

const CATEGORY_PHONES = {
  _id: "cat-phones",
  name: "Phones",
  slug: "phones",
};

const CATEGORY_TABLETS = {
  _id: "cat-tablets",
  name: "Tablets",
  slug: "tablets",
};

const CAT_PRODUCTS = [
  {
    _id: "cp-1",
    name: "Atlas Phone",
    slug: "atlas-phone",
    description: "Atlas flagship with improved camera and battery",
    price: 1299,
  },
  {
    _id: "cp-2",
    name: "Atlas Mini",
    slug: "atlas-mini",
    description: "Compact atlas model with balanced performance",
    price: null,
  },
  {
    _id: "cp-3",
    name: "Atlas Fold",
    slug: "atlas-fold",
    description: undefined,
    price: 1799,
  },
];

const TABLET_PRODUCTS = [
  {
    _id: "tp-1",
    name: "Nebula Tab",
    slug: "nebula-tab",
    description: "Large display tablet",
    price: 899,
  },
];

const PRODUCT_DETAILS_FOR_ATLAS = {
  _id: "cp-1",
  name: "Atlas Phone",
  description: "Atlas flagship with improved camera and battery",
  price: 1299,
  slug: "atlas-phone",
  category: CATEGORY_PHONES,
};

function renderAppAtCategoryProduct(slug = CATEGORY_PHONES.slug) {
  return render(
    <MemoryRouter
      initialEntries={[`/category/${slug}`]}
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

function setupAxiosForCategoryProductSuccess() {
  axios.get.mockImplementation((url) => {
    if (url === `/api/v1/product/product-category/${CATEGORY_PHONES.slug}`) {
      return Promise.resolve({
        data: {
          category: CATEGORY_PHONES,
          products: CAT_PRODUCTS,
        },
      });
    }

    if (url === `/api/v1/product/product-category/${CATEGORY_TABLETS.slug}`) {
      return Promise.resolve({
        data: {
          category: CATEGORY_TABLETS,
          products: TABLET_PRODUCTS,
        },
      });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: [CATEGORY_PHONES, CATEGORY_TABLETS],
        },
      });
    }

    if (url.includes("/api/v1/product/get-product/")) {
      const slug = url.substring(url.lastIndexOf("/") + 1);
      if (slug === PRODUCT_DETAILS_FOR_ATLAS.slug) {
        return Promise.resolve({ data: { product: PRODUCT_DETAILS_FOR_ATLAS } });
      }
      return Promise.resolve({
        data: {
          product: {
            ...PRODUCT_DETAILS_FOR_ATLAS,
            slug,
          },
        },
      });
    }

    if (
      url ===
      `/api/v1/product/related-product/${PRODUCT_DETAILS_FOR_ATLAS._id}/${CATEGORY_PHONES._id}`
    ) {
      return Promise.resolve({ data: { products: [] } });
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

describe("CategoryProduct integration (top-down)", () => {
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

  test("loads by category slug, calls category endpoint, and renders heading/count", async () => {
    setupAxiosForCategoryProductSuccess();

    renderAppAtCategoryProduct(CATEGORY_PHONES.slug);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/product-category/${CATEGORY_PHONES.slug}`
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /category - phones/i })).toBeInTheDocument();
      expect(screen.getByText("3 result found")).toBeInTheDocument();
    });
  });

  test("renders product cards with image src, names, prices, and truncated/fallback descriptions", async () => {
    setupAxiosForCategoryProductSuccess();

    renderAppAtCategoryProduct(CATEGORY_PHONES.slug);

    await waitFor(() => {
      expect(screen.getByText("Atlas Phone")).toBeInTheDocument();
      expect(screen.getByText("Atlas Mini")).toBeInTheDocument();
      expect(screen.getByText("Atlas Fold")).toBeInTheDocument();
    });

    expect(screen.getByText("$1,299.00")).toBeInTheDocument();
    expect(screen.getByText("$1,799.00")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();

    expect(screen.getByText("Atlas flagship with improved camera and battery...")).toBeInTheDocument();
    expect(screen.getByText("...")).toBeInTheDocument();

    const atlasImage = screen.getByAltText("Atlas Phone");
    const miniImage = screen.getByAltText("Atlas Mini");
    const foldImage = screen.getByAltText("Atlas Fold");

    expect(atlasImage).toHaveAttribute("src", `/api/v1/product/product-photo/cp-1`);
    expect(miniImage).toHaveAttribute("src", `/api/v1/product/product-photo/cp-2`);
    expect(foldImage).toHaveAttribute("src", `/api/v1/product/product-photo/cp-3`);
  });

  test("clicking More Details navigates to ProductDetails route using product slug", async () => {
    setupAxiosForCategoryProductSuccess();

    renderAppAtCategoryProduct(CATEGORY_PHONES.slug);

    const atlasCard = (await screen.findByText("Atlas Phone")).closest(".card");
    fireEvent.click(
      within(atlasCard).getByRole("button", { name: /more details/i })
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/get-product/${PRODUCT_DETAILS_FOR_ATLAS.slug}`
      );
      expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    });
  });

  test("supports optional chaining for missing category object without crashing", async () => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/product-category/${CATEGORY_PHONES.slug}`) {
        return Promise.resolve({
          data: {
            category: undefined,
            products: [],
          },
        });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtCategoryProduct(CATEGORY_PHONES.slug);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /category -/i })).toBeInTheDocument();
      expect(screen.getByText("0 result found")).toBeInTheDocument();
    });
  });

  test("handles category-not-found/API failure silently without crash", async () => {
    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/product-category/${CATEGORY_PHONES.slug}`) {
        return Promise.reject(new Error("category fetch failed"));
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtCategoryProduct(CATEGORY_PHONES.slug);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(screen.getByText(/category -/i)).toBeInTheDocument();
    });
  });
});
// Jian Tao - A0273320R
//
// AI Assistance Declaration:
// Generative AI (ChatGPT) was used to support the development of this test file.
// AI assistance was used for:
// 1. Suggesting a suitable frontend integration testing approach for the CategoryProduct page.
// 2. Explaining why a top-down integration approach was appropriate for this component.
// 3. Generating an initial draft of the integration test cases.
// 4. Suggesting test scenarios such as data fetching, defensive rendering, navigation, missing slug handling, and API error handling.
// 5. Helping refine and debug the test code to match the project's current Jest and Testing Library setup.
//
// All generated content was reviewed, edited, and validated by the author before submission.
// Frontend integration tests for CategoryProduct page
// Top-down integration approach:
// CategoryProduct -> Layout -> Header/Footer -> router hooks + axios boundary

import React from "react";
import "@testing-library/jest-dom";
import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import CategoryProduct from "../../pages/CategoryProduct";

jest.mock("axios");

let mockParams = { slug: "electronics" };
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

// Mock Header dependencies so real Layout/Header/Footer can still render
jest.mock("../../context/auth", () => ({
  useAuth: () => [{ user: null, token: "" }, jest.fn()],
}));

jest.mock("../../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../../hooks/useCategory", () => ({
  __esModule: true,
  default: () => [
    { slug: "electronics", name: "Electronics" },
    { slug: "fashion", name: "Fashion" },
  ],
}));

jest.mock("../../components/Form/SearchInput", () => ({
  __esModule: true,
  default: () => <div data-testid="search-input">SearchInput</div>,
}));

jest.mock("antd", () => ({
  Badge: ({ children, count }) => (
    <div data-testid="cart-badge" data-count={count}>
      {children}
    </div>
  ),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <CategoryProduct />
    </MemoryRouter>
  );

describe("CategoryProduct frontend integration tests", () => {
  let consoleSpy;

  beforeEach(() => {
    mockParams = { slug: "electronics" };
    mockNavigate.mockClear();
    axios.get.mockReset();

    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("renders Layout shell and fetches category products when slug exists", async () => {
    axios.get.mockResolvedValue({
      data: {
        category: { name: "Electronics" },
        products: [
          {
            _id: "p1",
            name: "Laptop",
            slug: "laptop",
            price: 1299.5,
            description: "A reliable laptop for school and coding projects",
          },
          {
            _id: "p2",
            name: "Headphones",
            slug: "headphones",
            price: 89.99,
            description: "Comfortable wireless headphones with clear sound",
          },
        ],
      },
    });

    renderPage();

    // Real Layout/Header/Footer integration
    expect(screen.getByText(/virtual vault/i)).toBeInTheDocument();
    expect(
      screen.getByText(/all rights reserved/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    expect(
      await screen.findByText(/category - electronics/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/2 result found/i)).toBeInTheDocument();

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("$1,299.50")).toBeInTheDocument();

    expect(screen.getByText("Headphones")).toBeInTheDocument();
    expect(screen.getByText("$89.99")).toBeInTheDocument();

    // Image source integration
    const laptopImage = screen.getByAltText("Laptop");
    expect(laptopImage).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1"
    );
  });

  it("renders defensive fallback values for missing description and invalid price", async () => {
    axios.get.mockResolvedValue({
      data: {
        category: { name: "Electronics" },
        products: [
          {
            _id: "p3",
            name: "Broken Item",
            slug: "broken-item",
            price: undefined,
            description: undefined,
          },
        ],
      },
    });

    renderPage();

    const title = await screen.findByText("Broken Item");
    const card = title.closest(".card");

    expect(card).not.toBeNull();
    expect(within(card).getByText("N/A")).toBeInTheDocument();
    expect(within(card).getByText("...")).toBeInTheDocument();
  });

  it("navigates to product details page when More Details is clicked", async () => {
    axios.get.mockResolvedValue({
      data: {
        category: { name: "Electronics" },
        products: [
          {
            _id: "p4",
            name: "Phone",
            slug: "phone",
            price: 499,
            description: "A great phone for daily use",
          },
        ],
      },
    });

    renderPage();

    await screen.findByText("Phone");

    await userEvent.click(
      screen.getByRole("button", { name: /more details/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/product/phone");
  });

  it("does not fetch products when slug is missing", async () => {
    mockParams = {};

    renderPage();

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/category -/i)).toBeInTheDocument();
    expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
  });

  it("keeps the page rendered and logs the error when fetching fails", async () => {
    const error = new Error("Network error");
    axios.get.mockRejectedValue(error);

    renderPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/electronics"
      );
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    // Page should still be rendered despite the failed request
    expect(screen.getByText(/virtual vault/i)).toBeInTheDocument();
    expect(screen.getByText(/category -/i)).toBeInTheDocument();
    expect(screen.getByText(/0 result found/i)).toBeInTheDocument();
  });
});
