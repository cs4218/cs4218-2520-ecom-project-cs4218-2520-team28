import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)
// Integration tests for UpdateProduct page through real app routing.
// Scope:
// 1) Slug-parameter product fetch and form pre-population
// 2) Category fetch and current category selection
// 3) Optional updated photo upload
// 4) FormData payload and PUT endpoint verification
// 5) Redirect and toast handling for success and failure scenarios

jest.mock("axios");

jest.mock("react-hot-toast", () => {
  const actual = jest.requireActual("react-hot-toast");
  return {
    ...actual,
    __esModule: true,
    default: {
      success: jest.fn(),
      error: jest.fn(),
    },
    Toaster: () => <div data-testid="toaster" />,
  };
});

jest.mock("antd", () => {
  const React = require("react");

  const Select = ({
    children,
    onChange,
    value,
    placeholder,
    className,
  }) => {
    const normalized = (placeholder || "").toLowerCase();
    const testId = normalized.includes("category")
      ? "category-select"
      : "shipping-select";

    return (
      <select
        data-testid={testId}
        className={className}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    );
  };

  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );

  const Badge = ({ children, count = 0 }) => (
    <span>
      <span data-testid="cart-badge">{count}</span>
      {children}
    </span>
  );

  const Modal = { confirm: jest.fn() };

  return { Select, Badge, Modal };
});

const ADMIN_USER = {
  _id: "admin-update-1",
  name: "Admin Updater",
  email: "admin.update@test.com",
  role: 1,
};

const PRODUCT_SLUG = "macbook-pro";
const PRODUCT_ID = "product-100";

let originalFormData;
let originalCreateObjectURL;
let consoleErrorSpy;

class MockFormData {
  constructor() {
    this.fields = {};
  }

  append(key, value) {
    this.fields[key] = value;
  }

  get(key) {
    return this.fields[key];
  }
}

function setAuthenticatedAdmin() {
  localStorage.clear();
  localStorage.setItem(
    "auth",
    JSON.stringify({
      user: ADMIN_USER,
      token: "admin-update-token",
    })
  );
}

function renderAppAtUpdateProductRoute(slug = PRODUCT_SLUG) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/dashboard/admin/product/${slug}`,
      ]}
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

function setupAxiosForUpdateProduct({
  product,
  categories,
  putResponse,
  putError,
} = {}) {
  const resolvedProduct =
    product ||
    {
      _id: PRODUCT_ID,
      name: "MacBook Pro",
      description: "16-inch laptop",
      price: 3200,
      quantity: 6,
      shipping: true,
      category: { _id: "cat-laptops" },
    };

  const resolvedCategories =
    categories || [
      { _id: "cat-phones", name: "Phones", slug: "phones" },
      { _id: "cat-laptops", name: "Laptops", slug: "laptops" },
    ];

  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/auth/admin-auth") {
      return Promise.resolve({ data: { ok: true } });
    }

    if (url === `/api/v1/product/get-product/${PRODUCT_SLUG}`) {
      return Promise.resolve({ data: { product: resolvedProduct } });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: resolvedCategories,
        },
      });
    }

    if (url === "/api/v1/product/get-product") {
      return Promise.resolve({ data: { products: [] } });
    }

    return Promise.resolve({ data: { success: true } });
  });

  if (putError) {
    axios.put.mockRejectedValue(putError);
  } else {
    axios.put.mockResolvedValue({ data: putResponse || { success: true } });
  }

  axios.post.mockResolvedValue({ data: { success: true } });
  axios.delete.mockResolvedValue({ data: { success: true } });
}

describe("UpdateProduct integration (top-down)", () => {
  beforeAll(() => {
    originalFormData = global.FormData;
    global.FormData = MockFormData;
    originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:mock-updated-product-photo");

    // Filter known act warning noise from deep provider + route updates.
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
    global.FormData = originalFormData;
    URL.createObjectURL = originalCreateObjectURL;
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    toast.success = jest.fn();
    toast.error = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("loads update-product route by slug and pre-fills form with fetched product data", async () => {
    setAuthenticatedAdmin();
    setupAxiosForUpdateProduct();

    renderAppAtUpdateProductRoute();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/get-product/${PRODUCT_SLUG}`
      );
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /update product/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a name")).toHaveValue("MacBook Pro");
      expect(screen.getByPlaceholderText("write a description")).toHaveValue("16-inch laptop");
      expect(screen.getByPlaceholderText("write a Price")).toHaveValue(3200);
      expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(6);
      expect(screen.getByTestId("category-select")).toHaveValue("cat-laptops");
      expect(screen.getByRole("option", { name: "Laptops" })).toBeInTheDocument();
    });
  });

  test("accepts updated photo upload and updates selected filename", async () => {
    setAuthenticatedAdmin();
    setupAxiosForUpdateProduct();

    const { container } = renderAppAtUpdateProductRoute();

    await screen.findByRole("heading", { name: /update product/i });

    const fileInput = container.querySelector('input[name="photo"]');
    const nextPhoto = new File(["new-img"], "updated-product.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [nextPhoto] } });

    await waitFor(() => {
      expect(screen.getByText("updated-product.png")).toBeInTheDocument();
    });
  });

  test("submits updated fields with optional photo, sends PUT FormData, and redirects on success", async () => {
    setAuthenticatedAdmin();
    setupAxiosForUpdateProduct({ putResponse: { success: true } });

    const { container } = renderAppAtUpdateProductRoute();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("write a name")).toHaveValue("MacBook Pro");
    });

    fireEvent.change(await screen.findByPlaceholderText("write a name"), {
      target: { value: "MacBook Pro M4" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Updated pro model" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "3499" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByTestId("category-select"), {
      target: { value: "cat-phones" },
    });
    fireEvent.change(screen.getByTestId("shipping-select"), {
      target: { value: "0" },
    });

    const fileInput = container.querySelector('input[name="photo"]');
    const updatedPhoto = new File(["bytes"], "new-macbook.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [updatedPhoto] } });

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/product/update-product/${PRODUCT_ID}`,
        expect.any(MockFormData)
      );
    });

    const payload = axios.put.mock.calls[0][1];
    expect(payload.get("name")).toBe("MacBook Pro M4");
    expect(payload.get("description")).toBe("Updated pro model");
    expect(payload.get("price")).toBe("3499");
    expect(payload.get("quantity")).toBe("9");
    expect(payload.get("category")).toBe("cat-phones");
    expect(payload.get("shipping")).toBe("0");
    expect(payload.get("photo")).toBe(updatedPhoto);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /all products list/i })).toBeInTheDocument();
    });
  });

  test("shows error toast when update-product PUT rejects", async () => {
    setAuthenticatedAdmin();
    setupAxiosForUpdateProduct({
      putError: {
        response: {
          data: { error: "Invalid product data" },
        },
      },
    });

    renderAppAtUpdateProductRoute();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("write a name")).toHaveValue("MacBook Pro");
    });

    fireEvent.click(
      await screen.findByRole("button", { name: /update product/i })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid product data");
    });
  });

  test("shows product-not-found toast when PUT response is unsuccessful", async () => {
    setAuthenticatedAdmin();
    setupAxiosForUpdateProduct({
      putResponse: { success: false, message: "Product not found" },
    });

    renderAppAtUpdateProductRoute();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("write a name")).toHaveValue("MacBook Pro");
    });

    fireEvent.click(
      await screen.findByRole("button", { name: /update product/i })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Product not found");
    });
  });
});
