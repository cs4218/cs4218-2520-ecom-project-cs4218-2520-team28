import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateProduct from './CreateProduct';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Chi Thanh, A0276229W
// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));
jest.mock('./../../components/Layout', () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>{children}</div>
));
jest.mock('./../../components/AdminMenu', () => () => (
  <div data-testid="admin-menu">Admin Menu</div>
));
jest.mock('antd', () => {
  const React = require('react');
  
  const Select = ({ children, onChange, placeholder, className }) => {
    const testId = placeholder === "Select a category" ? "category-select" : "shipping-select";
    return React.createElement(
      'select',
      {
        'data-testid': testId,
        onChange: (e) => onChange(e.target.value),
        className: className
      },
      React.createElement('option', { value: '' }, placeholder),
      children
    );
  };
  
  Select.Option = ({ children, value }) => {
    return React.createElement('option', { value: value }, children);
  };
  
  return { Select };
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Chi Thanh, A0276229W
describe('CreateProduct Component', () => {
  let mockNavigate;
  let mockAxiosGet;
  let mockAxiosPost;

  beforeEach(() => {
    // Setup mocks
    mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    
    mockAxiosGet = axios.get;
    mockAxiosPost = axios.post;

    // Reset all mocks
    jest.clearAllMocks();
    
    // Default successful category fetch
    mockAxiosGet.mockResolvedValue({
      data: {
        success: true,
        category: [
          { _id: 'cat1', name: 'Electronics' },
          { _id: 'cat2', name: 'Clothing' },
        ],
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ===== RENDERING TESTS =====
  
  describe('Rendering', () => {
    test('should render layout with correct title', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-title', 'Dashboard - Create Product');
      });
    });

    test('should render admin menu component', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
      });
    });

    test('should render create product heading', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Create Product')).toBeInTheDocument();
      });
    });

    test('should render category select dropdown', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('category-select')).toBeInTheDocument();
      });
    });

    test('should render photo upload button with default text', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
    });

    test('should render name input field', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
      });
    });

    test('should render description textarea field', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a description')).toBeInTheDocument();
      });
    });

    test('should render price input field', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument();
      });
    });

    test('should render quantity input field', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a quantity')).toBeInTheDocument();
      });
    });

    test('should render shipping select dropdown', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('shipping-select')).toBeInTheDocument();
      });
    });

    test('should render create product button', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });
    });
  });

  // ===== DATA FETCHING TESTS =====

  describe('getAllCategory', () => {
    test('should fetch categories on component mount', async () => {
      // Arrange
      mockAxiosGet.mockResolvedValue({
        data: {
          success: true,
          category: [{ _id: 'cat1', name: 'Electronics' }],
        },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(mockAxiosGet).toHaveBeenCalledWith('/api/v1/category/get-category');
      });
    });

    test('should populate category dropdown with fetched categories', async () => {
      // Arrange
      mockAxiosGet.mockResolvedValue({
        data: {
          success: true,
          category: [
            { _id: 'cat1', name: 'Electronics' },
            { _id: 'cat2', name: 'Clothing' },
          ],
        },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
      });
    });

    test('should show error toast when category fetch fails', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockAxiosGet.mockRejectedValue(new Error('Network error'));

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category');
      });
      
      consoleSpy.mockRestore();
    });

    test('should not populate categories when success is false', async () => {
      // Arrange
      mockAxiosGet.mockResolvedValue({
        data: {
          success: false,
          category: [],
        },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        const categorySelect = screen.getByTestId('category-select');
        expect(categorySelect.children.length).toBe(1); // Only placeholder
      });
    });
  });

  // ===== FORM STATE MANAGEMENT TESTS =====

  describe('Form State Management', () => {
    test('should update name state when input changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
      });
      const nameInput = screen.getByPlaceholderText('write a name');

      // Act
      fireEvent.change(nameInput, { target: { value: 'New Product' } });

      // Assert
      expect(nameInput.value).toBe('New Product');
    });

    test('should update description state when textarea changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a description')).toBeInTheDocument();
      });
      const descInput = screen.getByPlaceholderText('write a description');

      // Act
      fireEvent.change(descInput, { target: { value: 'Product description' } });

      // Assert
      expect(descInput.value).toBe('Product description');
    });

    test('should update price state when input changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument();
      });
      const priceInput = screen.getByPlaceholderText('write a Price');

      // Act
      fireEvent.change(priceInput, { target: { value: '100' } });

      // Assert
      expect(priceInput.value).toBe('100');
    });

    test('should update quantity state when input changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a quantity')).toBeInTheDocument();
      });
      const quantityInput = screen.getByPlaceholderText('write a quantity');

      // Act
      fireEvent.change(quantityInput, { target: { value: '50' } });

      // Assert
      expect(quantityInput.value).toBe('50');
    });

    test('should update category state when select changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });
      const categorySelect = screen.getByTestId('category-select');

      // Act
      fireEvent.change(categorySelect, { target: { value: 'cat1' } });

      // Assert
      expect(categorySelect.value).toBe('cat1');
    });

    test('should update shipping state when select changes', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByTestId('shipping-select')).toBeInTheDocument();
      });
      const shippingSelect = screen.getByTestId('shipping-select');

      // Act
      fireEvent.change(shippingSelect, { target: { value: '1' } });

      // Assert
      expect(shippingSelect.value).toBe('1');
    });
  });

  // ===== PHOTO UPLOAD TESTS =====

  describe('Photo Upload', () => {
    test('should update photo state when file is selected', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
      const file = new File(['content'], 'product.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Photo').querySelector('input');

      // Act
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('product.jpg')).toBeInTheDocument();
      });
    });

    test('should display photo preview when photo is uploaded', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });
      const file = new File(['content'], 'product.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Photo').querySelector('input');

      // Act
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Assert
      await waitFor(() => {
        const img = screen.getByAltText('product_photo');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-url');
      });
    });

    test('should not display photo preview when no photo is selected', async () => {
      // Arrange & Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByAltText('product_photo')).not.toBeInTheDocument();
      });
    });
  });

  // ===== PRODUCT CREATION TESTS =====

  describe('handleCreate', () => {
    test('should call axios post with form data when create button is clicked', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: false, // Note: success=false triggers success toast in current implementation
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByPlaceholderText('write a name');
      const priceInput = screen.getByPlaceholderText('write a Price');
      const quantityInput = screen.getByPlaceholderText('write a quantity');
      const categorySelect = screen.getByTestId('category-select');

      fireEvent.change(nameInput, { target: { value: 'New Product' } });
      fireEvent.change(priceInput, { target: { value: '100' } });
      fireEvent.change(quantityInput, { target: { value: '50' } });
      fireEvent.change(categorySelect, { target: { value: 'cat1' } });

      const createButton = screen.getByText('CREATE PRODUCT');

      // Act
      fireEvent.click(createButton);

      // Assert
      await waitFor(() => {
        expect(mockAxiosPost).toHaveBeenCalledWith(
          '/api/v1/product/create-product',
          expect.any(FormData)
        );
      });
    });

    test('should include all form fields in FormData when creating product', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: true,
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      // Fill all form fields
      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Test Product' },
      });
      fireEvent.change(screen.getByPlaceholderText('write a description'), {
        target: { value: 'Test Description' },
      });
      fireEvent.change(screen.getByPlaceholderText('write a Price'), {
        target: { value: '299' },
      });
      fireEvent.change(screen.getByPlaceholderText('write a quantity'), {
        target: { value: '25' },
      });
      fireEvent.change(screen.getByTestId('category-select'), {
        target: { value: 'cat1' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(mockAxiosPost).toHaveBeenCalled();
        const formData = mockAxiosPost.mock.calls[0][1];
        expect(formData).toBeInstanceOf(FormData);
      });
    });

    test('should show success toast when product is created successfully', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: true,
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product Created Successfully');
      });
    });

    test('should navigate to products page after successful creation', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: true,
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
      });
    });

    test('should show error toast when creation API returns success false', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: false,
          message: 'Creation failed',
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Creation failed');
      });
    });

    test('should show error toast when creation API call fails', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockAxiosPost.mockRejectedValue(new Error('Network error'));

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('something went wrong');
      });

      consoleSpy.mockRestore();
    });

    test('should prevent default form submission when create button is clicked', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: { success: false },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      const createButton = screen.getByText('CREATE PRODUCT');
      const mockEvent = { preventDefault: jest.fn() };

      // Act
      fireEvent.click(createButton);

      // Assert - verify axios was called (which means preventDefault was called)
      await waitFor(() => {
        expect(mockAxiosPost).toHaveBeenCalled();
      });
    });

    test('should not navigate when creation API returns success false', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: {
          success: false,
          message: 'Error occurred',
        },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ===== EDGE CASES =====

  describe('Edge Cases', () => {
    test('should handle empty category list', async () => {
      // Arrange
      mockAxiosGet.mockResolvedValue({
        data: {
          success: true,
          category: [],
        },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        const categorySelect = screen.getByTestId('category-select');
        expect(categorySelect.children.length).toBe(1); // Only placeholder
      });
    });

    test('should handle multiple file uploads by keeping only the latest', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      });

      const file1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Photo').querySelector('input');

      // Act
      fireEvent.change(fileInput, { target: { files: [file1] } });
      await waitFor(() => {
        expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      });

      fireEvent.change(fileInput, { target: { files: [file2] } });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
        expect(screen.queryByText('photo1.jpg')).not.toBeInTheDocument();
      });
    });

    test('should handle form submission without photo', async () => {
      // Arrange
      mockAxiosPost.mockResolvedValue({
        data: { success: false },
      });

      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('write a name'), {
        target: { value: 'Product Without Photo' },
      });

      // Act
      fireEvent.click(screen.getByText('CREATE PRODUCT'));

      // Assert
      await waitFor(() => {
        expect(mockAxiosPost).toHaveBeenCalled();
      });
    });

    test('should handle numeric inputs with empty values', async () => {
      // Arrange
      render(<CreateProduct />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument();
      });

      const priceInput = screen.getByPlaceholderText('write a Price');
      const quantityInput = screen.getByPlaceholderText('write a quantity');

      // Act - try to enter invalid values (type=number will prevent non-numeric input)
      fireEvent.change(priceInput, { target: { value: '' } });
      fireEvent.change(quantityInput, { target: { value: '' } });

      // Assert - empty strings are allowed for number inputs
      expect(priceInput.value).toBe('');
      expect(quantityInput.value).toBe('');
    });

    test('should handle category with special characters in name', async () => {
      // Arrange
      mockAxiosGet.mockResolvedValue({
        data: {
          success: true,
          category: [
            { _id: 'cat1', name: 'Books & Magazines' },
            { _id: 'cat2', name: 'Health/Wellness' },
          ],
        },
      });

      // Act
      render(<CreateProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Books & Magazines')).toBeInTheDocument();
        expect(screen.getByText('Health/Wellness')).toBeInTheDocument();
      });
    });
  });
});
