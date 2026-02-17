// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Header from './Header';
import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import useCategory from '../hooks/useCategory';

// --- Mock all external dependencies ---
jest.mock('../context/auth');
jest.mock('../context/cart');
jest.mock('../hooks/useCategory');
jest.mock('react-hot-toast');

// Mock child components
jest.mock('./Form/SearchInput', () => () => <div data-testid="search-input" />);
jest.mock('antd', () => ({
  Badge: ({ children, count }) => (
    <div data-testid="cart-badge">
      {children}
      <span data-testid="cart-count">{count}</span>
    </div>
  ),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: { removeItem: jest.fn() },
  writable: true,
});

const renderWithRouter = (ui) => render(ui, { wrapper: MemoryRouter });

describe('Header Component', () => {
  let mockSetAuth;

  beforeEach(() => {
    mockSetAuth = jest.fn();
    useCart.mockReturnValue([[]]); // Default cart is empty
    useCategory.mockReturnValue([ // Mock categories
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Books', slug: 'books' },
    ]);
    jest.clearAllMocks();
  });

  describe('For Guest Users (Logged Out)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue([{ user: null }, mockSetAuth]);
    });

    it('should render Register and Login links', () => {
      renderWithRouter(<Header />);
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    });

    it('should not render user dropdown or logout button', () => {
      renderWithRouter(<Header />);
      expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /logout/i })).not.toBeInTheDocument();
    });
  });

  describe('For Authenticated Users', () => {
    it('should render dashboard link for a regular user (role 0)', () => {
      const authUser = { user: { name: 'Test User', role: 0 } };
      useAuth.mockReturnValue([authUser, mockSetAuth]);
      
      renderWithRouter(<Header />);
      expect(screen.getByText(authUser.user.name)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard/user');
    });

    it('should render dashboard link for an admin user (role 1)', () => {
      const authAdmin = { user: { name: 'Admin User', role: 1 } };
      useAuth.mockReturnValue([authAdmin, mockSetAuth]);

      renderWithRouter(<Header />);
      expect(screen.getByText(authAdmin.user.name)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard/admin');
    });

    it('should handle user logout correctly', () => {
      const authUser = { user: { name: 'Test User', role: 0 } };
      useAuth.mockReturnValue([authUser, mockSetAuth]);
      
      renderWithRouter(<Header />);
      
      const logoutButton = screen.getByRole('link', { name: /logout/i });
      fireEvent.click(logoutButton);

      // 1. setAuth was called to clear user data
      expect(mockSetAuth).toHaveBeenCalledWith({ ...authUser, user: null, token: '' });
      
      // 2. localStorage was cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth');
      
      // 3. Success toast was shown
      expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
    });
  });

  describe('General Features', () => {
    it('should render the category dropdown with items from useCategory hook', () => {
        useAuth.mockReturnValue([{ user: null }, mockSetAuth]);
        renderWithRouter(<Header />);
        
        expect(screen.getByRole('link', { name: /all categories/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /electronics/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /books/i })).toBeInTheDocument();
    });

    it('should display the correct cart item count', () => {
        useAuth.mockReturnValue([{ user: null }, mockSetAuth]);
        useCart.mockReturnValue([[{ id: 1 }, { id: 2 }]]); // Cart with 2 items
        
        renderWithRouter(<Header />);
        
        const cartLink = screen.getByRole('link', { name: /cart/i });
        expect(cartLink).toBeInTheDocument();
        expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    });

    it('should show zero on the cart badge when cart is empty', () => {
        useAuth.mockReturnValue([{ user: null }, mockSetAuth]);
        useCart.mockReturnValue([[]]); // Empty cart
        
        renderWithRouter(<Header />);
        expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });
  });
});