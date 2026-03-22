// Note to the grader: The product integration is tested by multiple testers, with tests split by methods.
// The tests are consolidated in a single file for better organization and to avoid circular dependencies with mocks.
// Each describe block corresponds to a specific controller method.
// Refer to the comments at the top for details on who handles what.

import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import os from "os";
import * as dbHelper from "./dbHelper.js";

import {
  createProductController,
  getProductController,
  getSingleProductController,
  productCountController,
  productPhotoController,
  updateProductController,
  deleteProductController,
  productFiltersController,
} from "../../controllers/productController.js";
import productRoutes from "../../routes/productRoutes.js";
import app from "../../app.js";
import userModel from "../../models/userModel.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import {
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
} from "../../controllers/productController.js";

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
// Suppress console.log noise (e.g. JsonWebTokenError logged by authMiddleware on intentionally bad tokens)
let consoleSpy;
beforeAll(() => { consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {}); });
afterAll(() => { consoleSpy.mockRestore(); });

// ─────────────────────────────────────────────────────────────────────────────
// createProductController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: refeering to how we are doing right now, how would u suggest we add our integraion test how we arrange or folder it?
//
// Response: Suggested the current file structure we are using
//
// Prompt 2 (plan mode): I want implement integration test for createProductController. 
//    it should be in the way u suggest me to folder my file. 
//    It should use a bottom up approach. 
//    first inegrate the controller with the productModel 
//    however, it should not require db connection. next , 
//    integrate it with route with the respective middleware, 
//    then integrate it with the overall server.js. 
//    what do u think of my approach and plan how u will do it. 
//    if u think sth wrong with my plan say and suggest change. be neutral.
//
// Response:
// Suggested using mongodb-memory-server for the database layer in integration tests, 
//    which allows testing real Mongoose operations without needing a live MongoDB instance. 
// Found a bug "
//    One thing to flag: requireSignIn currently calls next() silently on JWT errors (no response sent). 
//    At Level 2/3 you may notice requests hang rather than getting a 401 when unauthenticated. 
//    You may want to address this as a bug fix alongside the tests."
//
// Prompt 3: proceed with the entire plan, fix the bug , updating its relevant unit test with it
//
// Response: Initial Implementation with many many files created (1 for each levels which I don't like)
//
// Prompt 4: can u make it follow this structure
//    tests/
//    integration/
//    auth.integration.test.js ← backend: routes + controller + DB
//    category.integration.test.js
//    product.integration.test.js
//    i.e they should all be in one file however, seprate them with describe for the level s to make it clear
//
// Response: Refactored to have all levels in one file, with nested describes for each level.
//
// Prompt 5: Ok there will be more productIntegration test in future such as updateProdscut deleteProduct etc 
//    so can u wrap them in a descirbe for createProduct please, 
//    and move the comments on 1st 17 lines into it as weell it is well written. 
//    then run test to ensure correct again .run backend test to ensure ur recent change in authMiddleware test is correct, 
//    if other non related test fail nvm but if it is caused by ur change in auth middleware fix it
describe("createProductController integration tests", () => {
  /**
   * Product Integration Tests
   *
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Product router mounted on a minimal Express app.
   *    Real JWT signing/verification; formidable parses multipart fields.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/product/... endpoint.
   */

  // ─── shared constants ──────────────────────────────────────────────────────

  const JWT_SECRET = "test-integration-secret";
  const ENDPOINT = "/api/v1/product/create-product";
  const validCategoryId = new mongoose.Types.ObjectId().toString();

  // Base valid fields used across levels
  const validFields = {
    name: "Test Product",
    description: "A test product description",
    price: "29.99",
    category: validCategoryId,
    quantity: "10",
    shipping: "true",
  };

  // ─── minimal Level-2 app (product router only) ───────────────────────────────

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  // ─── helpers ─────────────────────────────────────────────────────────────────

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  // ─── shared suite-level setup ────────────────────────────────────────────────

  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    // Seed admin — needed by Level 2 and Level 3 auth middleware
    const adminUser = await userModel.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "hashedpassword",
      phone: 1234567890,
      address: "123 Test St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    // Keep the admin user between tests; only wipe products
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    describe("Validation failures — nothing written to DB", () => {
      it("should return 400 when req.fields is missing", async () => {
        const req = {};
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Please provide all fields" });
        expect(await productModel.countDocuments()).toBe(0);
      });

      it.each([
        ["name",        { ...validFields, name: "" },        "Name is Required"],
        ["description", { ...validFields, description: "" }, "Description is Required"],
        ["price",       { ...validFields, price: "" },       "Price is Required"],
        ["category",    { ...validFields, category: "" },    "Category is Required"],
        ["quantity",    { ...validFields, quantity: "" },    "Quantity is Required"],
      ])("should return 400 when %s is missing", async (_field, fields, errorMsg) => {
        const req = { fields, files: {} };
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: errorMsg });
        expect(await productModel.countDocuments()).toBe(0);
      });

      it("should return 400 when photo exceeds 1,000,000 bytes", async () => {
        const req = {
          fields: { ...validFields },
          files: { photo: { size: 1000001, path: "", type: "image/jpeg" } },
        };
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          error: "Photo size must be between 1 and 1,000,000 bytes",
        });
        expect(await productModel.countDocuments()).toBe(0);
      });

      it("should return 400 when photo size is 0 bytes", async () => {
        const req = {
          fields: { ...validFields },
          files: { photo: { size: 0, path: "", type: "image/jpeg" } },
        };
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          error: "Photo size must be between 1 and 1,000,000 bytes",
        });
        expect(await productModel.countDocuments()).toBe(0);
      });
    });

    describe("Successful creation — product persisted in DB", () => {
      it("should create a product (no photo) and persist it in the DB", async () => {
        const req = { fields: { ...validFields }, files: {} };
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, message: "Product Created Successfully" })
        );

        const saved = await productModel.findOne({ name: "Test Product" });
        expect(saved).not.toBeNull();
        expect(saved.description).toBe("A test product description");
        expect(saved.price).toBe(29.99);
        expect(saved.slug).toBe("Test-Product");
      });

      it("should create a product with a photo and persist photo data in the DB", async () => {
        const tempPath = join(os.tmpdir(), "model-test-photo.jpg");
        const photoBuffer = Buffer.alloc(512, 0xff);
        writeFileSync(tempPath, photoBuffer);

        const req = {
          fields: { ...validFields, name: "Photo Product" },
          files: { photo: { size: 512, path: tempPath, type: "image/jpeg" } },
        };
        const res = makeRes();

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        const saved = await productModel.findOne({ name: "Photo Product" });
        expect(saved).not.toBeNull();
        expect(saved.photo.contentType).toBe("image/jpeg");
        expect(Buffer.from(saved.photo.data).equals(photoBuffer)).toBe(true);

        unlinkSync(tempPath);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", "bad.token.here")
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "user@routetest.com",
          password: "hashedpassword",
          phone: 9876543210,
          address: "456 Test Ave",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", userToken)
          .field("name", "Test");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Field validation (authenticated admin)", () => {
      it.each([
        ["name",        {},                                                             "Name is Required"],
        ["description", { name: "P" },                                                 "Description is Required"],
        ["price",       { name: "P", description: "D" },                              "Price is Required"],
        ["category",    { name: "P", description: "D", price: "10" },                 "Category is Required"],
        ["quantity",    { name: "P", description: "D", price: "10", category: validCategoryId }, "Quantity is Required"],
      ])("should return 400 when %s is missing", async (_field, presentFields, errorMsg) => {
        const req = request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken);

        for (const [key, val] of Object.entries(presentFields)) {
          req.field(key, val);
        }

        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(errorMsg);
      });
    });

    describe("Successful creation (authenticated admin)", () => {
      it("should create a product and return 201 when all fields are valid", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .field("name", "Route Test Product")
          .field("description", "Route level integration test product")
          .field("price", "49.99")
          .field("category", validCategoryId)
          .field("quantity", "20")
          .field("shipping", "true");

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Product Created Successfully");
        expect(res.body.products.name).toBe("Route Test Product");

        expect(await productModel.findOne({ name: "Route Test Product" })).not.toBeNull();
      });

      it("should create a product with an attached photo and return 201", async () => {
        const tempPath = join(os.tmpdir(), "route-test-photo.jpg");
        writeFileSync(tempPath, Buffer.alloc(256, 0xab));

        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .field("name", "Route Photo Product")
          .field("description", "Has a photo")
          .field("price", "15")
          .field("category", validCategoryId)
          .field("quantity", "3")
          .attach("photo", tempPath);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        unlinkSync(tempPath);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const res = await request(app).post(ENDPOINT).field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 with a tampered JWT", async () => {
        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", "tampered.jwt.value")
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "normal@servertest.com",
          password: "hashedpassword",
          phone: 4445556666,
          address: "1 Normal St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", normalToken)
          .field("name", "Test");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Validation", () => {
      it.each([
        ["name",        {},                                                             "Name is Required"],
        ["description", { name: "P" },                                                 "Description is Required"],
        ["price",       { name: "P", description: "D" },                              "Price is Required"],
        ["category",    { name: "P", description: "D", price: "10" },                 "Category is Required"],
        ["quantity",    { name: "P", description: "D", price: "10", category: validCategoryId }, "Quantity is Required"],
      ])("should return 400 when %s is missing", async (_field, presentFields, errorMsg) => {
        const req = request(app).post(ENDPOINT).set("Authorization", adminToken);

        for (const [key, val] of Object.entries(presentFields)) {
          req.field(key, val);
        }

        const res = await req;
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(errorMsg);
      });
    });

    describe("Successful end-to-end creation", () => {
      it("should create a product without photo and persist it in the DB", async () => {
        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .field("name", "Server Test Product")
          .field("description", "Full stack test")
          .field("price", "99.99")
          .field("category", validCategoryId)
          .field("quantity", "50")
          .field("shipping", "false");

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ success: true, message: "Product Created Successfully" });
        expect(res.body.products.name).toBe("Server Test Product");
        expect(res.body.products.slug).toBe("Server-Test-Product");

        const saved = await productModel.findOne({ name: "Server Test Product" });
        expect(saved).not.toBeNull();
        expect(saved.price).toBe(99.99);
      });

      it("should create a product with a photo and persist photo data in the DB", async () => {
        const tempPath = join(os.tmpdir(), "server-test-photo.jpg");
        writeFileSync(tempPath, Buffer.alloc(1024, 0xff));

        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .field("name", "Server Photo Product")
          .field("description", "Has a photo")
          .field("price", "25")
          .field("category", validCategoryId)
          .field("quantity", "10")
          .attach("photo", tempPath);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const saved = await productModel.findOne({ name: "Server Photo Product" });
        expect(saved).not.toBeNull();
        expect(saved.photo.contentType).toBe("image/jpeg");

        unlinkSync(tempPath);
      });

      it("should generate the correct slug from the product name", async () => {
        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .field("name", "Hello World Product")
          .field("description", "slug test")
          .field("price", "1")
          .field("category", validCategoryId)
          .field("quantity", "1");

        expect(res.status).toBe(201);
        expect(res.body.products.slug).toBe("Hello-World-Product");
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getProductController
// ─────────────────────────────────────────────────────────────────────────────

// Chi Thanh, A0276229W.
// AI generated tests using GitHub Copilot (GPT-5.3 Codex) Agent Mode.
describe("getProductController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route
   *    Same DB. Product router mounted on a minimal Express app.
   *    Verifies route output at /get-product.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests complete stack at /api/v1/product/get-product.
   */

  const ENDPOINT = "/api/v1/product/get-product";

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedCategory = async (name) => {
    const category = await categoryModel.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });
    return category;
  };

  const seedProduct = async ({
    name,
    category,
    price = 10,
    quantity = 5,
    description = "get-product-test",
    withPhoto = false,
  }) => {
    const product = {
      name,
      slug: name.replace(/\s+/g, "-"),
      description,
      price,
      category,
      quantity,
    };

    if (withPhoto) {
      product.photo = {
        data: Buffer.from([1, 2, 3, 4]),
        contentType: "image/jpeg",
      };
    }

    return productModel.create(product);
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should retrieve all products with populated category and photo excluded", async () => {
      const category = await seedCategory("Electronics");
      await seedProduct({ name: "Camera", category: category._id, withPhoto: true });

      const req = {};
      const res = makeRes();

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.counTotal).toBe(1);
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0].category).toMatchObject({ name: "Electronics" });
      expect(payload.products[0].photo?.data).toBeUndefined();
    });

    it("should enforce pagination limit(12) and sort by createdAt descending", async () => {
      const category = await seedCategory("Books");

      for (let i = 1; i <= 13; i++) {
        await seedProduct({
          name: `Item-${i}`,
          category: category._id,
          price: i,
        });
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      const req = {};
      const res = makeRes();

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.products).toHaveLength(12);
      expect(payload.counTotal).toBe(12);
      expect(payload.products[0].name).toBe("Item-13");
      expect(payload.products[payload.products.length - 1].name).toBe("Item-2");
    });

    it("should return 400 with error message when productModel.find throws", async () => {
      const req = {};
      const res = makeRes();
      const dbError = new Error("forced find failure");
      const findSpy = jest.spyOn(productModel, "find").mockImplementation(() => {
        throw dbError;
      });

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in getting products",
          error: "forced find failure",
        })
      );

      findSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Controller Integration (minimal Express)", () => {
    it("should return correct response structure from /get-product", async () => {
      const category = await seedCategory("Gadgets");
      await seedProduct({ name: "Speaker", category: category._id, withPhoto: true });
      await seedProduct({ name: "Mouse", category: category._id, withPhoto: true });

      const res = await request(routerApp).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        counTotal: 2,
      });
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products[0].photo).toBeUndefined();
      expect(res.body.products[0].category).toEqual(
        expect.objectContaining({
          name: "Gadgets",
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    it("should return { success: true, products: [], counTotal } from /api/v1/product/get-product", async () => {
      const category = await seedCategory("Appliances");
      await seedProduct({ name: "Kettle", category: category._id });

      const res = await request(app).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.counTotal).toBe("number");
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products).toHaveLength(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSingleProductController
// ─────────────────────────────────────────────────────────────────────────────

// Chi Thanh, A0276229W.
// AI generated tests using GitHub Copilot (GPT-5.3 Codex) Agent Mode.
describe("getSingleProductController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route
   *    Same DB. Product router mounted on a minimal Express app.
   *    Verifies product ID extraction from /get-product/:pid.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests complete stack at /api/v1/product/get-product/:pid.
   */

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedCategory = async (name) => {
    return categoryModel.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  const seedProduct = async ({
    name,
    category,
    description = "single-product-test",
    price = 88,
    quantity = 6,
    shipping = true,
  }) => {
    return productModel.create({
      name,
      slug: name.replace(/\s+/g, "-"),
      description,
      price,
      category,
      quantity,
      shipping,
      photo: {
        data: Buffer.from([9, 8, 7]),
        contentType: "image/jpeg",
      },
    });
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should retrieve a single product by product ID via productModel.findById", async () => {
      const category = await seedCategory("Phones");
      const product = await seedProduct({ name: "Pixel", category: category._id });

      const req = { params: { pid: product._id.toString() } };
      const res = makeRes();
      const findByIdSpy = jest.spyOn(productModel, "findById");

      await getSingleProductController(req, res);

      expect(findByIdSpy).toHaveBeenCalledWith(product._id.toString());
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.product).toEqual(
        expect.objectContaining({
          name: "Pixel",
          description: "single-product-test",
          price: 88,
          quantity: 6,
          shipping: true,
          slug: "Pixel",
          category: expect.objectContaining({ name: "Phones" }),
        })
      );
      expect(payload.product.photo?.data).toBeUndefined();

      findByIdSpy.mockRestore();
    });

    it("should return 404 when product slug does not exist in DB", async () => {
      const req = { params: { pid: "bad-id" } };
      const res = makeRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        })
      );
    });

    it("should return 404 when product ID does not exist", async () => {
      const req = { params: { pid: new mongoose.Types.ObjectId().toString() } };
      const res = makeRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        })
      );
    });

    it("should return 400 with error.message when database call throws", async () => {
      const req = { params: { pid: new mongoose.Types.ObjectId().toString() } };
      const res = makeRes();
      const dbError = new Error("single findById failure");
      const findByIdSpy = jest.spyOn(productModel, "findById").mockImplementation(() => {
        throw dbError;
      });

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting single product",
          error: "single findById failure",
        })
      );

      findByIdSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Controller Integration (minimal Express)", () => {
    it("should extract product ID from /api/v1/product/get-product/:pid and return full product", async () => {
      const category = await seedCategory("Laptops");
      const product = await seedProduct({ name: "ThinkPad", category: category._id });

      const res = await request(routerApp).get(`/api/v1/product/get-product/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product._id.toString()).toBe(product._id.toString());
      expect(res.body.product).toEqual(
        expect.objectContaining({
          name: "ThinkPad",
          description: "single-product-test",
          price: 88,
          quantity: 6,
          shipping: true,
          slug: "ThinkPad",
          category: expect.objectContaining({ name: "Laptops" }),
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    it("should return 404 for unknown slug", async () => {
      const res = await request(app).get("/api/v1/product/get-product/not-a-valid-objectid");

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: "Product not found",
      });
    });

    it("should return 404 for non-existent valid product ID", async () => {
      const missingId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/product/get-product/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: "Product not found",
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// productPhotoController
// ─────────────────────────────────────────────────────────────────────────────

// Chi Thanh, A0276229W.
// AI generated tests using GitHub Copilot (GPT-5.3 Codex) Agent Mode.
describe("productPhotoController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route
   *    Same DB. Product router mounted on a minimal Express app.
   *    Verifies /product-photo/:pid parameter extraction and binary response.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests complete stack at /api/v1/product/product-photo/:pid.
   */

  const ENDPOINT_BASE = "/api/v1/product/product-photo";

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    set: jest.fn(),
  });

  const binaryParser = (res, callback) => {
    res.setEncoding("binary");
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => callback(null, Buffer.from(data, "binary")));
  };

  const seedCategory = async (name) => {
    return categoryModel.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  const seedProduct = async ({
    name,
    category,
    withPhoto = true,
  }) => {
    const product = {
      name,
      slug: name.replace(/\s+/g, "-"),
      description: "photo-controller-test",
      price: 20,
      category,
      quantity: 2,
      shipping: true,
    };

    if (withPhoto) {
      product.photo = {
        data: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
        contentType: "image/jpeg",
      };
    }

    return productModel.create(product);
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should retrieve photo buffer via productModel.findById and return raw binary data", async () => {
      const category = await seedCategory("Cameras");
      const product = await seedProduct({ name: "Nikon", category: category._id, withPhoto: true });

      const req = { params: { pid: product._id.toString() } };
      const res = makeRes();
      const findByIdSpy = jest.spyOn(productModel, "findById");

      await productPhotoController(req, res);

      expect(findByIdSpy).toHaveBeenCalledWith(product._id.toString());
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
      expect(Buffer.from(res.send.mock.calls[0][0]).equals(product.photo.data)).toBe(true);

      findByIdSpy.mockRestore();
    });

    it("should return 404 when product ID does not exist", async () => {
      const req = { params: { pid: new mongoose.Types.ObjectId().toString() } };
      const res = makeRes();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        })
      );
    });

    it("should return 404 when product exists but photo field is missing", async () => {
      const category = await seedCategory("Tablets");
      const product = await seedProduct({ name: "Tab", category: category._id, withPhoto: false });

      const req = { params: { pid: product._id.toString() } };
      const res = makeRes();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product photo not found",
        })
      );
    });

    it("should return 500 with error.message when database call throws", async () => {
      const req = { params: { pid: new mongoose.Types.ObjectId().toString() } };
      const res = makeRes();
      const dbError = new Error("photo findById failure");
      const findByIdSpy = jest.spyOn(productModel, "findById").mockImplementation(() => {
        throw dbError;
      });

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting photo",
          error: "photo findById failure",
        })
      );

      findByIdSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Controller Integration (minimal Express)", () => {
    it("should extract :pid from /product-photo/:pid and return image stream", async () => {
      const category = await seedCategory("Audio");
      const product = await seedProduct({ name: "Headphones", category: category._id, withPhoto: true });

      const res = await request(routerApp)
        .get(`${ENDPOINT_BASE}/${product._id}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/jpeg");
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(Buffer.from(res.body).equals(product.photo.data)).toBe(true);
    });

    it("should return 404 from route when product exists but photo is missing", async () => {
      const category = await seedCategory("Wearables");
      const product = await seedProduct({ name: "Watch", category: category._id, withPhoto: false });

      const res = await request(routerApp).get(`${ENDPOINT_BASE}/${product._id}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: "Product photo not found",
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    it("should return raw binary photo with correct Content-Type from /api/v1/product/product-photo/:pid", async () => {
      const category = await seedCategory("Printers");
      const product = await seedProduct({ name: "LaserJet", category: category._id, withPhoto: true });

      const res = await request(app)
        .get(`${ENDPOINT_BASE}/${product._id}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/jpeg");
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(Buffer.from(res.body).equals(product.photo.data)).toBe(true);
    });

    it("should return 404 when product ID does not exist", async () => {
      const missingId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`${ENDPOINT_BASE}/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        message: "Product not found",
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// productCountController
// ─────────────────────────────────────────────────────────────────────────────

// Chi Thanh, A0276229W.
// AI generated tests using GitHub Copilot (GPT-5.3 Codex) Agent Mode.
describe("productCountController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route
   *    Same DB. Product router mounted on a minimal Express app.
   *    Verifies GET /product-count behavior.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests complete stack at /api/v1/product/product-count.
   */

  const ENDPOINT = "/api/v1/product/product-count";

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedCategory = async (name) => {
    return categoryModel.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
    });
  };

  const seedProduct = async ({ name, category }) => {
    return productModel.create({
      name,
      slug: name.replace(/\s+/g, "-"),
      description: "count-test",
      price: 10,
      quantity: 1,
      shipping: false,
      category,
    });
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should return zero count when database contains no products", async () => {
      const req = {};
      const res = makeRes();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: 0,
      });
    });

    it("should return accurate total count and expected response shape", async () => {
      const category = await seedCategory("Count-A");
      await seedProduct({ name: "C1", category: category._id });
      await seedProduct({ name: "C2", category: category._id });
      await seedProduct({ name: "C3", category: category._id });

      const req = {};
      const res = makeRes();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload).toEqual({
        success: true,
        total: 3,
      });
      expect(typeof payload.total).toBe("number");
    });

    it("should reflect database state after product creation and deletion", async () => {
      const category = await seedCategory("Count-B");
      const req = {};
      const res1 = makeRes();
      const res2 = makeRes();
      const res3 = makeRes();

      await productCountController(req, res1);
      expect(res1.send.mock.calls[0][0].total).toBe(0);

      const p1 = await seedProduct({ name: "D1", category: category._id });
      await seedProduct({ name: "D2", category: category._id });

      await productCountController(req, res2);
      expect(res2.send.mock.calls[0][0].total).toBe(2);

      await productModel.findByIdAndDelete(p1._id);

      await productCountController(req, res3);
      expect(res3.send.mock.calls[0][0].total).toBe(1);
    });

    it("should handle large count values (thousands of products) correctly", async () => {
      const category = await seedCategory("Count-Large");
      const manyProducts = Array.from({ length: 1200 }, (_, i) => ({
        name: `Bulk-${i}`,
        slug: `bulk-${i}`,
        description: "bulk-count-test",
        price: 1,
        quantity: 1,
        shipping: false,
        category: category._id,
      }));
      await productModel.insertMany(manyProducts);

      const req = {};
      const res = makeRes();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: 1200,
      });
    });

    it("should return 400 with error message when database query throws", async () => {
      const req = {};
      const res = makeRes();
      const dbError = new Error("count failure");
      const findSpy = jest.spyOn(productModel, "find").mockImplementation(() => {
        throw dbError;
      });

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in product count",
        })
      );

      findSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Controller Integration (minimal Express)", () => {
    it("should invoke count operation via GET /api/v1/product/product-count and return total", async () => {
      const category = await seedCategory("Count-Route");
      await seedProduct({ name: "R1", category: category._id });
      await seedProduct({ name: "R2", category: category._id });

      const res = await request(routerApp).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        total: 2,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    it("should return accurate count from /api/v1/product/product-count", async () => {
      const category = await seedCategory("Count-App");
      await seedProduct({ name: "A1", category: category._id });
      await seedProduct({ name: "A2", category: category._id });
      await seedProduct({ name: "A3", category: category._id });
      await seedProduct({ name: "A4", category: category._id });

      const res = await request(app).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        total: 4,
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateProductController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
// Prompt : following the way integration tests is doen for createProductController 
//    do it for updateProductController and deleteProductConttolerr
describe("updateProductController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Product router mounted on a minimal Express app.
   *    Real JWT signing/verification; formidable parses multipart fields.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/product/... endpoint.
   */

  // ─── shared constants ──────────────────────────────────────────────────────

  const JWT_SECRET = "test-integration-secret";
  const validCategoryId = new mongoose.Types.ObjectId().toString();

  const validFields = {
    name: "Updated Product",
    description: "Updated description",
    price: "59.99",
    category: validCategoryId,
    quantity: "20",
    shipping: "true",
  };

  // ─── minimal Level-2 app (product router only) ────────────────────────────

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  // ─── helpers ──────────────────────────────────────────────────────────────

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  // helper: seed one product and return its _id as string
  const seedProduct = async (overrides = {}) => {
    const p = await productModel.create({
      name: "Original Product",
      slug: "Original-Product",
      description: "Original description",
      price: 9.99,
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
      ...overrides,
    });
    return p._id.toString();
  };

  // ─── shared suite-level setup ─────────────────────────────────────────────

  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    const adminUser = await userModel.create({
      name: "Update Admin",
      email: "updateadmin@test.com",
      password: "hashedpassword",
      phone: 1111111111,
      address: "1 Update St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    describe("Validation failures", () => {
      it("should return 400 when req.fields is missing", async () => {
        const pid = await seedProduct();
        const req = { params: { pid } };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Please provide all fields" });
      });

      it.each([
        ["name",        { ...validFields, name: "" },        "Name is Required"],
        ["description", { ...validFields, description: "" }, "Description is Required"],
        ["price",       { ...validFields, price: "" },       "Price is Required"],
        ["category",    { ...validFields, category: "" },    "Category is Required"],
        ["quantity",    { ...validFields, quantity: "" },    "Quantity is Required"],
      ])("should return 400 when %s is missing", async (_field, fields, errorMsg) => {
        const pid = await seedProduct();
        const req = { params: { pid }, fields, files: {} };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error: errorMsg });
      });

      it("should return 400 when photo exceeds 1,000,000 bytes", async () => {
        const pid = await seedProduct();
        const req = {
          params: { pid },
          fields: { ...validFields },
          files: { photo: { size: 1000001, path: "", type: "image/jpeg" } },
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          error: "Photo size must be between 1 and 1,000,000 bytes",
        });
      });

      it("should return 404 when product does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const req = {
          params: { pid: nonExistentId },
          fields: { ...validFields },
          files: {},
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message: "Product not found" })
        );
      });
    });

    describe("Successful update — DB reflects changes", () => {
      it("should update a product (no photo) and persist changes in the DB", async () => {
        const pid = await seedProduct();
        const req = {
          params: { pid },
          fields: { ...validFields },
          files: {},
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, message: "Product Updated Successfully" })
        );

        const updated = await productModel.findById(pid);
        expect(updated.name).toBe("Updated Product");
        expect(updated.price).toBe(59.99);
        expect(updated.slug).toBe("Updated-Product");
      });

      it("should update a product with a new photo and persist photo data in the DB", async () => {
        const pid = await seedProduct();
        const tempPath = join(os.tmpdir(), "update-test-photo.jpg");
        const photoBuffer = Buffer.alloc(512, 0xcc);
        writeFileSync(tempPath, photoBuffer);

        const req = {
          params: { pid },
          fields: { ...validFields },
          files: { photo: { size: 512, path: tempPath, type: "image/png" } },
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        const updated = await productModel.findById(pid);
        expect(updated.photo.contentType).toBe("image/png");
        expect(Buffer.from(updated.photo.data).equals(photoBuffer)).toBe(true);

        unlinkSync(tempPath);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .put(`/api/v1/product/update-product/${pid}`)
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .put(`/api/v1/product/update-product/${pid}`)
          .set("Authorization", "bad.token.here")
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const pid = await seedProduct();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "updateroute_normal@test.com",
          password: "hashedpassword",
          phone: 2222222222,
          address: "2 Normal St",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .put(`/api/v1/product/update-product/${pid}`)
          .set("Authorization", userToken)
          .field("name", "Test");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Validation (authenticated admin)", () => {
      it("should return 404 when product does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(routerApp)
          .put(`/api/v1/product/update-product/${nonExistentId}`)
          .set("Authorization", adminToken)
          .field("name", "Updated")
          .field("description", "Desc")
          .field("price", "10")
          .field("category", validCategoryId)
          .field("quantity", "5");

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Product not found");
      });
    });

    describe("Successful update (authenticated admin)", () => {
      it("should update a product and return 201 when all fields are valid", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .put(`/api/v1/product/update-product/${pid}`)
          .set("Authorization", adminToken)
          .field("name", "Route Updated Product")
          .field("description", "Route update test")
          .field("price", "75.00")
          .field("category", validCategoryId)
          .field("quantity", "15")
          .field("shipping", "true");

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Product Updated Successfully");
        expect(res.body.products.name).toBe("Route Updated Product");

        const updated = await productModel.findById(pid);
        expect(updated.name).toBe("Route Updated Product");
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const pid = await seedProduct();
        const res = await request(app)
          .put(`/api/v1/product/update-product/${pid}`)
          .field("name", "Test");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const pid = await seedProduct();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "updateserver_normal@test.com",
          password: "hashedpassword",
          phone: 3333333333,
          address: "3 Normal St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .put(`/api/v1/product/update-product/${pid}`)
          .set("Authorization", normalToken)
          .field("name", "Test");

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Successful end-to-end update", () => {
      it("should update a product and persist changes in the DB", async () => {
        const pid = await seedProduct();
        const res = await request(app)
          .put(`/api/v1/product/update-product/${pid}`)
          .set("Authorization", adminToken)
          .field("name", "Server Updated Product")
          .field("description", "Full stack update test")
          .field("price", "149.99")
          .field("category", validCategoryId)
          .field("quantity", "30")
          .field("shipping", "false");

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ success: true, message: "Product Updated Successfully" });
        expect(res.body.products.slug).toBe("Server-Updated-Product");

        const updated = await productModel.findById(pid);
        expect(updated.price).toBe(149.99);
        expect(updated.name).toBe("Server Updated Product");
      });

      it("should return 404 when product does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
          .put(`/api/v1/product/update-product/${nonExistentId}`)
          .set("Authorization", adminToken)
          .field("name", "Ghost")
          .field("description", "Does not exist")
          .field("price", "1")
          .field("category", validCategoryId)
          .field("quantity", "1");

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Product not found");
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteProductController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
// Prompt 1: following the way integration tests is doen for createProductController
//    do it for updateProductController and deleteProductConttolerr
// Prompt 2: can u check the frontend logic , 
//    ithink delete product should only be doable by admin if it is fix it 
//    and update relevatn test case. 
//    i think the integrastio test got some error message spam please fix. thx
describe("deleteProductController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *    Auth is enforced by middleware which is bypassed at this level.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Product router mounted on a minimal Express app.
   *    Real JWT signing/verification; route is auth-protected (requireSignIn + isAdmin).
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/product/... endpoint.
   */

  const JWT_SECRET = "test-integration-secret";

  // ─── minimal Level-2 app (product router only) ────────────────────────────

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  // ─── helpers ──────────────────────────────────────────────────────────────

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedProduct = async (overrides = {}) => {
    const p = await productModel.create({
      name: "Product To Delete",
      slug: "Product-To-Delete",
      description: "Will be deleted",
      price: 9.99,
      category: new mongoose.Types.ObjectId(),
      quantity: 1,
      ...overrides,
    });
    return p._id.toString();
  };

  // ─── shared suite-level setup ─────────────────────────────────────────────

  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    const adminUser = await userModel.create({
      name: "Delete Admin",
      email: "deleteadmin@test.com",
      password: "hashedpassword",
      phone: 4444444444,
      address: "4 Delete St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // Auth is enforced by middleware; at this level the controller is called
  // directly, so auth tests belong to Level 2 and above.
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should return 404 when product does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = { params: { pid: nonExistentId } };
      const res = makeRes();

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Product not found" })
      );
    });

    it("should delete an existing product and return 200", async () => {
      const pid = await seedProduct();
      const req = { params: { pid } };
      const res = makeRes();

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Product Deleted successfully" })
      );

      const deleted = await productModel.findById(pid);
      expect(deleted).toBeNull();
    });

    it("should not affect other products when deleting one", async () => {
      const pidToDelete = await seedProduct({ name: "Delete Me", slug: "Delete-Me" });
      await seedProduct({ name: "Keep Me", slug: "Keep-Me" });

      const req = { params: { pid: pidToDelete } };
      const res = makeRes();

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(await productModel.countDocuments()).toBe(1);
      expect(await productModel.findOne({ name: "Keep Me" })).not.toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .delete(`/api/v1/product/delete-product/${pid}`);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .delete(`/api/v1/product/delete-product/${pid}`)
          .set("Authorization", "bad.token.here");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const pid = await seedProduct();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "deleteroute_normal@test.com",
          password: "hashedpassword",
          phone: 5555555555,
          address: "5 Normal St",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .delete(`/api/v1/product/delete-product/${pid}`)
          .set("Authorization", userToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Authorized admin", () => {
      it("should return 404 when product does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(routerApp)
          .delete(`/api/v1/product/delete-product/${nonExistentId}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Product not found");
      });

      it("should delete an existing product and return 200", async () => {
        const pid = await seedProduct();
        const res = await request(routerApp)
          .delete(`/api/v1/product/delete-product/${pid}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Product Deleted successfully");

        expect(await productModel.findById(pid)).toBeNull();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const pid = await seedProduct();
        const res = await request(app)
          .delete(`/api/v1/product/delete-product/${pid}`);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const pid = await seedProduct();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "deleteserver_normal@test.com",
          password: "hashedpassword",
          phone: 6666666666,
          address: "6 Normal St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .delete(`/api/v1/product/delete-product/${pid}`)
          .set("Authorization", normalToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Authorized admin", () => {
      it("should return 404 when product does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
          .delete(`/api/v1/product/delete-product/${nonExistentId}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Product not found");
      });

      it("should delete an existing product and return 200", async () => {
        const pid = await seedProduct();
        const res = await request(app)
          .delete(`/api/v1/product/delete-product/${pid}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Product Deleted successfully");

        expect(await productModel.findById(pid)).toBeNull();
      });

      it("should not affect other products when deleting one", async () => {
        const pidToDelete = await seedProduct({ name: "Server Delete Me", slug: "Server-Delete-Me" });
        await seedProduct({ name: "Server Keep Me", slug: "Server-Keep-Me" });

        const res = await request(app)
          .delete(`/api/v1/product/delete-product/${pidToDelete}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(await productModel.countDocuments()).toBe(1);
        expect(await productModel.findOne({ name: "Server Keep Me" })).not.toBeNull();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// productFiltersController
// ─────────────────────────────────────────────────────────────────────────────

// Chi Thanh, A0276229W.
// AI generated tests using GitHub Copilot (GPT-5.3 Codex) Agent Mode.

describe("productFiltersController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route
   *    Same DB. Product router mounted on a minimal Express app.
   *    Verifies request body parsing and response structure at /product-filters.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests complete stack at /api/v1/product/product-filters.
   */

  const ENDPOINT = "/api/v1/product/product-filters";

  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/product", productRoutes);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedProduct = async ({
    name,
    price,
    category,
    rating,
    description = "filter-test",
    quantity = 5,
  }) => {
    const created = await productModel.create({
      name,
      slug: name.replace(/\s+/g, "-"),
      description,
      price,
      category,
      quantity,
      rating,
    });
    return created._id.toString();
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should filter by category exclusion using $nin", async () => {
      const catA = new mongoose.Types.ObjectId();
      const catB = new mongoose.Types.ObjectId();
      const catC = new mongoose.Types.ObjectId();

      await seedProduct({ name: "A-1", price: 10, category: catA, rating: 3.2 });
      await seedProduct({ name: "B-1", price: 20, category: catB, rating: 3.8 });
      await seedProduct({ name: "C-1", price: 30, category: catC, rating: 4.1 });

      const req = { body: { excludedCategories: [catB.toString()] } };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toHaveLength(2);
      expect(payload.products.map((p) => p.name).sort()).toEqual(["A-1", "C-1"]);
    });

    it("should filter by price range using $gte and $lte", async () => {
      const cat = new mongoose.Types.ObjectId();
      await seedProduct({ name: "P-10", price: 10, category: cat, rating: 2.5 });
      await seedProduct({ name: "P-50", price: 50, category: cat, rating: 3.0 });
      await seedProduct({ name: "P-100", price: 100, category: cat, rating: 4.8 });

      const req = { body: { priceMin: 20, priceMax: 80 } };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0].name).toBe("P-50");
    });

    it("should paginate filtered results using skip and limit with page", async () => {
      const cat = new mongoose.Types.ObjectId();
      await seedProduct({ name: "Page-1", price: 10, category: cat, rating: 3.0 });
      await seedProduct({ name: "Page-2", price: 20, category: cat, rating: 3.0 });
      await seedProduct({ name: "Page-3", price: 30, category: cat, rating: 3.0 });
      await seedProduct({ name: "Page-4", price: 40, category: cat, rating: 3.0 });
      await seedProduct({ name: "Page-5", price: 50, category: cat, rating: 3.0 });

      const req = {
        body: {
          checked: [cat.toString()],
          page: 2,
          limit: 2,
        },
      };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toHaveLength(2);
      expect(payload.products.every((p) => p.category.toString() === cat.toString())).toBe(true);
    });

    it("should combine category, price and rating filters in a single query", async () => {
      const targetCategory = new mongoose.Types.ObjectId();
      const otherCategory = new mongoose.Types.ObjectId();

      await seedProduct({ name: "Combo Match", price: 60, category: targetCategory, rating: 4.5 });
      await seedProduct({ name: "Wrong Price", price: 90, category: targetCategory, rating: 4.6 });
      await seedProduct({ name: "Wrong Rating", price: 60, category: targetCategory, rating: 2.9 });
      await seedProduct({ name: "Wrong Category", price: 60, category: otherCategory, rating: 4.7 });

      const req = {
        body: {
          checked: [targetCategory.toString()],
          priceMin: 50,
          priceMax: 80,
          minRating: 4,
        },
      };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0].name).toBe("Combo Match");
    });

    it("should return all products when no filters are applied", async () => {
      const cat = new mongoose.Types.ObjectId();
      await seedProduct({ name: "All-1", price: 12, category: cat, rating: 3.1 });
      await seedProduct({ name: "All-2", price: 22, category: cat, rating: 3.9 });

      const req = { body: {} };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toHaveLength(2);
    });

    it("should handle invalid filter values gracefully (negative prices)", async () => {
      const req = { body: { priceMin: -1, priceMax: 10 } };
      const res = makeRes   ();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Price filter values cannot be negative",
      });
    });

    it("should handle invalid filter values gracefully (non-numeric ratings)", async () => {
      const req = { body: { minRating: "bad-rating" } };
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid rating filter values",
      });
    });

    it("should return 400 with error message when DB query throws", async () => {
      const req = { body: {} };
      const res = makeRes();
      const dbError = new Error("forced query failure");
      const findSpy = jest.spyOn(productModel, "find").mockImplementation(() => {
        throw dbError;
      });

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Filtering Products",
          error: dbError,
        })
      );

      findSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Controller Integration (minimal Express)", () => {
    it("should parse filter parameters from request body and return only matching products", async () => {
      const catA = new mongoose.Types.ObjectId();
      const catB = new mongoose.Types.ObjectId();

      await seedProduct({ name: "Route Match", price: 45, category: catA, rating: 4.3 });
      await seedProduct({ name: "Route Excluded Cat", price: 45, category: catB, rating: 4.5 });
      await seedProduct({ name: "Route Low Rating", price: 45, category: catA, rating: 2.0 });

      const res = await request(routerApp)
        .post(ENDPOINT)
        .send({
          checked: [catA.toString()],
          excludedCategories: [catB.toString()],
          priceMin: 40,
          priceMax: 50,
          minRating: 4,
          page: 1,
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("Route Match");
    });

    it("should return all products when request body has no filters", async () => {
      const cat = new mongoose.Types.ObjectId();
      await seedProduct({ name: "Route All 1", price: 11, category: cat, rating: 3.2 });
      await seedProduct({ name: "Route All 2", price: 21, category: cat, rating: 3.3 });

      const res = await request(routerApp).post(ENDPOINT).send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(2);
    });

    it("should return 400 for invalid filters through route body parsing", async () => {
      const res = await request(routerApp)
        .post(ENDPOINT)
        .send({ minRating: "not-a-number" });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: "Invalid rating filter values",
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    it("should return success payload shape { success: true, products: [] } for matching query", async () => {
      const cat = new mongoose.Types.ObjectId();
      await seedProduct({ name: "App Match", price: 70, category: cat, rating: 4.9 });
      await seedProduct({ name: "App Miss", price: 20, category: cat, rating: 2.0 });

      const res = await request(app)
        .post(ENDPOINT)
        .send({
          checked: [cat.toString()],
          priceMin: 60,
          priceMax: 100,
          minRating: 4,
          page: 1,
          limit: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("App Match");
    });

    it("should return 400 with error message for invalid negative price filters", async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ priceMin: -5, priceMax: 10 });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: "Price filter values cannot be negative",
      });
    });
  });


});












// Jian Tao, A0273320R

// import categoryModel from "../../models/categoryModel.js";




const publicProductRouter = express.Router();
const publicProductApp = express();

publicProductApp.use(express.json());

publicProductRouter.get("/product-list/:page", productListController);
publicProductRouter.get("/search/:keyword", searchProductController);
publicProductRouter.get("/related-product/:pid/:cid", relatedProductController);
publicProductRouter.get("/product-category/:slug", productCategoryController);

publicProductApp.use("/api/v1/product", publicProductRouter);
const clearDatabase = async () => {
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
};

const seedCategory = async (name, slug) => {
  return await categoryModel.create({ name, slug });
};

const seedProduct1 = async ({
  name,
  slug,
  description,
  price,
  category,
  quantity = 10,
  shipping = true,
  withPhoto = false,
}) => {
  return await productModel.create({
    name,
    slug,
    description,
    price,
    category,
    quantity,
    shipping,
    ...(withPhoto
      ? {
          photo: {
            data: Buffer.from("fake-image-data"),
            contentType: "image/png",
          },
        }
      : {}),
  });
};
describe("public product query controller integration tests", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await dbHelper.connect();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await dbHelper.closeDB();
    }
  });
  // Jian Tao, A0273320R
  // AI Assistance: ChatGPT
  // Prompt used: Asked for guidance on designing integration tests for the paginated product listing feature,
  // with a top-down structure separating route/controller behavior from database-backed behavior.
  // Prompt used: Requested suggestions for suitable test cases covering pagination, response structure,
  // exclusion of photo data, and error-handling paths.
  // Prompt used: Sought help reviewing the mocked query chain and the database-seeded test setup
  // to ensure the tests reflected the intended controller behavior.
  describe("productListController integration tests", () => {
    /**
     * Top-down integration approach:
     *
     * Level 1:
     * Route -> Controller
     * Model chain is mocked to isolate route/controller behaviour.
     *
     * Level 2:
     * Route -> Controller -> Model -> DB
     * Uses real Mongoose model and in-memory MongoDB to verify
     * pagination, select, and returned response structure.
     */

    // --------------------------------------------------------------------------
    // LEVEL 1 — Route -> Controller
    // --------------------------------------------------------------------------
    describe("Level 1 - Route -> Controller", () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
      });

      test("should return paginated products successfully", async () => {
        const mockProducts = [
          { _id: "p1", name: "Product 1", price: 100 },
          { _id: "p2", name: "Product 2", price: 200 },
        ];

        const sortMock = jest.fn().mockResolvedValue(mockProducts);
        const limitMock = jest.fn().mockReturnValue({ sort: sortMock });
        const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
        const selectMock = jest.fn().mockReturnValue({ skip: skipMock });

        jest.spyOn(productModel, "find").mockReturnValue({
          select: selectMock,
        });

        const res = await request(publicProductApp).get("/api/v1/product/product-list/2");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products).toEqual(mockProducts);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(selectMock).toHaveBeenCalledWith("-photo");
        expect(skipMock).toHaveBeenCalledWith(6);
        expect(limitMock).toHaveBeenCalledWith(6);
        expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      });

      test("should return 400 when product listing fails", async () => {
        jest.spyOn(productModel, "find").mockImplementation(() => {
          throw new Error("DB failed");
        });

        const res = await request(publicProductApp).get("/api/v1/product/product-list/1");

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("error in per page ctrl");
      });
    });

    // --------------------------------------------------------------------------
    // LEVEL 2 — Route -> Controller -> Model -> DB
    // --------------------------------------------------------------------------
    describe("Level 2 - Route -> Controller -> Model -> DB", () => {
      let category;

      beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        await clearDatabase();

        category = await seedCategory("Electronics", "electronics");

        for (let i = 1; i <= 8; i++) {
          await seedProduct1({
            name: `Product ${i}`,
            slug: `product-${i}`,
            description: `Description ${i}`,
            price: i * 100,
            category: category._id,
            withPhoto: i === 1,
          });
          await new Promise((resolve) => setTimeout(resolve, 2));
        }
      });

      test("should return first 6 products for page 1", async () => {
        const res = await request(publicProductApp).get("/api/v1/product/product-list/1");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products).toHaveLength(6);

        for (const product of res.body.products) {
          expect(product.photo).toBeUndefined();
        }
      });

      test("should return remaining products for page 2", async () => {
        const res = await request(publicProductApp).get("/api/v1/product/product-list/2");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products).toHaveLength(2);

        for (const product of res.body.products) {
          expect(product.photo).toBeUndefined();
        }
      });
    });
  });

  // Jian Tao, A0273320R
  // AI Assistance: ChatGPT
  // Prompt used: Asked for guidance on structuring integration tests for the product search feature,
  // using a staged top-down approach from route/controller behavior to database-backed behavior.
  // Prompt used: Requested suggestions for meaningful test scenarios involving keyword matching,
  // case-insensitive search, selective field return, and failure handling.
  // Prompt used: Sought feedback on the suitability of the seeded test data and mocked query behavior
  // for validating search across product name and description fields.
  describe("searchProductController integration tests", () => {
    /**
     * Top-down integration approach:
     *
     * Level 1:
     * Route -> Controller
     * Model chain is mocked to isolate route/controller behaviour.
     *
     * Level 2:
     * Route -> Controller -> Model -> DB
     * Uses real Mongoose model and in-memory MongoDB to verify
     * keyword search on name/description and select("-photo").
     */

    // --------------------------------------------------------------------------
    // LEVEL 1 — Route -> Controller
    // --------------------------------------------------------------------------
    describe("Level 1 - Route -> Controller", () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
      });

      test("should search products successfully by keyword", async () => {
        const mockResults = [
          { _id: "p1", name: "Phone", description: "A smartphone" },
        ];

        const selectMock = jest.fn().mockResolvedValue(mockResults);

        jest.spyOn(productModel, "find").mockReturnValue({
          select: selectMock,
        });

        const res = await request(publicProductApp).get("/api/v1/product/search/phone");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockResults);

        expect(productModel.find).toHaveBeenCalledWith({
          $or: [
            { name: { $regex: "phone", $options: "i" } },
            { description: { $regex: "phone", $options: "i" } },
          ],
        });
        expect(selectMock).toHaveBeenCalledWith("-photo");
      });

      test("should return 400 when product search fails", async () => {
        jest.spyOn(productModel, "find").mockImplementation(() => {
          throw new Error("Search failed");
        });

        const res = await request(publicProductApp).get("/api/v1/product/search/phone");

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error In Search Product API");
      });
    });

    // --------------------------------------------------------------------------
    // LEVEL 2 — Route -> Controller -> Model -> DB
    // --------------------------------------------------------------------------
    describe("Level 2 - Route -> Controller -> Model -> DB", () => {
      let category;

      beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        await clearDatabase();

        category = await seedCategory("Electronics", "electronics");

        await seedProduct1({
          name: "iPhone",
          slug: "iphone",
          description: "Premium smartphone",
          price: 1500,
          category: category._id,
          withPhoto: true,
        });

        await seedProduct1({
          name: "Laptop",
          slug: "laptop",
          description: "Phone companion device",
          price: 2500,
          category: category._id,
        });

        await seedProduct1({
          name: "Desk",
          slug: "desk",
          description: "Wooden furniture",
          price: 300,
          category: category._id,
        });
      });

      test("should return matching products by keyword from name or description", async () => {
        const res = await request(publicProductApp).get("/api/v1/product/search/phone");

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);

        const names = res.body.map((p) => p.name);
        expect(names).toContain("iPhone");
        expect(names).toContain("Laptop");
        expect(names).not.toContain("Desk");

        for (const product of res.body) {
          expect(product.photo).toBeUndefined();
        }
      });

      test("should perform case-insensitive search", async () => {
        const res = await request(publicProductApp).get("/api/v1/product/search/PHONE");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
      });
    });
  });

  // Jian Tao, A0273320R
  // AI Assistance: ChatGPT
  // Prompt used: Asked for help planning integration tests for the related products feature,
  // with emphasis on progressively testing controller flow first and then model/database interaction.
  // Prompt used: Requested suggestions for test coverage involving category-based filtering,
  // exclusion of the current product, result limiting, populated category data, and empty-result cases.
  // Prompt used: Sought review of the mock chain and seeded dataset
  // to check that the tests accurately reflected the intended related-product behavior.
  describe("relatedProductController integration tests", () => {
    /**
     * Top-down integration approach:
     *
     * Level 1:
     * Route -> Controller
     * Model chain is mocked to isolate route/controller behaviour.
     *
     * Level 2:
     * Route -> Controller -> Model -> DB
     * Uses real Mongoose model and in-memory MongoDB to verify
     * related product filtering by category, exclusion of current product,
     * limit(3), and category population.
     */

    // --------------------------------------------------------------------------
    // LEVEL 1 — Route -> Controller
    // --------------------------------------------------------------------------
    describe("Level 1 - Route -> Controller", () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
      });

      test("should get related products successfully", async () => {
        const mockProducts = [
          {
            _id: "p2",
            name: "Related Product",
            category: { _id: "c1", name: "Electronics" },
          },
        ];

        const populateMock = jest.fn().mockResolvedValue(mockProducts);
        const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

        jest.spyOn(productModel, "find").mockReturnValue({
          select: selectMock,
        });

        const res = await request(publicProductApp).get(
          "/api/v1/product/related-product/p1/c1"
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products).toEqual(mockProducts);

        expect(productModel.find).toHaveBeenCalledWith({
          category: "c1",
          _id: { $ne: "p1" },
        });
        expect(selectMock).toHaveBeenCalledWith("-photo");
        expect(limitMock).toHaveBeenCalledWith(3);
        expect(populateMock).toHaveBeenCalledWith("category");
      });

      test("should return 400 when related product lookup fails", async () => {
        jest.spyOn(productModel, "find").mockImplementation(() => {
          throw new Error("DB failed");
        });

        const res = await request(publicProductApp).get(
          "/api/v1/product/related-product/p1/c1"
        );

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("error while getting related product");
      });
    });

    // --------------------------------------------------------------------------
    // LEVEL 2 — Route -> Controller -> Model -> DB
    // --------------------------------------------------------------------------
    describe("Level 2 - Route -> Controller -> Model -> DB", () => {
      let category1;
      let category2;
      let baseProduct;

      beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        await clearDatabase();

        category1 = await seedCategory("Electronics", "electronics");
        category2 = await seedCategory("Furniture", "furniture");

        baseProduct = await seedProduct1({
          name: "Base Phone",
          slug: "base-phone",
          description: "Main product",
          price: 1000,
          category: category1._id,
          withPhoto: true,
        });

        await seedProduct1({
          name: "Related 1",
          slug: "related-1",
          description: "Same category",
          price: 1100,
          category: category1._id,
        });

        await seedProduct1({
          name: "Related 2",
          slug: "related-2",
          description: "Same category",
          price: 1200,
          category: category1._id,
        });

        await seedProduct1({
          name: "Related 3",
          slug: "related-3",
          description: "Same category",
          price: 1300,
          category: category1._id,
        });

        await seedProduct1({
          name: "Other Category Product",
          slug: "other-category-product",
          description: "Different category",
          price: 1400,
          category: category2._id,
        });
      });

      test("should return only related products from same category excluding current product", async () => {
        const res = await request(publicProductApp).get(
          `/api/v1/product/related-product/${baseProduct._id}/${category1._id}`
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products).toHaveLength(3);

        const names = res.body.products.map((p) => p.name);
        expect(names).toContain("Related 1");
        expect(names).toContain("Related 2");
        expect(names).toContain("Related 3");
        expect(names).not.toContain("Base Phone");
        expect(names).not.toContain("Other Category Product");

        for (const product of res.body.products) {
          expect(product.category._id.toString()).toBe(category1._id.toString());
          expect(product.photo).toBeUndefined();
        }
      });

      test("should return empty array when no related products exist", async () => {
        const soloCategory = await seedCategory("Books", "books");
        const soloProduct = await seedProduct1({
          name: "Solo Product",
          slug: "solo-product",
          description: "Only one in category",
          price: 50,
          category: soloCategory._id,
        });

        const res = await request(publicProductApp).get(
          `/api/v1/product/related-product/${soloProduct._id}/${soloCategory._id}`
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products).toEqual([]);
      });
    });
  });

  // Jian Tao, A0273320R
  // AI Assistance: ChatGPT
  // Prompt used: Asked for guidance on designing integration tests for category-based product retrieval,
  // following the same staged test organization used in earlier controller tests.
  // Prompt used: Requested suggestions for suitable scenarios covering category lookup by slug,
  // retrieval of products within the category, populated category data, unknown-category behavior,
  // and controller error handling.
  // Prompt used: Sought feedback on whether the mocked model behavior and seeded database setup
  // were appropriate for validating the controller’s expected responses.
  describe("productCategoryController integration tests", () => {
    /**
     * Top-down integration approach:
     *
     * Level 1:
     * Route -> Controller
     * Model chain is mocked to isolate route/controller behaviour.
     *
     * Level 2:
     * Route -> Controller -> Model -> DB
     * Uses real Mongoose models and in-memory MongoDB to verify
     * category lookup, category-based product retrieval, and population.
     */

    // --------------------------------------------------------------------------
    // LEVEL 1 — Route -> Controller
    // --------------------------------------------------------------------------
    describe("Level 1 - Route -> Controller", () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
      });

      test("should get products by category successfully", async () => {
        const mockCategory = {
          _id: "c1",
          name: "Electronics",
          slug: "electronics",
        };

        const mockProducts = [
          {
            _id: "p1",
            name: "Phone",
            category: mockCategory,
          },
        ];

        const populateMock = jest.fn().mockResolvedValue(mockProducts);

        jest.spyOn(categoryModel, "findOne").mockResolvedValue(mockCategory);
        jest.spyOn(productModel, "find").mockReturnValue({
          populate: populateMock,
        });

        const res = await request(publicProductApp).get(
          "/api/v1/product/product-category/electronics"
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toEqual(mockCategory);
        expect(res.body.products).toEqual(mockProducts);

        expect(categoryModel.findOne).toHaveBeenCalledWith({
          slug: "electronics",
        });
        expect(productModel.find).toHaveBeenCalledWith({
          category: mockCategory,
        });
        expect(populateMock).toHaveBeenCalledWith("category");
      });

      test("should return 400 when category lookup fails", async () => {
        jest.spyOn(categoryModel, "findOne").mockRejectedValue(
          new Error("Category lookup failed")
        );

        const res = await request(publicProductApp).get(
          "/api/v1/product/product-category/electronics"
        );

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error While Getting products");
      });
    });

    // --------------------------------------------------------------------------
    // LEVEL 2 — Route -> Controller -> Model -> DB
    // --------------------------------------------------------------------------
    describe("Level 2 - Route -> Controller -> Model -> DB", () => {
      let electronics;
      let furniture;

      beforeEach(async () => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        await clearDatabase();

        electronics = await seedCategory("Electronics", "electronics");
        furniture = await seedCategory("Furniture", "furniture");

        await seedProduct1({
          name: "Phone",
          slug: "phone",
          description: "Smartphone",
          price: 1000,
          category: electronics._id,
          withPhoto: true,
        });

        await seedProduct1({
          name: "Laptop",
          slug: "laptop",
          description: "Portable computer",
          price: 2000,
          category: electronics._id,
        });

        await seedProduct1({
          name: "Chair",
          slug: "chair",
          description: "Office chair",
          price: 300,
          category: furniture._id,
        });
      });

      test("should return category and products under that category", async () => {
        const res = await request(publicProductApp).get(
          "/api/v1/product/product-category/electronics"
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category.slug).toBe("electronics");
        expect(res.body.products).toHaveLength(2);

        const names = res.body.products.map((p) => p.name);
        expect(names).toContain("Phone");
        expect(names).toContain("Laptop");
        expect(names).not.toContain("Chair");

        for (const product of res.body.products) {
          expect(product.category.slug).toBe("electronics");
        }
      });

      test("should return null category and empty products for unknown slug", async () => {
        const res = await request(publicProductApp).get(
          "/api/v1/product/product-category/unknown-category"
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeNull();
        expect(res.body.products).toEqual([]);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// searchProductController — MS2 bottom-up integration tests
// ─────────────────────────────────────────────────────────────────────────────

// Foo Tzie Huang - A0262376Y
// AI Assistance: Claude (Anthropic)
// Prompt used: Asked for guidance on designing bottom-up integration tests for searchProductController,
// braintreeTokenController, and brainTreePaymentController with three levels of integration testing.
describe("searchProductController integration tests (MS2 - bottom-up)", () => {
  /**
   * Bottom-up integration approach:
   *
   * Level 1: Controller + Model (direct invocation, real in-memory DB)
   * Level 2: Route + Controller (HTTP via supertest on publicProductApp)
   * Level 3: Full App (HTTP via supertest on app.js)
   */

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  });

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // --------------------------------------------------------------------------
  // LEVEL 1 — Controller + Model Integration (no HTTP)
  // --------------------------------------------------------------------------
  // Foo Tzie Huang - A0262376Y
  // AI Assistance: Claude (Anthropic)
  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await categoryModel.create({
        name: "Electronics",
        slug: "electronics-ms2",
      });
    });

    test("should match products by name", async () => {
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });
      await productModel.create({
        name: "Samsung Galaxy",
        slug: "samsung-galaxy-ms2",
        description: "Android flagship",
        price: 899,
        category: testCategory._id,
        quantity: 5,
        shipping: true,
      });

      const req = { params: { keyword: "iPhone" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("iPhone 15");
    });

    test("should match products by description", async () => {
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-desc-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });
      await productModel.create({
        name: "MacBook Pro",
        slug: "macbook-pro-ms2",
        description: "Apple laptop for professionals",
        price: 1999,
        category: testCategory._id,
        quantity: 3,
        shipping: true,
      });

      const req = { params: { keyword: "laptop" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("MacBook Pro");
    });

    test("should perform case-insensitive search", async () => {
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-case-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });

      const req = { params: { keyword: "IPHONE" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("iPhone 15");
    });

    test("should return empty array when no products match", async () => {
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-empty-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });

      const req = { params: { keyword: "NonExistentProduct" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(0);
    });

    test("should exclude photo field from results", async () => {
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-photo-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
        photo: {
          data: Buffer.from("fake-photo-data"),
          contentType: "image/png",
        },
      });

      const req = { params: { keyword: "iPhone" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      // select("-photo") excludes the photo field from Mongoose documents
      expect("photo" in results[0].toObject()).toBe(false);
      expect(results[0].name).toBe("iPhone 15");
    });

    test("should match products from both name and description with same keyword", async () => {
      await productModel.create({
        name: "Wireless Headphones",
        slug: "wireless-headphones-ms2",
        description: "Bluetooth audio device",
        price: 199,
        category: testCategory._id,
        quantity: 20,
        shipping: true,
      });
      await productModel.create({
        name: "USB Cable",
        slug: "usb-cable-ms2",
        description: "Wireless charging cable",
        price: 15,
        category: testCategory._id,
        quantity: 100,
        shipping: true,
      });
      await productModel.create({
        name: "Monitor",
        slug: "monitor-ms2",
        description: "4K display",
        price: 500,
        category: testCategory._id,
        quantity: 8,
        shipping: true,
      });

      const req = { params: { keyword: "wireless" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(2);
      const names = results.map((p) => p.name);
      expect(names).toContain("Wireless Headphones");
      expect(names).toContain("USB Cable");
    });

    test("should return 400 when database query throws", async () => {
      const findSpy = jest.spyOn(productModel, "find").mockImplementation(() => {
        throw new Error("DB failure");
      });

      const req = { params: { keyword: "test" } };
      const res = makeRes();

      await searchProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error In Search Product API",
        })
      );

      findSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route + Controller (HTTP via publicProductApp)
  // --------------------------------------------------------------------------
  // Foo Tzie Huang - A0262376Y
  // AI Assistance: Claude (Anthropic)
  describe("Level 2 — Route + Controller (HTTP via publicProductApp)", () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await categoryModel.create({
        name: "Gadgets",
        slug: "gadgets-ms2",
      });
      await productModel.create({
        name: "iPhone 15",
        slug: "iphone-15-l2-ms2",
        description: "Latest Apple smartphone",
        price: 999,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });
      await productModel.create({
        name: "Samsung Galaxy S24",
        slug: "samsung-galaxy-s24-ms2",
        description: "Premium Android tablet",
        price: 899,
        category: testCategory._id,
        quantity: 7,
        shipping: true,
      });
      await productModel.create({
        name: "Sony Headphones",
        slug: "sony-headphones-ms2",
        description: "Noise cancelling audio",
        price: 350,
        category: testCategory._id,
        quantity: 15,
        shipping: true,
      });
    });

    test("should return matching products via HTTP GET", async () => {
      const res = await request(publicProductApp).get(
        "/api/v1/product/search/iPhone"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("iPhone 15");
    });

    test("should return empty array for non-matching keyword", async () => {
      const res = await request(publicProductApp).get(
        "/api/v1/product/search/NonExistentKeyword"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test("should match keyword in description via HTTP", async () => {
      const res = await request(publicProductApp).get(
        "/api/v1/product/search/Android"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Samsung Galaxy S24");
    });

    test("should perform case-insensitive search via HTTP", async () => {
      const res = await request(publicProductApp).get(
        "/api/v1/product/search/HEADPHONES"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Sony Headphones");
    });

    test("should exclude photo field from HTTP response", async () => {
      await productModel.deleteMany({});
      await productModel.create({
        name: "Photo Test Product",
        slug: "photo-test-ms2",
        description: "Has a photo field",
        price: 100,
        category: testCategory._id,
        quantity: 1,
        shipping: true,
        photo: {
          data: Buffer.from("image-binary-data"),
          contentType: "image/jpeg",
        },
      });

      const res = await request(publicProductApp).get(
        "/api/v1/product/search/Photo"
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Photo Test Product");
      expect(res.body[0].photo).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 3 — Full App Integration (app.js)
  // --------------------------------------------------------------------------
  // Foo Tzie Huang - A0262376Y
  // AI Assistance: Claude (Anthropic)
  describe("Level 3 — Full App Integration (app.js)", () => {
    let testCategory;

    beforeEach(async () => {
      testCategory = await categoryModel.create({
        name: "Computers",
        slug: "computers-ms2",
      });
      await productModel.create({
        name: "MacBook Air",
        slug: "macbook-air-ms2",
        description: "Lightweight Apple laptop",
        price: 1299,
        category: testCategory._id,
        quantity: 5,
        shipping: true,
      });
      await productModel.create({
        name: "Dell XPS 15",
        slug: "dell-xps-15-ms2",
        description: "Windows ultrabook",
        price: 1499,
        category: testCategory._id,
        quantity: 4,
        shipping: true,
      });
    });

    test("should return matching products via full app endpoint", async () => {
      const res = await request(app).get("/api/v1/product/search/MacBook");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("MacBook Air");
    });

    test("should return products matching description via full app", async () => {
      const res = await request(app).get("/api/v1/product/search/laptop");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("MacBook Air");
    });

    test("should return empty array for unmatched keyword via full app", async () => {
      const res = await request(app).get(
        "/api/v1/product/search/TabletThatDoesNotExist"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test("should perform case-insensitive search via full app", async () => {
      const res = await request(app).get("/api/v1/product/search/DELL");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Dell XPS 15");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// braintreeTokenController — MS2 integration tests
// ─────────────────────────────────────────────────────────────────────────────

// Foo Tzie Huang - A0262376Y
// AI Assistance: Claude (Anthropic)
// Prompt used: Asked for guidance on designing integration tests for braintreeTokenController
// and brainTreePaymentController, focusing on route + auth middleware integration since the
// braintree gateway is an external dependency that cannot be tested with real credentials.
describe("braintreeTokenController integration tests (MS2)", () => {
  /**
   * Braintree is an external payment service. These tests focus on:
   * - Route accessibility (token endpoint is public, no auth required)
   * - Verifying the endpoint responds correctly via the braintree sandbox
   */

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // Foo Tzie Huang - A0262376Y
  // AI Assistance: Claude (Anthropic)
  describe("Level 2 — Route accessibility", () => {
    test("should reach braintree token endpoint via full app without auth", async () => {
      const res = await request(app).get("/api/v1/product/braintree/token");

      // The endpoint is accessible without authentication (not blocked by auth middleware).
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(404);
    });

    (process.env.BRAINTREE_MERCHANT_ID ? test : test.skip)("should return a successful response with client token from braintree sandbox", async () => {
      const res = await request(app).get("/api/v1/product/braintree/token");

      // Braintree sandbox credentials are configured, so the gateway returns a token
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("clientToken");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// brainTreePaymentController — MS2 integration tests
// ─────────────────────────────────────────────────────────────────────────────

// Foo Tzie Huang - A0262376Y
// AI Assistance: Claude (Anthropic)
// Prompt used: Asked for integration test coverage for the braintree payment endpoint,
// focusing on auth middleware enforcement and route-level integration.
describe("brainTreePaymentController integration tests (MS2)", () => {
  /**
   * The payment endpoint requires authentication (requireSignIn middleware).
   * Braintree transaction processing is external, so we test:
   * - Auth middleware enforcement (401 for unauthenticated requests)
   * - Authenticated request reaching the controller (braintree sandbox is active)
   */

  const JWT_SECRET = "test-integration-secret";

  beforeAll(async () => {
    await dbHelper.connect();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // Foo Tzie Huang - A0262376Y
  // AI Assistance: Claude (Anthropic)
  describe("Level 2 — Route + Auth Middleware Integration", () => {
    test("should return 401 for unauthenticated request to payment endpoint", async () => {
      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .send({ nonce: "fake-nonce", cart: [] });

      expect(res.status).toBe(401);
    });

    test("should return 401 when Authorization header has invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", "invalid-jwt-token")
        .send({ nonce: "fake-nonce", cart: [{ price: 100 }] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    (process.env.BRAINTREE_MERCHANT_ID ? test : test.skip)("should pass auth middleware with valid token and reach payment controller", async () => {
      const testCategory = await categoryModel.create({
        name: "Payment Test Category",
        slug: "payment-test-cat-ms2",
      });

      // Create real products so their ObjectIds can be used in the cart
      const product1 = await productModel.create({
        name: "Payment Test Item 1",
        slug: "payment-test-1-ms2",
        description: "First test item",
        price: 100,
        category: testCategory._id,
        quantity: 10,
        shipping: true,
      });
      const product2 = await productModel.create({
        name: "Payment Test Item 2",
        slug: "payment-test-2-ms2",
        description: "Second test item",
        price: 200,
        category: testCategory._id,
        quantity: 5,
        shipping: true,
      });

      const user = await userModel.create({
        name: "Test Buyer",
        email: "buyer-ms2@test.com",
        password: "hashedpassword123",
        phone: "1234567890",
        address: "123 Test St",
        answer: "testanswer",
      });

      const validToken = JWT.sign({ _id: user._id }, JWT_SECRET);

      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", validToken)
        .send({
          nonce: "fake-valid-nonce",
          cart: [
            { _id: product1._id.toString(), price: 100 },
            { _id: product2._id.toString(), price: 200 },
          ],
        });

      // Auth middleware passes (not 401). The braintree sandbox processes
      // the transaction and the controller responds with { ok: true }.
      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      await userModel.findByIdAndDelete(user._id);
    });

    test("should not allow GET method on payment endpoint", async () => {
      const res = await request(app).get("/api/v1/product/braintree/payment");

      // GET is not defined for this route, should get 404
      expect(res.status).toBe(404);
    });
  });
});
