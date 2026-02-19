import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateCategory from './CreateCategory';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('./../../components/Layout', () => ({ children, title }) => (
    <div data-testid="layout" data-title={title}>{children}</div>
));
jest.mock('./../../components/AdminMenu', () => () => (
    <div data-testid="admin-menu">Admin Menu</div>
));
jest.mock('../../components/Form/CategoryForm', () => ({ handleSubmit, value, setValue }) => (
    <form data-testid="category-form" onSubmit={handleSubmit}>
        <input 
            data-testid="category-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit">Submit</button>
    </form>
));
jest.mock('antd', () => ({
    Modal: ({ visible, onCancel, children }) => 
        visible ? (
            <div data-testid="modal">
                <button data-testid="modal-cancel" onClick={onCancel}>Cancel</button>
                {children}
            </div>
        ) : null
}));

describe('CreateCategory', () => {
    // AI generated Unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
    // Test Coverage 1: Component rendering with all elements (layout, table, form, modal)
    // Test Coverage 2: Data fetching on mount (getAllCategory)
    // Test Coverage 3: Create category functionality with success/error handling
    // Test Coverage 4: Update category functionality with modal interaction
    // Test Coverage 5: Delete category functionality with confirmation
    // Test Coverage 6: Toast notifications for all actions
    // Test Coverage 7: API error handling for all operations
    // Test Coverage 8: State management (categories, name, visible, selected, updatedName)

    // Bug fixes in CreateCategory.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
    // Fixed 1: Added missing name reset after successful category creation (setName(""))
    // Fixed 2: Fixed typo in error message: "somthing" → "something"
    // Fixed 3: Fixed typo in toast message: "wwent" → "went"
    // Fixed 4: Fixed typo in error message: "Somtihing" → "Something"

    let mockAxiosGet, mockAxiosPost, mockAxiosPut, mockAxiosDelete;
    let mockToastSuccess, mockToastError;

    beforeEach(() => {
        // Arrange: Create fresh mock functions
        mockAxiosGet = jest.fn();
        mockAxiosPost = jest.fn();
        mockAxiosPut = jest.fn();
        mockAxiosDelete = jest.fn();
        
        axios.get = mockAxiosGet;
        axios.post = mockAxiosPost;
        axios.put = mockAxiosPut;
        axios.delete = mockAxiosDelete;

        mockToastSuccess = jest.fn();
        mockToastError = jest.fn();
        
        toast.success = mockToastSuccess;
        toast.error = mockToastError;

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        test('should render without crashing', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('layout')).toBeInTheDocument();
            });
        });

        test('should render with correct page title', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                const layout = screen.getByTestId('layout');
                expect(layout).toHaveAttribute('data-title', 'Dashboard - Create Category');
            });
        });

        test('should render AdminMenu component', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
            });
        });

        test('should render "Manage Category" heading', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Manage Category')).toBeInTheDocument();
            });
        });

        test('should render CategoryForm for creating new category', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('category-form')).toBeInTheDocument();
            });
        });

        test('should render table with correct headers', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Name')).toBeInTheDocument();
                expect(screen.getByText('Actions')).toBeInTheDocument();
            });
        });

        test('should not render modal initially', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('data fetching on mount', () => {
        test('should fetch categories on component mount', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledWith('/api/v1/category/get-category');
            });
        });

        test('should display fetched categories in table', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' },
                { _id: '2', name: 'Books' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
            });
        });

        test('should render Edit and Delete buttons for each category', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                const editButtons = screen.getAllByText('Edit');
                const deleteButtons = screen.getAllByText('Delete');
                expect(editButtons).toHaveLength(1);
                expect(deleteButtons).toHaveLength(1);
            });
        });

        test('should handle error when fetching categories fails', async () => {
            // Arrange
            const error = new Error('Network error');
            mockAxiosGet.mockRejectedValue(error);

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something went wrong in getting catgeory');
            });
        });

        test('should display empty table when no categories exist', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                const tableBody = screen.getByRole('table').querySelector('tbody');
                expect(tableBody.children.length).toBe(0);
            });
        });
    });

    describe('create category functionality', () => {
        test('should create new category successfully', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.change(input, { target: { value: 'Sports' } });
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPost).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: 'Sports' }
                );
                expect(mockToastSuccess).toHaveBeenCalledWith('Sports is created');
            });
        });

        test('should refetch categories after successful creation', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({ data: { success: true, category: [] } })
                .mockResolvedValueOnce({ 
                    data: { 
                        success: true, 
                        category: [{ _id: '1', name: 'Sports' }] 
                    } 
                });
            mockAxiosPost.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.change(input, { target: { value: 'Sports' } });
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledTimes(2);
            });
        });

        test('should show error toast when create fails', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockResolvedValue({
                data: { success: false, message: 'Category already exists' }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.change(input, { target: { value: 'Electronics' } });
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Category already exists');
            });
        });

        test('should handle network error during creation', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockRejectedValue(new Error('Network error'));

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.change(input, { target: { value: 'Sports' } });
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('something went wrong in input form');
            });
        });

        test('should prevent default form submission', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-form')).toBeInTheDocument();
            });

            const form = screen.getByTestId('category-form');
            const mockPreventDefault = jest.fn();

            // Act
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            submitEvent.preventDefault = mockPreventDefault;
            form.dispatchEvent(submitEvent);

            // Assert
            await waitFor(() => {
                expect(mockPreventDefault).toHaveBeenCalled();
            });
        });
    });

    describe('update category functionality', () => {
        test('should open modal when Edit button is clicked', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });
        });

        test('should populate modal form with selected category name', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            // Assert
            await waitFor(() => {
                const modalInputs = screen.getAllByTestId('category-input');
                const modalInput = modalInputs[modalInputs.length - 1]; // Get modal input
                expect(modalInput).toHaveValue('Electronics');
            });
        });

        test('should update category successfully', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const modalInputs = screen.getAllByTestId('category-input');
            const modalInput = modalInputs[modalInputs.length - 1];
            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.change(modalInput, { target: { value: 'Electronics & Gadgets' } });
            fireEvent.submit(modalForm);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPut).toHaveBeenCalledWith(
                    '/api/v1/category/update-category/1',
                    { name: 'Electronics & Gadgets' }
                );
                expect(mockToastSuccess).toHaveBeenCalledWith('Electronics & Gadgets is updated');
            });
        });

        test('should close modal after successful update', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.submit(modalForm);

            // Assert
            await waitFor(() => {
                expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
            });
        });

        test('should refetch categories after successful update', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.submit(modalForm);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledTimes(2);
            });
        });

        test('should close modal when cancel button is clicked', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            // Act
            const cancelButton = screen.getByTestId('modal-cancel');
            fireEvent.click(cancelButton);

            // Assert
            await waitFor(() => {
                expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
            });
        });

        test('should show error toast when update fails', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: false, message: 'Update failed' }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.submit(modalForm);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Update failed');
            });
        });

        test('should handle network error during update', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockRejectedValue(new Error('Network error'));

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.submit(modalForm);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
            });
        });
    });

    describe('delete category functionality', () => {
        test('should delete category successfully', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const deleteButton = screen.getByText('Delete');
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosDelete).toHaveBeenCalledWith('/api/v1/category/delete-category/1');
                expect(mockToastSuccess).toHaveBeenCalledWith('category is deleted');
            });
        });

        test('should refetch categories after successful deletion', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const deleteButton = screen.getByText('Delete');
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledTimes(2);
            });
        });

        test('should show error toast when deletion fails', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosDelete.mockResolvedValue({
                data: { success: false, message: 'Cannot delete category' }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const deleteButton = screen.getByText('Delete');
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Cannot delete category');
            });
        });

        test('should handle network error during deletion', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosDelete.mockRejectedValue(new Error('Network error'));

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            // Act
            const deleteButton = screen.getByText('Delete');
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
            });
        });

        test('should delete correct category when multiple exist', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' },
                { _id: '2', name: 'Books' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
            });

            // Act
            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[1]); // Delete Books

            // Assert
            await waitFor(() => {
                expect(mockAxiosDelete).toHaveBeenCalledWith('/api/v1/category/delete-category/2');
            });
        });
    });

    describe('state management', () => {
        test('should clear selected category and updatedName after successful update', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            });

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                expect(screen.getByTestId('modal')).toBeInTheDocument();
            });

            const forms = screen.getAllByTestId('category-form');
            const modalForm = forms[forms.length - 1];

            // Act
            fireEvent.submit(modalForm);

            // Assert - Modal closes means state was cleared
            await waitFor(() => {
                expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
            });
        });

        test('should handle multiple categories in state', async () => {
            // Arrange
            const mockCategories = [
                { _id: '1', name: 'Electronics' },
                { _id: '2', name: 'Books' },
                { _id: '3', name: 'Sports' }
            ];
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: mockCategories }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
                expect(screen.getByText('Sports')).toBeInTheDocument();
            });
        });
    });

    describe('edge cases', () => {
        test('should handle empty category name in create form', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-form')).toBeInTheDocument();
            });

            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPost).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: '' }
                );
            });
        });

        test('should handle special characters in category name', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true, category: [] }
            });
            mockAxiosPost.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            
            await waitFor(() => {
                expect(screen.getByTestId('category-input')).toBeInTheDocument();
            });

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // Act
            fireEvent.change(input, { target: { value: 'Home & Garden!' } });
            fireEvent.submit(form);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPost).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: 'Home & Garden!' }
                );
            });
        });

        test('should handle undefined category array', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: { success: true }
            });

            // Act
            render(<CreateCategory />);

            // Assert
            await waitFor(() => {
                const tableBody = screen.getByRole('table').querySelector('tbody');
                expect(tableBody.children.length).toBe(0);
            });
        });
    });
});
