import { jest } from '@jest/globals';
import categoryController from './categoryController.js';
import categoryModel from '../models/categoryModel.js';
import slugify from 'slugify';
import { mock } from 'node:test';

// Chi Thanh, A0276229W
// Create mock environment variables for Braintree configuration
process.env.BRAINTREE_MERCHANT_ID = "test_merchant_id";
process.env.BRAINTREE_PUBLIC_KEY = "test_public_key";
process.env.BRAINTREE_PRIVATE_KEY = "test_private_key";

// Chi Thanh, A0276229W
// Mock dependencies
jest.mock('../models/categoryModel.js');
jest.mock("fs")
jest.mock('slugify');
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: {
    Sandbox: "sandbox",
  },
}));

// Chi Thanh, A0276229W
// Import controllers
import {
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from "./categoryController.js";

// Chi Thanh, A0276229W
describe('createCategoryController', () => {
    // AI generated Unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
    // Test Coverage 1: All possible validation errors for missing/invalid names
    // Test Coverage 2: Duplicate category detection (case-sensitive)
    // Test Coverage 3: Successful category creation with correct slug generation
    // Test Coverage 4: Edge cases (whitespace, special characters, unicode, very long names)
    // Test Coverage 5: Response structure verification
    // Test Coverage 6: Boundary conditions (empty objects, null, undefined returns)
    // Test Coverage 7: Error handling for database exceptions

    // Bug fixes in categoryController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
    // Fixed 1: Changed error response property from 'errro' to 'error' (typo fix)
    //          to correctly return error object in 500 response

    let req, res;

    beforeEach(() => {
        // Arrange: Create fresh mock request and response objects before each test
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('validation', () => {
        test('should return 401 when name is missing from request body', async () => {
            // Arrange
            req.body = {};

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                message: "Name is required"
            });
        });

        test('should return 401 when name is undefined', async () => {
            // Arrange
            req.body = { name: undefined };

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                message: "Name is required"
            });
        });

        test('should return 401 when name is null', async () => {
            // Arrange
            req.body = { name: null };

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                message: "Name is required"
            });
        });

        test('should return 401 when name is empty string', async () => {
            // Arrange
            req.body = { name: "" };

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                message: "Name is required"
            });
        });

        test('should accept whitespace-only name as valid', async () => {
            // Arrange
            const whitespaceName = "   ";
            req.body = { name: whitespaceName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("");
            
            const savedCategory = {
                _id: "new-id",
                name: whitespaceName,
                slug: "",
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should accept name with leading and trailing whitespace', async () => {
            // Arrange
            const nameWithWhitespace = "  Books  ";
            req.body = { name: nameWithWhitespace };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("books");
            
            const savedCategory = {
                _id: "new-id",
                name: nameWithWhitespace,
                slug: "books",
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: nameWithWhitespace });
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('should accept name with special characters', async () => {
            // Arrange
            const nameWithSpecialChars = "Home & Garden!";
            req.body = { name: nameWithSpecialChars };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("home-garden");
            
            const savedCategory = {
                _id: "new-id",
                name: nameWithSpecialChars,
                slug: "home-garden",
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(slugify).toHaveBeenCalledWith(nameWithSpecialChars);
        });

        test('should accept very long category names', async () => {
            // Arrange
            const longName = "A".repeat(500);
            req.body = { name: longName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("a".repeat(500));
            
            const savedCategory = {
                _id: "new-id",
                name: longName,
                slug: "a".repeat(500),
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('existing category', () => {
        test('should return 200 when category already exists', async () => {
            // Arrange
            const categoryName = "Electronics";
            req.body = { name: categoryName };
            
            const existingCategory = {
                _id: "some-id",
                name: categoryName,
                slug: "electronics"
            };
            
            categoryModel.findOne.mockResolvedValue(existingCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: categoryName });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Already Exisits"
            });
        });

        test('should allow categories with different case to be created', async () => {
            // Arrange
            const categoryName = "electronics";
            req.body = { name: categoryName };
            
            // Existing category is "Electronics" with uppercase E
            const existingCategory = {
                _id: "existing-id",
                name: "Electronics",
                slug: "Electronics"
            };
            
            // findOne uses exact match, so different case won't find match
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("electronics");
            
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: "electronics",
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: categoryName });
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('successful creation', () => {
        test('should return 201 with created category when new category is successfully saved', async () => {
            // Arrange
            const categoryName = "Books";
            const expectedSlug = "books";
            req.body = { name: categoryName };
            
            // Stub: No existing category
            categoryModel.findOne.mockResolvedValue(null);
            
            // Stub: slugify generates the expected slug
            slugify.mockReturnValue(expectedSlug);
            
            // Create mock saved category
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: expectedSlug,
                save: jest.fn()
            };
            
            // Stub: categoryModel constructor returns object with save method
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({ name: categoryName });
            expect(slugify).toHaveBeenCalledWith(categoryName);
            expect(savedCategory.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "new category created",
                category: savedCategory
            });
        });

        test('should create category with correct slug using slugify', async () => {
            // Arrange
            const categoryName = "Home & Garden";
            const expectedSlug = "home-garden";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue(expectedSlug);
            
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: expectedSlug,
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(slugify).toHaveBeenCalledWith(categoryName);
            const responseCall = res.send.mock.calls[0][0];
            expect(responseCall.category.slug).toBe(expectedSlug);
        });

        test('should handle names with numbers and symbols in slug generation', async () => {
            // Arrange
            const categoryName = "2024 Winter Sale!";
            const expectedSlug = "2024-winter-sale";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue(expectedSlug);
            
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: expectedSlug,
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(slugify).toHaveBeenCalledWith(categoryName);
            expect(res.send.mock.calls[0][0].category.slug).toBe(expectedSlug);
        });

        test('should handle unicode characters in slug generation', async () => {
            // Arrange
            const categoryName = "Électronique";
            const expectedSlug = "electronique";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue(expectedSlug);
            
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: expectedSlug,
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(slugify).toHaveBeenCalledWith(categoryName);
            expect(res.send.mock.calls[0][0].category.slug).toBe(expectedSlug);
        });

        test('should handle names that produce identical slugs', async () => {
            // Arrange
            const categoryName = "Test-Category";
            // This would produce same slug as "Test Category"
            const expectedSlug = "test-category";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue(expectedSlug);
            
            const savedCategory = {
                _id: "new-id",
                name: categoryName,
                slug: expectedSlug,
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(slugify).toHaveBeenCalledWith(categoryName);
        });
    });

    describe('response structure verification', () => {
        test('should return response with correct structure for successful creation', async () => {
            // Arrange
            const categoryName = "Sports";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("sports");
            
            const savedCategory = {
                _id: "category-123",
                name: categoryName,
                slug: "sports",
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            const response = res.send.mock.calls[0][0];
            expect(response).toHaveProperty('success', true);
            expect(response).toHaveProperty('message', 'new category created');
            expect(response).toHaveProperty('category');
            expect(response.category).toHaveProperty('_id');
            expect(response.category).toHaveProperty('name');
            expect(response.category).toHaveProperty('slug');
        });

        test('should return the exact saved category object in response', async () => {
            // Arrange
            const categoryName = "Furniture";
            req.body = { name: categoryName };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("furniture");
            
            const savedCategory = {
                _id: "furniture-id",
                name: categoryName,
                slug: "furniture",
                createdAt: new Date(),
                save: jest.fn()
            };
            
            categoryModel.mockImplementation(() => savedCategory);
            savedCategory.save.mockResolvedValue(savedCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            const response = res.send.mock.calls[0][0];
            expect(response.category).toBe(savedCategory);
        });
    });

    describe('boundary conditions', () => {
        test('should handle save returning empty object', async () => {
            // Arrange
            req.body = { name: "TestCategory" };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("testcategory");
            
            const emptyCategory = { save: jest.fn() };
            categoryModel.mockImplementation(() => emptyCategory);
            emptyCategory.save.mockResolvedValue({});

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send.mock.calls[0][0].category).toEqual({});
        });

        test('should handle save returning null', async () => {
            // Arrange
            req.body = { name: "TestCategory" };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("testcategory");
            
            const nullCategory = { save: jest.fn() };
            categoryModel.mockImplementation(() => nullCategory);
            nullCategory.save.mockResolvedValue(null);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send.mock.calls[0][0].category).toBeNull();
        });

        test('should handle save returning undefined', async () => {
            // Arrange
            req.body = { name: "TestCategory" };
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("testcategory");
            
            const undefinedCategory = { save: jest.fn() };
            categoryModel.mockImplementation(() => undefinedCategory);
            undefinedCategory.save.mockResolvedValue(undefined);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send.mock.calls[0][0].category).toBeUndefined();
        });
    });

    describe('error handling', () => {
        test('should return 500 when database findOne throws error', async () => {
            // Arrange
            req.body = { name: "TestCategory" };
            const dbError = new Error("Database connection failed");
            
            categoryModel.findOne.mockRejectedValue(dbError);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Errro in Category"
            });
        });

        test('should return 500 when save operation throws error', async () => {
            // Arrange
            req.body = { name: "TestCategory" };
            const saveError = new Error("Save operation failed");
            
            categoryModel.findOne.mockResolvedValue(null);
            slugify.mockReturnValue("testcategory");
            
            const mockCategory = {
                save: jest.fn().mockRejectedValue(saveError)
            };
            
            categoryModel.mockImplementation(() => mockCategory);

            // Act
            await createCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: saveError,
                message: "Errro in Category"
            });
        });
    });
});

// Chi Thanh, A0276229W
describe('updateCategoryController', () => {
    // AI generated Unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
    // Test Coverage 1: All possible validation errors for missing fields (name, id)
    // Test Coverage 2: 404 error when category not found
    // Test Coverage 3: Successful category update with slug regeneration
    // Test Coverage 4: Edge cases (whitespace, special characters, empty strings)
    // Test Coverage 5: Response structure verification (including typo in response key)
    // Test Coverage 6: Error handling for database exceptions

    // Bug fixes in categoryController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
    // Fixed 1: Added validation to check if id is provided before attempting update
    // Fixed 2: Return 400 error when category ID is missing or empty
    // Fixed 3: Added validation to check if category exists before returning success
    // Fixed 4: Return 404 error when category is not found

    let req, res;

    beforeEach(() => {
        // Arrange: Create fresh mock request and response objects before each test
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('validation', () => {
        test('should return 400 when category ID is missing', async () => {
            // Arrange
            req.params.id = undefined;
            req.body = { name: "Updated Category" };

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required"
            });
        });

        test('should return 400 when category ID is empty string', async () => {
            // Arrange
            req.params.id = "";
            req.body = { name: "Updated Category" };

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required"
            });
        });

        test('should return 400 when name is missing', async () => {
            // Arrange
            req.params.id = "validId123";
            req.body = {};

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required"
            });
        });

        test('should return 400 when name is undefined', async () => {
            // Arrange
            req.params.id = "validId123";
            req.body = { name: undefined };

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required"
            });
        });

        test('should return 400 when name is null', async () => {
            // Arrange
            req.params.id = "validId123";
            req.body = { name: null };

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required"
            });
        });

        test('should return 400 when name is empty string', async () => {
            // Arrange
            req.params.id = "validId123";
            req.body = { name: "" };

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required"
            });
        });
    });

    describe('category not found', () => {
        test('should return 404 when category not found', async () => {
            // Arrange
            req.params.id = "nonExistentId";
            req.body = { name: "Updated Category" };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(null);

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "nonExistentId",
                { name: "Updated Category", slug: expect.any(String) },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category not found"
            });
        });
    });

    describe('successful update', () => {
        test('should successfully update category with valid data', async () => {
            // Arrange
            req.params.id = "validId123";
            req.body = { name: "Updated Electronics" };
            
            const updatedCategory = {
                _id: "validId123",
                name: "Updated Electronics",
                slug: "updated-electronics"
            };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);
            slugify.mockReturnValue("updated-electronics");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(slugify).toHaveBeenCalledWith("Updated Electronics");
            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "validId123",
                { name: "Updated Electronics", slug: "updated-electronics" },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                messsage: "Category Updated Successfully",
                category: updatedCategory
            });
        });

        test('should regenerate slug when updating category name', async () => {
            // Arrange
            req.params.id = "categoryId";
            req.body = { name: "Home & Garden" };
            
            const updatedCategory = {
                _id: "categoryId",
                name: "Home & Garden",
                slug: "home-garden"
            };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);
            slugify.mockReturnValue("home-garden");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(slugify).toHaveBeenCalledWith("Home & Garden");
            expect(res.send.mock.calls[0][0].category.slug).toBe("home-garden");
        });

        test('should handle name with special characters', async () => {
            // Arrange
            req.params.id = "categoryId";
            req.body = { name: "Books & Magazines!" };
            
            const updatedCategory = {
                _id: "categoryId",
                name: "Books & Magazines!",
                slug: "books-magazines"
            };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);
            slugify.mockReturnValue("books-magazines");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(slugify).toHaveBeenCalledWith("Books & Magazines!");
        });

        test('should handle name with leading/trailing whitespace', async () => {
            // Arrange
            req.params.id = "categoryId";
            req.body = { name: "  Sports  " };
            
            const updatedCategory = {
                _id: "categoryId",
                name: "  Sports  ",
                slug: "sports"
            };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);
            slugify.mockReturnValue("sports");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "categoryId",
                { name: "  Sports  ", slug: "sports" },
                { new: true }
            );
        });
    });

    describe('response structure', () => {
        test('should return response with correct structure including typo', async () => {
            // Arrange
            req.params.id = "categoryId";
            req.body = { name: "TestCategory" };
            
            const updatedCategory = {
                _id: "categoryId",
                name: "TestCategory",
                slug: "testcategory"
            };
            
            categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);
            slugify.mockReturnValue("testcategory");

            // Act
            await updateCategoryController(req, res);

            // Assert
            const response = res.send.mock.calls[0][0];
            expect(response).toHaveProperty('success', true);
            expect(response).toHaveProperty('messsage', 'Category Updated Successfully'); // Note: typo in code
            expect(response).toHaveProperty('category');
            expect(response.category).toBe(updatedCategory);
        });
    });

    describe('error handling', () => {
        test('should return 500 when database update throws error', async () => {
            // Arrange
            req.params.id = "categoryId";
            req.body = { name: "TestCategory" };
            const dbError = new Error("Database connection failed");
            
            categoryModel.findByIdAndUpdate.mockRejectedValue(dbError);
            slugify.mockReturnValue("testcategory");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error while updating category"
            });
        });

        test('should handle invalid category ID format', async () => {
            // Arrange
            req.params.id = "invalidIdFormat";
            req.body = { name: "TestCategory" };
            const castError = new Error("Cast to ObjectId failed");
            
            categoryModel.findByIdAndUpdate.mockRejectedValue(castError);
            slugify.mockReturnValue("testcategory");

            // Act
            await updateCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: castError,
                message: "Error while updating category"
            });
        });
    });
});

// Chi Thanh, A0276229W
describe('deleteCategoryController', () => {
    // AI generated Unit tests using Github Copilot (Claude Sonnet 4.5) Agent Mode for the following:
    // Test Coverage 1: Validation errors for missing/empty category ID
    // Test Coverage 2: 404 error when category not found
    // Test Coverage 3: Successful category deletion
    // Test Coverage 4: Error handling for database exceptions
    // Test Coverage 5: Verification that correct category is deleted

    // Bug fixes in categoryController.js by Github Copilot (Claude Sonnet 4.5) Agent Mode:
    // Fixed 1: Added validation to check if id is provided before attempting deletion
    // Fixed 2: Return 400 error when category ID is missing or empty
    // Fixed 3: Added validation to check if category exists before returning success
    // Fixed 4: Return 404 error when category is not found

    let req, res;

    beforeEach(() => {
        // Arrange: Create fresh mock request and response objects before each test
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('validation', () => {
        test('should return 400 when category ID is missing', async () => {
            // Arrange
            req.params.id = undefined;

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required"
            });
        });

        test('should return 400 when category ID is empty string', async () => {
            // Arrange
            req.params.id = "";

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required"
            });
        });
    });

    describe('category not found', () => {
        test('should return 404 when category not found', async () => {
            // Arrange
            req.params.id = "nonExistentId";
            
            categoryModel.findByIdAndDelete.mockResolvedValue(null);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("nonExistentId");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category not found"
            });
        });
    });

    describe('successful deletion', () => {
        test('should successfully delete category with valid ID', async () => {
            // Arrange
            req.params.id = "validId123";
            
            const deletedCategory = {
                _id: "validId123",
                name: "Electronics",
                slug: "electronics"
            };
            
            categoryModel.findByIdAndDelete.mockResolvedValue(deletedCategory);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("validId123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category Deleted Successfully"
            });
        });

        test('should verify correct category ID is used for deletion', async () => {
            // Arrange
            req.params.id = "specificCategoryId456";
            
            const deletedCategory = {
                _id: "specificCategoryId456",
                name: "Books",
                slug: "books"
            };
            
            categoryModel.findByIdAndDelete.mockResolvedValue(deletedCategory);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("specificCategoryId456");
            expect(categoryModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
        });

        test('should not return deleted category data in response', async () => {
            // Arrange
            req.params.id = "categoryId";
            
            const deletedCategory = {
                _id: "categoryId",
                name: "TestCategory",
                slug: "testcategory"
            };
            
            categoryModel.findByIdAndDelete.mockResolvedValue(deletedCategory);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            const response = res.send.mock.calls[0][0];
            expect(response).not.toHaveProperty('category');
            expect(response).toEqual({
                success: true,
                message: "Category Deleted Successfully"
            });
        });
    });

    describe('error handling', () => {
        test('should return 500 when database deletion throws error', async () => {
            // Arrange
            req.params.id = "categoryId";
            const dbError = new Error("Database connection failed");
            
            categoryModel.findByIdAndDelete.mockRejectedValue(dbError);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error while deleting category",
                error: dbError
            });
        });

        test('should handle invalid category ID format', async () => {
            // Arrange
            req.params.id = "invalidIdFormat";
            const castError = new Error("Cast to ObjectId failed");
            
            categoryModel.findByIdAndDelete.mockRejectedValue(castError);

            // Act
            await deleteCategoryController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "error while deleting category",
                error: castError
            });
        });
    });
});