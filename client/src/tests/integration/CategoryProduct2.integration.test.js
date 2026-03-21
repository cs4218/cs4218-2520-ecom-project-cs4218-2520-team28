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

// // Mock Header dependencies so real Layout/Header/Footer can still render
jest.mock("../../context/auth", () => {
  const actual = jest.requireActual("../../context/auth");
  return {
    ...actual,
    useAuth: () => [{ user: null, token: "" }, jest.fn()],
  };
});

jest.mock("../../context/cart", () => {
  const actual = jest.requireActual("../../context/cart");
  return {
    ...actual,
    useCart: () => [[], jest.fn()],
  };
});

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

jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

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
