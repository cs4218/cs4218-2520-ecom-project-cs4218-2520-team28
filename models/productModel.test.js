// Chi Thanh, A0276229W

// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode for the following:
// Test Coverage 1: Schema structure validation (model name, field definitions, types)
// Test Coverage 2: Required field enforcement with validation errors for missing fields
// Test Coverage 3: Optional fields (photo, shipping) not required
// Test Coverage 4: photo sub-document structure (data: Buffer, contentType: String)
// Test Coverage 5: category field is ObjectId with ref "Category"
// Test Coverage 6: Multiple required field missing errors at once
// Test Coverage 7: Type coercion and invalid type handling
// Test Coverage 8: Timestamps configuration verification
// Test Coverage 9: Validation via .validate() without DB connection

import mongoose from "mongoose";
import productModel from "./productModel.js";

// ── Schema reference helper ───────────────────────────────────────────────────
const schema = productModel.schema.obj;

describe("Product Model Unit Tests", () => {

  // ── Model definition ───────────────────────────────────────────────────────

  // Test 1: model should be defined
  it("should be defined", () => {
    // Arrange / Act / Assert
    expect(productModel).toBeDefined();
  });

  // Test 2: model name should be "Products"
  it("should have the correct model name", () => {
    // Arrange / Act / Assert
    expect(productModel.modelName).toBe("Products");
  });

  // ── Schema structure ───────────────────────────────────────────────────────

  // Test 3: all top-level fields are present in schema
  it("should define all expected fields in the schema", () => {
    // Arrange / Act / Assert
    expect(schema.name).toBeDefined();
    expect(schema.slug).toBeDefined();
    expect(schema.description).toBeDefined();
    expect(schema.price).toBeDefined();
    expect(schema.category).toBeDefined();
    expect(schema.quantity).toBeDefined();
    expect(schema.photo).toBeDefined();
    expect(schema.shipping).toBeDefined();
  });

  // ── Field types ────────────────────────────────────────────────────────────

  // Test 4: name is String type
  it("should have name field as type String", () => {
    expect(schema.name.type).toBe(String);
  });

  // Test 5: slug is String type
  it("should have slug field as type String", () => {
    expect(schema.slug.type).toBe(String);
  });

  // Test 6: description is String type
  it("should have description field as type String", () => {
    expect(schema.description.type).toBe(String);
  });

  // Test 7: price is Number type
  it("should have price field as type Number", () => {
    expect(schema.price.type).toBe(Number);
  });

  // Test 8: quantity is Number type
  it("should have quantity field as type Number", () => {
    expect(schema.quantity.type).toBe(Number);
  });

  // Test 9: shipping is Boolean type
  it("should have shipping field as type Boolean", () => {
    expect(schema.shipping.type).toBe(Boolean);
  });

  // ── Required fields ────────────────────────────────────────────────────────

  // Test 10: name is required
  it("should mark name as required", () => {
    expect(schema.name.required).toBe(true);
  });

  // Test 11: slug is required
  it("should mark slug as required", () => {
    expect(schema.slug.required).toBe(true);
  });

  // Test 12: description is required
  it("should mark description as required", () => {
    expect(schema.description.required).toBe(true);
  });

  // Test 13: price is required
  it("should mark price as required", () => {
    expect(schema.price.required).toBe(true);
  });

  // Test 14: category is required
  it("should mark category as required", () => {
    expect(schema.category.required).toBe(true);
  });

  // Test 15: quantity is required
  it("should mark quantity as required", () => {
    expect(schema.quantity.required).toBe(true);
  });

  // ── Optional fields ────────────────────────────────────────────────────────

  // Test 16: shipping is not required
  it("should not mark shipping as required", () => {
    expect(schema.shipping.required).toBeUndefined();
  });

  // Test 17: photo is not required
  it("should not define photo as required", () => {
    // photo is a sub-document object, no required key at top level
    expect(schema.photo.required).toBeUndefined();
  });

  // ── photo sub-document ─────────────────────────────────────────────────────

  // Test 18: photo.data is Buffer type
  it("should define photo.data as Buffer type", () => {
    expect(schema.photo.data).toBe(Buffer);
  });

  // Test 19: photo.contentType is String type
  it("should define photo.contentType as String type", () => {
    expect(schema.photo.contentType).toBe(String);
  });

  // ── category ref ───────────────────────────────────────────────────────────

  // Test 20: category ref points to "Category"
  it("should set the category ref to 'Category'", () => {
    expect(schema.category.ref).toBe("Category");
  });

  // Test 21: category type is mongoose.ObjectId
  it("should set category type to mongoose.ObjectId", () => {
    expect(schema.category.type).toBe(mongoose.ObjectId);
  });

  // ── Timestamps ─────────────────────────────────────────────────────────────

  // Test 22: timestamps option is enabled
  it("should have timestamps enabled", () => {
    expect(productModel.schema.options.timestamps).toBe(true);
  });

  // ── Validation via .validate() ─────────────────────────────────────────────

  // Test 23: valid document passes validation without DB connection
  it("should pass validation for a fully valid product", async () => {
    // Arrange
    const product = new productModel({
      name: "Test Widget",
      slug: "test-widget",
      description: "A test product description",
      price: 29.99,
      category: new mongoose.Types.ObjectId(),
      quantity: 10,
    });

    // Act / Assert — should not throw
    await expect(product.validate()).resolves.toBeUndefined();
  });

  // Test 24: missing name triggers validation error
  it("should fail validation when name is missing", async () => {
    // Arrange
    const product = new productModel({
      slug: "test-widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.name).toBeDefined();
  });

  // Test 25: missing slug triggers validation error
  it("should fail validation when slug is missing", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.slug).toBeDefined();
  });

  // Test 26: missing description triggers validation error
  it("should fail validation when description is missing", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.description).toBeDefined();
  });

  // Test 27: missing price triggers validation error
  it("should fail validation when price is missing", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.price).toBeDefined();
  });

  // Test 28: missing category triggers validation error
  it("should fail validation when category is missing", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: 10,
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.category).toBeDefined();
  });

  // Test 29: missing quantity triggers validation error
  it("should fail validation when quantity is missing", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.quantity).toBeDefined();
  });

  // Test 30: all required fields missing produces multiple errors
  it("should report errors for all missing required fields simultaneously", async () => {
    // Arrange
    const product = new productModel({});

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert — all six required fields fail
    expect(err.errors.name).toBeDefined();
    expect(err.errors.slug).toBeDefined();
    expect(err.errors.description).toBeDefined();
    expect(err.errors.price).toBeDefined();
    expect(err.errors.category).toBeDefined();
    expect(err.errors.quantity).toBeDefined();
  });

  // ── Optional fields allow absent values ───────────────────────────────────

  // Test 31: product without photo passes validation
  it("should pass validation when photo is omitted", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
    });

    // Act / Assert
    await expect(product.validate()).resolves.toBeUndefined();
  });

  // Test 32: product without shipping passes validation
  it("should pass validation when shipping is omitted", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
    });

    // Act / Assert
    await expect(product.validate()).resolves.toBeUndefined();
  });

  // ── Type coercion ──────────────────────────────────────────────────────────

  // Test 33: numeric string is coerced to Number for price
  it("should coerce a numeric string to Number for price", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: "49.99",
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act / Assert
    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.price).toBe(49.99);
  });

  // Test 34: non-numeric string causes cast error for price
  it("should fail validation when price is a non-numeric string", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: "not-a-number",
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
    });

    // Act
    const err = await product.validate().catch((e) => e);

    // Assert
    expect(err.errors.price).toBeDefined();
  });

  // Test 35: product with photo data and contentType passes validation
  it("should pass validation with photo data and contentType set", async () => {
    // Arrange
    const product = new productModel({
      name: "Widget",
      slug: "widget",
      description: "desc",
      price: 10,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
      photo: {
        data: Buffer.from("image bytes"),
        contentType: "image/jpeg",
      },
    });

    // Act / Assert
    await expect(product.validate()).resolves.toBeUndefined();
  });
});
