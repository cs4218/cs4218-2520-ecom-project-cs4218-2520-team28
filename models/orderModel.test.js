import mongoose from "mongoose";
import Order from "./orderModel.js";

describe("Order Model Unit Tests", () => {

  test("should set default status to 'Not Process'", async () => {
    const order = new Order({
      buyer: new mongoose.Types.ObjectId(),
    });

    await order.validate(); // no DB connection

    expect(order.status).toBe("Not Process");
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
