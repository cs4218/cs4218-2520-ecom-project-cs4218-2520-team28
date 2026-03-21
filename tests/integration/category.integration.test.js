// Note to the grader: The category integration is tested by multiple testers, with tests split by methods.
// The tests are consolidated in a single file for better organization and to avoid circular dependencies with mocks.
// Each describe block corresponds to a specific controller method.
// Refer to the comments at the top for details on who handles what.
import express from "express";
import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import * as dbHelper from "./dbHelper.js";

import {
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from "../../controllers/categoryController.js";
import categoryRoutes from "../../routes/categoryRoutes.js";
import app from "../../app.js";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
// Suppress console.log noise (e.g. JsonWebTokenError logged by authMiddleware on intentionally bad tokens)
let consoleSpy;
beforeAll(() => {
  consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(() => {
  consoleSpy.mockRestore();
});

// ─────────────────────────────────────────────────────────────────────────────
// createCategoryController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt: following the way product integration tests was done,
//   do integration test for create/update/delete category controllers
describe("createCategoryController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Category router mounted on a minimal Express app.
   *    Real JWT signing/verification.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/category/... endpoint.
   */

  const JWT_SECRET = "test-integration-secret";
  const ENDPOINT = "/api/v1/category/create-category";

  // ─── minimal Level-2 app ──────────────────────────────────────────────────
  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/category", categoryRoutes);

  // ─── helpers ──────────────────────────────────────────────────────────────
  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  // ─── shared setup ─────────────────────────────────────────────────────────
  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    const adminUser = await userModel.create({
      name: "Cat Create Admin",
      email: "catcreateadmin@test.com",
      password: "hashedpassword",
      phone: 1000000001,
      address: "1 Cat St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    describe("Validation failures", () => {
      it("should return 400 when name is missing", async () => {
        const req = { body: {} };
        const res = makeRes();

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
      });

      it("should return 400 when name is empty string", async () => {
        const req = { body: { name: "" } };
        const res = makeRes();

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
      });
    });

    describe("Duplicate detection", () => {
      it("should return 409 when category already exists", async () => {
        await categoryModel.create({ name: "Electronics", slug: "Electronics" });

        const req = { body: { name: "Electronics" } };
        const res = makeRes();

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message: "Category Already Exists" })
        );
      });
    });

    describe("Successful creation", () => {
      it("should create a category and persist it in the DB", async () => {
        const req = { body: { name: "Books" } };
        const res = makeRes();

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, message: "New Category Created" })
        );

        const saved = await categoryModel.findOne({ name: "Books" });
        expect(saved).not.toBeNull();
        expect(saved.slug).toBeTruthy();
      });

      it("should generate the correct slug from the category name", async () => {
        const req = { body: { name: "Home And Garden" } };
        const res = makeRes();

        await createCategoryController(req, res);

        const saved = await categoryModel.findOne({ name: "Home And Garden" });
        expect(saved.slug).toBe("home-and-garden");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .send({ name: "Sports" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", "bad.token.here")
          .send({ name: "Sports" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catcreate_normal@test.com",
          password: "hashedpassword",
          phone: 2000000001,
          address: "2 Normal St",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", userToken)
          .send({ name: "Sports" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Validation (authenticated admin)", () => {
      it("should return 400 when name is missing", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Name is required");
      });
    });

    describe("Successful creation (authenticated admin)", () => {
      it("should create a new category and return 201", async () => {
        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .send({ name: "Clothing" });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("New Category Created");
        expect(res.body.category.name).toBe("Clothing");

        const saved = await categoryModel.findOne({ name: "Clothing" });
        expect(saved).not.toBeNull();
      });

      it("should return 409 when category already exists", async () => {
        await categoryModel.create({ name: "Toys", slug: "Toys" });

        const res = await request(routerApp)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .send({ name: "Toys" });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Category Already Exists");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const res = await request(app)
          .post(ENDPOINT)
          .send({ name: "Music" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catcreateserver_normal@test.com",
          password: "hashedpassword",
          phone: 3000000001,
          address: "3 Normal St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", normalToken)
          .send({ name: "Music" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Successful end-to-end creation", () => {
      it("should create a category and persist it in the DB", async () => {
        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .send({ name: "Furniture" });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ success: true, message: "New Category Created" });
        expect(res.body.category.slug).toBeTruthy();

        const saved = await categoryModel.findOne({ name: "Furniture" });
        expect(saved).not.toBeNull();
      });

      it("should return 409 when category already exists", async () => {
        await categoryModel.create({ name: "Garden", slug: "Garden" });

        const res = await request(app)
          .post(ENDPOINT)
          .set("Authorization", adminToken)
          .send({ name: "Garden" });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Category Already Exists");
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateCategoryController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt: following the way product integration tests was done,
//   do integration test for create/update/delete category controllers
describe("updateCategoryController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Category router mounted on a minimal Express app.
   *    Real JWT signing/verification.
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/category/... endpoint.
   */

  const JWT_SECRET = "test-integration-secret";

  // ─── minimal Level-2 app ──────────────────────────────────────────────────
  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/category", categoryRoutes);

  // ─── helpers ──────────────────────────────────────────────────────────────
  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedCategory = async (overrides = {}) => {
    const c = await categoryModel.create({
      name: "Original Category",
      slug: "Original-Category",
      ...overrides,
    });
    return c._id.toString();
  };

  // ─── shared setup ─────────────────────────────────────────────────────────
  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    const adminUser = await userModel.create({
      name: "Cat Update Admin",
      email: "catupdateadmin@test.com",
      password: "hashedpassword",
      phone: 1000000002,
      address: "1 Update Cat St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    describe("Validation failures", () => {
      it("should return 400 when name is missing", async () => {
        const id = await seedCategory();
        const req = { params: { id }, body: {} };
        const res = makeRes();

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message: "Name is required" })
        );
      });

      it("should return 404 when category does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const req = { params: { id: nonExistentId }, body: { name: "New Name" } };
        const res = makeRes();

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message: "Category not found" })
        );
      });
    });

    describe("Successful update", () => {
      it("should update a category name and slug and persist changes in the DB", async () => {
        const id = await seedCategory();
        const req = { params: { id }, body: { name: "Updated Category" } };
        const res = makeRes();

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, message: "Category Updated Successfully" })
        );

        const updated = await categoryModel.findById(id);
        expect(updated.name).toBe("Updated Category");
        expect(updated.slug).toBe("updated-category");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .put(`/api/v1/category/update-category/${id}`)
          .send({ name: "New Name" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .put(`/api/v1/category/update-category/${id}`)
          .set("Authorization", "bad.token.here")
          .send({ name: "New Name" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const id = await seedCategory();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catupdate_normal@test.com",
          password: "hashedpassword",
          phone: 2000000002,
          address: "2 Normal Update St",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .put(`/api/v1/category/update-category/${id}`)
          .set("Authorization", userToken)
          .send({ name: "New Name" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Validation (authenticated admin)", () => {
      it("should return 404 when category does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(routerApp)
          .put(`/api/v1/category/update-category/${nonExistentId}`)
          .set("Authorization", adminToken)
          .send({ name: "New Name" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
      });
    });

    describe("Successful update (authenticated admin)", () => {
      it("should update a category and return 200", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .put(`/api/v1/category/update-category/${id}`)
          .set("Authorization", adminToken)
          .send({ name: "Route Updated Category" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Category Updated Successfully");
        expect(res.body.category.name).toBe("Route Updated Category");

        const updated = await categoryModel.findById(id);
        expect(updated.name).toBe("Route Updated Category");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const id = await seedCategory();
        const res = await request(app)
          .put(`/api/v1/category/update-category/${id}`)
          .send({ name: "New Name" });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const id = await seedCategory();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catupdateserver_normal@test.com",
          password: "hashedpassword",
          phone: 3000000002,
          address: "3 Normal Update St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .put(`/api/v1/category/update-category/${id}`)
          .set("Authorization", normalToken)
          .send({ name: "New Name" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Successful end-to-end update", () => {
      it("should update a category and persist changes in the DB", async () => {
        const id = await seedCategory();
        const res = await request(app)
          .put(`/api/v1/category/update-category/${id}`)
          .set("Authorization", adminToken)
          .send({ name: "Server Updated Category" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ success: true, message: "Category Updated Successfully" });
        expect(res.body.category.slug).toBe("server-updated-category");

        const updated = await categoryModel.findById(id);
        expect(updated.name).toBe("Server Updated Category");
      });

      it("should return 404 when category does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
          .put(`/api/v1/category/update-category/${nonExistentId}`)
          .set("Authorization", adminToken)
          .send({ name: "Ghost Category" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteCategoryController
// ─────────────────────────────────────────────────────────────────────────────

// Foo Chao, A0272024R
// AI Assistance: Github Copilot (Claude Sonnet 4.6)
//
// Prompt: following the way product integration tests was done,
//   do integration test for create/update/delete category controllers
describe("deleteCategoryController integration tests", () => {
  /**
   * Bottom-up approach — three levels of integration, each as a nested describe:
   *
   *  Level 1 — Controller + Model
   *    Real Mongoose operations against in-memory MongoDB.
   *    req/res constructed manually; no HTTP layer involved.
   *    Auth is enforced by middleware; not applicable at this level.
   *
   *  Level 2 — Controller + Model + Route + Middleware
   *    Same DB. Category router mounted on a minimal Express app.
   *    Real JWT signing/verification; route is auth-protected (requireSignIn + isAdmin).
   *
   *  Level 3 — Full App (app.js)
   *    Same DB. Full Express application imported from app.js.
   *    Tests the complete stack at the real /api/v1/category/... endpoint.
   */

  const JWT_SECRET = "test-integration-secret";

  // ─── minimal Level-2 app ──────────────────────────────────────────────────
  const routerApp = express();
  routerApp.use(express.json());
  routerApp.use("/api/v1/category", categoryRoutes);

  // ─── helpers ──────────────────────────────────────────────────────────────
  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedCategory = async (overrides = {}) => {
    const c = await categoryModel.create({
      name: "Category To Delete",
      slug: "Category-To-Delete",
      ...overrides,
    });
    return c._id.toString();
  };

  // ─── shared setup ─────────────────────────────────────────────────────────
  let adminToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await dbHelper.connect();

    const adminUser = await userModel.create({
      name: "Cat Delete Admin",
      email: "catdeleteadmin@test.com",
      password: "hashedpassword",
      phone: 1000000003,
      address: "1 Delete Cat St",
      answer: "test",
      role: 1,
    });

    adminToken = JWT.sign({ _id: adminUser._id }, JWT_SECRET);
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbHelper.closeDB();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Controller + Model
  // Auth is enforced by middleware; at this level the controller is called
  // directly, so auth tests belong to Level 2 and above.
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 1 — Controller + Model Integration (no HTTP)", () => {
    it("should return 404 when category does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = { params: { id: nonExistentId } };
      const res = makeRes();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Category not found" })
      );
    });

    it("should delete an existing category and return 200", async () => {
      const id = await seedCategory();
      const req = { params: { id } };
      const res = makeRes();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Category Deleted Successfully" })
      );

      expect(await categoryModel.findById(id)).toBeNull();
    });

    it("should not affect other categories when deleting one", async () => {
      const idToDelete = await seedCategory({ name: "Delete Me", slug: "Delete-Me" });
      await seedCategory({ name: "Keep Me", slug: "Keep-Me" });

      const req = { params: { id: idToDelete } };
      const res = makeRes();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(await categoryModel.countDocuments()).toBe(1);
      expect(await categoryModel.findOne({ name: "Keep Me" })).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Controller + Model + Route + Middleware
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 2 — Route + Middleware + Controller Integration (minimal Express)", () => {
    describe("Auth middleware", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .delete(`/api/v1/category/delete-category/${id}`);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 401 when JWT is invalid", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .delete(`/api/v1/category/delete-category/${id}`)
          .set("Authorization", "bad.token.here");

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when user is not admin", async () => {
        const id = await seedCategory();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catdelete_normal@test.com",
          password: "hashedpassword",
          phone: 2000000003,
          address: "2 Normal Delete St",
          answer: "test",
          role: 0,
        });
        const userToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(routerApp)
          .delete(`/api/v1/category/delete-category/${id}`)
          .set("Authorization", userToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Authorized admin", () => {
      it("should return 404 when category does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(routerApp)
          .delete(`/api/v1/category/delete-category/${nonExistentId}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
      });

      it("should delete an existing category and return 200", async () => {
        const id = await seedCategory();
        const res = await request(routerApp)
          .delete(`/api/v1/category/delete-category/${id}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Category Deleted Successfully");

        expect(await categoryModel.findById(id)).toBeNull();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Full App Integration (app.js)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Level 3 — Full App Integration (app.js, server level)", () => {
    describe("Auth guard", () => {
      it("should return 401 with no Authorization header", async () => {
        const id = await seedCategory();
        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${id}`);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
      });

      it("should return 403 when a valid JWT belongs to a non-admin user", async () => {
        const id = await seedCategory();
        const normalUser = await userModel.create({
          name: "Normal User",
          email: "catdeleteserver_normal@test.com",
          password: "hashedpassword",
          phone: 3000000003,
          address: "3 Normal Delete St",
          answer: "test",
          role: 0,
        });
        const normalToken = JWT.sign({ _id: normalUser._id }, JWT_SECRET);

        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${id}`)
          .set("Authorization", normalToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized Access");
      });
    });

    describe("Authorized admin", () => {
      it("should return 404 when category does not exist", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${nonExistentId}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Category not found");
      });

      it("should delete an existing category and return 200", async () => {
        const id = await seedCategory();
        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${id}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Category Deleted Successfully");

        expect(await categoryModel.findById(id)).toBeNull();
      });

      it("should not affect other categories when deleting one", async () => {
        const idToDelete = await seedCategory({ name: "Server Delete Me", slug: "Server-Delete-Me" });
        await seedCategory({ name: "Server Keep Me", slug: "Server-Keep-Me" });

        const res = await request(app)
          .delete(`/api/v1/category/delete-category/${idToDelete}`)
          .set("Authorization", adminToken);

        expect(res.status).toBe(200);
        expect(await categoryModel.countDocuments()).toBe(1);
        expect(await categoryModel.findOne({ name: "Server Keep Me" })).not.toBeNull();
      });
    });
  });
});
