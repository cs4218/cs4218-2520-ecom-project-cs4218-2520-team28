// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5 and ChatGPT 5.2

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

// We mock axios to prevent real network calls and to inspect its properties
jest.mock("axios");

const TestConsumer = () => {
  const [auth, setAuth] = useAuth();

  const updateUser = () => {
    setAuth({
      user: { name: "Jane Doe" },
      token: "new-test-token",
    });
  };

  return (
    <div>
      <div data-testid="user-name">
        {auth?.user ? auth.user.name : "No User"}
      </div>
      <div data-testid="token">{auth?.token || "No Token"}</div>
      <button onClick={updateUser}>Update User</button>
    </div>
  );
};

describe("AuthProvider", () => {
  let getItemSpy;
  let setItemSpy;
  let removeItemSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on Storage methods so we can assert calls like toHaveBeenCalledWith
    getItemSpy = jest.spyOn(Storage.prototype, "getItem");
    setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    removeItemSpy = jest.spyOn(Storage.prototype, "removeItem");

    // Ensure clean localStorage + clean axios header state for every test
    localStorage.clear();
    delete axios.defaults.headers.common.Authorization;
  });

  afterEach(() => {
    // Restore spies (good hygiene; prevents cross-test interference)
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();

    delete axios.defaults.headers.common.Authorization;
  });

  it("should initialize with no user or token if localStorage is empty", () => {
    // localStorage.getItem("auth") -> null
    getItemSpy.mockReturnValueOnce(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // initial state
    expect(screen.getByTestId("user-name")).toHaveTextContent("No User");
    expect(screen.getByTestId("token")).toHaveTextContent("No Token");

    // Verify it attempted to read from localStorage
    expect(getItemSpy).toHaveBeenCalledWith("auth");

    // With the recommended auth.js fix, Authorization should be removed when token is empty.
    expect(axios.defaults.headers.common["Authorization"]).toBeUndefined();
  });

  it("should initialize with auth data from localStorage if it exists", () => {
    const mockAuthData = {
      user: { name: "John Doe" },
      token: "test-token-123",
    };

    // We can simulate existing localStorage by mocking getItem directly
    getItemSpy.mockReturnValueOnce(JSON.stringify(mockAuthData));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // state populated from localStorage (effect runs on mount)
    expect(screen.getByTestId("user-name")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("token")).toHaveTextContent("test-token-123");

    expect(getItemSpy).toHaveBeenCalledWith("auth");

    // axios header set with the token from localStorage
    expect(axios.defaults.headers.common["Authorization"]).toBe("test-token-123");
  });

  it("should allow child components to update the auth context", () => {
    getItemSpy.mockReturnValueOnce(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // initial state
    expect(screen.getByTestId("user-name")).toHaveTextContent("No User");
    expect(screen.getByTestId("token")).toHaveTextContent("No Token");
    expect(axios.defaults.headers.common["Authorization"]).toBeUndefined();

    // click to update
    const updateButton = screen.getByRole("button", { name: /update user/i });
    act(() => {
      updateButton.click();
    });

    // updated state
    expect(screen.getByTestId("user-name")).toHaveTextContent("Jane Doe");
    expect(screen.getByTestId("token")).toHaveTextContent("new-test-token");

    // axios header updated
    expect(axios.defaults.headers.common["Authorization"]).toBe("new-test-token");
  });

  it("should throw an error if useAuth is used outside of AuthProvider", () => {
    // Suppress React error output for this test (React logs an error when a render throws)
    const originalError = console.error;
    console.error = jest.fn();

    const renderWithoutProvider = () => render(<TestConsumer />);
    expect(renderWithoutProvider).toThrow();

    console.error = originalError;
  });
});
