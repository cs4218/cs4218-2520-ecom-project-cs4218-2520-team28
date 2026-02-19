// Jian Tao - A0273320R
// fixed applied:
// - changed enum values for order status from "deliverd" to "Delivered", and 
// - changed "cancel" to "Cancelled", to maintain consistent capitalization and formatting in the order status values.
// - changed default stauts from "Not Process" to "Pending", to better reflect the initial state of an order and maintain consistent capitalization in the status values.



import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        type: mongoose.ObjectId,
        ref: "Products",
      },
    ],
    payment: {},
    buyer: {
      type: mongoose.ObjectId,
      ref: "users",
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);