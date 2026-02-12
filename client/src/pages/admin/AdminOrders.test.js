import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrders from "./AdminOrders";
import axios from "axios";

jest.mock("axios");

// Mock auth context
jest.mock("../../context/auth", () => ({
  useAuth: () => [{ token: "fake-token" }, jest.fn()],
}));


// Mock Layout
jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

// Mock AdminMenu
jest.mock("../../components/AdminMenu", () => () => (
  <div>AdminMenu</div>
));

// Mock antd Select (replace with normal select)
jest.mock("antd", () => {
  const Select = ({ children, onChange, defaultValue }) => (
    <select
      data-testid="status-select"
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );

  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );

  return { Select };
});


describe("AdminOrders Component", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });

  test("renders page title", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<AdminOrders />);

    await waitFor(() =>
      expect(screen.getByText("All Orders")).toBeInTheDocument()
    );
  });


  test("fetches and displays orders", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [],
        },
      ],
    });

    render(<AdminOrders />);

    await waitFor(() =>
      expect(screen.getByText("John")).toBeInTheDocument()
    );

    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  test("calls PUT API when status changes", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [],
        },
      ],
    });

    axios.put.mockResolvedValue({ data: {} });

    render(<AdminOrders />);

    await waitFor(() =>
      expect(screen.getByText("John")).toBeInTheDocument()
    );

    const select = screen.getByTestId("status-select");

    fireEvent.change(select, { target: { value: "Shipped" } });

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/1",
        { status: "Shipped" }
      )
    );
  });

  test("re-fetches orders after status update", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [],
        },
      ],
    });

    axios.put.mockResolvedValue({ data: {} });

    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "1",
          status: "Shipped",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [],
        },
      ],
    });

    render(<AdminOrders />);

    // Wait for first fetch
    await screen.findByText("John");

    fireEvent.change(screen.getByTestId("status-select"), {
      target: { value: "Shipped" },
    });

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledTimes(2)
    );
  });


});
