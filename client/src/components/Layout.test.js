// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Layout from './Layout';

// Mock the child components to isolate the Layout component for testing.
// This ensures we are only testing Layout's logic, not Header's or Footer's.
jest.mock('./Header', () => () => <header data-testid="header-mock">Header</header>);
jest.mock('./Footer', () => () => <footer data-testid="footer-mock">Footer</footer>);
// We also mock Toaster as its presence is not the focus of this test.
jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster-mock" />,
}));


describe('Layout Component', () => {
  it('should render the Header, Footer, and children components', () => {
    // Arrange: Render Layout with a child element
    render(
      <Layout>
        <div data-testid="child-content">This is the child content</div>
      </Layout>
    );

    // Assert: Check that all structural components are present
    expect(screen.getByTestId('header-mock')).toBeInTheDocument();
    expect(screen.getByTestId('footer-mock')).toBeInTheDocument();
    expect(screen.getByTestId('toaster-mock')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('This is the child content')).toBeInTheDocument();
  });

  it('should apply custom title and meta tags when props are provided', () => {
    // Arrange: Define custom props
    const customProps = {
      title: 'Custom Page Title',
      description: 'A custom page description.',
      keywords: 'custom, test, page',
      author: 'Test Author',
    };

    render(<Layout {...customProps} />);

    // Assert: Check that the document head has been updated by react-helmet
    expect(document.title).toBe('Custom Page Title');

    const descriptionMeta = document.querySelector("meta[name='description']");
    expect(descriptionMeta).toHaveAttribute('content', 'A custom page description.');

    const keywordsMeta = document.querySelector("meta[name='keywords']");
    expect(keywordsMeta).toHaveAttribute('content', 'custom, test, page');

    const authorMeta = document.querySelector("meta[name='author']");
    expect(authorMeta).toHaveAttribute('content', 'Test Author');
  });

  it('should use defaultProps for title and meta tags when no props are provided', () => {
    // Arrange: Render Layout without any props
    render(<Layout />);

    // Assert: Check that the document head contains the default values
    expect(document.title).toBe('Ecommerce app - shop now');

    const descriptionMeta = document.querySelector("meta[name='description']");
    expect(descriptionMeta).toHaveAttribute('content', 'mern stack project');

    const keywordsMeta = document.querySelector("meta[name='keywords']");
    expect(keywordsMeta).toHaveAttribute('content', 'mern,react,node,mongodb');

    const authorMeta = document.querySelector("meta[name='author']");
    expect(authorMeta).toHaveAttribute('content', 'Techinfoyt');
  });
});