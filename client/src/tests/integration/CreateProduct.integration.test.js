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
// Integration tests for CreateProduct page through real app routes.
// Scope:
// 1) Admin-authenticated route access and mount data fetch
// 2) Category loading into dropdown and form field rendering
// 3) File upload state updates for different file types/sizes
// 4) FormData payload verification for create-product API
// 5) Success redirect and error-path toasts

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
  _id: "admin-create-1",
  name: "Admin Creator",
  email: "admin.create@test.com",
  role: 1,
};

let originalFormData;
let originalCreateObjectURL;
let formDataInstances = [];
let consoleErrorSpy;

class MockFormData {
  constructor() {
    this.fields = {};
    formDataInstances.push(this);
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
      token: "admin-create-token",
    })
  );
}

function renderAppAtCreateProductRoute() {
  return render(
    <MemoryRouter
      initialEntries={["/dashboard/admin/create-product"]}
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

function setupAxiosForCreateProduct({ categories = [], postResponse, postError } = {}) {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/auth/admin-auth") {
      return Promise.resolve({ data: { ok: true } });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: categories,
        },
      });
    }

    if (url === "/api/v1/product/get-product") {
      return Promise.resolve({ data: { products: [] } });
    }

    return Promise.resolve({ data: { success: true } });
  });

  if (postError) {
    axios.post.mockRejectedValue(postError);
  } else {
    axios.post.mockResolvedValue({ data: postResponse || { success: true } });
  }

  axios.put.mockResolvedValue({ data: { success: true } });
  axios.delete.mockResolvedValue({ data: { success: true } });
}

describe("CreateProduct integration (top-down)", () => {
  beforeAll(() => {
    originalFormData = global.FormData;
    global.FormData = MockFormData;
    originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:mock-product-photo");

    // Integration rendering with the full provider tree can emit known act-noise.
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
    formDataInstances = [];

    toast.success = jest.fn();
    toast.error = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("loads create-product route as admin, fetches categories, and renders all form fields", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateProduct({
      categories: [
        { _id: "cat-1", name: "Electronics", slug: "electronics" },
        { _id: "cat-2", name: "Furniture", slug: "furniture" },
      ],
    });

    renderAppAtCreateProductRoute();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create product/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(screen.getByTestId("category-select")).toBeInTheDocument();
      expect(screen.getByTestId("category-select")).toHaveTextContent("Electronics");
      expect(screen.getByTestId("category-select")).toHaveTextContent("Furniture");
      expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a description")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a quantity")).toBeInTheDocument();
      expect(screen.getByTestId("shipping-select")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create product/i })).toBeInTheDocument();
    });
  });

  test("accepts photo upload and updates label for various file types and sizes", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateProduct({
      categories: [{ _id: "cat-1", name: "Electronics", slug: "electronics" }],
    });

    const { container } = renderAppAtCreateProductRoute();

    await screen.findByRole("heading", { name: /create product/i });

    const fileInput = container.querySelector('input[name="photo"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", "image/*");

    const files = [
      new File(["jpeg"], "camera.jpg", { type: "image/jpeg" }),
      new File(["png"], "banner.png", { type: "image/png" }),
      new File([new ArrayBuffer(2 * 1024 * 1024)], "large.webp", {
        type: "image/webp",
      }),
    ];

    for (const uploadedFile of files) {
      fireEvent.change(fileInput, { target: { files: [uploadedFile] } });
      await waitFor(() => {
        expect(screen.getByText(uploadedFile.name)).toBeInTheDocument();
      });
    }
  });

  test("submits required fields, posts FormData with photo, shows success toast, and redirects", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateProduct({
      categories: [{ _id: "cat-1", name: "Electronics", slug: "electronics" }],
      postResponse: { success: true },
    });

    const { container } = renderAppAtCreateProductRoute();

    const nameInput = await screen.findByPlaceholderText("write a name");
    fireEvent.change(nameInput, { target: { value: "Gaming Mouse" } });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Ultra-lightweight gaming mouse" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "12" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("category-select")).toHaveTextContent("Electronics");
    });

    fireEvent.change(screen.getByTestId("category-select"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByTestId("shipping-select"), {
      target: { value: "1" },
    });

    const photoFile = new File(["img"], "mouse.jpg", { type: "image/jpeg" });
    const fileInput = container.querySelector('input[name="photo"]');
    fireEvent.change(fileInput, { target: { files: [photoFile] } });

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(MockFormData)
      );
    });

    const postedFormData = axios.post.mock.calls[0][1];
    expect(postedFormData.get("name")).toBe("Gaming Mouse");
    expect(postedFormData.get("description")).toBe("Ultra-lightweight gaming mouse");
    expect(postedFormData.get("price")).toBe("99");
    expect(postedFormData.get("quantity")).toBe("12");
    expect(postedFormData.get("category")).toBe("cat-1");
    expect(postedFormData.get("shipping")).toBe("1");
    expect(postedFormData.get("photo")).toBe(photoFile);
    expect(formDataInstances.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /all products list/i })).toBeInTheDocument();
    });
  });

  test("shows backend error toast when create-product POST rejects", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateProduct({
      categories: [{ _id: "cat-1", name: "Electronics", slug: "electronics" }],
      postError: {
        response: {
          data: { error: "Photo exceeds maximum size" },
        },
      },
    });

    const { container } = renderAppAtCreateProductRoute();

    fireEvent.change(await screen.findByPlaceholderText("write a name"), {
      target: { value: "Camera" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Compact camera" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByTestId("category-select"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByTestId("shipping-select"), {
      target: { value: "0" },
    });

    const fileInput = container.querySelector('input[name="photo"]');
    const photoFile = new File(["img"], "camera.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [photoFile] } });

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Photo exceeds maximum size");
    });
  });
});
