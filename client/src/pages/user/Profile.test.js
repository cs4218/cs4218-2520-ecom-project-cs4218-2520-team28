// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Profile from './Profile';
import { useAuth } from '../../context/auth';

// Mock all external dependencies
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../components/UserMenu', () => () => <div data-testid="user-menu-mock" />);
jest.mock('./../../components/Layout', () => ({ children }) => <div data-testid="layout-mock">{children}</div>);

// Set up a mock for window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
  },
  writable: true,
});

describe('Profile Component', () => {
  let mockSetAuth;
  const initialAuth = {
    user: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '1112223333',
      address: '123 Main St',
    },
    token: 'some-jwt-token',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockSetAuth = jest.fn();
    useAuth.mockReturnValue([initialAuth, mockSetAuth]);
  });

  it('should render the profile form and populate it with user data', () => {
    render(<Profile />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: /user profile/i })).toBeInTheDocument();
    
    // Check if form fields are populated with data from the useAuth hook
    expect(screen.getByPlaceholderText(/enter your name/i)).toHaveValue(initialAuth.user.name);
    expect(screen.getByPlaceholderText(/enter your email/i)).toHaveValue(initialAuth.user.email);
    expect(screen.getByPlaceholderText(/enter your phone/i)).toHaveValue(initialAuth.user.phone);
    expect(screen.getByPlaceholderText(/enter your address/i)).toHaveValue(initialAuth.user.address);
    
    // The email field should be disabled
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeDisabled();
  });

  it('should allow user to type and update form fields', () => {
    render(<Profile />, { wrapper: MemoryRouter });

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

    expect(nameInput).toHaveValue('Jane Doe');
    expect(passwordInput).toHaveValue('newpassword123');
  });

  it('should handle successful profile update on form submission', async () => {
    // Arrange: Mock the successful API response and localStorage
    const updatedUser = { ...initialAuth.user, name: 'Jane Doe' };
    axios.put.mockResolvedValueOnce({ data: { updatedUser } });
    localStorage.getItem.mockReturnValueOnce(JSON.stringify(initialAuth));

    render(<Profile />, { wrapper: MemoryRouter });

    // Act: Change a value and submit the form
    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    // Assert: Check if async operations completed as expected
    await waitFor(() => {
      // 1. API was called with the correct data
      expect(axios.put).toHaveBeenCalledWith('/api/v1/auth/profile', {
        name: 'Jane Doe',
        email: initialAuth.user.email,
        password: '', // Password starts empty
        phone: initialAuth.user.phone,
        address: initialAuth.user.address,
      });
      
      // 2. Success toast was shown
      expect(toast.success).toHaveBeenCalledWith('Profile Updated Successfully');

      // 3. Global auth state was updated
      expect(mockSetAuth).toHaveBeenCalledWith({ ...initialAuth, user: updatedUser });

      // 4. LocalStorage was updated
      const expectedLocalStorageData = { ...initialAuth, user: updatedUser };
      expect(localStorage.setItem).toHaveBeenCalledWith('auth', JSON.stringify(expectedLocalStorageData));
    });
  });

  it('should handle API error on form submission', async () => {
    // Note: The component code has a typo "errro". This test reflects the code as written.
    // If the typo is fixed to "error", this test will need to be updated.
    const apiError = { errro: 'Invalid input data' };
    axios.put.mockResolvedValueOnce({ data: apiError });

    render(<Profile />, { wrapper: MemoryRouter });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(apiError.errro);
    });

    // Ensure state and localStorage were NOT updated
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle network/server error on form submission', async () => {
    axios.put.mockRejectedValueOnce(new Error('Network request failed'));

    render(<Profile />, { wrapper: MemoryRouter });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });

    // Ensure state and localStorage were NOT updated
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});