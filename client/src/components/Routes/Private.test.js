// AI generated unit tests for PrivateRoute component by ChatGPT 5.2 Thinking
// https://chatgpt.com/share/6982cdb6-3e80-8005-8bec-96cbb3bdafff
// Modified with comments and some (non-trival amount of) logic cleaning
// notably use Promise.resolve to flush microtasks 
// when we need useEffect to finish but it does not cause change in state
// also added a test case for security scenario when token is removed
// Prompt: Private.js Code + 
// suggest unit test for this it should use studs/mocks for useAUth or others 
// and should test true originially false originally change from true to false and false to truth
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import PrivateRoute from "./Private";
import axios from "axios";

// 1) Mock axios
jest.mock("axios");

// 2) Mock useAuth hook (module path must match Private.js)
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

describe("Private Route Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("initially renders Spinner because ok starts false", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act -> Render
    render(<PrivateRoute />);

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
    render(<PrivateRoute />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });
    
    // Wait for state updates to complete
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  })

  test("Spinner then Outlet when first API call returns ok=true", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    // Act -> Render
    render(<PrivateRoute />);

    // Assert
    // Initially Spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Finally Outlet after API call on useEffect
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    // Check axios called with correct URL
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
  });

  test("Stays Spinner when first API call returns ok=false", async () => {
    // Arrange -> Mock useAuth to return token
    mockAuthValue = [{ token: "t" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    // Act -> Render
    render(<PrivateRoute />);

    // Assert
    // Initially Spinner
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Still Spinner after API call on useEffect
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
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
    render(<PrivateRoute />);

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

    const { rerender } = render(<PrivateRoute />);
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    }); // ensures intial state is ready

    // Act
    // Second render: change token and ok=false
    mockAuthValue = [{ token: "t2" }, jest.fn()];
    axios.get.mockResolvedValueOnce({ data: { ok: false } });
    rerender(<PrivateRoute />);

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

    const { rerender } = render(<PrivateRoute />);

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
    rerender(<PrivateRoute />);

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
    const { rerender } = render(<PrivateRoute />);

    // First render should show Outlet after API call
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Act - Second render: token removed (security scenario)
    mockAuthValue = [{}, jest.fn()];
    rerender(<PrivateRoute />);

    // Assert - Should immediately show Spinner when token is removed
    // Wait for any potential state updates to settle
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(1); // Still only called once
  });
});
