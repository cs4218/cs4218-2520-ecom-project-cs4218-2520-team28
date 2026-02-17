// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../../context/auth';

// Mock the dependencies of the AdminDashboard component
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../components/AdminMenu', () => {
  // A simple functional component mock for AdminMenu
  return () => <div data-testid="admin-menu-mock">Admin Menu</div>;
});

jest.mock('./../../components/Layout', () => {
  // The Layout component is just a wrapper, so we mock it to render its children
  return ({ children }) => <div data-testid="layout-mock">{children}</div>;
});

describe('AdminDashboard Component', () => {
  // Clear all mocks before each test to ensure a clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the admin details when the user is authenticated', () => {
    // Arrange: Set up the mock return value for our useAuth hook
    const mockAuthData = {
      user: {
        name: 'Test Admin',
        email: 'admin@example.com',
        phone: '123-456-7890',
      },
    };
    useAuth.mockReturnValue([mockAuthData]);

    // Act: Render the component
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Assert: Check if the admin details are displayed correctly
    expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
    expect(screen.getByText(/Test Admin/)).toBeInTheDocument();

    expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    
    expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
    expect(screen.getByText(/123-456-7890/)).toBeInTheDocument();
  });

  it('should render the AdminMenu component', () => {
    // Arrange: Provide a minimal mock for useAuth
    useAuth.mockReturnValue([{ user: null }]);
    
    // Act
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Assert: Check that our mocked AdminMenu is on the screen
    expect(screen.getByTestId('admin-menu-mock')).toBeInTheDocument();
    expect(screen.getByText('Admin Menu')).toBeInTheDocument();
  });

  it('should render gracefully without user details if auth.user is null', () => {
    // Arrange: Mock useAuth to return an object with a null user
    useAuth.mockReturnValue([{ user: null }]);

    // Act
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Assert: The component should not crash and should display the static text
    expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
    expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
    expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();

    // Verify that no specific user data is displayed
    expect(screen.queryByText('Test Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
  });

  it('should render gracefully if the entire auth object is null', () => {
    // Arrange: Mock useAuth to return an array with null, simulating an uninitialized state
    useAuth.mockReturnValue([null]);

    // Act
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Assert: The component should still render its basic structure without crashing thanks to optional chaining
    expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
    expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
    expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
    expect(screen.getByTestId('admin-menu-mock')).toBeInTheDocument();
  });
});