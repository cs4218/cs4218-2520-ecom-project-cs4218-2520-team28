// Foo Chao, A0272024R
// Modified logic so that cart is stored separately 
// for each user in localStorage using key "cart:userId", and "cart:guest" for non-logged in users. 
// This ensures that each user's cart is preserved when they log out and another user logs in,
// preventing data loss and improving user experience.

// AI assistance: ChatGPT 5.2 Thinking, modified by Github Copilot (Grok Code Fast 1) Agent Mode
// Link to ChatGPT Prompt: https://chatgpt.com/share/69918c47-e8ec-8005-bb63-f37d41e0696d
// ChatGPT 5.2 Prompt: initial code + "this code looks very sus to me because when i log out i still see same cart or change acc"
// Output: Suggest code but not specified to how we store our user data
// Github Copilot Prompt: "
//  GPT suggest this approach but it is not specified to this file so can u adapt it based on the overall code logic
// " + GPT's code
// Output: Modified file here

import { useState, useContext, createContext, useEffect, useMemo, useRef } from "react";
import { useAuth } from "./auth";

const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [auth] = useAuth();
  const userId = auth?.user?._id || null;
  const storageKey = useMemo(() => (userId ? `cart:${userId}` : "cart:guest"), [userId]);

  const [cart, setCart] = useState([]);

  // track whether we've loaded for the current key
  const loadedKeyRef = useRef(null);

  // load cart whenever user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCart([]);
    } finally {
      loadedKeyRef.current = storageKey;
    }
  }, [storageKey]);

  // persist cart ONLY after load for that key is done
  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // optionally no-op or report
    }
  }, [storageKey, cart]);

  return (
    <CartContext.Provider value={[cart, setCart]}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};

export { useCart, CartProvider };