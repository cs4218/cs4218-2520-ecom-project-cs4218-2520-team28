// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { AuthProvider, useAuth } from './auth';

// We mock axios to prevent real network calls and to inspect its properties
jest.mock('axios');

const TestConsumer = () => {
  const [auth, setAuth] = useAuth();

  const updateUser = () => {
    setAuth({
      user: { name: 'Jane Doe' },
      token: 'new-test-token',
    });
  };

  return (
    <div>
      <div data-testid="user-name">{auth?.user ? auth.user.name : 'No User'}</div>
      <div data-testid="token">{auth?.token || 'No Token'}</div>
      <button onClick={updateUser}>Update User</button>
    </div>
  );
};

describe('AuthProvider', () => {
  // Before each test, we clear any previous localStorage mocks
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with no user or token if localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Check that the initial state is empty
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(screen.getByTestId('token')).toHaveTextContent('No Token');

    // Verify that it attempted to read from localStorage
    expect(localStorage.getItem).toHaveBeenCalledWith('auth');

    // The axios header should not be set
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
  });

  it('should initialize with auth data from localStorage if it exists', () => {
    const mockAuthData = {
      user: { name: 'John Doe' },
      token: 'test-token-123',
    };
    localStorage.setItem('auth', JSON.stringify(mockAuthData));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Check that the state is populated from localStorage
    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('token')).toHaveTextContent('test-token-123');

    // Verify that it attempted to read from localStorage
    expect(localStorage.getItem).toHaveBeenCalledWith('auth');

    // The axios header should be set with the token from localStorage
    expect(axios.defaults.headers.common['Authorization']).toBe('test-token-123');
  });

  it('should allow child components to update the auth context', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Check initial state
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(screen.getByTestId('token')).toHaveTextContent('No Token');
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined();

    // Find the button and click it to update the context
    const updateButton = screen.getByRole('button', { name: /update user/i });
    act(() => {
      updateButton.click();
    });

    // Check that the state has been updated
    expect(screen.getByTestId('user-name')).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('token')).toHaveTextContent('new-test-token');

    // The axios header should now be updated with the new token
    expect(axios.defaults.headers.common['Authorization']).toBe('new-test-token');
  });

  it('should throw an error if useAuth is used outside of AuthProvider', () => {
    // Suppress console.error for this test as React will log an error we expect
    const originalError = console.error;
    console.error = jest.fn();
    
    // We expect this to throw an error, so we wrap it in a function
    const renderWithoutProvider = () => render(<TestConsumer />);
    
    expect(renderWithoutProvider).toThrow();
    
    // Restore original console.error
    console.error = originalError;
  });
});