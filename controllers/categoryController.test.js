
// Jian Tao - A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// Prompt 1: "How should I unit test Express controllers that use Mongoose models?"
// Prompt 2: "How to mock categoryModel.find and findOne in Jest for controller testing?"


import { categoryController, singleCategoryController } from "./categoryController";
import categoryModel from "../models/categoryModel";


jest.mock("../models/categoryModel");

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


// categoryController tests
describe("categoryController", () => {
  test("should return all categories successfully", async () => {
    const mockCategories = [
      { name: "Electronics", slug: "electronics" },
      { name: "Clothing", slug: "clothing" },
    ];

    categoryModel.find.mockResolvedValue(mockCategories);

    await categoryController(req, res);

    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: mockCategories,
    });
  });

  test("should handle errors and return 500", async () => {
    categoryModel.find.mockRejectedValue(new Error("Database error"));

    await categoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting all categories",
    });
  });
});


// singleCategoryController tests
describe("singleCategoryController", () => {
  test("should return single category by slug", async () => {
    const mockCategory = {
      name: "Electronics",
      slug: "electronics",
    };

    categoryModel.findOne.mockResolvedValue(mockCategory);

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      slug: "electronics",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get single category successfully",
      category: mockCategory,
    });
  });

  test("should return null if category is not found", async () => {
    categoryModel.findOne.mockResolvedValue(null);

    await singleCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get single category successfully",
      category: null,
    });
  });

  test("should handle errors and return 500", async () => {
    categoryModel.findOne.mockRejectedValue(new Error("Database error"));

    await singleCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting single category",
    });
  });
});