import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user by username (exact match)
    const user = await User.findOne({ username: username.trim() });
    
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    console.log(`User found: ${user.username}`);

    // Compare password - handle both hashed and plain text passwords
    let isPasswordValid = false;
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
      // Password is hashed, use bcrypt comparison
      isPasswordValid = await user.comparePassword(password);
    } else {
      // Password is plain text, compare directly
      isPasswordValid = user.password === password;
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

export default router;

