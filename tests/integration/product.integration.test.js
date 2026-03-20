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

import {
  createProductController,
  getProductController,
  getSingleProductController,
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
import * as dbHelper from "./dbHelper.js";

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

    it("should return 400 when product ID is malformed", async () => {
      const req = { params: { pid: "bad-id" } };
      const res = makeRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid product ID",
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
    it("should return 400 for malformed product ID", async () => {
      const res = await request(app).get("/api/v1/product/get-product/not-a-valid-objectid");

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        message: "Invalid product ID",
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
