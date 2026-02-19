import { updateProfileController, getOrdersController, 
  getAllOrdersController, orderStatusController } from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import orderModel from "../models/orderModel.js";


jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
}));
jest.mock("../models/orderModel.js");

describe("authController", () => {

  // Jian Tao - A0273320R
  // AI-assisted unit tests generated with guidance from ChatGPT-5.2
  // Prompt:
  // 1. "Generate Jest unit tests for Express controllers including
  //     updateProfileController, getOrdersController,
  //     getAllOrdersController, and orderStatusController.
  //     Mock Mongoose models and helper functions.
  //     Cover success cases, validation branches, and error handling."
  //
  // 2. "each response should have its HTTP code status right? should the controller return without status?"

  // Jian Tao - A0273320R
  // test coverage:
  // - Successful full profile update
  // - Successful partial update (name only)
  // - Successful partial update (password only)
  // - Password validation error (length < 6 returns 400)
  // - Database error during findById
  // - Error during password hashing
  // - Database error during findByIdAndUpdate
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
        user: { _id: "userId123" },
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
  // test coverage:
  // getOrdersController:
  // - Successfully returns user orders
  // - Handles database error and returns 500
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
  // test coverage:
  // getAllOrdersController:
  // - Successfully returns all orders
  // - Handles database error and returns 500
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
  // test coverage:
  // - Successfully updates order status
  // - Handles database error and returns 500
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
});
  

