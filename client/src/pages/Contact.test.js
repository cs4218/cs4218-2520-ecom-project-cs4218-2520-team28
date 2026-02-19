// Foo Chao, A0272024R
// AI generated unit tests using Github Copilot (Claude Opus 4.6) Agent Mode
//
// Prompt: do unit test for Contact.js in similar structure to Dashboard.test.js.
// Test that Layout, BiMailSend, BiPhoneCall, BiSupport, img are each rendered (1 test each).
// Test that img, BiMailSend, BiPhoneCall, BiSupport are each children of Layout (1 test each).
// Also test Layout title prop, image src attribute, and image alt attribute.
//
// Test Coverage:
// 1. Layout, BiMailSend, BiPhoneCall, BiSupport, and img are rendered (5 tests)
// 2. img, BiMailSend, BiPhoneCall, BiSupport are children of Layout (4 tests)
// 3. Layout receives correct title prop (1 test)
// 4. Image has correct src attribute (1 test)
// 5. Image has correct alt attribute (1 test)
// 6. Page renders a heading element (1 test)
// 7. CONTACT US heading is a child of Layout (1 test)

import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "./Contact";

// Mock Layout (same pattern as Dashboard.test.js)
jest.mock("./../components/Layout", () => (props) => (
  <div data-testid="layout">
    <div>Layout Title: {props.title}</div>
    {props.children}
  </div>
));

// Mock react-icons individually so each gets a testid
jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="bi-mail-send">BiMailSend</span>,
  BiPhoneCall: () => <span data-testid="bi-phone-call">BiPhoneCall</span>,
  BiSupport: () => <span data-testid="bi-support">BiSupport</span>,
}));

describe("Contact Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering tests (each component renders) ──

  it("renders the Layout component", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("renders the BiMailSend icon", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("bi-mail-send")).toBeInTheDocument();
  });

  it("renders the BiPhoneCall icon", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("bi-phone-call")).toBeInTheDocument();
  });

  it("renders the BiSupport icon", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("bi-support")).toBeInTheDocument();
  });

  it("renders the contact us image", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const img = screen.getByAltText("Contact us illustration");
    expect(img).toBeInTheDocument();
  });

  // ── Child-of-Layout tests ──

  it("img is a child of Layout", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    const img = screen.getByAltText("Contact us illustration");
    expect(layout).toContainElement(img);
  });

  it("BiMailSend is a child of Layout", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    expect(layout).toContainElement(screen.getByTestId("bi-mail-send"));
  });

  it("BiPhoneCall is a child of Layout", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    expect(layout).toContainElement(screen.getByTestId("bi-phone-call"));
  });

  it("BiSupport is a child of Layout", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const layout = screen.getByTestId("layout");
    expect(layout).toContainElement(screen.getByTestId("bi-support"));
  });

  // ── Props and attributes tests ──

  it("Layout has correct title prop", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    expect(screen.getByTestId("layout")).toHaveTextContent("Layout Title: Contact us");
  });

  it("image has correct src attribute", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const img = screen.getByAltText("Contact us illustration");
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("image has correct alt attribute", () => {
    // Arrange
    
    // Act
    render(<Contact />);
    
    // Assert
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Contact us illustration");
  });

  // ── Heading tests ──

  it("renders a heading element", () => {
    // Arrange
    
    // Act
    render(<Contact />);
        
    // Assert
    const heading = screen.getByRole("heading");
    expect(heading).toBeInTheDocument();
  });

  it("heading is a child of Layout", () => {
    // Arrange
    
    // Act
    render(<Contact />);

    // Assert
    const layout = screen.getByTestId("layout");
    const heading = screen.getByRole("heading");
    expect(layout).toContainElement(heading);
  });
});
