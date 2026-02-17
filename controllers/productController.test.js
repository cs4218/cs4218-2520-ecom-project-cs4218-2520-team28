// Note to the grader: The productController is tested by multiple testers, with tests split by methods.
// The tests are consolidated in a single file for better organization and to avoid circular dependencies with mocks.
// Each describe block corresponds to a specific controller method.
// Refer to the comments at the top for details on who handles what.

import { jest } from "@jest/globals";
import productModel from "../models/productModel.js";
import fs from "fs";
import slugify from "slugify";

// Foo Chao, A0272024R
// Mock environment variables before importing controller
process.env.BRAINTREE_MERCHANT_ID = "test_merchant_id";
process.env.BRAINTREE_PUBLIC_KEY = "test_public_key";
process.env.BRAINTREE_PRIVATE_KEY = "test_private_key";

// Foo Chao, A0272024R
// Mock dependencies before importing controller
jest.mock("../models/productModel.js");
jest.mock("fs");
jest.mock("slugify");
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: {
    Sandbox: "sandbox",
  },
}));

// Foo Chao, A0272024R
// Import controller after mocks are set up
import {
  createProductController,
  deleteProductController,
  updateProductController,
} from "./productController.js";

// Foo Chao, A0272024R
describe("createProductController", () => {
  // AI generated unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
  // Test Coverage 1: All possible error messages are given correctly for missing fields
  // Test Coverage 2: Empty req.files does not cause error (graceful handling)
  // Test Coverage 3: Extra fields cannot be added to product (security validation)
  // Test Coverage 4: Photo size validation (> 1MB rejection and edge cases: 0, -1, 1, 999999 bytes)
  // Test Coverage 5: Successful product creation with and without photo
  // Test Coverage 6: Photo assignment bug fix verification (lines 57-60)

  // Prompt 1: do unit test for the method createProductController notable test all possible error 
  // messages is given correctly, multiple errors can be handled as well, empty req.files does not 
  // cause error, extra fields cannot be added, additionally check line 56-59, I think it cause an 
  // error cause products.photo is not defined yet so make sure to have test case for it and fix 
  // code if necessary

  // Prompt 2: for file size testing, prof say should test on below above so need test 1mb - 1 as well 
  // moreover, we should test and handle case of -1 0 1 where we reject 0 and negative number 
  // modify the code and test from product controller and test to show this 
  // make sure to give AI credit and to update test number

  // Bug fixes in productController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
  // Fixed 1: Changed photo assignment from products.photo.data/contentType to products.photo = {...}
  //          to avoid "Cannot set property of undefined" error
  // Fixed 2: Removed spread operator ...req.fields for security (prevents field injection)
  // Fixed 3: Use only explicitly validated fields (name, description, price, category, quantity, shipping)
  // Fixed 4: Updated photo size validation to reject sizes <= 0 and > 1MB, with improved error message

  let req, res, mockProduct, mockSave;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      fields: {
        name: "Test Product",
        description: "Test Description",
        price: "100",
        category: "category123",
        quantity: "10",
        shipping: "true",
      },
      files: {},
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Mock product instance
    mockSave = jest.fn().mockResolvedValue();
    mockProduct = {
      save: mockSave,
      name: "Test Product",
      description: "Test Description",
      price: 100,
      category: "category123",
      quantity: 10,
      shipping: true,
      slug: "test-product",
    };

    productModel.mockImplementation(() => mockProduct);
    slugify.mockReturnValue("test-product");
  });

  // Test 1: Should return error when req.fields is missing
  it("should return 400 error when req.fields is missing", async () => {
    req.fields = undefined;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Please provide all fields",
    });
  });

  // Test 2: Should return error when name is missing
  it("should return error when name is missing", async () => {
    delete req.fields.name;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  // Test 3: Should return error when description is missing
  it("should return error when description is missing", async () => {
    delete req.fields.description;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is Required",
    });
  });

  // Test 4: Should return error when price is missing
  it("should return error when price is missing", async () => {
    delete req.fields.price;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  // Test 5: Should return error when category is missing
  it("should return error when category is missing", async () => {
    delete req.fields.category;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
  });

  // Test 6: Should return error when quantity is missing
  it("should return error when quantity is missing", async () => {
    delete req.fields.quantity;

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
  });

  // Test 7: Should return error when photo size exceeds 1MB
  it("should return error when photo size exceeds 1MB", async () => {
    req.files = {
      photo: {
        size: 1500000, // 1.5MB
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 8: Should handle first error when multiple fields are missing
  it("should return first error when multiple fields are missing", async () => {
    delete req.fields.name;
    delete req.fields.description;
    delete req.fields.price;

    await createProductController(req, res);

    // Switch statement catches first error (name)
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  // Test 9: Should create product successfully without photo
  it("should create product successfully without photo", async () => {
    req.files = {};

    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith({
      name: "Test Product",
      description: "Test Description",
      price: "100",
      category: "category123",
      quantity: "10",
      shipping: "true",
      slug: "test-product",
    });
    expect(slugify).toHaveBeenCalledWith("Test Product");
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Created Successfully",
      products: mockProduct,
    });
  });

  // Test 10: Should create product successfully with photo
  it("should create product successfully with photo", async () => {
    const mockPhotoBuffer = Buffer.from("fake image data");
    req.files = {
      photo: {
        size: 500000, // 0.5MB
        path: "/fake/path/photo.jpg",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(mockPhotoBuffer);

    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith({
      name: "Test Product",
      description: "Test Description",
      price: "100",
      category: "category123",
      quantity: "10",
      shipping: "true",
      slug: "test-product",
    });
    expect(fs.readFileSync).toHaveBeenCalledWith("/fake/path/photo.jpg");
    expect(mockProduct.photo).toEqual({
      data: mockPhotoBuffer,
      contentType: "image/jpeg",
    });
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Created Successfully",
      products: mockProduct,
    });
  });

  // Test 11: Should not include extra fields from req.fields
  it("should not include extra fields from req.fields", async () => {
    req.fields.extraField = "malicious data";
    req.fields.adminRole = "true";

    await createProductController(req, res);

    // Verify only expected fields are passed to productModel
    const modelCall = productModel.mock.calls[0][0];
    expect(modelCall).not.toHaveProperty("extraField");
    expect(modelCall).not.toHaveProperty("adminRole");
    expect(Object.keys(modelCall)).toEqual([
      "name",
      "description",
      "price",
      "category",
      "quantity",
      "shipping",
      "slug",
    ]);
  });

  // Test 12: Should handle empty req.files gracefully
  it("should handle empty req.files without error", async () => {
    req.files = {};

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Created Successfully",
      products: mockProduct,
    });
  });

  // Test 13: Should handle undefined req.files gracefully
  it("should handle undefined req.files without error", async () => {
    req.files = undefined;

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 14: Should handle missing req.files.photo gracefully
  it("should handle missing req.files.photo without error", async () => {
    req.files = { otherFile: {} };

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 15: Should handle database save error
  it("should return 500 error when database save fails", async () => {
    const dbError = new Error("Database connection failed");
    mockSave.mockRejectedValue(dbError);

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError,
      message: "Error in creating product",
    });
  });

  // Test 16: Should handle file read error
  it("should return 500 error when photo file read fails", async () => {
    req.files = {
      photo: {
        size: 500000,
        path: "/invalid/path/photo.jpg",
        type: "image/jpeg",
      },
    };
    const fileError = new Error("File not found");
    fs.readFileSync.mockImplementation(() => {
      throw fileError;
    });

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: fileError,
      message: "Error in creating product",
    });
  });

  // Test 17: Should generate slug from product name
  it("should generate slug from product name using slugify", async () => {
    slugify.mockReturnValue("custom-slug");
    req.fields.name = "Custom Product Name";

    await createProductController(req, res);

    expect(slugify).toHaveBeenCalledWith("Custom Product Name");
    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "custom-slug",
      })
    );
  });

  // Test 18: Photo assignment bug fix verification
  it("should assign photo as object without causing undefined error", async () => {
    const mockPhotoBuffer = Buffer.from("test data");
    req.files = {
      photo: {
        size: 100000,
        path: "/test/path.jpg",
        type: "image/png",
      },
    };
    fs.readFileSync.mockReturnValue(mockPhotoBuffer);

    await createProductController(req, res);

    // Verify photo is assigned as complete object (bug fix)
    expect(mockProduct.photo).toBeDefined();
    expect(mockProduct.photo).toEqual({
      data: mockPhotoBuffer,
      contentType: "image/png",
    });
    // Should not throw "Cannot set property 'data' of undefined" error
    expect(mockSave).toHaveBeenCalled();
  });

  // Test 19: Should handle name with empty string
  it("should return error when name is empty string", async () => {
    req.fields.name = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  // Test 20: Should handle price as string (valid input from form)
  it("should accept price as string from form input", async () => {
    req.fields.price = "99.99";

    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({
        price: "99.99",
      })
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 21: Should handle quantity as string (valid input from form)
  it("should accept quantity as string from form input", async () => {
    req.fields.quantity = "50";

    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: "50",
      })
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 22: Should handle shipping field when not provided
  it("should handle missing shipping field gracefully", async () => {
    delete req.fields.shipping;

    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping: undefined,
      })
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 23: Should validate photo at exactly 1MB boundary
  it("should accept photo at exactly 1MB size", async () => {
    req.files = {
      photo: {
        size: 1000000, // exactly 1MB
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("data"));

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 24: Should reject photo at 1MB + 1 byte
  it("should reject photo at 1MB + 1 byte", async () => {
    req.files = {
      photo: {
        size: 1000001, // 1MB + 1 byte
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 25: Should reject photo with size 0
  it("should reject photo with size 0", async () => {
    req.files = {
      photo: {
        size: 0,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 26: Should reject photo with negative size
  it("should reject photo with negative size", async () => {
    req.files = {
      photo: {
        size: -1,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 27: Should accept photo with size 1 byte
  it("should accept photo with size 1 byte", async () => {
    req.files = {
      photo: {
        size: 1,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("x"));

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 28: Should accept photo with size 999999 bytes
  it("should accept photo with size 999999 bytes", async () => {
    req.files = {
      photo: {
        size: 999999,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("data"));

    await createProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// // Foo Chao, A0272024R
describe("deleteProductController", () => {
  // AI generated unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
  // Test Coverage 1: Successful product deletion by valid ID
  // Test Coverage 2: 404 error when product not found
  // Test Coverage 3: Error handling for invalid product ID format
  // Test Coverage 4: Database error handling during deletion
  // Test Coverage 5: Verification that correct product is deleted
  // Test Coverage 6: 400 error when product ID is not provided

  // Prompt 1: explain deleteController code
  // Prompt 2: ok fix them and create unit test based on the corrected behaviour make sure to include AI usage
  // Prompt 3: modify deleteProductController to check if pid is provided and update relevant test case 
  //           before trying else give 400 error update AI usage for it as well

  // Bug fixes in productController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
  // Fixed 1: Added validation to check if product exists before returning success
  // Fixed 2: Return 404 error when product is not found instead of success message
  // Fixed 3: Added validation to check if pid is provided before attempting deletion
  // Fixed 4: Return 400 error when product ID is missing or empty

  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      params: {
        pid: "validProductId123",
      },
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: Should successfully delete product with valid ID
  it("should delete product successfully with valid ID", async () => {
    const mockDeletedProduct = {
      _id: "validProductId123",
      name: "Test Product",
      price: 100,
    };
    const mockSelect = jest.fn().mockResolvedValue(mockDeletedProduct);
    productModel.findByIdAndDelete = jest
      .fn()
      .mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      "validProductId123"
    );
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  // Test 2: Should return 404 when product not found
  it("should return 404 error when product not found", async () => {
    const mockSelect = jest.fn().mockResolvedValue(null);
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      "validProductId123"
    );
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  // Test 3: Should handle invalid product ID format
  it("should handle invalid product ID format", async () => {
    req.params.pid = "invalidIdFormat";
    const dbError = new Error("Cast to ObjectId failed");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      "invalidIdFormat"
    );
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
      error: dbError,
    });
  });

  // Test 4: Should handle database connection error
  it("should handle database connection error", async () => {
    const dbError = new Error("Database connection failed");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
      error: dbError,
    });
  });

  // Test 5: Should verify correct product ID is used
  it("should call findByIdAndDelete with correct product ID", async () => {
    req.params.pid = "specificProductId456";
    const mockSelect = jest.fn().mockResolvedValue({
      _id: "specificProductId456",
      name: "Specific Product",
    });
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      "specificProductId456"
    );
    expect(mockSelect).toHaveBeenCalledWith("-photo");
    expect(productModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
  });

  // Test 6: Should not return photo data in response
  it("should successfully delete product without returning photo data", async () => {
    const mockDeletedProduct = {
      _id: "validProductId123",
      name: "Test Product",
      price: 100,
      photo: {
        data: Buffer.from("large binary data"),
        contentType: "image/jpeg",
      },
    };
    const mockSelect = jest.fn().mockResolvedValue(mockDeletedProduct);
    productModel.findByIdAndDelete = jest
      .fn()
      .mockReturnValue({ select: mockSelect });

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // Response should not include the deleted product data (especially photo)
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  // Test 7: Should handle missing params.pid
  it("should return 400 error when product ID is missing", async () => {
    req.params.pid = undefined;

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product ID is required",
    });
  });

  // Test 8: Should handle empty string product ID
  it("should return 400 error when product ID is empty string", async () => {
    req.params.pid = "";

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product ID is required",
    });
  });
});

// // Foo Chao, A0272024R
describe("updateProductController", () => {
  // AI generated unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
  // Test Coverage 1: All possible error messages are given correctly for missing fields
  // Test Coverage 2: Empty req.files does not cause error (graceful handling)
  // Test Coverage 3: Extra fields cannot be added to product (security validation)
  // Test Coverage 4: Photo size validation (> 1MB rejection and edge cases: 0, -1, 1, 999999 bytes)
  // Test Coverage 5: Successful product update with and without photo
  // Test Coverage 6: Product ID validation (missing or not found)
  // Test Coverage 7: Photo assignment bug fix verification

  // Prompt 1: do unit test including all parallel tests in createProductController as well as cases 
  // when params id not provided or product not found. Make sure to give AI credits as well

  // Prompt 2: for file size testing, prof say should test on below above so need test 1mb - 1 as well 
  // moreover, we should test and handle case of -1 0 1 where we reject 0 and negative number 
  // modify the code and test from product controller and test to show this 
  // make sure to give AI credit and to update test number

  // Bug fixes in productController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
  // Fixed 1: Added validation to check if pid is provided before attempting update
  // Fixed 2: Return 400 error when product ID is missing or empty
  // Fixed 3: Added validation to check if product exists before updating
  // Fixed 4: Return 404 error when product is not found
  // Fixed 5: Changed validation error status codes from 500 to 400
  // Fixed 6: Removed spread operator ...req.fields for security (prevents field injection)
  // Fixed 7: Changed photo assignment from products.photo.data/contentType to products.photo = {...}
  // Fixed 8: Added req.fields validation check
  // Fixed 9: Updated photo size validation to reject sizes <= 0 and > 1MB, with improved error message

  let req, res, mockProduct, mockSave, mockFindByIdAndUpdate;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      params: {
        pid: "validProductId123",
      },
      fields: {
        name: "Updated Product",
        description: "Updated Description",
        price: "150",
        category: "category456",
        quantity: "20",
        shipping: "false",
      },
      files: {},
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Mock product instance
    mockSave = jest.fn().mockResolvedValue();
    mockProduct = {
      save: mockSave,
      _id: "validProductId123",
      name: "Updated Product",
      description: "Updated Description",
      price: 150,
      category: "category456",
      quantity: 20,
      shipping: false,
      slug: "updated-product",
    };

    mockFindByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);
    productModel.findByIdAndUpdate = mockFindByIdAndUpdate;
    slugify.mockReturnValue("updated-product");
  });

  // Test 1: Should return error when req.fields is missing
  it("should return 400 error when req.fields is missing", async () => {
    req.fields = undefined;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Please provide all fields",
    });
  });

  // Test 2: Should return error when product ID is missing
  it("should return 400 error when product ID is missing", async () => {
    req.params.pid = undefined;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product ID is required",
    });
  });

  // Test 3: Should return error when product ID is empty string
  it("should return 400 error when product ID is empty string", async () => {
    req.params.pid = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product ID is required",
    });
  });

  // Test 4: Should return 404 when product not found
  it("should return 404 error when product not found", async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.objectContaining({
        name: "Updated Product",
        description: "Updated Description",
      }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  // Test 5: Should return error when name is missing
  it("should return 400 error when name is missing", async () => {
    delete req.fields.name;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Name is Required",
    });
  });

  // Test 6: Should return error when description is missing
  it("should return 400 error when description is missing", async () => {
    delete req.fields.description;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is Required",
    });
  });

  // Test 7: Should return error when price is missing
  it("should return 400 error when price is missing", async () => {
    delete req.fields.price;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Price is Required",
    });
  });

  // Test 8: Should return error when category is missing
  it("should return 400 error when category is missing", async () => {
    delete req.fields.category;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Category is Required",
    });
  });

  // Test 9: Should return error when quantity is missing
  it("should return 400 error when quantity is missing", async () => {
    delete req.fields.quantity;

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Quantity is Required",
    });
  });

  // Test 10: Should return error when shipping is missing
  it("should not return error when shipping is missing", async () => {
    delete req.fields.shipping;

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.objectContaining({
        shipping: undefined,
      }),
      { new: true }
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 11: Should successfully update product without photo
  it("should update product successfully without photo", async () => {
    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      {
        name: "Updated Product",
        description: "Updated Description",
        price: "150",
        category: "category456",
        quantity: "20",
        shipping: "false",
        slug: "updated-product",
      },
      { new: true }
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Updated Successfully",
      products: mockProduct,
    });
  });

  // Test 12: Should successfully update product with photo
  it("should update product successfully with photo", async () => {
    req.files = {
      photo: {
        size: 500000,
        path: "/fake/path/photo.jpg",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("photo data"));

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledWith("/fake/path/photo.jpg");
    expect(mockProduct.photo).toEqual({
      data: Buffer.from("photo data"),
      contentType: "image/jpeg",
    });
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 13: Should reject photo larger than 1MB
  it("should reject photo larger than 1MB", async () => {
    req.files = {
      photo: {
        size: 1000001,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 14: Should accept photo at exactly 1MB
  it("should accept photo at exactly 1MB size", async () => {
    req.files = {
      photo: {
        size: 1000000,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("data"));

    await updateProductController(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 15: Should not add extra fields (security test)
  it("should not add extra fields to product update", async () => {
    req.fields.extraField = "malicious data";
    req.fields.adminRole = "true";

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.not.objectContaining({
        extraField: "malicious data",
        adminRole: "true",
      }),
      { new: true }
    );
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 16: Should handle database error
  it("should return 500 error when database update fails", async () => {
    const dbError = new Error("Database connection failed");
    mockFindByIdAndUpdate.mockRejectedValue(dbError);

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: dbError,
      message: "Error in updating product",
    });
  });

  // Test 17: Should handle file system error when reading photo
  it("should return 500 error when photo file read fails", async () => {
    req.files = {
      photo: {
        size: 500000,
        path: "/invalid/path/photo.jpg",
        type: "image/jpeg",
      },
    };
    const fileError = new Error("File not found");
    fs.readFileSync.mockImplementation(() => {
      throw fileError;
    });

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: fileError,
      message: "Error in updating product",
    });
  });

  // Test 18: Should generate slug from updated product name
  it("should generate slug from updated product name using slugify", async () => {
    slugify.mockReturnValue("custom-updated-slug");
    req.fields.name = "Custom Updated Product";

    await updateProductController(req, res);

    expect(slugify).toHaveBeenCalledWith("Custom Updated Product");
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.objectContaining({
        slug: "custom-updated-slug",
      }),
      { new: true }
    );
  });

  // Test 19: Should handle save error after photo update
  it("should return 500 error when save fails after photo update", async () => {
    req.files = {
      photo: {
        size: 500000,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("data"));
    const saveError = new Error("Save failed");
    mockSave.mockRejectedValue(saveError);

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: saveError,
      message: "Error in updating product",
    });
  });

  // Test 20: Should handle invalid product ID format
  it("should handle invalid product ID format", async () => {
    req.params.pid = "invalidIdFormat";
    const dbError = new Error("Cast to ObjectId failed");
    mockFindByIdAndUpdate.mockRejectedValue(dbError);

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "invalidIdFormat",
      expect.any(Object),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in updating product",
      error: dbError,
    });
  });

  // Test 21: Should verify correct product ID is used
  it("should call findByIdAndUpdate with correct product ID", async () => {
    req.params.pid = "specificProductId789";
    mockFindByIdAndUpdate.mockResolvedValue({
      ...mockProduct,
      _id: "specificProductId789",
      save: mockSave,
    });

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "specificProductId789",
      expect.any(Object),
      { new: true }
    );
    expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  // Test 22: Should handle empty name string
  it("should return 400 error when name is empty string", async () => {
    req.fields.name = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Name is Required",
    });
  });

  // Test 23: Should handle different price values
  it("should accept different price values", async () => {
    req.fields.price = "199.99";

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.objectContaining({
        price: "199.99",
      }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 24: Should handle different quantity values
  it("should accept different quantity values", async () => {
    req.fields.quantity = "100";

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "validProductId123",
      expect.objectContaining({
        quantity: "100",
      }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 25: Should reject photo with size 0
  it("should reject photo with size 0", async () => {
    req.files = {
      photo: {
        size: 0,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 26: Should reject photo with negative size
  it("should reject photo with negative size", async () => {
    req.files = {
      photo: {
        size: -1,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo size must be between 1 and 1,000,000 bytes",
    });
  });

  // Test 27: Should accept photo with size 1 byte
  it("should accept photo with size 1 byte", async () => {
    req.files = {
      photo: {
        size: 1,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("x"));

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Test 28: Should accept photo with size 999999 bytes
  it("should accept photo with size 999999 bytes", async () => {
    req.files = {
      photo: {
        size: 999999,
        path: "/fake/path",
        type: "image/jpeg",
      },
    };
    fs.readFileSync.mockReturnValue(Buffer.from("data"));

    await updateProductController(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
