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
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
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

// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Returns all products with populated category, no photo, limit 12, sorted by createdAt desc
// Test Coverage 2: Response shape (success flag, counTotal, message, products array)
// Test Coverage 3: DB error returns 500 with error.message string
// Test Coverage 4: counTotal reflects actual array length
// Test Coverage 5: find called exactly once with empty query
// Test Coverage 6: response success is false on error
describe("getProductController", () => {
  let req, res;

  // Helper: builds the standard mongoose chain mock
  const buildChain = (resolvedValue) => {
    const mockSort = jest.fn().mockResolvedValue(resolvedValue);
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    productModel.find = jest.fn().mockReturnValue({ populate: mockPopulate });
    return { mockSort, mockLimit, mockSelect, mockPopulate };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: returns 200 on success
  it("should return 200 with all products on success", async () => {
    // Arrange
    const mockProducts = [
      { _id: "p1", name: "Widget", category: { name: "Electronics" } },
      { _id: "p2", name: "Gadget", category: { name: "Electronics" } },
    ];
    buildChain(mockProducts);

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Test 2: response body has correct shape with products
  it("should send correct response body including success, counTotal, message and products", async () => {
    // Arrange
    const mockProducts = [
      { _id: "p1", name: "Widget", category: { name: "Electronics" } },
      { _id: "p2", name: "Gadget", category: { name: "Electronics" } },
    ];
    buildChain(mockProducts);

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      counTotal: 2,
      message: "ALlProducts ",
      products: mockProducts,
    });
  });

  // Test 3: queries find with empty filter
  it("should call find with empty query object", async () => {
    // Arrange
    buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
  });

  // Test 4: populates category field
  it("should populate the category field", async () => {
    // Arrange
    const { mockPopulate } = buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockPopulate).toHaveBeenCalledWith("category");
  });

  // Test 5: selects -photo to exclude photo data
  it("should select -photo to exclude photo binary data", async () => {
    // Arrange
    const { mockSelect } = buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockSelect).toHaveBeenCalledWith("-photo");
  });

  // Test 6: limits result to 12
  it("should limit results to 12", async () => {
    // Arrange
    const { mockLimit } = buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockLimit).toHaveBeenCalledWith(12);
  });

  // Test 7: sorts by createdAt descending
  it("should sort results by createdAt descending", async () => {
    // Arrange
    const { mockSort } = buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  // Test 8: counTotal matches returned array length
  it("should set counTotal equal to the number of products returned", async () => {
    // Arrange
    const mockProducts = [{ _id: "p1" }, { _id: "p2" }, { _id: "p3" }];
    buildChain(mockProducts);

    // Act
    await getProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.counTotal).toBe(3);
  });

  // Test 9: returns 200 with empty array when no products exist
  it("should return counTotal 0 and empty products array when no products exist", async () => {
    // Arrange
    buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ counTotal: 0, products: [] })
    );
  });

  // Test 10: find is called exactly once
  it("should call find exactly once", async () => {
    // Arrange
    buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledTimes(1);
  });

  // Test 11: single product sets counTotal to 1
  it("should set counTotal to 1 when exactly one product is returned", async () => {
    // Arrange
    buildChain([{ _id: "p1", name: "Solo" }]);

    // Act
    await getProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.counTotal).toBe(1);
  });

  // Test 12: success flag is true on success
  it("should include success: true in the response on success", async () => {
    // Arrange
    buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(true);
  });

  // Test 13: returns 500 when DB query throws
  it("should return 500 when the DB query throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockSort = jest.fn().mockRejectedValue(dbError);
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    productModel.find = jest.fn().mockReturnValue({ populate: mockPopulate });

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // Test 14: error response uses error.message string
  it("should include error.message string in 500 response", async () => {
    // Arrange
    const dbError = new Error("connection refused");
    const mockSort = jest.fn().mockRejectedValue(dbError);
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    productModel.find = jest.fn().mockReturnValue({ populate: mockPopulate });

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "connection refused" })
    );
  });

  // Test 15: error response includes success: false
  it("should include success: false in the 500 error response", async () => {
    // Arrange
    const mockSort = jest.fn().mockRejectedValue(new Error("err"));
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    productModel.find = jest.fn().mockReturnValue({ populate: mockPopulate });

    // Act
    await getProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(false);
  });

  // Test 16: error response contains correct message string
  it("should include the correct error message string in the 500 response", async () => {
    // Arrange
    const mockSort = jest.fn().mockRejectedValue(new Error("err"));
    const mockLimit = jest.fn().mockReturnValue({ sort: mockSort });
    const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockPopulate = jest.fn().mockReturnValue({ select: mockSelect });
    productModel.find = jest.fn().mockReturnValue({ populate: mockPopulate });

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Erorr in getting products" })
    );
  });

  // Test 17: products are returned as the exact resolved array
  it("should return the exact products array resolved by the DB", async () => {
    // Arrange
    const mockProducts = [{ _id: "x1", name: "Alpha" }, { _id: "x2", name: "Beta" }];
    buildChain(mockProducts);

    // Act
    await getProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.products).toBe(mockProducts);
  });

  // Test 18: full query chain called in correct order
  it("should complete the full query chain: find → populate → select → limit → sort", async () => {
    // Arrange
    const { mockPopulate, mockSelect, mockLimit, mockSort } = buildChain([]);

    // Act
    await getProductController(req, res);

    // Assert — each step in the chain is invoked
    expect(productModel.find).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalled();
    expect(mockSort).toHaveBeenCalled();
  });
});

// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Fetches product by slug with -photo selection and category populated
// Test Coverage 2: Returns null product when slug does not match
// Test Coverage 3: DB error returns 500 with error object
// Test Coverage 4: findOne called exactly once with correct slug
// Test Coverage 5: response success flag and message
describe("getSingleProductController", () => {
  let req, res;

  // Helper: builds the standard mongoose chain mock
  const buildChain = (resolvedValue) => {
    const mockPopulate = jest.fn().mockResolvedValue(resolvedValue);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });
    return { mockPopulate, mockSelect };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { slug: "test-product" } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: returns 200 on success
  it("should return 200 when product is found", async () => {
    // Arrange
    buildChain({ _id: "p1", name: "Widget", slug: "test-product" });

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Test 2: full response shape on success
  it("should return correct response body with success, message and product", async () => {
    // Arrange
    const mockProduct = { _id: "p1", name: "Widget", slug: "test-product" };
    buildChain(mockProduct);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Single Product Fetched",
      product: mockProduct,
    });
  });

  // Test 3: queries findOne with correct slug object
  it("should call findOne with the slug from req.params", async () => {
    // Arrange
    buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
  });

  // Test 4: uses a different slug correctly
  it("should call findOne with any slug provided in params", async () => {
    // Arrange
    req.params.slug = "another-slug";
    buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "another-slug" });
  });

  // Test 5: selects -photo to exclude photo field
  it("should select -photo to exclude photo data", async () => {
    // Arrange
    const { mockSelect } = buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(mockSelect).toHaveBeenCalledWith("-photo");
  });

  // Test 6: populates category field
  it("should populate the category field", async () => {
    // Arrange
    const { mockPopulate } = buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(mockPopulate).toHaveBeenCalledWith("category");
  });

  // Test 7: findOne called exactly once
  it("should call findOne exactly once", async () => {
    // Arrange
    buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledTimes(1);
  });

  // Test 8: returns 200 with null when product not found
  it("should return 200 with null product when slug does not match any product", async () => {
    // Arrange
    buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ product: null })
    );
  });

  // Test 9: success is true even when product is null
  it("should include success: true even when product is null", async () => {
    // Arrange
    buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(true);
  });

  // Test 10: message is correct on success
  it("should include the correct message on success", async () => {
    // Arrange
    buildChain({ _id: "p1" });

    // Act
    await getSingleProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.message).toBe("Single Product Fetched");
  });

  // Test 11: product is the exact resolved value from DB
  it("should return the exact product object resolved by the DB", async () => {
    // Arrange
    const mockProduct = { _id: "p99", name: "Exact", slug: "exact" };
    buildChain(mockProduct);

    // Act
    await getSingleProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.product).toBe(mockProduct);
  });

  // Test 12: returns 500 when DB throws
  it("should return 500 when the DB query throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockPopulate = jest.fn().mockRejectedValue(dbError);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // Test 13: 500 response includes correct error message string
  it("should include the correct error message in the 500 response", async () => {
    // Arrange
    const dbError = new Error("timeout");
    const mockPopulate = jest.fn().mockRejectedValue(dbError);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Eror while getitng single product" })
    );
  });

  // Test 14: 500 response includes error object
  it("should include the error object in the 500 response", async () => {
    // Arrange
    const dbError = new Error("timeout");
    const mockPopulate = jest.fn().mockRejectedValue(dbError);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: dbError })
    );
  });

  // Test 15: 500 response has success: false
  it("should include success: false in the 500 error response", async () => {
    // Arrange
    const dbError = new Error("err");
    const mockPopulate = jest.fn().mockRejectedValue(dbError);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await getSingleProductController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(false);
  });

  // Test 16: full query chain called in correct order
  it("should complete the full query chain: findOne → select → populate", async () => {
    // Arrange
    const { mockPopulate, mockSelect } = buildChain(null);

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
  });

  // Test 17: full error response shape is correct
  it("should return exact 500 response shape when DB throws", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockPopulate = jest.fn().mockRejectedValue(dbError);
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
    productModel.findOne = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Eror while getitng single product",
      error: dbError,
    });
  });
});

// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Sends photo binary data with correct Content-type header
// Test Coverage 2: No response sent when photo.data is falsy
// Test Coverage 3: DB error returns 500 with error object
// Test Coverage 4: findById called with correct pid and selects only photo field
// Test Coverage 5: Handles different image content types
describe("productPhotoController", () => {
  let req, res;

  // Helper: builds a findById → select chain mock
  const buildChain = (resolvedValue) => {
    const mockSelect = jest.fn().mockResolvedValue(resolvedValue);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });
    return { mockSelect };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { pid: "prod-1" } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: returns 200 when photo.data exists
  it("should return 200 when the product photo exists", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("img"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Test 2: sets Content-type header to the stored contentType
  it("should set Content-type header matching the stored contentType", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("img"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
  });

  // Test 3: sends the photo buffer as the response body
  it("should send the photo binary data as the response body", async () => {
    // Arrange
    const photoBuffer = Buffer.from("image bytes");
    buildChain({ photo: { data: photoBuffer, contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(photoBuffer);
  });

  // Test 4: handles PNG content type correctly
  it("should set Content-type to image/png for PNG photos", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("png"), contentType: "image/png" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
  });

  // Test 5: handles WebP content type correctly
  it("should set Content-type to image/webp for WebP photos", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("webp"), contentType: "image/webp" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/webp");
  });

  // Test 6: calls findById with the correct pid from params
  it("should call findById with the pid from req.params", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("x"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("prod-1");
  });

  // Test 7: uses a different pid correctly
  it("should call findById with any pid provided in params", async () => {
    // Arrange
    req.params.pid = "prod-999";
    buildChain({ photo: { data: Buffer.from("x"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledWith("prod-999");
  });

  // Test 8: selects only the photo field
  it("should select only the photo field from the product", async () => {
    // Arrange
    const { mockSelect } = buildChain({ photo: { data: Buffer.from("x"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(mockSelect).toHaveBeenCalledWith("photo");
  });

  // Test 9: findById called exactly once
  it("should call findById exactly once", async () => {
    // Arrange
    buildChain({ photo: { data: Buffer.from("x"), contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(productModel.findById).toHaveBeenCalledTimes(1);
  });

  // Test 10: does not send a response when photo.data is null
  it("should not call res.send when photo.data is null", async () => {
    // Arrange
    buildChain({ photo: { data: null, contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).not.toHaveBeenCalled();
  });

  // Test 11: does not set Content-type header when photo.data is null
  it("should not call res.set when photo.data is null", async () => {
    // Arrange
    buildChain({ photo: { data: null, contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).not.toHaveBeenCalled();
  });

  // Test 12: does not send a response when photo.data is undefined
  it("should not call res.send when photo.data is undefined", async () => {
    // Arrange
    buildChain({ photo: { data: undefined, contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).not.toHaveBeenCalled();
  });

  // Test 13: returns 500 when DB throws
  it("should return 500 when the DB query throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // Test 14: 500 response contains correct error message string
  it("should include correct error message in the 500 response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Erorr while getting photo" })
    );
  });

  // Test 15: 500 response has success: false
  it("should include success: false in the 500 error response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await productPhotoController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(false);
  });

  // Test 16: 500 response contains error object
  it("should include the error object in the 500 response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: dbError })
    );
  });

  // Test 17: full 500 response shape is correct
  it("should return exact 500 response shape when DB throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockSelect = jest.fn().mockRejectedValue(dbError);
    productModel.findById = jest.fn().mockReturnValue({ select: mockSelect });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Erorr while getting photo",
      error: dbError,
    });
  });

  // Test 18: sends the exact binary buffer returned by DB
  it("should send the exact Buffer instance stored in photo.data", async () => {
    // Arrange
    const exactBuffer = Buffer.from("exact bytes");
    buildChain({ photo: { data: exactBuffer, contentType: "image/jpeg" } });

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(exactBuffer);
  });
});

// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Filters by category when checked array is non-empty
// Test Coverage 2: Filters by price range when radio array is non-empty
// Test Coverage 3: Applies both filters together
// Test Coverage 4: No filters applied when both arrays are empty
// Test Coverage 5: Does not include price filter when radio is empty
// Test Coverage 6: DB error returns 400 with error object
// Test Coverage 7: Response shape (success, products)
describe("productFiltersController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: { checked: [], radio: [] } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: returns 200 on success
  it("should return 200 on success", async () => {
    // Arrange
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Test 2: full response shape on success
  it("should return correct response body with success and products", async () => {
    // Arrange
    const mockProducts = [{ _id: "p1", name: "Widget" }];
    productModel.find = jest.fn().mockResolvedValue(mockProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts,
    });
  });

  // Test 3: success is true in response
  it("should include success: true in the response", async () => {
    // Arrange
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(true);
  });

  // Test 4: returns empty products array when none match
  it("should return empty products array when no products match", async () => {
    // Arrange
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.products).toEqual([]);
  });

  // Test 5: applies category filter when checked is non-empty
  it("should filter by category when checked array is non-empty", async () => {
    // Arrange
    req.body.checked = ["cat-1", "cat-2"];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ category: ["cat-1", "cat-2"] })
    );
  });

  // Test 6: applies a single-category filter correctly
  it("should pass a single-element checked array as the category filter", async () => {
    // Arrange
    req.body.checked = ["cat-only"];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ category: ["cat-only"] })
    );
  });

  // Test 7: applies price range filter when radio is non-empty
  it("should filter by price $gte/$lte when radio array is non-empty", async () => {
    // Arrange
    req.body.radio = [100, 500];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ price: { $gte: 100, $lte: 500 } })
    );
  });

  // Test 8: applies both category and price filters simultaneously
  it("should apply both category and price filters simultaneously", async () => {
    // Arrange
    req.body.checked = ["cat-1"];
    req.body.radio = [50, 200];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: ["cat-1"],
      price: { $gte: 50, $lte: 200 },
    });
  });

  // Test 9: passes empty args when both checked and radio are empty
  it("should call find with empty object when both checked and radio are empty", async () => {
    // Arrange
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
  });

  // Test 10: does not include category key when checked is empty
  it("should not include category in query args when checked is empty", async () => {
    // Arrange
    req.body.radio = [10, 100];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    const calledWith = productModel.find.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("category");
  });

  // Test 11: does not include price key when radio is empty
  it("should not include price in query args when radio is empty", async () => {
    // Arrange
    req.body.checked = ["cat-1"];
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    const calledWith = productModel.find.mock.calls[0][0];
    expect(calledWith).not.toHaveProperty("price");
  });

  // Test 12: find is called exactly once
  it("should call find exactly once", async () => {
    // Arrange
    productModel.find = jest.fn().mockResolvedValue([]);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledTimes(1);
  });

  // Test 13: products is the exact array resolved by DB
  it("should return the exact products array resolved by the DB", async () => {
    // Arrange
    const mockProducts = [{ _id: "p1" }, { _id: "p2" }];
    productModel.find = jest.fn().mockResolvedValue(mockProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.products).toBe(mockProducts);
  });

  // Test 14: returns 400 when DB throws
  it("should return 400 when the DB query throws", async () => {
    // Arrange
    productModel.find = jest.fn().mockRejectedValue(new Error("err"));

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Test 15: error response has correct message
  it("should include correct error message in the 400 response", async () => {
    // Arrange
    productModel.find = jest.fn().mockRejectedValue(new Error("err"));

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error WHile Filtering Products" })
    );
  });

  // Test 16: error response has success: false
  it("should include success: false in the 400 error response", async () => {
    // Arrange
    productModel.find = jest.fn().mockRejectedValue(new Error("err"));

    // Act
    await productFiltersController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(false);
  });

  // Test 17: error response contains error object
  it("should include the error object in the 400 error response", async () => {
    // Arrange
    const dbError = new Error("crash");
    productModel.find = jest.fn().mockRejectedValue(dbError);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: dbError })
    );
  });

  // Test 18: full 400 response shape is correct
  it("should return exact 400 response shape when DB throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    productModel.find = jest.fn().mockRejectedValue(dbError);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error WHile Filtering Products",
      error: dbError,
    });
  });
});

// Chi Thanh, A0276229W
// AI generated unit tests using GitHub Copilot (Claude Sonnet 4.6) Agent Mode
// Test Coverage 1: Returns total product count on success
// Test Coverage 2: Uses find({}).estimatedDocumentCount() chain
// Test Coverage 3: DB error returns 400 with error object
// Test Coverage 4: Response shape (success, total)
// Test Coverage 5: find called exactly once with empty query
describe("productCountController", () => {
  let req, res;

  // Helper: builds the find → estimatedDocumentCount chain mock
  const buildChain = (resolvedCount) => {
    const mockCount = jest.fn().mockResolvedValue(resolvedCount);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });
    return { mockCount };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  // Test 1: returns 200 on success
  it("should return 200 on success", async () => {
    // Arrange
    buildChain(10);

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Test 2: full response shape on success
  it("should return correct response body with success and total", async () => {
    // Arrange
    buildChain(42);

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: 42,
    });
  });

  // Test 3: success is true in response
  it("should include success: true in the response", async () => {
    // Arrange
    buildChain(5);

    // Act
    await productCountController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(true);
  });

  // Test 4: total reflects exact count from DB
  it("should return the exact count resolved by estimatedDocumentCount", async () => {
    // Arrange
    buildChain(99);

    // Act
    await productCountController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.total).toBe(99);
  });

  // Test 5: calls find with empty query
  it("should call find with an empty query object", async () => {
    // Arrange
    buildChain(0);

    // Act
    await productCountController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
  });

  // Test 6: calls estimatedDocumentCount
  it("should call estimatedDocumentCount on the find result", async () => {
    // Arrange
    const { mockCount } = buildChain(0);

    // Act
    await productCountController(req, res);

    // Assert
    expect(mockCount).toHaveBeenCalled();
  });

  // Test 7: find called exactly once
  it("should call find exactly once", async () => {
    // Arrange
    buildChain(0);

    // Act
    await productCountController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledTimes(1);
  });

  // Test 8: returns 200 with total 0 when no products exist
  it("should return total 0 when count is 0", async () => {
    // Arrange
    buildChain(0);

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0 })
    );
  });

  // Test 9: returns 200 with total 1 for a single product
  it("should return total 1 when exactly one product exists", async () => {
    // Arrange
    buildChain(1);

    // Act
    await productCountController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.total).toBe(1);
  });

  // Test 10: handles large counts correctly
  it("should return the correct total for large product counts", async () => {
    // Arrange
    buildChain(100000);

    // Act
    await productCountController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.total).toBe(100000);
  });

  // Test 11: returns 400 when estimatedDocumentCount throws
  it("should return 400 when the DB query throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockCount = jest.fn().mockRejectedValue(dbError);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // Test 12: error response has correct message
  it("should include correct error message in the 400 response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockCount = jest.fn().mockRejectedValue(dbError);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error in product count" })
    );
  });

  // Test 13: error response has success: false
  it("should include success: false in the 400 error response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockCount = jest.fn().mockRejectedValue(dbError);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });

    // Act
    await productCountController(req, res);

    // Assert
    const sent = res.send.mock.calls[0][0];
    expect(sent.success).toBe(false);
  });

  // Test 14: error response contains error object
  it("should include the error object in the 400 error response", async () => {
    // Arrange
    const dbError = new Error("crash");
    const mockCount = jest.fn().mockRejectedValue(dbError);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: dbError })
    );
  });

  // Test 15: full 400 response shape is correct
  it("should return exact 400 response shape when DB throws", async () => {
    // Arrange
    const dbError = new Error("DB failure");
    const mockCount = jest.fn().mockRejectedValue(dbError);
    productModel.find = jest.fn().mockReturnValue({ estimatedDocumentCount: mockCount });

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({
      message: "Error in product count",
      error: dbError,
      success: false,
    });
  });

  // Test 16: find → estimatedDocumentCount chain called in order
  it("should complete the chain: find({}) → estimatedDocumentCount()", async () => {
    // Arrange
    const { mockCount } = buildChain(7);

    // Act
    await productCountController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(mockCount).toHaveBeenCalled();
  });


// Jian Tao - A0273320R
import { productListController, searchProductController, 
  relatedProductController, productCategoryController
 } from "./productController";
import categoryModel from "../models/categoryModel";
// import productModel from "../../models/productModel";

// Jian Tao - A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// Prompt: "How should I test the unit testing on this controller?"


// mock the productModel to control its behavior in tests
jest.mock("../models/productModel");
jest.mock("../models/categoryModel");



// Jian Tao - A0273320R
describe("productListController", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Should return products with default page = 1
  test("should return products with default page = 1", async () => {
    const mockProducts = [
      { name: "Product 1" },
      { name: "Product 2" },
    ];

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockProducts),
    });

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts,
    });
  });

  test("should apply correct pagination when page param is provided", async () => {
    req.params.page = 2;

    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: skipMock,
      limit: limitMock,
      sort: jest.fn().mockResolvedValue([]),
    });

    await productListController(req, res);

    // perPage = 6, so skip = (2 - 1) * 6 = 6
    expect(skipMock).toHaveBeenCalledWith(6);
    expect(limitMock).toHaveBeenCalledWith(6);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("should sort by createdAt descending", async () => {
    const sortMock = jest.fn().mockResolvedValue([]);

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: sortMock,
    });

    await productListController(req, res);

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test("should handle errors and return 400 status", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("Database error");
    });

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error in per page ctrl",
      error: expect.any(Error),
    });
  });


  test("should use default page when page param is undefined", async () => {
    req.params = {};

    const skipMock = jest.fn().mockReturnThis();

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: skipMock,
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    });

    await productListController(req, res);

    // default page = 1 -> skip = 0
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});



// Jian Tao - A0273320R
describe("searchProductController", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        keyword: "phone",
      },
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should search products using keyword with regex and return results", async () => {
    const mockResults = [
      { name: "iPhone", description: "Apple phone" },
      { name: "Samsung Phone", description: "Android device" },
    ];

    const selectMock = jest.fn().mockResolvedValue(mockResults);

    productModel.find.mockReturnValue({
      select: selectMock,
    });

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "phone", $options: "i" } },
        { description: { $regex: "phone", $options: "i" } },
      ],
    });

    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(res.json).toHaveBeenCalledWith(mockResults);
  });

  test("should handle different keyword values correctly", async () => {
    req.params.keyword = "laptop";

    productModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "laptop", $options: "i" } },
        { description: { $regex: "laptop", $options: "i" } },
      ],
    });

    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("should call select with -photo to exclude photo field", async () => {
    const selectMock = jest.fn().mockResolvedValue([]);

    productModel.find.mockReturnValue({
      select: selectMock,
    });

    await searchProductController(req, res);

    expect(selectMock).toHaveBeenCalledWith("-photo");
  });

  test("should handle errors and return 400 status", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("Database error");
    });

    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error In Search Product API",
      error: expect.any(Error),
    });
  });
});

// Jian Tao - A0273320R

describe("relatedProductController", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        pid: "product123",
        cid: "category456",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return related products excluding current product", async () => {
    const mockProducts = [
      { name: "Product A", category: "category456" },
      { name: "Product B", category: "category456" },
    ];

    const populateMock = jest.fn().mockResolvedValue(mockProducts);
    const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
    const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

    productModel.find.mockReturnValue({
      select: selectMock,
    });

    await relatedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: "category456",
      _id: { $ne: "product123" },
    });

    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: mockProducts,
    });
  });

  test("should limit the results to 3 products", async () => {
    const limitMock = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: limitMock,
      }),
    });

    await relatedProductController(req, res);

    expect(limitMock).toHaveBeenCalledWith(3);
  });

  test("should populate category field", async () => {
    const populateMock = jest.fn().mockResolvedValue([]);

    productModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: populateMock,
        }),
      }),
    });

    await relatedProductController(req, res);

    expect(populateMock).toHaveBeenCalledWith("category");
  });

  test("should return 400 if pid or cid is missing (validation branch)", async () => {
    req.params = { pid: "", cid: "" };

    await relatedProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product ID and Category ID are required",
    });
  });

  test("should handle database errors and return 400 status", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("Database error");
    });

    await relatedProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error while getting related product",
      error: expect.any(Error),
    });
  });
});


// Jian Tao - A0273320R

describe("productCategoryController", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        slug: "electronics",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should fetch category by slug and return products in that category", async () => {
    const mockCategory = { _id: "cat123", slug: "electronics" };
    const mockProducts = [
      { name: "Laptop", category: mockCategory },
      { name: "Phone", category: mockCategory },
    ];

    // Mock categoryModel.findOne()
    categoryModel.findOne.mockResolvedValue(mockCategory);

    // Mock productModel.find().populate()
    const populateMock = jest.fn().mockResolvedValue(mockProducts);
    productModel.find.mockReturnValue({
      populate: populateMock,
    });

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: "electronics",
    });

    expect(productModel.find).toHaveBeenCalledWith({
      category: mockCategory,
    });

    expect(populateMock).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: mockProducts,
    });
  });

  test("should return empty products if category exists but no products found", async () => {
    const mockCategory = { _id: "cat123", slug: "electronics" };

    categoryModel.findOne.mockResolvedValue(mockCategory);

    productModel.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    await productCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: [],
    });
  });

  test("should handle case when category is null (slug not found)", async () => {
    categoryModel.findOne.mockResolvedValue(null);

    productModel.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    await productCategoryController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: null,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: null,
      products: [],
    });
  });

  test("should handle errors and return 400 status", async () => {
    categoryModel.findOne.mockRejectedValue(new Error("Database error"));

    await productCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error While Getting products",
    });
  });
});
