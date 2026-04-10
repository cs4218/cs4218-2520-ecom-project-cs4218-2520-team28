// Ho Jin Han, A0266275W
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../../../models/usermodel.js";
import Category from "../../../models/categorymodel.js";
import Product from "../../../models/productmodel.js";
import Order from "../../../models/ordermodel.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URL);

console.log("users:", await User.countDocuments());
console.log("categories:", await Category.countDocuments());
console.log("products:", await Product.countDocuments());
console.log("orders:", await Order.countDocuments());

await mongoose.disconnect();
