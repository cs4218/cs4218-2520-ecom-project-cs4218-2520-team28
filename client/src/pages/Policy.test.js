// Foo Chao, A0272024R
// AI generated unit tests using Github Copilot (Grok Code Fast 1) Agent Mode
//
// Prompt: do unit test for Policy.js following the structure of Contact.test.js.
// Test parallel elements: Layout renders, image renders, image src/alt attributes,
// Layout title prop, heading renders, heading is child of Layout, image is child of Layout.
// No icons in Policy.js, so skip those tests.
//
// Test Coverage:
// 1. Layout renders (1 test)
// 2. Image renders (1 test)
// 3. Layout has correct title prop (1 test)
// 4. Image has correct src attribute (1 test)
// 5. Image has correct alt attribute (1 test)
// 6. Page renders a heading element (1 test)
// 7. Heading is a child of Layout (1 test)
// 8. Image is a child of Layout (1 test)

import React from "react";
import { render, screen } from "@testing-library/react";
import Policy from "./Policy";

// Mock Layout (same pattern as Contact.test.js)
jest.mock("./../components/Layout", () => (props) => (
  <div data-testid="layout">
    <div>Layout Title: {props.title}</div>
    {props.children}
  </div>
));

describe("Policy Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering tests ──

  it("renders the Layout component", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("renders the privacy policy image", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const img = screen.getByAltText("Contact us illustration");
    expect(img).toBeInTheDocument();
  });

  // ── Props and attributes tests ──

  it("Layout has correct title prop", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    expect(screen.getByTestId("layout")).toHaveTextContent("Layout Title: Privacy Policy");
  });

  it("image has correct src attribute", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const img = screen.getByAltText("Contact us illustration");
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("image has correct alt attribute", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Contact us illustration");
  });

  // ── Heading tests ──

  it("renders a heading element", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const heading = screen.getByRole("heading");
    expect(heading).toBeInTheDocument();
  });

  it("heading is a child of Layout", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    const heading = screen.getByRole("heading");
    expect(layout).toContainElement(heading);
  });

  // ── Child-of-Layout tests ──

  it("image is a child of Layout", () => {
    // Arrange & Act
    render(<Policy />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    const img = screen.getByAltText("Contact us illustration");
    expect(layout).toContainElement(img);
  });
});