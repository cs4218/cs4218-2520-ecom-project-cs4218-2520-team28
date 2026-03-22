// Ho Jin Han, A0266275W
// Integration Test for controllers/categoryController.js

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import express from "express";
import {
  createCategoryController,
  updateCategoryController,
  categoryController,
  singleCategoryController,
  deleteCategoryController,
} from "../../controllers/categoryController.js";
import categoryModel from "../../models/categoryModel.js";
import slugify from "slugify";

const app = express();
app.use(express.json());

// Routes to test (Express -> controller -> MongoDB)
app.post("/api/v1/category/create-category", createCategoryController);
app.put("/api/v1/category/update-category/:id", updateCategoryController);
app.get("/api/v1/category/get-category", categoryController);
app.get("/api/v1/category/single-category/:slug", singleCategoryController);
app.delete("/api/v1/category/delete-category/:id", deleteCategoryController);

let mongoServer;

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("categoryController Integration Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await categoryModel.deleteMany({});
    jest.restoreAllMocks();
  });

  // Ho Jin Han, A0266275W
  it("CC.1 createCategoryController - Should create a new category", async () => {
    const res = await request(app)
      .post("/api/v1/category/create-category")
      .send({ name: "Electronics" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.category.name).toBe("Electronics");
    expect(res.body.category.slug).toBe("electronics");

    const inDb = await categoryModel.findOne({ name: "Electronics" });
    expect(inDb).toBeTruthy();
  });

  // Ho Jin Han, A0266275W
  it("CC.2 updateCategoryController - Should update an existing category", async () => {
    const category = await new categoryModel({
      name: "Books",
      slug: slugify("Books"),
    }).save();

    const res = await request(app)
      .put(`/api/v1/category/update-category/${category._id}`)
      .send({ name: "New Books" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category.name).toBe("New Books");

    const inDb = await categoryModel.findById(category._id);
    expect(inDb.name).toBe("New Books");
  });

  // Ho Jin Han, A0266275W
  it("CC.3 categoryController - Should get all categories", async () => {
    await new categoryModel({ name: "Cat1", slug: "cat1" }).save();
    await new categoryModel({ name: "Cat2", slug: "cat2" }).save();

    const res = await request(app).get("/api/v1/category/get-category");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category).toHaveLength(2);
    expect(res.body.category.map((c) => c.name)).toContain("Cat1");
  });

  // Ho Jin Han, A0266275W
  it("CC.4 singleCategoryController - Should get a category by slug", async () => {
    await new categoryModel({ name: "Unique Cat", slug: "unique-cat" }).save();

    const res = await request(app).get(
      "/api/v1/category/single-category/unique-cat"
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category.name).toBe("Unique Cat");
  });

  // Ho Jin Han, A0266275W
  it("CC.5 deleteCategoryController - Should delete an existing category", async () => {
    const category = await new categoryModel({
      name: "To Delete",
      slug: "to-delete",
    }).save();

    const res = await request(app).delete(
      `/api/v1/category/delete-category/${category._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const inDb = await categoryModel.findById(category._id);
    expect(inDb).toBeNull();
  });

  // -------------------
  // Validation branches
  // -------------------

  // Ho Jin Han, A0266275W
  it("CC.6 createCategoryController - Missing name returns 400", async () => {
    const res = await request(app)
      .post("/api/v1/category/create-category")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name is required/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.7 createCategoryController - Duplicate name returns 409", async () => {
    await new categoryModel({ name: "Dup", slug: "dup" }).save();

    const res = await request(app)
      .post("/api/v1/category/create-category")
      .send({ name: "Dup" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.8 updateCategoryController - Missing name returns 400", async () => {
    const category = await new categoryModel({
      name: "Stationery",
      slug: "stationery",
    }).save();

    const res = await request(app)
      .put(`/api/v1/category/update-category/${category._id}`)
      .send({}); // no name

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name is required/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.9 updateCategoryController - Nonexistent category returns 404", async () => {
    const nonExistingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/category/update-category/${nonExistingId}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.10 deleteCategoryController - Nonexistent category returns 404", async () => {
    const nonExistingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).delete(
      `/api/v1/category/delete-category/${nonExistingId}`
    );

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  // -------------------
  // Catch blocks (500)
  // -------------------
  // These are important for coverage; they prove the controller handles unexpected failures.

  // Ho Jin Han, A0266275W
  it("CC.11 updateCategoryController - Invalid id format returns 500 (current behavior: CastError)", async () => {
    const res = await request(app)
      .put("/api/v1/category/update-category/not-a-valid-objectid")
      .send({ name: "Whatever" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while updating category/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.12 deleteCategoryController - Invalid id format returns 500 (current behavior: CastError)", async () => {
    const res = await request(app).delete(
      "/api/v1/category/delete-category/not-a-valid-objectid"
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while deleting category/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.13 categoryController - If model throws, returns 500", async () => {
    jest.spyOn(categoryModel, "find").mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get("/api/v1/category/get-category");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while getting all categories/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.14 singleCategoryController - If model throws, returns 500", async () => {
    jest
      .spyOn(categoryModel, "findOne")
      .mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get(
      "/api/v1/category/single-category/any-slug"
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while getting single category/i);
  });

  // -------------------
  // Branches not reachable via Express route definition (missing :id)
  // (Still valid white-box controller integration: controller + real res behaviour)
  // -------------------

  // Ho Jin Han, A0266275W
  it("CC.15 updateCategoryController - Missing id (direct call) returns 400", async () => {
    const req = { body: { name: "X" }, params: {} };
    const res = mockRes();

    await updateCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Category ID is required" })
    );
  });

  // Ho Jin Han, A0266275W
  it("CC.16 deleteCategoryController - Missing id (direct call) returns 400", async () => {
    const req = { params: {} };
    const res = mockRes();

    await deleteCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Category ID is required" })
    );
  });

  // Ho Jin Han, A0266275W
  it("CC.17 createCategoryController - If model throws, returns 500", async () => {
    jest.spyOn(categoryModel, "findOne").mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app)
      .post("/api/v1/category/create-category")
      .send({ name: "Anything" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error in category/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.18 updateCategoryController - If findByIdAndUpdate throws, returns 500 (covers catch)", async () => {
    const id = new mongoose.Types.ObjectId().toString();

    jest
      .spyOn(categoryModel, "findByIdAndUpdate")
      .mockRejectedValueOnce(new Error("DB fail update"));

    const res = await request(app)
      .put(`/api/v1/category/update-category/${id}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while updating category/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.19 deleteCategoryController - If findByIdAndDelete throws, returns 500 (covers catch)", async () => {
    const id = new mongoose.Types.ObjectId().toString();

    jest
      .spyOn(categoryModel, "findByIdAndDelete")
      .mockRejectedValueOnce(new Error("DB fail delete"));

    const res = await request(app).delete(
      `/api/v1/category/delete-category/${id}`
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/error while deleting category/i);
  });

  // Ho Jin Han, A0266275W
  it("CC.20 singleCategoryController - Nonexistent slug returns 200 with null category (current behavior)", async () => {
    const res = await request(app).get(
      "/api/v1/category/single-category/no-such-slug"
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category).toBeNull();
    expect(res.body.message).toMatch(/get single category successfully/i);
  });

});
