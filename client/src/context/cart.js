// Foo Chao, A0272024R
// Modified logic so that cart is stored separately 
// for each user in localStorage using key "cart:userId", and "cart:guest" for non-logged in users. 
// This ensures that each user's cart is preserved when they log out and another user logs in,
// preventing data loss and improving user experience.
// Exception is when user who logged in has no saved cart, then we transfer the guest cart to user cart 
// so that items added before login are preserved, ensuring a seamless shopping experience.

// AI assistance: ChatGPT 5.2 Thinking, modified by Github Copilot (Grok Code Fast 1) Agent Mode and Claude Opus 4.6 Agent Mode
// Link to ChatGPT Prompt: https://chatgpt.com/share/69918c47-e8ec-8005-bb63-f37d41e0696d
// ChatGPT 5.2 Prompt: initial code + "this code looks very sus to me because when i log out i still see same cart or change acc"
// Output: Suggest code but not specified to how we store our user data
// Github Copilot Prompt(Grok): "
//  GPT suggest this approach but it is not specified to this file so can u adapt it based on the overall code logic
// " + GPT's code
// Output: Modified file here
// Github Copilot Prompt(Claude):
// Modify the cart logic such that if log in from guest to user and user has no data set the guest data to user data. 
// This is because when user shop and then want to make acc to checkout they should keep their cart
// Github Copilot Prompt(Claude):
// after transfer guest cart persist and won't be affected if user add more item after

import React, { useState, useContext, createContext, useEffect, useMemo } from "react";
import { useAuth } from "./auth";

const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [auth] = useAuth();
  const userId = auth?.user?._id || null;
  const storageKey = useMemo(() => (userId ? `cart:${userId}` : "cart:guest"), [userId]);

  const [cart, setCart] = useState([]);

  // load cart whenever user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      let cartData = Array.isArray(parsed) ? parsed : [];

      // When a guest logs in and the user has no saved cart,
      // transfer the guest cart so items added before login are preserved
      if (storageKey !== "cart:guest" && cartData.length === 0) {
        try {
          const guestSaved = localStorage.getItem("cart:guest");
          if (guestSaved) {
            const guestParsed = JSON.parse(guestSaved);
            if (Array.isArray(guestParsed) && guestParsed.length > 0) {
              cartData = guestParsed;
            }
          }
        } catch {
          // guest cart corrupted, ignore
        }
      }

      setCart(cartData);
    } catch {
      setCart([]);
    }
  }, [storageKey]);

  // persist cart on every change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // no-op
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
