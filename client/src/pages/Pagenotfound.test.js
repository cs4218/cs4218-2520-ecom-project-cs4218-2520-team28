// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Pagenotfound from './Pagenotfound';

// Mock the Layout component, capturing the title prop for testing
let capturedTitle = '';
jest.mock('./../components/Layout', () => ({ children, title }) => {
  capturedTitle = title;
  return <div>{children}</div>;
});

const renderWithRouter = (ui) => {
  return render(ui, { wrapper: MemoryRouter });
};

describe('Pagenotfound Component', () => {
  beforeEach(() => {
    capturedTitle = ''; // Reset before each test
  });

  it('should render inside a Layout with the correct title', () => {
    renderWithRouter(<Pagenotfound />);
    expect(capturedTitle).toBe('go back- page not found');
  });

  it('should display the 404 error code', () => {
    renderWithRouter(<Pagenotfound />);
    
    // Find the heading with the text "404"
    const titleElement = screen.getByRole('heading', { name: '404' });
    expect(titleElement).toBeInTheDocument();
  });

  it('should display the "Oops ! Page Not Found" message', () => {
    renderWithRouter(<Pagenotfound />);
    
    const headingElement = screen.getByRole('heading', { name: /oops ! page not found/i });
    expect(headingElement).toBeInTheDocument();
  });

  it('should display a "Go Back" link that points to the homepage', () => {
    renderWithRouter(<Pagenotfound />);
    
    const linkElement = screen.getByRole('link', { name: /go back/i });
    expect(linkElement).toBeInTheDocument();
    
    // Verify the link's destination URL is the root ('/')
    expect(linkElement).toHaveAttribute('href', '/');
  });
});