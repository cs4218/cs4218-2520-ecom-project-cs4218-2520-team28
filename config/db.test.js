// Ho Jin Han, A0266275W
// Generation of test cases are assisted using Gemini 2.5 Pro

import mongoose from 'mongoose';
import connectDB from './db.js';

// Mock the entire mongoose module
jest.mock('mongoose');

describe('Database Connector (connectDB)', () => {
  let consoleSpy;

  // Before each test, spy on console.log and suppress its output in the test runner
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  // After each test, restore the original console.log
  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should call mongoose.connect with the correct MONGO_URL', async () => {
    // Arrange
    process.env.MONGO_URL = 'mongodb://test-url/test-db';
    // Mock the successful connection response
    mongoose.connect.mockResolvedValue({
      connection: { host: 'mock-host' },
    });

    // Act
    await connectDB();

    // Assert
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://test-url/test-db');
  });

  it('should log a success message when the database connection is established', async () => {
    // Arrange
    process.env.MONGO_URL = 'mongodb://test-url/test-db';
    mongoose.connect.mockResolvedValue({
      connection: { host: 'mock-host' },
    });

    // Act
    await connectDB();

    // Assert
    // Check that console.log was called at least once
    expect(consoleSpy).toHaveBeenCalled();
    // Check the content of the first call to console.log, ignoring colors
    // We use expect.stringContaining to make the test less brittle.
    expect(consoleSpy.mock.calls[0][0]).toContain('Connected To Mongodb Database mock-host');
  });

  it('should log an error message when the database connection fails', async () => {
    // Arrange
    const connectionError = new Error('Connection failed');
    // Mock mongoose.connect to reject with an error
    mongoose.connect.mockRejectedValue(connectionError);
    process.env.MONGO_URL = 'mongodb://invalid-url/test-db';

    // Act
    await connectDB();

    // Assert
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    
    // Check that console.log was called
    expect(consoleSpy).toHaveBeenCalled();
    
    // Check the content of the error log message
    expect(consoleSpy.mock.calls[0][0]).toContain(`Error in Mongodb ${connectionError}`);
  });
});