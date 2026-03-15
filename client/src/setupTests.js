// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// JSDOM does not implement window.matchMedia. react-hot-toast's <Toaster>
// calls matchMedia (for prefers-reduced-motion) when it renders a toast.
// Stub it globally so any test that renders a Toaster with real toasts
// does not throw "matchMedia is not defined".
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
