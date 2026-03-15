import { useState, useEffect } from "react";
import axios from "axios";

export default function useCategory() {
  const [categories, setCategories] = useState([]);

  //get cat
  const getCategories = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      setCategories(data?.category);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getCategories();
    // Foo Chao, A0272024R
    // AI Assistance: Github Copilot (Claude Sonnet 4.6)
    // Bug fix: re-fetch categories whenever CreateCategory dispatches this event so the
    // Header nav dropdown updates immediately without requiring a full page reload
    window.addEventListener("categoryUpdated", getCategories);
    return () => window.removeEventListener("categoryUpdated", getCategories);
  }, []);

  return categories;
}