// Ho Jin Han, A0266275W
// Integration Test for Spinner Component

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Spinner from "../../components/Spinner";

// Helper component to verify where we were navigated to
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe("Spinner Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("S.1 Should navigate to login by default after 3 seconds", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/user"]}>
        <Routes>
          <Route path="/dashboard/user" element={<Spinner />} />
          <Route path="/login" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial state: should show countdown
    expect(screen.getByText("redirecting to you in 3 second")).toBeInTheDocument();

    // Advance 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText("redirecting to you in 2 second")).toBeInTheDocument();

    // Advance 2 more seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should have navigated to /login
    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/login");
    });
  });

  it("S.2 Should navigate to custom path after 3 seconds", async () => {
    render(
      <MemoryRouter initialEntries={["/admin-dashboard"]}>
        <Routes>
          <Route path="/admin-dashboard" element={<Spinner path="custom-path" />} />
          <Route path="/custom-path" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/custom-path");
    });
  });
});
