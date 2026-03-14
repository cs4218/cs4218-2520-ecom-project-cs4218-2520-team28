import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import os from "os";

import { createProductController } from "../../controllers/productController.js";
import productRoutes from "../../routes/productRoutes.js";
import app from "../../app.js";
import userModel from "../../models/userModel.js";
import productModel from "../../models/productModel.js";
import * as dbHelper from "./dbHelper.js";

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt 1: refeering to how we are doing right now, how would u suggest we add our integraion test how we arrange or folder it?
//
// Response: Suggested the current file structure we are using
//
// Prtompt 2 (plan mode): I want implement integration test for createProductController. 
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

      it("should return 401 when user is not admin", async () => {
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

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("UnAuthorized Access");
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

      it("should return 401 when a valid JWT belongs to a non-admin user", async () => {
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

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("UnAuthorized Access");
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
