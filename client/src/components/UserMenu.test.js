import React from 'react';
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom/extend-expect';
import UserMenu from "./UserMenu";

describe('User Menu Component', () => {

  it('renders user menu with profile and orders links', () => {
    // Arrange/Act -> Rendering
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // Assert -> Check presence of elements
    /* eslint-disable testing-library/prefer-screen-queries */
    expect(getByText('Dashboard')).toBeInTheDocument();
    expect(getByText('Profile')).toBeInTheDocument();
    expect(getByText('Orders')).toBeInTheDocument();
    /* eslint-enable testing-library/prefer-screen-queries */
  });

  it('profile link has correct href', () => {
    // Arrange -> Rendering
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // Act -> Get link
    // eslint-disable-next-line testing-library/prefer-screen-queries
    const profileLink = getByText('Profile');

    // Assert -> Check href attribute
    expect(profileLink.getAttribute('href')).toBe('/dashboard/user/profile');
  });

  it('orders link has correct href', () => {
    // Arrange -> Rendering
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // Act -> Get link
    // eslint-disable-next-line testing-library/prefer-screen-queries
    const ordersLink = getByText('Orders');

    // Assert -> Check href attribute
    expect(ordersLink.getAttribute('href')).toBe('/dashboard/user/orders');
  });

  // AI generated navigation unit test by ChatGPT 5.2 Thinking
  // Modified: added eslint disable/enable, AAA comments, and /dashboard route to fix warnings
  // Prompt: og code + T want simulate clicking of href and see if it actually navigate write 2 unit test for it
  // https://chatgpt.com/share/6982bb17-a550-8005-87f0-f48a1f44b4f9
  it("navigates to profile page when Profile link is clicked", () => {
    // Arrange -> Rendering
    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <UserMenu />
        <Routes>
          <Route path="/dashboard" element={<div>MAIN_PAGE</div>} />
          <Route path="/dashboard/user/profile" element={<div>PROFILE_PAGE</div>} />
          <Route path="/dashboard/user/orders" element={<div>ORDERS_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );

    // pre-check: not on profile page yet and is on main page
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(queryByText("PROFILE_PAGE")).not.toBeInTheDocument();
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(getByText("MAIN_PAGE")).toBeInTheDocument();

    // Act -> Click profile link
    // eslint-disable-next-line testing-library/prefer-screen-queries
    const profileLink = getByText("Profile");
    fireEvent.click(profileLink);

    // Assert -> Ensures navigation occurred
    // after click: profile route should render
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(getByText("PROFILE_PAGE")).toBeInTheDocument();
  });

  // AI generated navigation test by ChatGPT 5.2 Thinking
  // Modified: added eslint disable/enable, AAA comments, and /dashboard route to fix warnings
  // Prompt: og code + T want simulate clicking of href and see if it actually navigate write 2 unit test for it
  // https://chatgpt.com/share/6982bb17-a550-8005-87f0-f48a1f44b4f9
  it("navigates to orders page when Orders link is clicked", () => {
    // Arrange -> Rendering
    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <UserMenu />
        <Routes>
          <Route path="/dashboard" element={<div>MAIN_PAGE</div>} />
          <Route path="/dashboard/user/profile" element={<div>PROFILE_PAGE</div>} />
          <Route path="/dashboard/user/orders" element={<div>ORDERS_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );

    // pre-check: not on orders page yet and is on main page
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(queryByText("ORDERS_PAGE")).not.toBeInTheDocument();
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(getByText("MAIN_PAGE")).toBeInTheDocument();

    // Act -> Click orders link
    // eslint-disable-next-line testing-library/prefer-screen-queries
    const ordersLink = getByText("Orders");
    fireEvent.click(ordersLink);

    // Assert -> Ensures navigation occurred
    // after click: orders route should render
    // eslint-disable-next-line testing-library/prefer-screen-queries
    expect(getByText("ORDERS_PAGE")).toBeInTheDocument();
  });
});