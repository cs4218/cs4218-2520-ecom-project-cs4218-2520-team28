// Foo Chao, A0272024R

// AI usage:
// Prompt 1 (Github Copilot Claude Opus 4.6): Following the instructions on line 7 to 45, generate unit tests for cart.js. 
// Make sure to look at and follow the styling and structure of the tests as stated in instructions there.
// Summarise the test case added below line 45
// Instructions for AI:
// Generate test case based on FSM with the following states
// - Guest empty(GE)
// - Guest not empty (GN)
// - user 1 empty (U1E)
// - user 1 not empty (U1N)
// - user 2 empty (U2E)
// - user 2 not empty (U2N)
// Test cases:
// Initilisation/load behaviour
// - Make sure to test initialisation for each state (6 tests)
// 
// State transitions (cart transition same user)
// - GE -> GN (add item)
// - GN -> GE (remove item)
// - GN -> GN (add/modify item)
// - U1E -> U1N (add item)
// - U1N -> U1E (remove item)
// - U1N -> U1N (add/modify item)
// - U2E -> U2N (add item)
// - U2N -> U2E (remove item)
// - U2N -> U2N (add/modify item)
//
// State transitions (user change)
// - GE -> U1E (login)
// - GE -> U1N (login)
// - GN -> U1E (login)
// - GN -> U1N (login)
// - U1E -> GE (logout)
// - U1E -> U2E (logout + login)
// - U1E -> U2N (logout + login)
// - U1N -> GE (logout)
// - U1N -> U2E (logout + login)
// - U1N -> U2N (logout + login)
// 
// Note:
// Use Mock as necessary for localStorage and useAuth
// Files to refer to for testing patterns: Dashboard.test.js, Contact.test.js, Policy.test.js, Private.test.js, UserMenu.test.js
// Make sure to follow the way test is written in these files (arrange, act, assert) and to use beforeEach to reset mocks and state as necessary

// Test Coverage Summary:
// Initialisation/Load Behaviour (6 tests):
//   1. GE: Guest with empty localStorage loads empty cart
//   2. GN: Guest with existing localStorage items loads cart
//   3. U1E: User 1 with empty localStorage loads empty cart
//   4. U1N: User 1 with existing localStorage items loads cart
//   5. U2E: User 2 with empty localStorage loads empty cart
//   6. U2N: User 2 with existing localStorage items loads cart
//
// State Transitions - Same User (9 tests):
//   7.  GE -> GN: Guest adds item to empty cart
//   8.  GN -> GE: Guest removes last item from cart
//   9.  GN -> GN: Guest modifies item in non-empty cart
//   10. U1E -> U1N: User 1 adds item to empty cart
//   11. U1N -> U1E: User 1 removes last item from cart
//   12. U1N -> U1N: User 1 modifies item in non-empty cart
//   13. U2E -> U2N: User 2 adds item to empty cart
//   14. U2N -> U2E: User 2 removes last item from cart
//   15. U2N -> U2N: User 2 modifies item in non-empty cart
//
// State Transitions - User Change (10 tests):
//   16. GE -> U1E: Login from empty guest cart, user 1 has no saved cart
//   17. GE -> U1N: Login from empty guest cart, user 1 has saved cart
//   18. GN -> U1N: Login from non-empty guest cart, user 1 has no saved cart (guest cart transfers)
//   19. GN -> U1N: Login from non-empty guest cart, user 1 has saved cart
//   20. U1E -> GE: Logout from user 1 with empty cart, guest has no saved cart
//   21. U1E -> U2E: Logout + login, user 1 empty cart, user 2 has no saved cart
//   22. U1E -> U2N: Logout + login, user 1 empty cart, user 2 has saved cart
//   23. U1N -> GE: Logout from user 1 with non-empty cart, guest has no saved cart
//   24. U1N -> U2E: Logout + login, user 1 non-empty cart, user 2 has no saved cart
//   25. U1N -> U2N: Logout + login, user 1 non-empty cart, user 2 has saved cart

// Prompt 2 (Github Copilot Claude Opus 4.6): 
// Handle line 38 coverage simulate realistic situation(s) where errors are thrown

// Prompt 3 (Github Copilot Claude Opus 4.6):
// run test for cat.js and figure out why branch coverage not 100% and fix it
// Output: Added error handling test cases

// Prompt 4 (Github Copilot Claude Opus 4.6):
// Modify the cart logic such that if log in from guest to user and user has no data set the guest data to user data. 
// This is because when user shop and then want to make acc to checkout they should keep their cart

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

// Mock useAuth - mutable value that can change between renders
let mockAuthValue = [{ user: null }, jest.fn()];
jest.mock("./auth", () => ({
  useAuth: jest.fn(() => mockAuthValue),
}));

// Test consumer component that exposes cart state
const TestConsumer = () => {
  const [cart, setCart] = useCart();
  return (
    <div>
      <span data-testid="cart-length">{cart.length}</span>
      <span data-testid="cart-data">{JSON.stringify(cart)}</span>
      <button
        data-testid="set-cart"
        onClick={() => setCart([{ _id: "item1", name: "Item 1", price: 10 }])}
      >
        Set Cart
      </button>
      <button
        data-testid="add-item"
        onClick={() =>
          setCart((prev) => [
            ...prev,
            { _id: "item2", name: "Item 2", price: 20 },
          ])
        }
      >
        Add Item
      </button>
      <button data-testid="clear-cart" onClick={() => setCart([])}>
        Clear Cart
      </button>
      <button
        data-testid="modify-cart"
        onClick={() =>
          setCart((prev) =>
            prev.map((item) =>
              item._id === "item1" ? { ...item, name: "Modified Item" } : item
            )
          )
        }
      >
        Modify Cart
      </button>
    </div>
  );
};

// Helper to render with CartProvider
const renderWithProvider = () =>
  render(
    <CartProvider>
      <TestConsumer />
    </CartProvider>
  );

// Test data
const item1 = { _id: "item1", name: "Item 1", price: 10 };
const item2 = { _id: "item2", name: "Item 2", price: 20 };
const user1Id = "user1_abc";
const user2Id = "user2_xyz";

describe("CartProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAuthValue = [{ user: null }, jest.fn()];
  });

  // ── Initialisation/Load Behaviour (6 tests) ──

  describe("Initialisation/Load Behaviour", () => {
    it("GE: loads empty cart for guest with no localStorage", () => {
      // Arrange -> Guest user, no localStorage
      mockAuthValue = [{ user: null }, jest.fn()];

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("GN: loads existing cart for guest from localStorage", () => {
      // Arrange -> Guest user, localStorage has items
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify([item1]));

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart has item from localStorage
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1])
      );
    });

    it("U1E: loads empty cart for user 1 with no localStorage", () => {
      // Arrange -> User 1 logged in, no localStorage
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U1N: loads existing cart for user 1 from localStorage", () => {
      // Arrange -> User 1 logged in, localStorage has items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1, item2]));

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart has items from localStorage
      expect(screen.getByTestId("cart-length").textContent).toBe("2");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1, item2])
      );
    });

    it("U2E: loads empty cart for user 2 with no localStorage", () => {
      // Arrange -> User 2 logged in, no localStorage
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U2N: loads existing cart for user 2 from localStorage", () => {
      // Arrange -> User 2 logged in, localStorage has items
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      localStorage.setItem(`cart:${user2Id}`, JSON.stringify([item2]));

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart has items from localStorage
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item2])
      );
    });
  });

  // ── State Transitions - Same User (9 tests) ──

  describe("State Transitions - Same User", () => {
    it("GE -> GN: guest adds item to empty cart", async () => {
      // Arrange -> Guest user, empty cart
      mockAuthValue = [{ user: null }, jest.fn()];
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Add item
      act(() => {
        screen.getByTestId("set-cart").click();
      });

      // Assert -> Cart has 1 item
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
    });

    it("GN -> GE: guest removes last item from cart", () => {
      // Arrange -> Guest user, cart has items
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Clear cart
      act(() => {
        screen.getByTestId("clear-cart").click();
      });

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
    });

    it("GN -> GN: guest modifies item in non-empty cart", () => {
      // Arrange -> Guest user, cart has items
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Modify item
      act(() => {
        screen.getByTestId("modify-cart").click();
      });

      // Assert -> Cart still has 1 item but modified
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      const cartData = JSON.parse(
        screen.getByTestId("cart-data").textContent
      );
      expect(cartData[0].name).toBe("Modified Item");
    });

    it("U1E -> U1N: user 1 adds item to empty cart", () => {
      // Arrange -> User 1 logged in, empty cart
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Add item
      act(() => {
        screen.getByTestId("set-cart").click();
      });

      // Assert -> Cart has 1 item
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
    });

    it("U1N -> U1E: user 1 removes last item from cart", () => {
      // Arrange -> User 1 logged in, cart has items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Clear cart
      act(() => {
        screen.getByTestId("clear-cart").click();
      });

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
    });

    it("U1N -> U1N: user 1 modifies item in non-empty cart", () => {
      // Arrange -> User 1 logged in, cart has items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Modify item
      act(() => {
        screen.getByTestId("modify-cart").click();
      });

      // Assert -> Cart still has 1 item but modified
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      const cartData = JSON.parse(
        screen.getByTestId("cart-data").textContent
      );
      expect(cartData[0].name).toBe("Modified Item");
    });

    it("U2E -> U2N: user 2 adds item to empty cart", () => {
      // Arrange -> User 2 logged in, empty cart
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Add item
      act(() => {
        screen.getByTestId("set-cart").click();
      });

      // Assert -> Cart has 1 item
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
    });

    it("U2N -> U2E: user 2 removes last item from cart", () => {
      // Arrange -> User 2 logged in, cart has items
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      localStorage.setItem(`cart:${user2Id}`, JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Clear cart
      act(() => {
        screen.getByTestId("clear-cart").click();
      });

      // Assert -> Cart is empty
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
    });

    it("U2N -> U2N: user 2 modifies item in non-empty cart", () => {
      // Arrange -> User 2 logged in, cart has items
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      localStorage.setItem(`cart:${user2Id}`, JSON.stringify([item1]));
      renderWithProvider();
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Modify item
      act(() => {
        screen.getByTestId("modify-cart").click();
      });

      // Assert -> Cart still has 1 item but modified
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      const cartData = JSON.parse(
        screen.getByTestId("cart-data").textContent
      );
      expect(cartData[0].name).toBe("Modified Item");
    });
  });

  // ── State Transitions - User Change (10 tests) ──

  describe("State Transitions - User Change", () => {
    it("GE -> U1E: login from empty guest cart, user 1 has no saved cart", () => {
      // Arrange -> Guest user, empty cart
      mockAuthValue = [{ user: null }, jest.fn()];
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Login as user 1
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart is empty for user 1
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("GE -> U1N: login from empty guest cart, user 1 has saved cart", () => {
      // Arrange -> Guest user, empty cart; user 1 has saved items
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Login as user 1
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart loads user 1's saved items
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1])
      );
    });

    it("GN -> U1N: login from non-empty guest cart, user 1 has no saved cart, guest cart transfers", () => {
      // Arrange -> Guest user with items in cart
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify([item1]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Login as user 1 (no saved cart)
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Guest cart transferred to user 1
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1])
      );
      // Guest cart should still be present in localStorage
      expect(localStorage.getItem("cart:guest")).toBe(JSON.stringify([item1]));
    });

    it("GN -> U1N: login from non-empty guest cart, user 1 has saved cart", () => {
      // Arrange -> Guest user with items; user 1 has different saved items
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify([item1]));
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item2]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1])
      );

      // Act -> Login as user 1
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart loads user 1's saved items (not guest's)
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item2])
      );
    });

    it("U1E -> GE: logout from user 1 with empty cart, guest has no saved cart", () => {
      // Arrange -> User 1 logged in, empty cart
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Logout (become guest)
      mockAuthValue = [{ user: null }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart is empty for guest
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U1E -> U2E: logout + login, user 1 empty cart, user 2 has no saved cart", () => {
      // Arrange -> User 1 logged in, empty cart
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Switch to user 2
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart is empty for user 2
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U1E -> U2N: logout + login, user 1 empty cart, user 2 has saved cart", () => {
      // Arrange -> User 1 logged in, empty cart; user 2 has saved items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user2Id}`, JSON.stringify([item2]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("0");

      // Act -> Switch to user 2
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart loads user 2's saved items
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item2])
      );
    });

    it("U1N -> GE: logout from user 1 with non-empty cart, guest has no saved cart", () => {
      // Arrange -> User 1 logged in with items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Logout (become guest)
      mockAuthValue = [{ user: null }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart is empty for guest
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U1N -> U2E: logout + login, user 1 non-empty cart, user 2 has no saved cart", () => {
      // Arrange -> User 1 logged in with items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("1");

      // Act -> Switch to user 2 (no saved cart)
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart is empty for user 2
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("U1N -> U2N: logout + login, user 1 non-empty cart, user 2 has saved cart", () => {
      // Arrange -> User 1 logged in with items; user 2 has different saved items
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, JSON.stringify([item1]));
      localStorage.setItem(`cart:${user2Id}`, JSON.stringify([item2]));
      const { rerender } = render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item1])
      );

      // Act -> Switch to user 2
      mockAuthValue = [{ user: { _id: user2Id } }, jest.fn()];
      rerender(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Assert -> Cart loads user 2's saved items (not user 1's)
      expect(screen.getByTestId("cart-length").textContent).toBe("1");
      expect(screen.getByTestId("cart-data").textContent).toBe(
        JSON.stringify([item2])
      );
    });
  });

  // ── Error Handling  ──

  describe("Error Handling", () => {
    it("falls back to empty cart when localStorage contains corrupted JSON for guest", () => {
      // Arrange -> Guest user, localStorage has invalid JSON (simulates data corruption)
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", "{{not valid json}}");

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart gracefully falls back to empty instead of crashing
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("falls back to empty cart when localStorage contains corrupted JSON for logged-in user", () => {
      // Arrange -> User 1 logged in, localStorage has truncated/corrupt JSON
      mockAuthValue = [{ user: { _id: user1Id } }, jest.fn()];
      localStorage.setItem(`cart:${user1Id}`, '[{"_id":"item1"');

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart gracefully falls back to empty instead of crashing
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("falls back to empty cart when localStorage contains valid JSON that is not an array", () => {
      // Arrange -> Guest user, localStorage has a JSON object instead of an array
      mockAuthValue = [{ user: null }, jest.fn()];
      localStorage.setItem("cart:guest", JSON.stringify({ key: "value" }));

      // Act -> Render
      renderWithProvider();

      // Assert -> Cart falls back to empty since parsed data is not an array
      expect(screen.getByTestId("cart-length").textContent).toBe("0");
      expect(screen.getByTestId("cart-data").textContent).toBe("[]");
    });

    it("useCart throws when used outside CartProvider", () => {
      // Arrange -> Component that calls useCart without being wrapped in CartProvider
      const BadComponent = () => {
        const [cart] = useCart();
        return <div>{cart.length}</div>;
      };
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert -> Rendering without CartProvider throws
      expect(() => render(<BadComponent />)).toThrow(
        "useCart must be used within a CartProvider"
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

  });
});