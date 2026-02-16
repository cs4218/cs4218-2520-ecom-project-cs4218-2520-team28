// Ho Jin Han, A0266275W
// Generation of unit test are assisted with Gemini Pro 2.5

import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './authHelper';

// Mock the entire bcrypt library
jest.mock('bcrypt');

describe('authHelper', () => {
  // Clear all mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should correctly hash a password using bcrypt', async () => {
      // Arrange
      const plainPassword = 'password123';
      const expectedHash = 'a_very_secure_hash';
      
      // Mock the bcrypt.hash implementation for this test
      bcrypt.hash.mockResolvedValue(expectedHash);

      // Act
      const result = await hashPassword(plainPassword);

      // Assert
      // 1. Check that bcrypt.hash was called with the correct arguments
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10); // 10 is the salt rounds

      // 2. Check that the function returned the value from bcrypt.hash
      expect(result).toBe(expectedHash);
    });

    it('should handle errors from bcrypt and log them', async () => {
      // Arrange
      const plainPassword = 'password123';
      const hashingError = new Error('Hashing failed');
      
      // Mock bcrypt.hash to reject with an error
      bcrypt.hash.mockRejectedValue(hashingError);
      
      // Mock console.log to spy on its calls and prevent polluting the test output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await hashPassword(plainPassword);

      // Assert
      // 1. Check that console.log was called with the error
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(hashingError);
      
      // 2. Check that the function returns undefined as the catch block doesn't return anything
      expect(result).toBeUndefined();

      // Restore the original console.log
      consoleSpy.mockRestore();
    });
  });

  describe('comparePassword', () => {
    it('should return true when passwords match', async () => {
      // Arrange
      const plainPassword = 'password123';
      const hashedPassword = 'a_very_secure_hash';
      
      // Mock bcrypt.compare to resolve to true
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      // 1. Check that bcrypt.compare was called with the correct arguments
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);

      // 2. Check that the function returned true
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      // Arrange
      const plainPassword = 'wrong_password';
      const hashedPassword = 'a_very_secure_hash';
      
      // Mock bcrypt.compare to resolve to false
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await comparePassword(plainPassword, hashedPassword);

      // Assert
      // 1. Check that bcrypt.compare was called with the correct arguments
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);

      // 2. Check that the function returned false
      expect(result).toBe(false);
    });
  });
});