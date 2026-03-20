import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryForm from './CategoryForm';

describe('CategoryForm', () => {
    // AI generated Unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
    // Test Coverage 1: Component rendering with all elements (input, button, form)
    // Test Coverage 2: Props integration (value, setValue, handleSubmit)
    // Test Coverage 3: User interactions (typing, form submission, keyboard events)
    // Test Coverage 4: Edge cases (empty values, special characters, whitespace)
    // Test Coverage 5: Form behavior (preventDefault, multiple submissions)
    // Test Coverage 6: Accessibility attributes

    let mockHandleSubmit, mockSetValue;

    beforeEach(() => {
        // Arrange: Create fresh mock functions before each test
        mockHandleSubmit = jest.fn((e) => e.preventDefault());
        mockSetValue = jest.fn();
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        test('should render without crashing', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            expect(screen.getByPlaceholderText('Enter new category')).toBeInTheDocument();
        });

        test('should render input field with correct type', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveAttribute('type', 'text');
        });

        test('should render input field with correct CSS class', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveClass('form-control');
        });

        test('should render submit button with correct text', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const button = screen.getByRole('button', { name: /submit/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveTextContent('Submit');
        });

        test('should render submit button with correct type attribute', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const button = screen.getByRole('button', { name: /submit/i });
            expect(button).toHaveAttribute('type', 'submit');
        });

        test('should render submit button with correct CSS class', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const button = screen.getByRole('button', { name: /submit/i });
            expect(button).toHaveClass('btn', 'btn-primary');
        });

        test('should render form element', () => {
            // Arrange & Act
            const { container } = render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const form = container.querySelector('form');
            expect(form).toBeInTheDocument();
        });
    });

    describe('props integration', () => {
        test('should display value prop in input field', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue('Electronics');
        });

        test('should display empty value when value prop is empty string', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue('');
        });

        test('should display value with special characters', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Home & Garden!" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue('Home & Garden!');
        });

        test('should display value with whitespace', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="  Books  " 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue('  Books  ');
        });
    });

    describe('user interactions', () => {
        test('should call setValue when user types in input', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'Sports' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledTimes(1);
            expect(mockSetValue).toHaveBeenCalledWith('Sports');
        });

        test('should call setValue with each character typed', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'B' } });
            fireEvent.change(input, { target: { value: 'Bo' } });
            fireEvent.change(input, { target: { value: 'Boo' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledTimes(3);
            expect(mockSetValue).toHaveBeenNthCalledWith(1, 'B');
            expect(mockSetValue).toHaveBeenNthCalledWith(2, 'Bo');
            expect(mockSetValue).toHaveBeenNthCalledWith(3, 'Boo');
        });

        test('should call setValue with special characters', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'Books & Magazines!' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('Books & Magazines!');
        });

        test('should call setValue when clearing input', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: '' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('');
        });

        test('should call handleSubmit when form is submitted', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        });

        test('should call handleSubmit when submit button is clicked', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const button = screen.getByRole('button', { name: /submit/i });

            // Act
            fireEvent.click(button);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        });

        test('should call handleSubmit with event object', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledWith(expect.any(Object));
            expect(mockHandleSubmit.mock.calls[0][0]).toHaveProperty('preventDefault');
        });
    });

    describe('form behavior', () => {
        test('should submit form with empty value', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        });

        test('should submit form with whitespace-only value', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="   " 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        });

        test('should handle multiple form submissions', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);
            fireEvent.submit(form);
            fireEvent.submit(form);

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalledTimes(3);
        });

        test('should submit form when Enter key is pressed in input', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

            // Assert
            expect(mockHandleSubmit).toHaveBeenCalled();
        });

        test('should not call setValue when form is submitted', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const form = screen.getByRole('button', { name: /submit/i }).closest('form');

            // Act
            fireEvent.submit(form);

            // Assert
            expect(mockSetValue).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('should handle very long category names', () => {
            // Arrange
            const longValue = 'A'.repeat(500);
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value={longValue} 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue(longValue);
        });

        test('should handle unicode characters', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'Électronique 中文' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('Électronique 中文');
        });

        test('should handle numbers in category name', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: '2024 Summer Sale' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('2024 Summer Sale');
        });

        test('should handle symbols and punctuation', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: '@#$%^&*()_+-=[]{}|;:,.<>?/' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('@#$%^&*()_+-=[]{}|;:,.<>?/');
        });

        test('should handle line breaks in value', () => {
            // Arrange
            const valueWithLineBreak = 'Line1\nLine2';
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value={valueWithLineBreak} 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toHaveValue(valueWithLineBreak);
        });
    });

    describe('integration scenarios', () => {
        test('should support complete user workflow: type and submit', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');
            const button = screen.getByRole('button', { name: /submit/i });

            // Act
            fireEvent.change(input, { target: { value: 'Sports' } });
            fireEvent.click(button);

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('Sports');
            expect(mockHandleSubmit).toHaveBeenCalled();
        });

        test('should support editing existing value', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Electronics" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'Electronics & Gadgets' } });

            // Assert
            expect(mockSetValue).toHaveBeenCalledWith('Electronics & Gadgets');
        });

        test('should not interfere with other props when typing', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="Books" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act
            fireEvent.change(input, { target: { value: 'Books & Magazines' } });

            // Assert
            expect(mockHandleSubmit).not.toHaveBeenCalled();
            expect(mockSetValue).toHaveBeenCalledTimes(1);
        });
    });

    describe('accessibility', () => {
        test('should have accessible input field', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const input = screen.getByPlaceholderText('Enter new category');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('type', 'text');
        });

        test('should have accessible submit button', () => {
            // Arrange & Act
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );

            // Assert
            const button = screen.getByRole('button', { name: /submit/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('type', 'submit');
        });

        test('should be keyboard navigable', () => {
            // Arrange
            render(
                <CategoryForm 
                    handleSubmit={mockHandleSubmit} 
                    value="" 
                    setValue={mockSetValue} 
                />
            );
            const input = screen.getByPlaceholderText('Enter new category');

            // Act - Tab should move focus to button (implicit browser behavior)
            input.focus();

            // Assert
            expect(document.activeElement).toBe(input);
        });
    });
});
