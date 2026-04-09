// Ho Jin Han, A0266275W
import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../../../models/usermodel.js";
import Category from "../../../models/categorymodel.js";
import Product from "../../../models/productmodel.js";
import Order from "../../../models/ordermodel.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

function slugify(s) {
    return String(s)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientMongoError(err) {
    const msg = String(err?.message || "");
    const code = String(err?.code || "");
    return (
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EPIPE") ||
        msg.includes("Topology is closed") ||
        code.includes("ECONNRESET") ||
        code.includes("ETIMEDOUT")
    );
}

async function insertManyWithRetry(model, docs, options, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await model.insertMany(docs, options);
        } catch (err) {
            const transient = isTransientMongoError(err);
            console.log(
                `insertMany failed (attempt ${attempt}/${maxRetries}). transient=${transient}. ` +
                `error=${err?.code || ""} ${err?.message || err}`
            );

            if (!transient || attempt === maxRetries) {
                throw err;
            }

            // Exponential-ish backoff
            await sleepMs(500 * attempt);
        }
    }
}

async function main() {
    if (process.env.CONFIRM_DELETE !== "YES") {
        throw new Error('Refusing to delete collections. Set CONFIRM_DELETE=YES to proceed.');
    }


    if (!MONGO_URL) {
        throw new Error("MONGO_URL is missing. Fix .env to include MONGO_URL=...");
    }

    // Start smaller first, then scale up
    const NUM_CATEGORIES = parseInt(process.env.NUM_CATEGORIES || "1000", 10);
    const NUM_PRODUCTS = parseInt(process.env.NUM_PRODUCTS || "10000", 10);
    const NUM_USERS = parseInt(process.env.NUM_USERS || "1000", 10);
    const NUM_ORDERS = parseInt(process.env.NUM_ORDERS || "2000", 10);

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("Connected.");

    console.log("WARNING: This script deletes existing data in these collections:");
    console.log("users, categories, products, orders");
    console.log("If this is not a local/dev DB, STOP now.\n");

    // Clean (for repeatability)
    await Promise.all([
        User.deleteMany({}),
        Category.deleteMany({}),
        Product.deleteMany({}),
        Order.deleteMany({}),
    ]);

    // 1) Seed categories
    console.log(`Seeding categories: ${NUM_CATEGORIES}`);
    const categories = [];
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        const name = `Category ${i}`;
        categories.push({ name, slug: slugify(name) });
    }
    const insertedCategories = await Category.insertMany(categories, { ordered: false });
    const categoryIds = insertedCategories.map((c) => c._id);

    // 2) Seed users (includes required `answer`)
    console.log(`Seeding users: ${NUM_USERS}`);
    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
        users.push({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            password: "Password123!",     // NOTE: login may require hashing; seeding is still useful for orders.
            phone: 80000000 + (i % 1000000),
            address: `Address ${i}`,
            answer: "seed-answer",
            role: 0,
        });
    }
    const insertedUsers = await User.insertMany(users, { ordered: false });
    const userIds = insertedUsers.map((u) => u._id);

    // 3) Seed products (include “laptop” so search test hits many docs)
    console.log(`Seeding products: ${NUM_PRODUCTS}`);
    const batchSize = 1000;
    let created = 0;

    while (created < NUM_PRODUCTS) {
        const n = Math.min(batchSize, NUM_PRODUCTS - created);
        const batch = [];

        for (let i = 0; i < n; i++) {
            const idx = created + i;
            const name = `laptop model ${idx}`; // makes regex search heavy on purpose
            batch.push({
                name,
                slug: slugify(name) + "-" + idx,
                description: (`laptop description ${idx} `).repeat(20), // longer text to stress regex / payload
                price: (idx % 10000) + 1,
                category: pick(categoryIds),
                quantity: 1000,
                shipping: true,
                rating: (idx % 5),
            });
        }

        await insertManyWithRetry(Product, batch, { ordered: false }, 6);
        created += n;
        console.log(`Products seeded: ${created}/${NUM_PRODUCTS}`);
    }

    // 4) Seed orders referencing users/products
    console.log(`Seeding orders: ${NUM_ORDERS}`);
    const someProducts = await Product.find({}).select("_id").limit(5000);
    const productIds = someProducts.map((p) => p._id);

    const orders = [];
    for (let i = 0; i < NUM_ORDERS; i++) {
        const items = [];
        for (let j = 0; j < 3; j++) items.push(pick(productIds));

        orders.push({
            products: items,
            buyer: pick(userIds),
            payment: {},
            status: "Pending",
        });
    }
    await insertManyWithRetry(Order, orders, { ordered: false }, 6);

    console.log("Done seeding.");
    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
