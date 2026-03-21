import { updateProfileController, getOrdersController, 
  getAllOrdersController, orderStatusController, registerController, loginController, forgotPasswordController, testController } from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import orderModel from "../models/orderModel.js";


jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

describe("authController", () => {

  // Jian Tao - A0273320R
  // AI-assisted unit tests generated with guidance from ChatGPT-5.2
  // Test Coverage: Successful full profile update, Successful partial update (name only),
  // Successful partial update (password only), Password validation error (length < 6 returns 400),
  // Database error during findById, Error during password hashing, Database error during findByIdAndUpdate
  describe("updateProfileController", () => {

    let existingUser, res;
    beforeEach(() => {
      jest.clearAllMocks() // Clear mocks before each test

      existingUser = {
        _id: "userId123",
        name: "Old Name",
        password: "hashedOldPassword",
        email: "oldemail@example.com",
        phone: "0987654321",
        address: "Old Address",
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
    });

    test("should update user profile successfully", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
          password: "newpassword",
          address: "New Address",
          phone: "1234567890",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("hashedNewPassword");

      const updatedUser = {
        ...existingUser,
        name: "New Name",
        password: "hashedNewPassword",
        phone: "1234567890",
        address: "New Address",
      };

      userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      // Act
      await updateProfileController(req, res);

      // Assert — DB logic
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedNewPassword",
          phone: "1234567890",
          address: "New Address",
        },
        { new: true }
      );

      // Assert — response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile updated successfully",
          updatedUser: 
          { 
            ...existingUser,
            name: "New Name",
            password: "hashedNewPassword",
            phone: "1234567890",
            address: "New Address",
          },
        })
      );
    });


    
    test("should update user profile successfully with changing only name", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...existingUser,
        name: "New Name",
      });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: {
          ...existingUser,
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
      });
    });


    test("should update user profile successfully with changing only password", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123",},
        body: {
          password: "newpassword",
        },
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("hashedNewPassword");
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...existingUser,
        password: "hashedNewPassword",
      });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "Old Name",
          password: "hashedNewPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }   
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        updatedUser: {
          ...existingUser,
          password: "hashedNewPassword",
        },
      });
    });

    test("should return error if password is less than 6 characters", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          password: "123",
        },
      };
      userModel.findById.mockResolvedValue(existingUser);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    test("should handle errors during profile update", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: {
          name: "New Name",
        },
      };
      userModel.findById.mockRejectedValue(new Error("Database error"));

      // Act
      await updateProfileController(req, res);
      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


    test("should handle errors during password hashing", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123",},
        body: { password: "newpassword", },
      };
      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockRejectedValue(new Error("Hashing error"));

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


    test("should handle errors during user update", async () => {
      // Arrange
      const req = {
        user: { _id: "userId123" },
        body: { name: "New Name" },
      };
      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockRejectedValue(new Error("Update error"));

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("userId123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "userId123",
        {
          name: "New Name",
          password: "hashedOldPassword",
          phone: "0987654321",
          address: "Old Address",
        },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
          error: expect.any(Error),
        })
      );
    });


  });


  // Jian Tao - A0273320R
  // AI-assisted unit tests generated with guidance from ChatGPT-5.2
  // Test Coverage: Successfully returns user orders, Handles database error and returns 500
  describe("getOrderController", () => {    // Tests for getOrderController would go here

    let req, res;

    beforeEach(() => {
      jest.clearAllMocks();
      req = {
        user: { _id: "user123" },
      };

      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

    });

    test("should return orders for logged-in user", async () => {
    const mockOrders = [{ _id: "order1" }];

    orderModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockImplementation(() =>
          Promise.resolve(mockOrders)
        ),
      }),
    });


    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
    expect(res.json).toHaveBeenCalledWith(mockOrders);
    });



    test("should handle error and return 500", async () => {
      orderModel.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting orders",
        })
      );

    });

  });


  // Jian Tao - A0273320R
  // AI-assisted unit tests generated with guidance from ChatGPT-5.2
  // Test Coverage: Successfully returns all orders, Handles database error and returns 500
  describe("getAllOrdersController", () => {

    let res;

    beforeEach(() => {
      jest.clearAllMocks();

      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
    });


    test("should return all orders", async () => {
      // Arrange
      const req = {};
      const mockOrders = [{ _id: "order1" }, { _id: "order2" }];

      orderModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockImplementation(() =>
              Promise.resolve(mockOrders)
            ),
          }),
        }),
      });

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    test("should handle error and return 500", async () => {
      // Arrange
      const req = {};
      orderModel.find.mockImplementation(() => {
        throw new Error("DB error");
      });

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting all orders",
        })
      );
    });
  });


  // Jian Tao - A0273320R
  // AI-assisted unit tests generated with guidance from ChatGPT-5.2
  // Test Coverage: Successfully updates order status, Handles database error and returns 500
  describe("orderStatusController", () => {

    let res;

    beforeEach(() => {
      jest.clearAllMocks();
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
    });
      
    test("should update order status successfully", async () => {
      const req = {
        params: { orderId: "order123" },
        body: { status: "Delivered" },
      };

      const updatedOrder = {
        _id: "order123",
        status: "Delivered",
      };

      orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      await orderStatusController(req, res);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "order123",
        { status: "Delivered" },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });


    test("should handle error and return 500", async () => {
      // Arrange
      const req = {
        params: { orderId: "order123" },
        body: { status: "Delivered" },
      };

      orderModel.findByIdAndUpdate.mockImplementation(() => {
        throw new Error("DB error");
      });

      // Act
      await orderStatusController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating order status",
        })
      );
    });
  });


  // Foo Tzie Huang - A0262376Y
  // AI-assisted unit tests generated with guidance from GitHub Copilot (Claude Haiku 4.5)
  // Updated for MS2: Added comprehensive validation failure tests for all branches,
  // existing user check, and catch/error branch as per MS1 feedback.
  // AI Assistance: CodeMax (Claude Sonnet 4)
  describe("registerController", () => {
    let res;
    beforeEach(() => {
      jest.clearAllMocks();
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    // --- Success path ---

    test("should register a new user successfully", async () => {
      const req = {
        body: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          phone: "12345678",
          address: "123 AI Lane",
          answer: "Blue",
        },
      };

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassword123");

      const mockSave = jest.fn().mockResolvedValue(req.body);
      userModel.mockImplementation(() => ({
        save: mockSave,
      }));

      await registerController(req, res);

      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
        })
      );
    });

    // --- Validation failure branches (all 6 required fields) ---

    test("should return error if name is missing", async () => {
      const req = { body: { email: "t@e.com", password: "p", phone: "1", address: "a", answer: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return error if email is missing", async () => {
      const req = { body: { name: "User", password: "p", phone: "1", address: "a", answer: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return error if password is missing", async () => {
      const req = { body: { name: "User", email: "t@e.com", phone: "1", address: "a", answer: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return error if phone is missing", async () => {
      const req = { body: { name: "User", email: "t@e.com", password: "p", address: "a", answer: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return error if address is missing", async () => {
      const req = { body: { name: "User", email: "t@e.com", password: "p", phone: "1", answer: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return error if answer is missing", async () => {
      const req = { body: { name: "User", email: "t@e.com", password: "p", phone: "1", address: "a" } };
      await registerController(req, res);
      expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    // --- Existing user ---

    test("should return error if user already exists", async () => {
      const req = {
        body: { name: "User", email: "existing@example.com", password: "p", phone: "1", address: "a", answer: "a" },
      };
      userModel.findOne.mockResolvedValue({ _id: "existing123", email: "existing@example.com" });

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });
      expect(hashPassword).not.toHaveBeenCalled();
    });

    // --- Error/catch branch ---

    test("should return 500 when an unexpected error occurs", async () => {
      const req = {
        body: { name: "User", email: "t@e.com", password: "p", phone: "1", address: "a", answer: "a" },
      };
      userModel.findOne.mockRejectedValue(new Error("DB crash"));

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Errro in Registeration",
        })
      );
    });
  });

  // Foo Tzie Huang - A0262376Y
  // AI-assisted unit tests generated with guidance from GitHub Copilot (Claude Haiku 4.5)
  // Updated for MS2: Added all failure branches (missing credentials, user not found,
  // wrong password, catch branch) as per MS1 feedback.
  // AI Assistance: CodeMax (Claude Sonnet 4)
  describe("loginController", () => {
    let res;
    beforeEach(() => {
      jest.clearAllMocks();
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    // --- Success path ---

    test("should login successfully with correct credentials", async () => {
      const req = { body: { email: "test@example.com", password: "password123" } };
      const mockUser = {
        _id: "u123",
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword",
        phone: "12345678",
        address: "123 Street",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      await loginController(req, res);

      expect(comparePassword).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
          user: expect.objectContaining({
            _id: "u123",
            name: "Test User",
            email: "test@example.com",
          }),
        })
      );
    });

    // --- Missing email or password ---

    test("should return 404 when email is missing", async () => {
      const req = { body: { password: "password123" } };
      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return 404 when password is missing", async () => {
      const req = { body: { email: "test@example.com" } };
      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    test("should return 404 when both email and password are missing", async () => {
      const req = { body: {} };
      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    // --- User not found ---

    test("should return 404 when email is not registered", async () => {
      const req = { body: { email: "unknown@example.com", password: "password123" } };
      userModel.findOne.mockResolvedValue(null);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registerd",
      });
    });

    // --- Wrong password ---

    test("should return 200 with success false when password is invalid", async () => {
      const req = { body: { email: "test@example.com", password: "wrongpassword" } };
      const mockUser = {
        _id: "u123",
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword",
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await loginController(req, res);

      expect(comparePassword).toHaveBeenCalledWith("wrongpassword", "hashedPassword");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    // --- Error/catch branch ---

    test("should return 500 when an unexpected error occurs", async () => {
      const req = { body: { email: "test@example.com", password: "password123" } };
      userModel.findOne.mockRejectedValue(new Error("DB crash"));

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        })
      );
    });
  });

  // Foo Tzie Huang - A0262376Y
  // AI-assisted unit tests generated with guidance from GitHub Copilot (Claude Haiku 4.5)
  // Updated for MS2: Added tests for missing answer, missing newPassword, and verified
  // that validation checks do NOT stop execution (known bug — missing return statements).
  // AI Assistance: CodeMax (Claude Sonnet 4)
  describe("forgotPasswordController", () => {
    let res;
    beforeEach(() => {
      jest.clearAllMocks();
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    // --- Success path ---

    test("should reset password successfully", async () => {
      const req = {
        body: {
          email: "user@example.com",
          answer: "Blue",
          newPassword: "newSecurePassword",
        },
      };

      userModel.findOne.mockResolvedValue({ _id: "user123" });
      hashPassword.mockResolvedValue("hashedNewPassword");
      userModel.findByIdAndUpdate.mockResolvedValue(true);

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "user@example.com",
        answer: "Blue",
      });
      expect(hashPassword).toHaveBeenCalledWith("newSecurePassword");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        password: "hashedNewPassword",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password Reset Successfully",
        })
      );
    });

    // --- Wrong email or answer ---

    test("should return 404 for wrong email or answer", async () => {
      const req = {
        body: { email: "wrong@example.com", answer: "Wrong", newPassword: "newpass123" },
      };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Wrong Email Or Answer",
        })
      );
    });

    // --- Validation: missing fields ---
    // Note: The forgotPasswordController has a known bug where validation checks
    // do NOT have return statements, so execution continues after sending a 400.
    // These tests document the actual behaviour of the controller.

    test("should send 400 when email is missing", async () => {
      const req = { body: { answer: "Blue", newPassword: "newpass123" } };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Emai is required" })
      );
    });

    test("should send 400 when answer is missing", async () => {
      const req = { body: { email: "user@example.com", newPassword: "newpass123" } };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "answer is required" })
      );
    });

    test("should send 400 when newPassword is missing", async () => {
      const req = { body: { email: "user@example.com", answer: "Blue" } };
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "New Password is required" })
      );
    });

    // --- Error/catch branch ---

    test("should return 500 when an unexpected error occurs", async () => {
      const req = {
        body: { email: "user@example.com", answer: "Blue", newPassword: "newpass123" },
      };
      userModel.findOne.mockRejectedValue(new Error("DB crash"));

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        })
      );
    });
  });

  // Foo Tzie Huang - A0262376Y
  // AI-assisted unit tests generated with guidance from GitHub Copilot (Claude Haiku 4.5)
  // Test Coverage 1: Return 'Protected Routes' message
  // Test Coverage 2: Not throw when called without errors
  describe("testController", () => {
    let req, res;

    beforeEach(() => {
      jest.clearAllMocks();
      req = {};
      res = {
        send: jest.fn(),
      };
    });

    test("should return 'Protected Routes' message", () => {
      testController(req, res);

      expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });

    test("should not throw when called without errors", () => {
      // testController should execute without throwing
      expect(() => testController(req, res)).not.toThrow();
      expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });
  });
});
