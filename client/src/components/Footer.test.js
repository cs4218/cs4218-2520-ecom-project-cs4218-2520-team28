// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Footer from './Footer';

// The Footer component uses <Link>, so it must be rendered within a router.
const renderWithRouter = (ui) => {
  return render(ui, { wrapper: MemoryRouter });
};

describe('Footer Component', () => {
  it('should render the copyright text', () => {
    renderWithRouter(<Footer />);
    
    // Check for the main heading/text content
    const copyrightText = screen.getByText(/All Rights Reserved © TestingComp/i);
    expect(copyrightText).toBeInTheDocument();
  });

  it('should render the "About" link correctly', () => {
    renderWithRouter(<Footer />);
    
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('should render the "Contact" link correctly', () => {
    renderWithRouter(<Footer />);
    
    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('should render the "Privacy Policy" link correctly', () => {
    renderWithRouter(<Footer />);
    
    const policyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(policyLink).toBeInTheDocument();
    expect(policyLink).toHaveAttribute('href', '/policy');
  });
});