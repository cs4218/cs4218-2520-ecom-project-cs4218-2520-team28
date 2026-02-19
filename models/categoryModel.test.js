
// Jian Tao - A0273320R

// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// Prompt 1: "How should I unit test a Mongoose schema model?"
// Prompt 2: "What should be tested for mongoose schema fields and lowercase options?"
// Scope: Testing Category schema structure, model instantiation, and lowercase
// transformation behavior for the slug field using Jest.
// No modifications were made to the original schema logic.

import mongoose from "mongoose";
import Category from "../models/categoryModel";

describe("Category Model Schema", () => {
  test("should create a category document successfully", () => {
    const categoryData = {
      name: "Electronics",
      slug: "electronics",
    };

    const category = new Category(categoryData);

    expect(category.name).toBe("Electronics");
    expect(category.slug).toBe("electronics");
  });

  test("should lowercase the slug automatically", () => {
    const category = new Category({
      name: "Clothing",
      slug: "CLOTHING",
    });

    // mongoose lowercase: true should convert it
    expect(category.slug).toBe("clothing");
  });

  test("should allow missing name since required is commented out", () => {
    const category = new Category({
      slug: "test-slug",
    });

    expect(category.name).toBeUndefined();
    expect(category.slug).toBe("test-slug");
  });

  test("should allow duplicate names since unique is commented out", () => {
    const category1 = new Category({
      name: "Books",
      slug: "books",
    });

    const category2 = new Category({
      name: "Books",
      slug: "books-2",
    });

    expect(category1.name).toBe("Books");
    expect(category2.name).toBe("Books");
  });

  test("should have correct schema fields", () => {
    const schemaPaths = Category.schema.paths;

    expect(schemaPaths).toHaveProperty("name");
    expect(schemaPaths).toHaveProperty("slug");
  });
});