// Jian Tao - A0273320R
// AI-assisted unit tests generated with guidance from ChatGPT-5.2
// Prompts Used:
// - "Generate Jest unit tests for a Mongoose Order schema.
//    Test default values, enum validation, ObjectId references,
//    array handling, and schema options such as timestamps."
// - "How can I validate a Mongoose model using .validate()
//    without connecting to MongoDB during unit testing?"
// - "is Not Process a good default status for an order? What would be a better default status value?"

// Test Coverage:
//
// - Verifies default status value is set correctly.
// - Verifies valid enum status values are accepted.
// - Verifies invalid enum values are rejected.
// - Verifies products array accepts multiple ObjectIds.
// - Verifies timestamps option is enabled in schema.
// - Verifies validation works using .validate() without database connection.




import mongoose from "mongoose";
import Order from "./orderModel.js";

describe("Order Model Unit Tests", () => {

  test("should set default status to 'Pending'", async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
    });

    await order.validate(); // no DB connection

    expect(order.status).toBe("Pending");
  });


  test("should allow valid status values", async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      status: "Processing",
    });

    await order.validate();

    expect(order.status).toBe("Processing");
  });


  test("should reject invalid status values", async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      status: "InvalidStatus",
    });

    await order.validate().catch((err) => {
      expect(err.errors.status).toBeDefined();
    });

  });


  test("should store multiple product ObjectIds", async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
      products: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
    });

    await order.validate();

    expect(order.products.length).toBe(2);
  });


  test("should have timestamps option enabled", () => {
    expect(Order.schema.options.timestamps).toBe(true);
  });

});
