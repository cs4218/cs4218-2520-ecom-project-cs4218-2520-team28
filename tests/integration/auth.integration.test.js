// Jian Tao, A0273320R

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import router from "../../routes/authRoute.js";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import { hashPassword, comparePassword } from "../../helpers/authHelper.js";


// Keep hashPassword mocked to focus on integration flow rather than hashing implementation.
jest.mock("../../helpers/authHelper.js", () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.setTimeout(20000);
process.env.JWT_SECRET = "test-secret";

const app = express();
app.use(express.json());
app.use("/api/v1/auth", router);

let mongoServer;

let consoleLogSpy;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(async () => {
  if (consoleLogSpy) {
    consoleLogSpy.mockRestore();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

const clearDatabase = async () => {
  await orderModel.deleteMany({});
  await productModel.deleteMany({});
  await userModel.deleteMany({});
};

// Jian Tao, A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// AI Declaration:
// Prompt used: "Help me write top-down integration tests for updateProfileController using Jest, Supertest, Express, Mongoose, and MongoMemoryServer."
// Prompt used: "Structure the tests into Level 1 (Route -> Middleware -> Controller) and Level 2 (Route -> Middleware -> Controller -> Model -> DB)."
// Prompt used: "Include cases for successful profile update with password, partial update without password change, short password validation failure, and invalid token handling."
// Prompt used: "Use real in-memory MongoDB for persistence tests, but mock hashPassword so the focus stays on integration flow instead of hashing implementation."
describe("updateProfileController integration tests", () => {
  /**
   * Top-down integration approach:
   *
   * Level 1:
   * Route -> Middleware -> Controller
   * External dependencies are mocked to isolate backend request handling.
   *
   * Level 2:
   * Route -> Middleware -> Controller -> Model -> DB
   * Uses real JWT, real Mongoose model, and in-memory MongoDB to verify persistence.
   */

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller
  // --------------------------------------------------------------------------

  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {

      jest.clearAllMocks();
    });

    test("should update profile successfully with password", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Old Name",
        email: "old@test.com",
        password: "oldhashedpw",
        phone: "11111111",
        address: "Old Address",
        role: 0,
      });

      hashPassword.mockResolvedValue("newhashedpw");

      jest.spyOn(userModel, "findByIdAndUpdate").mockResolvedValue({
        _id: "user123",
        name: "New Name",
        email: "old@test.com",
        password: "newhashedpw",
        phone: "99999999",
        address: "New Address",
        role: 0,
      });

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", "valid-token")
        .send({
          name: "New Name",
          password: "123456",
          phone: "99999999",
          address: "New Address",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Profile updated successfully");

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).toHaveBeenCalledWith("123456");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "New Name",
          password: "newhashedpw",
          phone: "99999999",
          address: "New Address",
        },
        { new: true }
      );
    });

    test("should update profile successfully without changing password", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Old Name",
        email: "old@test.com",
        password: "oldhashedpw",
        phone: "11111111",
        address: "Old Address",
        role: 0,
      });

      jest.spyOn(userModel, "findByIdAndUpdate").mockResolvedValue({
        _id: "user123",
        name: "Updated Name",
        email: "old@test.com",
        password: "oldhashedpw",
        phone: "11111111",
        address: "Updated Address",
        role: 0,
      });

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", "valid-token")
        .send({
          name: "Updated Name",
          address: "Updated Address",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Profile updated successfully");
      expect(hashPassword).not.toHaveBeenCalled();
    });

    test("should return 400 for password shorter than 6 characters", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Old Name",
        email: "old@test.com",
        password: "oldhashedpw",
        phone: "11111111",
        address: "Old Address",
        role: 0,
      });

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", "valid-token")
        .send({
          name: "New Name",
          password: "123",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Password is required and 6 character long");
      expect(hashPassword).not.toHaveBeenCalled();
    });

    test("should return 401 when token is invalid", async () => {
      jest.spyOn(JWT, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", "bad-token")
        .send({
          name: "New Name",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------

  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    let userToken;
    let seededUserId;

    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      await clearDatabase();

      const seededUser = await userModel.create({
        name: "Seed User",
        email: "seed@test.com",
        password: "oldhashedpw",
        phone: "11111111",
        address: "Old Address",
        answer: "test",
        role: 0,
      });

      seededUserId = seededUser._id.toString();
      userToken = JWT.sign({ _id: seededUserId }, process.env.JWT_SECRET);

      hashPassword.mockResolvedValue("newhashedpw");
    });

    test("should update profile and persist changes in DB", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", userToken)
        .send({
          name: "Updated Seed User",
          password: "123456",
          phone: "99999999",
          address: "Updated Address",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Profile updated successfully");

      const updatedUser = await userModel.findById(seededUserId);

      expect(updatedUser.name).toBe("Updated Seed User");
      expect(updatedUser.password).toBe("newhashedpw");
      expect(updatedUser.phone).toBe(99999999);
      expect(updatedUser.address).toBe("Updated Address");
    });

    test("should persist partial update while preserving existing password", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", userToken)
        .send({
          name: "Partially Updated User",
          address: "Only Address Changed",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await userModel.findById(seededUserId);

      expect(updatedUser.name).toBe("Partially Updated User");
      expect(updatedUser.address).toBe("Only Address Changed");
      expect(updatedUser.password).toBe("oldhashedpw");
      expect(updatedUser.phone).toBe(11111111);
    });

    test("should reject invalid token and keep DB unchanged", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", "invalid-token")
        .send({
          name: "Should Not Persist",
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");

      const unchangedUser = await userModel.findById(seededUserId);
      expect(unchangedUser.name).toBe("Seed User");
      expect(unchangedUser.address).toBe("Old Address");
      expect(unchangedUser.password).toBe("oldhashedpw");
    });
  });
});

// Jian Tao, A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// AI Declaration:
// Prompt used: "Help me write top-down integration tests for getOrdersController."
// Prompt used: "For Level 1, mock the model chain for orderModel.find().populate().populate() and verify only the route, middleware, and controller integration."
// Prompt used: "For Level 2, use MongoMemoryServer with real user, product, and order documents to verify that only the authenticated buyer's orders are returned."
// Prompt used: "Include cases for successful retrieval, empty order list, backend failure, and missing authorization token."
describe("getOrdersController integration tests", () => {
  /**
   * Top-down integration approach:
   *
   * Level 1:
   * Route -> Middleware -> Controller
   * External dependencies are mocked to isolate backend request handling.
   *
   * Level 2:
   * Route -> Middleware -> Controller -> Model -> DB
   * Uses real JWT, real Mongoose models, and in-memory MongoDB to verify retrieval and population.
   */

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should get orders successfully for authenticated user", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "buyer123" });

      const mockOrders = [
        {
          _id: "order1",
          buyer: { _id: "buyer123", name: "John Doe" },
          products: [
            {
              _id: "prod1",
              name: "Product A",
              price: 100,
            },
          ],
          status: "Processing",
        },
      ];

      const populateBuyer = jest.fn().mockResolvedValue(mockOrders);
      const populateProducts = jest.fn().mockReturnValue({
        populate: populateBuyer,
      });

      jest.spyOn(orderModel, "find").mockReturnValue({
        populate: populateProducts,
      });

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", "valid-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOrders);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: "buyer123" });
      expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
      expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
    });

    test("should return 500 when order retrieval fails", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "buyer123" });

      jest.spyOn(orderModel, "find").mockImplementation(() => {
        throw new Error("Database failed");
      });

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", "valid-token");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error while getting orders");
    });

    test("should return 401 when no authorization header is provided", async () => {
      const res = await request(app).get("/api/v1/auth/orders");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      await clearDatabase();
    });

    test("should retrieve only the authenticated buyer's orders from DB", async () => {
      const buyer1 = await userModel.create({
        name: "Buyer One",
        email: "buyer1@test.com",
        password: "hashedpw1",
        phone: "11111111",
        address: "Address 1",
        answer: "blue",
        role: 0,
      });

      const buyer2 = await userModel.create({
        name: "Buyer Two",
        email: "buyer2@test.com",
        password: "hashedpw2",
        phone: "22222222",
        address: "Address 2",
        answer: "green",
        role: 0,
      });

      const product1 = await productModel.create({
        name: "Phone",
        slug: "phone",
        description: "A smartphone",
        price: 1000,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        shipping: true,
      });

      const product2 = await productModel.create({
        name: "Laptop",
        slug: "laptop",
        description: "A laptop",
        price: 2000,
        category: new mongoose.Types.ObjectId(),
        quantity: 3,
        shipping: true,
      });

      await orderModel.create({
        products: [product1._id],
        payment: { method: "card" },
        buyer: buyer1._id,
        status: "Processing",
      });

      await orderModel.create({
        products: [product2._id],
        payment: { method: "card" },
        buyer: buyer2._id,
        status: "Delivered",
      });

      const token = JWT.sign({ _id: buyer1._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      expect(res.body[0].status).toBe("Processing");
      expect(res.body[0].buyer.name).toBe("Buyer One");
      expect(res.body[0].buyer._id.toString()).toBe(buyer1._id.toString());

      expect(res.body[0].products).toHaveLength(1);
      expect(res.body[0].products[0].name).toBe("Phone");
      expect(res.body[0].products[0].price).toBe(1000);
      expect(res.body[0].products[0].photo).toBeUndefined();
    });

    test("should return empty array when authenticated buyer has no orders in DB", async () => {
      const buyer = await userModel.create({
        name: "No Orders User",
        email: "noorders@test.com",
        password: "hashedpw",
        phone: "33333333",
        address: "Address 3",
        answer: "red",
        role: 0,
      });

      const token = JWT.sign({ _id: buyer._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});

// Jian Tao, A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// AI Declaration:
// Prompt used: "Help me write top-down integration tests for getAllOrdersController with admin-only access."
// Prompt used: "Split the tests into Level 1 with mocked dependencies and Level 2 with real database persistence."
// Prompt used: "Test successful admin retrieval of all orders, rejection of non-admin users, missing token handling, and verify sorting by createdAt descending."
// Prompt used: "Use realistic seeded users, products, and orders so the integration tests reflect actual backend behaviour."
describe("getAllOrdersController integration tests", () => {
  /**
   * Top-down integration approach:
   *
   * Level 1:
   * Route -> Middleware -> Controller
   * External dependencies are mocked to isolate backend request handling.
   *
   * Level 2:
   * Route -> Middleware -> Controller -> Model -> DB
   * Uses real JWT, real Mongoose models, and in-memory MongoDB to verify
   * retrieval, population, sorting, and admin-only access.
   */

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should get all orders successfully for admin user", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "admin123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "admin123",
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "blue",
        role: 1,
      });

      const mockOrders = [
        {
          _id: "order2",
          buyer: { _id: "buyer2", name: "Buyer Two" },
          products: [
            {
              _id: "prod2",
              name: "Laptop",
              price: 2000,
            },
          ],
          status: "Delivered",
        },
        {
          _id: "order1",
          buyer: { _id: "buyer1", name: "Buyer One" },
          products: [
            {
              _id: "prod1",
              name: "Phone",
              price: 1000,
            },
          ],
          status: "Processing",
        },
      ];

      const sortMock = jest.fn().mockResolvedValue(mockOrders);
      const populateBuyer = jest.fn().mockReturnValue({
        sort: sortMock,
      });
      const populateProducts = jest.fn().mockReturnValue({
        populate: populateBuyer,
      });

      jest.spyOn(orderModel, "find").mockReturnValue({
        populate: populateProducts,
      });

      const res = await request(app)
        .get("/api/v1/auth/all-orders")
        .set("Authorization", "valid-admin-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOrders);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
      expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test("should return 403 when authenticated user is not admin", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Normal User",
        email: "user@test.com",
        password: "hashedpw",
        phone: "88888888",
        address: "User Address",
        answer: "red",
        role: 0,
      });

      const res = await request(app)
        .get("/api/v1/auth/all-orders")
        .set("Authorization", "valid-user-token");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");
    });

    test("should return 401 when no authorization header is provided", async () => {
      const res = await request(app).get("/api/v1/auth/all-orders");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    let adminToken;
    let userToken;
    let adminUser;
    let normalUser;

    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      await clearDatabase();

      adminUser = await userModel.create({
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedadminpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "blue",
        role: 1,
      });

      normalUser = await userModel.create({
        name: "Normal User",
        email: "user@test.com",
        password: "hasheduserpw",
        phone: "88888888",
        address: "User Address",
        answer: "green",
        role: 0,
      });

      adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);
      userToken = JWT.sign({ _id: normalUser._id }, process.env.JWT_SECRET);
    });

    test("should retrieve all orders from DB for admin user", async () => {
      const buyer1 = await userModel.create({
        name: "Buyer One",
        email: "buyer1@test.com",
        password: "hashedpw1",
        phone: "11111111",
        address: "Address 1",
        answer: "yellow",
        role: 0,
      });

      const buyer2 = await userModel.create({
        name: "Buyer Two",
        email: "buyer2@test.com",
        password: "hashedpw2",
        phone: "22222222",
        address: "Address 2",
        answer: "purple",
        role: 0,
      });

      const product1 = await productModel.create({
        name: "Phone",
        slug: "phone",
        description: "A smartphone",
        price: 1000,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        shipping: true,
      });

      const product2 = await productModel.create({
        name: "Laptop",
        slug: "laptop",
        description: "A laptop computer",
        price: 2000,
        category: new mongoose.Types.ObjectId(),
        quantity: 3,
        shipping: true,
      });

      await orderModel.create({
        products: [product1._id],
        payment: { method: "card" },
        buyer: buyer1._id,
        status: "Processing",
      });

      await orderModel.create({
        products: [product2._id],
        payment: { method: "paypal" },
        buyer: buyer2._id,
        status: "Delivered",
      });

      const res = await request(app)
        .get("/api/v1/auth/all-orders")
        .set("Authorization", adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const returnedStatuses = res.body.map((order) => order.status);
      expect(returnedStatuses).toContain("Processing");
      expect(returnedStatuses).toContain("Delivered");

      const returnedBuyerNames = res.body.map((order) => order.buyer.name);
      expect(returnedBuyerNames).toContain("Buyer One");
      expect(returnedBuyerNames).toContain("Buyer Two");
    });

    test("should return orders sorted by createdAt descending", async () => {
      const buyer = await userModel.create({
        name: "Sort Buyer",
        email: "sortbuyer@test.com",
        password: "hashedpw",
        phone: "77777777",
        address: "Sort Address",
        answer: "black",
        role: 0,
      });

      const product = await productModel.create({
        name: "Monitor",
        slug: "monitor",
        description: "A monitor",
        price: 500,
        category: new mongoose.Types.ObjectId(),
        quantity: 8,
        shipping: true,
      });

      const olderOrder = await orderModel.create({
        products: [product._id],
        payment: { method: "card" },
        buyer: buyer._id,
        status: "Processing",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const newerOrder = await orderModel.create({
        products: [product._id],
        payment: { method: "paypal" },
        buyer: buyer._id,
        status: "Delivered",
      });

      const res = await request(app)
        .get("/api/v1/auth/all-orders")
        .set("Authorization", adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]._id.toString()).toBe(newerOrder._id.toString());
      expect(res.body[1]._id.toString()).toBe(olderOrder._id.toString());
    });

    test("should return 403 when non-admin user accesses all-orders", async () => {
      const res = await request(app)
        .get("/api/v1/auth/all-orders")
        .set("Authorization", userToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");
    });
  });
});

// Jian Tao, A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// AI Declaration:
// Prompt used: "Help me write top-down integration tests for orderStatusController."
// Prompt used: "At Level 1, mock JWT verification, admin role lookup, and orderModel.findByIdAndUpdate to isolate route, middleware, and controller behaviour."
// Prompt used: "At Level 2, use MongoMemoryServer to verify that an admin can update order status and the change persists in the database."
// Prompt used: "Include negative cases for non-admin access, missing token, database failure, and invalid order id format."
describe("orderStatusController integration tests", () => {
  /**
   * Top-down integration approach:
   *
   * Level 1:
   * Route -> Middleware -> Controller
   * External dependencies are mocked to isolate backend request handling.
   *
   * Level 2:
   * Route -> Middleware -> Controller -> Model -> DB
   * Uses real JWT, real Mongoose models, and in-memory MongoDB to verify
   * admin-only status update and persistence.
   */

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should update order status successfully for admin user", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "admin123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "admin123",
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "blue",
        role: 1,
      });

      const updatedOrder = {
        _id: "order123",
        status: "Shipped",
      };

      jest.spyOn(orderModel, "findByIdAndUpdate").mockResolvedValue(updatedOrder);

      const res = await request(app)
        .put("/api/v1/auth/order-status/order123")
        .set("Authorization", "valid-admin-token")
        .send({
          status: "Shipped",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedOrder);
      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "order123",
        { status: "Shipped" },
        { new: true }
      );
    });

    test("should return 403 when authenticated user is not admin", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Normal User",
        email: "user@test.com",
        password: "hashedpw",
        phone: "88888888",
        address: "User Address",
        answer: "red",
        role: 0,
      });

      const res = await request(app)
        .put("/api/v1/auth/order-status/order123")
        .set("Authorization", "valid-user-token")
        .send({
          status: "Shipped",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");
    });

    test("should return 500 when order status update fails", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "admin123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "admin123",
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "blue",
        role: 1,
      });

      jest
        .spyOn(orderModel, "findByIdAndUpdate")
        .mockRejectedValue(new Error("DB error"));

      const res = await request(app)
        .put("/api/v1/auth/order-status/order123")
        .set("Authorization", "valid-admin-token")
        .send({
          status: "Cancelled",
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error while updating order status");
    });

    test("should return 401 when no authorization header is provided", async () => {
      const res = await request(app)
        .put("/api/v1/auth/order-status/order123")
        .send({
          status: "Delivered",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    let adminToken;
    let userToken;
    let adminUser;
    let normalUser;
    let buyer;
    let product;
    let seededOrder;

    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();

      await clearDatabase();

      adminUser = await userModel.create({
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedadminpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "blue",
        role: 1,
      });

      normalUser = await userModel.create({
        name: "Normal User",
        email: "user@test.com",
        password: "hasheduserpw",
        phone: "88888888",
        address: "User Address",
        answer: "green",
        role: 0,
      });

      buyer = await userModel.create({
        name: "Buyer User",
        email: "buyer@test.com",
        password: "hashedbuyerpw",
        phone: "77777777",
        address: "Buyer Address",
        answer: "yellow",
        role: 0,
      });

      product = await productModel.create({
        name: "Phone",
        slug: "phone",
        description: "A smartphone",
        price: 1000,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        shipping: true,
      });

      seededOrder = await orderModel.create({
        products: [product._id],
        payment: { method: "card" },
        buyer: buyer._id,
        status: "Processing",
      });

      adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);
      userToken = JWT.sign({ _id: normalUser._id }, process.env.JWT_SECRET);
    });

    test("should update order status and persist changes in DB for admin user", async () => {
      const res = await request(app)
        .put(`/api/v1/auth/order-status/${seededOrder._id}`)
        .set("Authorization", adminToken)
        .send({
          status: "Delivered",
        });

      expect(res.status).toBe(200);
      expect(res.body._id.toString()).toBe(seededOrder._id.toString());
      expect(res.body.status).toBe("Delivered");

      const updatedOrder = await orderModel.findById(seededOrder._id);
      expect(updatedOrder.status).toBe("Delivered");
    });

    test("should return 403 and keep DB unchanged when non-admin user updates order status", async () => {
      const res = await request(app)
        .put(`/api/v1/auth/order-status/${seededOrder._id}`)
        .set("Authorization", userToken)
        .send({
          status: "Cancelled",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");

      const unchangedOrder = await orderModel.findById(seededOrder._id);
      expect(unchangedOrder.status).toBe("Processing");
    });

    test("should return 401 and keep DB unchanged when token is missing", async () => {
      const res = await request(app)
        .put(`/api/v1/auth/order-status/${seededOrder._id}`)
        .send({
          status: "Shipped",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");

      const unchangedOrder = await orderModel.findById(seededOrder._id);
      expect(unchangedOrder.status).toBe("Processing");
    });

    test("should return 500 for invalid order id format", async () => {
      const res = await request(app)
        .put("/api/v1/auth/order-status/not-a-valid-id")
        .set("Authorization", adminToken)
        .send({
          status: "Delivered",
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error while updating order status");
    });
  });
});

// Foo Tzie Huang - A0262376Y
// AI-assisted integration tests generated with guidance from Claude (Anthropic)
// AI Declaration:
// Prompt used: "Write bottom-up integration tests for registerController, loginController, forgotPasswordController, and testController."
// Prompt used: "Structure as Level 1 (Route -> Middleware -> Controller with mocked Model) and Level 2 (Route -> Middleware -> Controller -> Model -> DB with real in-memory MongoDB)."
describe("registerController integration tests", () => {
  // Foo Tzie Huang - A0262376Y

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller (mock Model/DB)
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should register a new user successfully", async () => {
      jest.spyOn(userModel, "findOne").mockResolvedValue(null);

      hashPassword.mockResolvedValue("hashedPassword");

      const mockUser = {
        _id: "newuser123",
        name: "Test User",
        email: "test@test.com",
        phone: "12345678",
        address: "Test Address",
        password: "hashedPassword",
        answer: "test answer",
        role: 0,
      };

      jest.spyOn(userModel.prototype, "save").mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test User",
          email: "test@test.com",
          password: "password123",
          phone: "12345678",
          address: "Test Address",
          answer: "test answer",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User Register Successfully");
      expect(res.body.user).toBeDefined();
      expect(hashPassword).toHaveBeenCalledWith("password123");
    });

    test("should return error when user already exists", async () => {
      jest.spyOn(userModel, "findOne").mockResolvedValue({
        _id: "existing123",
        email: "existing@test.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Existing User",
          email: "existing@test.com",
          password: "password123",
          phone: "12345678",
          address: "Test Address",
          answer: "test answer",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Already Register please login");
    });

    test("should return error when name is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@test.com",
          password: "password123",
          phone: "12345678",
          address: "Test Address",
          answer: "test answer",
        });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe("Name is Required");
    });

    test("should return 401 for invalid token on protected route", async () => {
      jest.spyOn(JWT, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/api/v1/auth/test")
        .set("Authorization", "invalid-token");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      await clearDatabase();

      hashPassword.mockResolvedValue("hashedPassword");
    });

    test("should register user and persist in DB", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "New DB User",
          email: "newdbuser@test.com",
          password: "password123",
          phone: "12345678",
          address: "DB Address",
          answer: "db answer",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User Register Successfully");

      const savedUser = await userModel.findOne({ email: "newdbuser@test.com" });
      expect(savedUser).not.toBeNull();
      expect(savedUser.name).toBe("New DB User");
      expect(savedUser.email).toBe("newdbuser@test.com");
      expect(savedUser.address).toBe("DB Address");
      expect(savedUser.answer).toBe("db answer");
    });

    test("should prevent duplicate registration", async () => {
      await userModel.create({
        name: "Existing User",
        email: "duplicate@test.com",
        password: "hashedPassword",
        phone: "12345678",
        address: "Existing Address",
        answer: "existing answer",
        role: 0,
      });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Duplicate User",
          email: "duplicate@test.com",
          password: "password123",
          phone: "87654321",
          address: "New Address",
          answer: "new answer",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Already Register please login");

      const users = await userModel.find({ email: "duplicate@test.com" });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("Existing User");
    });

    test("should verify hashed password is stored (not plain text)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Hash Check User",
          email: "hashcheck@test.com",
          password: "plainTextPassword",
          phone: "11112222",
          address: "Hash Address",
          answer: "hash answer",
        });

      expect(res.status).toBe(201);

      const savedUser = await userModel.findOne({ email: "hashcheck@test.com" });
      expect(savedUser.password).toBe("hashedPassword");
      expect(savedUser.password).not.toBe("plainTextPassword");
      expect(hashPassword).toHaveBeenCalledWith("plainTextPassword");
    });
  });
});

// Foo Tzie Huang - A0262376Y
// AI-assisted integration tests generated with guidance from Claude (Anthropic)
// AI Declaration:
// Prompt used: "Write bottom-up integration tests for loginController with Level 1 and Level 2."
// Prompt used: "Include cases for successful login, missing credentials, non-existent email, and wrong password."
describe("loginController integration tests", () => {
  // Foo Tzie Huang - A0262376Y

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller (mock Model/DB)
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should login successfully with correct credentials", async () => {
      const mockUser = {
        _id: "user123",
        name: "Login User",
        email: "login@test.com",
        password: "hashedPassword",
        phone: "12345678",
        address: "Login Address",
        role: 0,
      };

      jest.spyOn(userModel, "findOne").mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@test.com",
          password: "correctPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("login successfully");
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("login@test.com");
      expect(res.body.user.name).toBe("Login User");
      expect(comparePassword).toHaveBeenCalledWith("correctPassword", "hashedPassword");
    });

    test("should return 404 for missing email or password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "",
          password: "",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid email or password");
    });

    test("should return 404 for non-existent email", async () => {
      jest.spyOn(userModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@test.com",
          password: "somePassword",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email is not registerd");
    });

    test("should return 200 with success false for wrong password", async () => {
      const mockUser = {
        _id: "user123",
        name: "Login User",
        email: "login@test.com",
        password: "hashedPassword",
        phone: "12345678",
        address: "Login Address",
        role: 0,
      };

      jest.spyOn(userModel, "findOne").mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@test.com",
          password: "wrongPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid Password");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      await clearDatabase();

      hashPassword.mockResolvedValue("hashedPassword");
      comparePassword.mockResolvedValue(true);
    });

    test("should login with real user in DB", async () => {
      await userModel.create({
        name: "DB Login User",
        email: "dblogin@test.com",
        password: "hashedPassword",
        phone: "12345678",
        address: "DB Login Address",
        answer: "db answer",
        role: 0,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "dblogin@test.com",
          password: "correctPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("login successfully");
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
    });

    test("should return user object with correct fields (no password)", async () => {
      await userModel.create({
        name: "Fields User",
        email: "fields@test.com",
        password: "hashedPassword",
        phone: "99887766",
        address: "Fields Address",
        answer: "fields answer",
        role: 0,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "fields@test.com",
          password: "correctPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user._id).toBeDefined();
      expect(res.body.user.name).toBe("Fields User");
      expect(res.body.user.email).toBe("fields@test.com");
      expect(res.body.user.phone).toBe(99887766);
      expect(res.body.user.address).toBe("Fields Address");
      expect(res.body.user.role).toBe(0);
      expect(res.body.user.password).toBeUndefined();
    });

    test("should return JWT token on successful login", async () => {
      const createdUser = await userModel.create({
        name: "Token User",
        email: "token@test.com",
        password: "hashedPassword",
        phone: "55566677",
        address: "Token Address",
        answer: "token answer",
        role: 0,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "token@test.com",
          password: "correctPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = JWT.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(createdUser._id.toString());
    });
  });
});

// Foo Tzie Huang - A0262376Y
// AI-assisted integration tests generated with guidance from Claude (Anthropic)
// AI Declaration:
// Prompt used: "Write bottom-up integration tests for forgotPasswordController with Level 1 and Level 2."
// Prompt used: "Include cases for successful password reset, wrong email/answer, missing email, and DB persistence verification."
describe("forgotPasswordController integration tests", () => {
  // Foo Tzie Huang - A0262376Y

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller (mock Model/DB)
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should reset password successfully", async () => {
      const mockUser = {
        _id: "user123",
        email: "forgot@test.com",
        answer: "secret answer",
      };

      jest.spyOn(userModel, "findOne").mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newHashedPassword");
      jest.spyOn(userModel, "findByIdAndUpdate").mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "forgot@test.com",
          answer: "secret answer",
          newPassword: "newPassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Password Reset Successfully");
      expect(hashPassword).toHaveBeenCalledWith("newPassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        password: "newHashedPassword",
      });
    });

    test("should return 404 for wrong email or answer", async () => {
      jest.spyOn(userModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "wrong@test.com",
          answer: "wrong answer",
          newPassword: "newPassword123",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Wrong Email Or Answer");
    });

    test("should return 500 when an unexpected error occurs", async () => {
      jest.spyOn(userModel, "findOne").mockRejectedValue(new Error("DB failure"));

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "error@test.com",
          answer: "some answer",
          newPassword: "newPassword123",
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Something went wrong");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      await clearDatabase();

      hashPassword.mockResolvedValue("hashedPassword");
    });

    test("should reset password and persist new hashed password in DB", async () => {
      await userModel.create({
        name: "Forgot User",
        email: "forgotdb@test.com",
        password: "oldHashedPassword",
        phone: "12345678",
        address: "Forgot Address",
        answer: "my secret",
        role: 0,
      });

      hashPassword.mockResolvedValue("newHashedPassword");

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "forgotdb@test.com",
          answer: "my secret",
          newPassword: "brandNewPassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Password Reset Successfully");

      const updatedUser = await userModel.findOne({ email: "forgotdb@test.com" });
      expect(updatedUser.password).toBe("newHashedPassword");
      expect(hashPassword).toHaveBeenCalledWith("brandNewPassword");
    });

    test("should verify old password is replaced", async () => {
      await userModel.create({
        name: "Replace PW User",
        email: "replacepw@test.com",
        password: "originalHashedPW",
        phone: "99998888",
        address: "Replace Address",
        answer: "replace answer",
        role: 0,
      });

      hashPassword.mockResolvedValue("replacementHashedPW");

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({
          email: "replacepw@test.com",
          answer: "replace answer",
          newPassword: "replacementPassword",
        });

      expect(res.status).toBe(200);

      const updatedUser = await userModel.findOne({ email: "replacepw@test.com" });
      expect(updatedUser.password).not.toBe("originalHashedPW");
      expect(updatedUser.password).toBe("replacementHashedPW");
    });
  });
});

// Foo Tzie Huang - A0262376Y
// AI-assisted integration tests generated with guidance from Claude (Anthropic)
// AI Declaration:
// Prompt used: "Write bottom-up integration tests for testController (GET /api/v1/auth/test) with requireSignIn and isAdmin middleware."
// Prompt used: "Include Level 1 (mocked JWT and model) and Level 2 (real DB and JWT) tests for admin access, non-admin rejection, and missing token."
describe("testController integration tests", () => {
  // Foo Tzie Huang - A0262376Y

  // --------------------------------------------------------------------------
  // LEVEL 1 — Route -> Middleware -> Controller (mock Model/DB)
  // --------------------------------------------------------------------------
  describe("Level 1 - Route -> Middleware -> Controller", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    test("should return 'Protected Routes' for admin user", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "admin123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "admin123",
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedpw",
        phone: "99999999",
        address: "Admin Address",
        answer: "admin answer",
        role: 1,
      });

      const res = await request(app)
        .get("/api/v1/auth/test")
        .set("Authorization", "valid-admin-token");

      expect(res.status).toBe(200);
      expect(res.text).toBe("Protected Routes");
    });

    test("should return 403 for non-admin user", async () => {
      jest.spyOn(JWT, "verify").mockReturnValue({ _id: "user123" });

      jest.spyOn(userModel, "findById").mockResolvedValue({
        _id: "user123",
        name: "Normal User",
        email: "user@test.com",
        password: "hashedpw",
        phone: "88888888",
        address: "User Address",
        answer: "user answer",
        role: 0,
      });

      const res = await request(app)
        .get("/api/v1/auth/test")
        .set("Authorization", "valid-user-token");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");
    });

    test("should return 401 for missing token", async () => {
      const res = await request(app).get("/api/v1/auth/test");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized: Invalid or missing token");
    });
  });

  // --------------------------------------------------------------------------
  // LEVEL 2 — Route -> Middleware -> Controller -> Model -> DB
  // --------------------------------------------------------------------------
  describe("Level 2 - Route -> Middleware -> Controller -> Model -> DB", () => {
    beforeEach(async () => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
      await clearDatabase();
    });

    test("should allow admin to access protected route", async () => {
      const adminUser = await userModel.create({
        name: "Admin DB User",
        email: "admindb@test.com",
        password: "hashedAdminPW",
        phone: "99999999",
        address: "Admin DB Address",
        answer: "admin db answer",
        role: 1,
      });

      const adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get("/api/v1/auth/test")
        .set("Authorization", adminToken);

      expect(res.status).toBe(200);
      expect(res.text).toBe("Protected Routes");
    });

    test("should reject non-admin from accessing protected route", async () => {
      const normalUser = await userModel.create({
        name: "Normal DB User",
        email: "normaldb@test.com",
        password: "hashedNormalPW",
        phone: "88888888",
        address: "Normal DB Address",
        answer: "normal db answer",
        role: 0,
      });

      const userToken = JWT.sign({ _id: normalUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get("/api/v1/auth/test")
        .set("Authorization", userToken);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unauthorized Access");
    });
  });
});