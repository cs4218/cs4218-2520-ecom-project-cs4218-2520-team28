// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import JWT from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { requireSignIn, isAdmin } from './authMiddleware.js';

// Mock the dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/userModel.js');

describe('authMiddleware', () => {
  // Mock Express request, response, and next function
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null, // This will be set by requireSignIn
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // mockReturnThis allows chaining .status().send()
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('requireSignIn', () => {
    it('should call next() and attach user to req if token is valid', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const userPayload = { _id: 'someUserId', name: 'Test User' };
      process.env.JWT_SECRET = 'test-secret'; // Provide a secret for the test

      mockReq.headers.authorization = token;
      JWT.verify.mockReturnValue(userPayload); // Mock JWT.verify to return a decoded user

      // Act
      requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(JWT.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockReq.user).toEqual(userPayload);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should catch and log error if token is invalid', () => {
      // Arrange
      mockReq.headers.authorization = 'invalid.jwt.token';
      const verificationError = new Error('Invalid token');
      JWT.verify.mockImplementation(() => {
        throw verificationError;
      });

      // Spy on console.log to check if it's called
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      requireSignIn(mockReq, mockRes, mockNext);

      // Assert
      expect(JWT.verify).toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
      expect(mockNext).not.toHaveBeenCalled(); // Crucially, next() should not be called on error
      expect(consoleSpy).toHaveBeenCalledWith(verificationError);
      
      consoleSpy.mockRestore(); // Clean up the spy
    });
  });

  describe('isAdmin', () => {
    it('should call next() if user is an admin (role === 1)', async () => {
      // Arrange
      mockReq.user = { _id: 'adminUserId' }; // This would have been set by requireSignIn
      const adminUser = { _id: 'adminUserId', name: 'Admin', role: 1 };
      userModel.findById.mockResolvedValue(adminUser);

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('adminUserId');
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should send 401 error if user is not an admin (role !== 1)', async () => {
      // Arrange
      mockReq.user = { _id: 'regularUserId' };
      const regularUser = { _id: 'regularUserId', name: 'User', role: 0 };
      userModel.findById.mockResolvedValue(regularUser);

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('regularUserId');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: 'UnAuthorized Access',
      });
    });

    it('should send 401 error if user is not found in the database', async () => {
      // Arrange
      mockReq.user = { _id: 'nonExistentUserId' };
      userModel.findById.mockResolvedValue(null); // Simulate user not found

      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await isAdmin(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      // This will fail because accessing .role of null throws an error, so the catch block is executed
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error in admin middleware',
        })
      );
      expect(consoleSpy).toHaveBeenCalled(); // Error should be logged
      consoleSpy.mockRestore();
    });

    it('should handle database errors', async () => {
        // Arrange
        mockReq.user = { _id: 'someUserId' };
        const dbError = new Error('Database connection failed');
        userModel.findById.mockRejectedValue(dbError);

        // Spy on console.log
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Act
        await isAdmin(mockReq, mockRes, mockNext);

        // Assert
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.send).toHaveBeenCalledWith({
            success: false,
            error: dbError,
            message: 'Error in admin middleware',
        });
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        consoleSpy.mockRestore();
    });
  });
});