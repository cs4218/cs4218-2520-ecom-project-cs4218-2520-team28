import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import { Modal } from "antd";

// Chi Thanh, A0276229W
// AI Assistance: Github Copilot (GPT-5.3-Codex)
// Integration tests for admin category management page.
// Test perspective: top-down through App routing and real providers.
// Network calls are boundary-mocked via axios.
// Coverage focus:
// 1) Initial load and category fetch
// 2) Create category success + error paths
// 3) Update flow via edit modal
// 4) Delete flow via confirmation callback

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

const ADMIN_USER = {
  _id: "admin-1",
  name: "Admin User",
  email: "admin@test.com",
  role: 1,
};

// Seeds auth storage so AdminRoute allows entry to admin pages.
function setAuthenticatedAdmin() {
  localStorage.clear();
  localStorage.setItem(
    "auth",
    JSON.stringify({
      user: ADMIN_USER,
      token: "admin-token",
    })
  );
}

// Renders full route chain to validate page behavior in-app, not in isolation.
function renderAppAtCreateCategoryRoute() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
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

// Shared network setup for creation flow with optional post-create table refresh data.
function setupAxiosForCreateCategoryFlow({
  initialCategories = [],
  categoriesAfterCreate,
  postResponse = { success: true },
} = {}) {
  const nextCategories = categoriesAfterCreate ?? initialCategories;

  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/auth/admin-auth") {
      return Promise.resolve({ data: { ok: true } });
    }

    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: initialCategories,
        },
      });
    }

    if (url === "/api/v1/auth/user-auth") {
      return Promise.resolve({ data: { ok: true } });
    }

    return Promise.resolve({ data: { success: true } });
  });

  axios.post.mockImplementation((url, body) => {
    if (url === "/api/v1/category/create-category") {
      return Promise.resolve({ data: postResponse });
    }
    return Promise.resolve({ data: { success: true } });
  });

  axios.put.mockResolvedValue({ data: { success: true } });
  axios.delete.mockResolvedValue({ data: { success: true } });

  // Switch get-category payload after first create success so refetch can be asserted in UI.
  axios.post.mockImplementationOnce((url) => {
    if (url === "/api/v1/category/create-category") {
      axios.get.mockImplementation((getUrl) => {
        if (getUrl === "/api/v1/auth/admin-auth") {
          return Promise.resolve({ data: { ok: true } });
        }
        if (getUrl === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: {
              success: true,
              category: nextCategories,
            },
          });
        }
        if (getUrl === "/api/v1/auth/user-auth") {
          return Promise.resolve({ data: { ok: true } });
        }
        return Promise.resolve({ data: { success: true } });
      });
    }

    return Promise.resolve({ data: postResponse });
  });
}

describe("CreateCategory integration (top-down)", () => {
  let confirmSpy;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    toast.success = jest.fn();
    toast.error = jest.fn();

    confirmSpy = jest.spyOn(Modal, "confirm");
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    localStorage.clear();
  });

  // Verifies authenticated admin can load page and initial categories are fetched/rendered.
  test("loads page for authenticated admin and fetches categories on mount", async () => {
    setAuthenticatedAdmin();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: "c1", name: "Electronics", slug: "electronics" }],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    renderAppAtCreateCategoryRoute();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /manage category/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      const tableBody = screen.getByRole("table").querySelector("tbody");
      expect(within(tableBody).getByText("Electronics")).toBeInTheDocument();
    });
  });

  // Verifies create submit, success toast, input reset, and table update after refetch.
  test("creates category, shows success toast, resets input, and refetches table", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateCategoryFlow({
      initialCategories: [{ _id: "c1", name: "Books", slug: "books" }],
      categoriesAfterCreate: [
        { _id: "c1", name: "Books", slug: "books" },
        { _id: "c2", name: "Sports", slug: "sports" },
      ],
      postResponse: { success: true },
    });

    renderAppAtCreateCategoryRoute();

    const input = await screen.findByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Sports" } });

    const createForm = input.closest("form");
    fireEvent.submit(createForm);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "Sports" }
      );
      expect(toast.success).toHaveBeenCalledWith("Sports is created");
    });

    await waitFor(() => {
      expect(input).toHaveValue("");
    });

    await waitFor(() => {
      const tableBody = screen.getByRole("table").querySelector("tbody");
      expect(within(tableBody).getByText("Sports")).toBeInTheDocument();
    });
  });

  // Verifies non-success API response is surfaced to user via toast.
  test("shows error toast when create API returns invalid response", async () => {
    setAuthenticatedAdmin();

    setupAxiosForCreateCategoryFlow({
      initialCategories: [],
      postResponse: { success: false, message: "Category Already Exists" },
    });

    renderAppAtCreateCategoryRoute();

    const input = await screen.findByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Books" } });
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Category Already Exists");
    });
  });

  // Verifies rejected create request propagates backend message.
  test("shows error toast when create API rejects", async () => {
    setAuthenticatedAdmin();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    axios.post.mockRejectedValue({
      response: {
        data: { message: "Name is required" },
      },
    });

    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });

    renderAppAtCreateCategoryRoute();

    const input = await screen.findByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Name is required");
    });
  });

  // Verifies edit action seeds modal input and sends update API request.
  test("opens edit modal with selected category and submits update", async () => {
    setAuthenticatedAdmin();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: "c7", name: "Garden", slug: "garden" }],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });

    renderAppAtCreateCategoryRoute();

    await screen.findByRole("heading", { name: /manage category/i });

    const tableBody = screen.getByRole("table").querySelector("tbody");
    const row = await within(tableBody).findByText("Garden");
    const rowElement = row.closest("tr");

    fireEvent.click(within(rowElement).getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText("Enter new category")[1]).toHaveValue("Garden");
    });

    const modalInput = screen.getAllByPlaceholderText("Enter new category")[1];
    fireEvent.change(modalInput, { target: { value: "Garden Updated" } });
    fireEvent.submit(modalInput.closest("form"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/c7",
        { name: "Garden Updated" }
      );
      expect(toast.success).toHaveBeenCalledWith("Garden Updated is updated");
    });
  });

  // Verifies delete action executes API call through confirmation modal onOk path.
  test("delete flow sends delete request via category API", async () => {
    setAuthenticatedAdmin();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/auth/admin-auth") {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: "c9", name: "Delete Me", slug: "delete-me" }],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });

    confirmSpy.mockImplementation(({ onOk }) => onOk && onOk());

    renderAppAtCreateCategoryRoute();

    await screen.findByRole("heading", { name: /manage category/i });

    const tableBody = screen.getByRole("table").querySelector("tbody");
    const row = await within(tableBody).findByText("Delete Me");
    const rowElement = row.closest("tr");

    fireEvent.click(within(rowElement).getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/c9"
      );
    });
  });
});
