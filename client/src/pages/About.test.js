// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import About from './About';

// Mock the Layout component to isolate the About component for testing.
// We'll check that it receives the correct title prop.
let layoutTitle = '';
jest.mock('./../components/Layout', () => ({ children, title }) => {
  layoutTitle = title; // Capture the title prop for assertion
  return <div data-testid="layout-mock">{children}</div>;
});

describe('About Component', () => {
  beforeEach(() => {
    // Reset the captured title before each test
    layoutTitle = '';
  });

  it('should render the component within a Layout with the correct title', () => {
    render(<About />);
    
    // Check that the Layout mock was rendered
    expect(screen.getByTestId('layout-mock')).toBeInTheDocument();
    
    // Check that the correct title was passed to the Layout component
    expect(layoutTitle).toBe('About us - Ecommerce app');
  });

  it('should display the main image with correct attributes', () => {
    render(<About />);
    
    const imageElement = screen.getByRole('img');
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveAttribute('src', '/images/about.jpeg');
    expect(imageElement).toHaveAttribute('alt', 'contactus');
  });

  it('should display the descriptive paragraph text', () => {
    render(<About />);
    
    // Check for the presence of the paragraph text
    const paragraphElement = screen.getByText('Add text');
    expect(paragraphElement).toBeInTheDocument();
  });
});