// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import AdminMenu from './AdminMenu';

// Since the AdminMenu component uses <NavLink>, which must be rendered
// inside a router, we wrap it in <MemoryRouter> for every test.
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: MemoryRouter });
};

describe('AdminMenu Component', () => {
  it('should render the "Admin Panel" heading', () => {
    renderWithRouter(<AdminMenu />);
    
    // Check for the heading. getByRole is a good, accessible query.
    const headingElement = screen.getByRole('heading', { name: /admin panel/i });
    expect(headingElement).toBeInTheDocument();
  });

  it('should display a link to "Create Category"', () => {
    renderWithRouter(<AdminMenu />);
    
    const linkElement = screen.getByRole('link', { name: /create category/i });
    expect(linkElement).toBeInTheDocument();
    
    // Verify that the link points to the correct destination URL
    expect(linkElement).toHaveAttribute('href', '/dashboard/admin/create-category');
  });

  it('should display a link to "Create Product"', () => {
    renderWithRouter(<AdminMenu />);
    
    const linkElement = screen.getByRole('link', { name: /create product/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/dashboard/admin/create-product');
  });

  it('should display a link to "Products"', () => {
    renderWithRouter(<AdminMenu />);
    
    // We use a more precise query here since "Create Product" also contains "Product"
    const linkElement = screen.getByRole('link', { name: /^products$/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/dashboard/admin/products');
  });

  it('should display a link to "Orders"', () => {
    renderWithRouter(<AdminMenu />);
    
    const linkElement = screen.getByRole('link', { name: /orders/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/dashboard/admin/orders');
  });

  it('should not display the commented-out "Users" link', () => {
    renderWithRouter(<AdminMenu />);
    
    // queryByRole returns null if the element is not found, which is what we want.
    // getByRole would throw an error, causing the test to fail.
    const linkElement = screen.queryByRole('link', { name: /users/i });
    expect(linkElement).not.toBeInTheDocument();
  });
});