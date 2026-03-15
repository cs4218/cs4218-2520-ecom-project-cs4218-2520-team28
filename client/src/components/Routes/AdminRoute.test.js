// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
// refer to line 34-41 i previously fixed a bug there 
// is there a parallel bug in admin route if it is fix it then do unit test for admin route similar to private route

// done in ms2 for completeness sake it is just 1 prompt anyway LOL

// Unit tests for AdminRoute component, modelled after Private.test.js
// Covers the same scenarios: initial spinner, API calls, ok state transitions,
// no-token guard, token removal (security), and expired/invalid token handling.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminRoute from "./AdminRoute";
import axios from "axios";

// 1) Mock axios
jest.mock("axios");

// 2) Mock useAuth hook (module path must match AdminRoute.js)
let mockAuthValue = [{}, jest.fn()]; // Mutable value that can be changed between renders
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => mockAuthValue),
}));

// 3) Mock Outlet
jest.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">OUTLET</div>,
}));

// 4) Mock Spinner
jest.mock("../Spinner", () => (props) => (
  <div data-testid="spinner">SPINNER path={props.path}</div>
));

// 5) Mock toast so toast.error calls are silent in tests
jest.mock("react-hot-toast", () => ({
  default: { error: jest.fn(), success: jest.fn() },
  __esModule: true,
}));

describe("Admin Route Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("initially renders Spinner because ok starts false", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act -> Render
    render(<AdminRoute />);

    // Assert
    // Before useEffect finishes, should still be spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  });

  test("API to be called when token exists", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act -> Render
    render(<AdminRoute />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    // Wait for state updates to complete
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  });

  test("Spinner then Outlet when first API call returns ok=true", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act -> Render
    render(<AdminRoute />);

    // Assert
    // Initially Spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Finally Outlet after API call on useEffect
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    // Check axios called with correct URL
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
  });

  test("Stays Spinner when first API call returns ok=false", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    // Act -> Render
    render(<AdminRoute />);

    // Assert
    // Initially Spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Still Spinner after API call on useEffect
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    // flush one microtask tick
    await Promise.resolve();

    // check still spinner after useEffect
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  test("no token: does NOT call axios and remains Spinner", async () => {
    // Arrange -> Mock useAuth to return no token
    mockAuthValue = [{}, jest.fn()];

    // Act -> Render
    render(<AdminRoute />);

    // Assert
    // Initially Spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // axios.get should NOT be called
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });

    // flush one microtask tick
    await Promise.resolve();

    // still Spinner after useEffect
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  test("true -> false: Outlet then Spinner when token changes and API returns ok=false", async () => {
    // Arrange setup of initial state
    // First render: ok=true
    mockAuthValue = [{ token: "t1" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    const { rerender } = render(<AdminRoute />);
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    }); // ensures initial state is ready

    // Act
    // Second render: change token and ok=false
    mockAuthValue = [{ token: "t2" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: false } });
    rerender(<AdminRoute />);

    // Assert
    // useEffect runs again due to token change
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("false -> true: Spinner then Outlet when token changes and API returns ok=true", async () => {
    // Arrange setup of initial state
    // First render: ok=false
    mockAuthValue = [{ token: "t1" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    const { rerender } = render(<AdminRoute />);

    // First render: wait for first API call to complete
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();

    // Act
    // Second render: change token and ok=true
    mockAuthValue = [{ token: "t2" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });
    rerender(<AdminRoute />);

    // Assert
    // Now wait for the outlet to appear (this also ensures API was called)
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  // this test case is not by AI but added manually to cover security scenario
  test("token removed: immediately shows Spinner (security)", async () => {
    // Arrange - First render with token
    mockAuthValue = [{ token: "t1" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });
    const { rerender } = render(<AdminRoute />);

    // First render should show Outlet after API call
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Act - Second render: token removed (security scenario)
    mockAuthValue = [{}, jest.fn()];
    rerender(<AdminRoute />);

    // Assert - Should immediately show Spinner when token is removed
    // Wait for any potential state updates to settle
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(1); // Still only called once
  });

  test("expired/invalid token: clears auth state and shows Spinner", async () => {
    // Arrange
    const mockSetAuth = jest.fn();
    mockAuthValue = [{ token: "expired-token", user: { name: "Admin" } }, mockSetAuth];
    // Simulate server returning 401 for an expired token
    axios.get.mockRejectedValueOnce(new Error("Request failed with status code 401"));

    // Act
    render(<AdminRoute />);

    // Assert — setAuth called to clear stale credentials
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith({ user: null, token: "" });
    });
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
  });

  // Foo Chao, A0272024R
  // AI Assistance: Github Copilot (Claude Sonnet 4.6)
  // New test: 403 means "authenticated but not admin" — auth state must NOT be cleared
  // and Spinner should redirect to /dashboard/user, not /login.
  test("non-admin user (403): keeps auth state and shows Spinner redirecting to dashboard/user", async () => {
    // Arrange
    const mockSetAuth = jest.fn();
    mockAuthValue = [{ token: "user-token", user: { name: "Regular User" } }, mockSetAuth];
    const error403 = new Error("Request failed with status code 403");
    error403.response = { status: 403 };
    axios.get.mockRejectedValueOnce(error403);

    // Act
    render(<AdminRoute />);

    // Assert — wait for the Spinner to reflect the 403 redirect path (requires both the
    // axios call AND the catch-block state update to have settled)
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toHaveTextContent("dashboard/user");
    });

    // setAuth must NOT be called — the user's session should remain intact
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
  });

  // Foo Chao, A0272024R
  // AI Assistance: Github Copilot (Claude Sonnet 4.6)
  // New test: 401 means token invalid/expired — auth state MUST be cleared and
  // Spinner should redirect to /login (not /dashboard/user).
  test("invalid/expired token (explicit 401): clears auth state and Spinner redirects to login", async () => {
    // Arrange
    const mockSetAuth = jest.fn();
    mockAuthValue = [{ token: "bad-token", user: { name: "Someone" } }, mockSetAuth];
    const error401 = new Error("Request failed with status code 401");
    error401.response = { status: 401 };
    axios.get.mockRejectedValueOnce(error401);

    // Act
    render(<AdminRoute />);

    // Assert — setAuth IS called to clear the expired session
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith({ user: null, token: "" });
    });

    // Spinner redirects to login
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toHaveTextContent("login");
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
  });
});
