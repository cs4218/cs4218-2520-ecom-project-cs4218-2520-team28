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
import { hashPassword } from "../../helpers/authHelper.js";


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