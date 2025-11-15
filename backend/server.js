// backend/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import projectRoutes from "./routes/projectRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import fs from "fs";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/project-management";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB connection error:", err));

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads");
const businessCasesDir = path.join(uploadsDir, "business-cases");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(businessCasesDir)) {
  fs.mkdirSync(businessCasesDir);
}

// Serve uploads statically
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/projects", projectRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Project Management API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
