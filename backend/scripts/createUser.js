// Script to create a default user
// Run with: node scripts/createUser.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/project-management";

async function createDefaultUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if user already exists
    const existingUser = await User.findOne({ username: "admin" });
    if (existingUser) {
      console.log("❌ User 'admin' already exists");
      process.exit(0);
    }

    // Create default user
    const user = new User({
      username: "admin",
      password: "admin123", // Will be hashed automatically
    });

    await user.save();
    console.log("✅ Default user created successfully!");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("\n⚠️  Please change the default password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  }
}

createDefaultUser();

