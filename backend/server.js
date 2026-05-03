const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const Student = require("./config/Student");
const Question = require("./Question");
const Result = require("./Result");
const connectDB = require("./config/db");

const app = express();

// SUPER OPEN CORS FOR PRODUCTION
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true
}));

app.use(express.json());

// Connect Database
connectDB();

// Test Route to check if server is live
app.get("/ping", (req, res) => {
  res.json({ status: "alive", message: "Exam Portal Backend is working!" });
});

/* ================= ROUTES ================= */

// Register Student
app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, course } = req.body;
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const newStudent = new Student({ full_name, email, password, course });
    await newStudent.save();
    res.json({ status: "success", user: newStudent });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login Student
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  try {
    const user = await Student.findOne({ email: email, password: password });
    if (user) {
      console.log("Login successful!");
      res.json({ status: "success", user });
    } else {
      console.log("Login failed: User not found or password mismatch");
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get Questions by Course
app.get("/get-questions", async (req, res) => {
  const { course } = req.query;
  try {
    const questions = await Question.find({ course: course });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Database Error" });
  }
});

// Save Result (Highest Score Only)
app.post("/save-result", async (req, res) => {
  try {
    const { email, course, score, total } = req.body;
    
    // 1. Check if a result already exists for this student and course
    const existingResult = await Result.findOne({ student_email: email, course: course });

    if (existingResult) {
      // 2. Only update if the NEW score is better than the OLD score
      if (score > existingResult.score) {
        existingResult.score = score;
        existingResult.total = total;
        existingResult.exam_date = Date.now();
        await existingResult.save();
        return res.json({ status: "success", message: "New High Score saved!" });
      } else {
        return res.json({ status: "success", message: "Previous score was better, kept old record." });
      }
    } else {
      // 3. No existing record, so save this one
      const newResult = new Result({
        student_email: email,
        course,
        score,
        total
      });
      await newResult.save();
      res.json({ status: "success", message: "First attempt saved!" });
    }
  } catch (err) {
    console.error("Save Result Error:", err);
    res.status(500).json({ error: "Failed to save result" });
  }
});

// Get User Results
app.get("/get-result", async (req, res) => {
  const { email } = req.query;
  try {
    const results = await Result.find({ student_email: email }).sort({ exam_date: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Fetch error" });
  }
});

/* ================= ADMIN ROUTES ================= */

// Get all users
app.get("/admin/users", async (req, res) => {
  try {
    const users = await Student.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Delete a user
app.delete("/admin/users/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ status: "success", message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// Get all results
app.get("/admin/results", async (req, res) => {
  try {
    const results = await Result.find().sort({ exam_date: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// Delete a result
app.delete("/admin/results/:id", async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ status: "success", message: "Result deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// Manage Questions (Get All)
app.get("/admin/questions", async (req, res) => {
  try {
    const questions = await Question.find().limit(100);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
// Update Profile
app.post("/update-profile", async (req, res) => {
  try {
    const { email, full_name, password, profile_img } = req.body;
    const user = await Student.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (full_name) user.full_name = full_name;
    if (password) user.password = password;
    if (profile_img) user.profile_img = profile_img;

    await user.save();
    res.json({ status: "success", user });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});