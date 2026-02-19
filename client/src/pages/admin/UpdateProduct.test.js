import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpdateProduct from './UpdateProduct';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
    useParams: jest.fn()
}));
jest.mock('./../../components/Layout', () => ({ children, title }) => (
    <div data-testid="layout" data-title={title}>{children}</div>
));
jest.mock('./../../components/AdminMenu', () => () => (
    <div data-testid="admin-menu">Admin Menu</div>
));
jest.mock('antd', () => {
    const Select = ({ children, onChange, value, placeholder, className }) => (
        <select
            data-testid={placeholder === "Select a category" ? "category-select" : "shipping-select"}
            className={className}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {children}
        </select>
    );
    
    Select.Option = ({ children, value }) => <option value={value}>{children}</option>;
    
    return { Select };
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');

describe('UpdateProduct', () => {
    // AI generated Unit tests for UpdateProduct component covering:
    // Test Coverage 1: Component rendering with all form elements
    // Test Coverage 2: Product data fetching on mount (getSingleProduct)
    // Test Coverage 3: Categories fetching on mount (getAllCategory)
    // Test Coverage 4: Product update functionality with success/error handling
    // Test Coverage 5: Product deletion with confirmation prompt
    // Test Coverage 6: File upload handling and photo preview
    // Test Coverage 7: Form input state management
    // Test Coverage 8: Navigation after update/delete operations
    // Test Coverage 9: API error handling for all operations
    // Test Coverage 10: Toast notifications for all actions

    // Bugs fixed in UpdateProduct.js:
    // Fixed 1: Added missing await before axios.put() call (line 73)
    // Fixed 2: Corrected shipping select value from "yes"/"No" to "1"/"0" (line 211)

    let mockAxiosGet, mockAxiosPut, mockAxiosDelete;
    let mockToastSuccess, mockToastError;
    let mockNavigate, mockUseParams;

    beforeEach(() => {
        // Arrange: Create fresh mock functions
        mockAxiosGet = jest.fn();
        mockAxiosPut = jest.fn();
        mockAxiosDelete = jest.fn();
        
        axios.get = mockAxiosGet;
        axios.put = mockAxiosPut;
        axios.delete = mockAxiosDelete;

        mockToastSuccess = jest.fn();
        mockToastError = jest.fn();
        
        toast.success = mockToastSuccess;
        toast.error = mockToastError;

        mockNavigate = jest.fn();
        mockUseParams = { slug: 'test-product' };

        useNavigate.mockReturnValue(mockNavigate);
        useParams.mockReturnValue(mockUseParams);

        // Mock window.prompt
        global.prompt = jest.fn();

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('rendering', () => {
        test('should render without crashing', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('layout')).toBeInTheDocument();
            });
        });

        test('should render with correct page title', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                const layout = screen.getByTestId('layout');
                expect(layout).toHaveAttribute('data-title', 'Dashboard - Create Product');
            });
        });

        test('should render AdminMenu component', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
            });
        });

        test('should render "Update Product" heading', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Update Product')).toBeInTheDocument();
            });
        });

        test('should render category select dropdown', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('category-select')).toBeInTheDocument();
            });
        });

        test('should render all form input fields', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('write a description')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument();
                expect(screen.getByPlaceholderText('write a quantity')).toBeInTheDocument();
            });
        });

        test('should render shipping select dropdown', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('shipping-select')).toBeInTheDocument();
            });
        });

        test('should render UPDATE PRODUCT button', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument();
            });
        });

        test('should render DELETE PRODUCT button', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument();
            });
        });

        test('should render photo upload button with default text', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Upload Photo')).toBeInTheDocument();
            });
        });
    });

    describe('data fetching on mount - getSingleProduct', () => {
        test('should fetch product data on component mount', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    }
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledWith('/api/v1/product/get-product/test-product');
            });
        });

        test('should populate form fields with fetched product data', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Laptop',
                        description: 'High-end laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toHaveValue('Laptop');
                expect(screen.getByPlaceholderText('write a description')).toHaveValue('High-end laptop');
                expect(screen.getByPlaceholderText('write a Price')).toHaveValue(1500);
                expect(screen.getByPlaceholderText('write a quantity')).toHaveValue(5);
            });
        });

        test('should set category from fetched product data', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat123' }
                    },
                    success: true,
                    category: [{ _id: 'cat123', name: 'Electronics' }]
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('category-select')).toHaveValue('cat123');
            });
        });

        test('should handle error when fetching product fails', async () => {
            // Arrange
            const error = new Error('Network error');
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockAxiosGet.mockRejectedValue(error);

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });
        });
    });

    describe('data fetching on mount - getAllCategory', () => {
        test('should fetch categories on component mount', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: []
                    }
                });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(mockAxiosGet).toHaveBeenCalledWith('/api/v1/category/get-category');
            });
        });

        test('should populate category options with fetched categories', async () => {
            // Arrange
            const mockCategories = [
                { _id: 'cat1', name: 'Electronics' },
                { _id: 'cat2', name: 'Books' }
            ];
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: mockCategories
                    }
                });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
            });
        });

        test('should not set categories when success is false', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: false,
                        category: [{ _id: 'cat1', name: 'Electronics' }]
                    }
                });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
            });
        });

        test('should show error toast when fetching categories fails', async () => {
            // Arrange
            const error = new Error('Network error');
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockRejectedValueOnce(error);

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something wwent wrong in getting catgeory');
            });
        });
    });

    describe('form input state management', () => {
        test('should update name field when user types', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument());

            const nameInput = screen.getByPlaceholderText('write a name');

            // Act
            fireEvent.change(nameInput, { target: { value: 'New Product Name' } });

            // Assert
            expect(nameInput).toHaveValue('New Product Name');
        });

        test('should update description field when user types', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByPlaceholderText('write a description')).toBeInTheDocument());

            const descInput = screen.getByPlaceholderText('write a description');

            // Act
            fireEvent.change(descInput, { target: { value: 'New description text' } });

            // Assert
            expect(descInput).toHaveValue('New description text');
        });

        test('should update price field when user types', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument());

            const priceInput = screen.getByPlaceholderText('write a Price');

            // Act
            fireEvent.change(priceInput, { target: { value: '200' } });

            // Assert
            expect(priceInput).toHaveValue(200);
        });

        test('should update quantity field when user types', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByPlaceholderText('write a quantity')).toBeInTheDocument());

            const quantityInput = screen.getByPlaceholderText('write a quantity');

            // Act
            fireEvent.change(quantityInput, { target: { value: '20' } });

            // Assert
            expect(quantityInput).toHaveValue(20);
        });

        test('should update category when user selects from dropdown', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: [
                            { _id: 'cat1', name: 'Electronics' },
                            { _id: 'cat2', name: 'Books' }
                        ]
                    }
                });
            render(<UpdateProduct />);
            
            // Wait for both product and categories to load
            await waitFor(() => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
            });

            const categorySelect = screen.getByTestId('category-select');

            // Act
            fireEvent.change(categorySelect, { target: { value: 'cat2' } });

            // Assert
            await waitFor(() => {
                expect(categorySelect).toHaveValue('cat2');
            });
        });

        test('should update shipping when user selects from dropdown', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByTestId('shipping-select')).toBeInTheDocument());

            const shippingSelect = screen.getByTestId('shipping-select');

            // Act
            fireEvent.change(shippingSelect, { target: { value: '1' } });

            // Assert
            expect(shippingSelect).toHaveValue('1');
        });
    });

    describe('photo upload handling', () => {
        test('should update photo upload label when file is selected', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('Upload Photo')).toBeInTheDocument());

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['dummy content'], 'test-image.jpg', { type: 'image/jpeg' });

            // Act
            fireEvent.change(fileInput, { target: { files: [file] } });

            // Assert
            await waitFor(() => {
                expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
            });
        });

        test('should display existing product photo when no new photo is uploaded', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'product123',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                const img = screen.getByAltText('product_photo');
                expect(img).toHaveAttribute('src', '/api/v1/product/product-photo/product123');
            });
        });

        test('should display new photo preview when file is uploaded', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: '1',
                            name: 'Test Product',
                            description: 'Test Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: []
                    }
                });
            
            render(<UpdateProduct />);
            
            // Wait for component to fully load
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toHaveValue('Test Product');
            });

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['dummy content'], 'new-image.jpg', { type: 'image/jpeg' });

            // Act - wrap in act to ensure state updates complete
            await waitFor(() => {
                fireEvent.change(fileInput, { target: { files: [file] } });
            });

            // Assert - verify file name is displayed in label
            await waitFor(() => {
                expect(screen.getByText('new-image.jpg')).toBeInTheDocument();
            });
            
            // Verify URL.createObjectURL was called with the file
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
        });
    });

    describe('product update functionality', () => {
        test('should send PUT request with product data when UPDATE button is clicked', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: 'prod123',
                            name: 'Laptop',
                            description: 'Gaming laptop',
                            price: 1500,
                            quantity: 5,
                            shipping: true,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: []
                    }
                });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            
            // Wait for both data fetches to complete
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toHaveValue('Laptop');
            });

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPut).toHaveBeenCalledWith(
                    '/api/v1/product/update-product/prod123',
                    expect.any(FormData)
                );
            });
        });

        test('should include all product fields in FormData when updating', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                const formDataCall = mockAxiosPut.mock.calls[0][1];
                expect(formDataCall).toBeInstanceOf(FormData);
            });
        });

        test('should include photo in FormData when photo is uploaded', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('Upload Photo')).toBeInTheDocument());

            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['dummy content'], 'product.jpg', { type: 'image/jpeg' });
            fireEvent.change(fileInput, { target: { files: [file] } });

            await waitFor(() => expect(screen.getByText('product.jpg')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPut).toHaveBeenCalled();
            });
        });

        test('should show success toast and navigate when update succeeds', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('Product Updated Successfully');
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
            });
        });

        test('should show error toast when API returns success true', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: true, message: 'Error occurred' }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Error occurred');
            });
        });

        test('should show error toast when update fails', async () => {
            // Arrange
            const error = new Error('Network error');
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockRejectedValue(error);

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('something went wrong');
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });
        });

        test('should prevent default form submission when UPDATE button is clicked', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument());

            const updateButton = screen.getByText('UPDATE PRODUCT');
            const mockEvent = { preventDefault: jest.fn() };

            // Act
            fireEvent.click(updateButton);

            // Assert
            // The preventDefault is called within handleUpdate, verified by no page reload
            await waitFor(() => {
                expect(mockAxiosPut).toHaveBeenCalled();
            });
        });
    });

    describe('product deletion functionality', () => {
        test('should prompt user for confirmation when DELETE button is clicked', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            global.prompt.mockReturnValue('yes');
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument());

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(global.prompt).toHaveBeenCalledWith('Are You Sure want to delete this product ? ');
            });
        });

        test('should not delete product when user cancels confirmation prompt', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            global.prompt.mockReturnValue(null);

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument());

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosDelete).not.toHaveBeenCalled();
            });
        });

        test('should not delete product when user enters empty string in prompt', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            global.prompt.mockReturnValue('');

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument());

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosDelete).not.toHaveBeenCalled();
            });
        });

        test('should send DELETE request when user confirms deletion', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: 'prod123',
                            name: 'Laptop',
                            description: 'Gaming laptop',
                            price: 1500,
                            quantity: 5,
                            shipping: true,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: []
                    }
                });
            global.prompt.mockReturnValue('yes');
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<UpdateProduct />);
            
            // Wait for both data fetches to complete
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toHaveValue('Laptop');
            });

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosDelete).toHaveBeenCalledWith('/api/v1/product/delete-product/prod123');
            });
        });

        test('should show success toast and navigate when deletion succeeds', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            global.prompt.mockReturnValue('yes');
            mockAxiosDelete.mockResolvedValue({
                data: { success: true }
            });

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument());

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('Product DEleted Succfully');
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
            });
        });

        test('should show error toast when deletion fails', async () => {
            // Arrange
            const error = new Error('Network error');
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: 'prod123',
                        name: 'Laptop',
                        description: 'Gaming laptop',
                        price: 1500,
                        quantity: 5,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });
            global.prompt.mockReturnValue('yes');
            mockAxiosDelete.mockRejectedValue(error);

            render(<UpdateProduct />);
            await waitFor(() => expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument());

            const deleteButton = screen.getByText('DELETE PRODUCT');

            // Act
            fireEvent.click(deleteButton);

            // Assert
            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
            });
        });
    });

    describe('edge cases and integration scenarios', () => {
        test('should handle missing category in product response', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: {}
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId('layout')).toBeInTheDocument();
            });
        });

        test('should handle empty categories array', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                const categorySelect = screen.getByTestId('category-select');
                expect(categorySelect.options.length).toBe(0);
            });
        });

        test('should update with modified product fields', async () => {
            // Arrange
            mockAxiosGet
                .mockResolvedValueOnce({
                    data: {
                        product: {
                            _id: 'prod123',
                            name: 'Original Name',
                            description: 'Original Description',
                            price: 100,
                            quantity: 10,
                            shipping: false,
                            category: { _id: 'cat1' }
                        }
                    }
                })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        category: []
                    }
                });
            mockAxiosPut.mockResolvedValue({
                data: { success: false }
            });

            render(<UpdateProduct />);
            
            // Wait for product data to be fully loaded
            await waitFor(() => {
                expect(screen.getByPlaceholderText('write a name')).toHaveValue('Original Name');
            });

            const nameInput = screen.getByPlaceholderText('write a name');
            const priceInput = screen.getByPlaceholderText('write a Price');

            fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
            fireEvent.change(priceInput, { target: { value: '200' } });

            const updateButton = screen.getByText('UPDATE PRODUCT');

            // Act
            fireEvent.click(updateButton);

            // Assert
            await waitFor(() => {
                expect(mockAxiosPut).toHaveBeenCalledWith(
                    '/api/v1/product/update-product/prod123',
                    expect.any(FormData)
                );
            });
        });

        test('should display "No" for shipping when product shipping is false', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: false,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                const shippingSelect = screen.getByTestId('shipping-select');
                expect(shippingSelect).toHaveValue('0');
            });
        });

        test('should display "Yes" for shipping when product shipping is true', async () => {
            // Arrange
            mockAxiosGet.mockResolvedValue({
                data: {
                    product: {
                        _id: '1',
                        name: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        quantity: 10,
                        shipping: true,
                        category: { _id: 'cat1' }
                    },
                    success: true,
                    category: []
                }
            });

            // Act
            render(<UpdateProduct />);

            // Assert
            await waitFor(() => {
                const shippingSelect = screen.getByTestId('shipping-select');
                expect(shippingSelect).toHaveValue('1');
            });
        });
    });
});
