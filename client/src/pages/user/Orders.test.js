import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Orders from "./Orders";
import axios from "axios";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: () => [
    { token: "fake-token" }, // mock auth
    jest.fn(),
  ],
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

jest.mock("../../components/UserMenu", () => () => <div>UserMenu</div>);




describe("Orders Component", () => {

  test("renders Orders title", () => {
    render(<Orders />);
    expect(screen.getByText("All Orders")).toBeInTheDocument();
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
          products: [
            {
              _id: "p1",
              name: "Product 1",
              description: "Product description",
              price: 100,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("Processing")).toBeInTheDocument()
    );

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Product 1")).toBeInTheDocument();
  });



  test("handles empty orders", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("All Orders")).toBeInTheDocument()
    );
  });


  test("handles API errors gracefully", async () => {
    axios.get.mockRejectedValue(new Error("API Error"));

    render(<Orders />);

    await waitFor(() =>
      expect(screen.getByText("All Orders")).toBeInTheDocument()
    );
  });

  test("displays multiple orders correctly", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          _id: "1",
          status: "Processing",
          buyer: { name: "John" },
          createAt: new Date(),
          payment: { success: true },
          products: [
            {
              _id: "p1",
              name: "Product 1",
              description: "Product description",
              price: 100,
            },
          ],
        },
        {
          _id: "2",
          status: "Shipped",
          buyer: { name: "Jane" },
          createAt: new Date(),
          payment: { success: true },
          products: [
            {
              _id: "p2",
              name: "Product 2",
              description: "Another product description",
              price: 200,
            },
          ],
        },
      ],
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText("Processing")).toBeInTheDocument();
      expect(screen.getByText("Shipped")).toBeInTheDocument();
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Jane")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
    });


  });

});