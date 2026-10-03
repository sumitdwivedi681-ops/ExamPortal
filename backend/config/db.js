const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // ── Connection Pool — handle many simultaneous DB operations ──
      maxPoolSize: 50,          // Max 50 simultaneous DB connections per worker
      minPoolSize: 5,           // Keep 5 connections always warm
      socketTimeoutMS: 30000,   // 30s socket timeout
      serverSelectionTimeoutMS: 5000, // Fail fast if no MongoDB server found

      // ── Performance ────────────────────────────────────────────────
      compressors: ["zlib"],    // Compress MongoDB wire protocol traffic
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Log when connection drops and reconnects
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting reconnect...");
    });
    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected.");
    });

  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("Check:");
    console.error("  1. IP whitelisted in MongoDB Atlas (Network Access)");
    console.error("  2. Cluster is not paused (free-tier pauses after inactivity)");
    console.error("  3. MONGO_URI and password are correct in .env");
    process.exit(1);
  }
};

module.exports = connectDB;
