const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    console.error("Please check:");
    console.error("  1. Your IP is whitelisted in MongoDB Atlas (Network Access)");
    console.error("  2. Your cluster is not paused (free-tier clusters pause after inactivity)");
    console.error("  3. Your MONGO_URI and password are correct in .env");
    process.exit(1);
  }
};

module.exports = connectDB;
