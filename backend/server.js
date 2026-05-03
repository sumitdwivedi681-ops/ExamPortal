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
  try {
    const user = await Student.findOne({ email, password });
    if (user) {
      res.json({ status: "success", user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
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

// Save Result
app.post("/save-result", async (req, res) => {
  try {
    const { email, course, score, total } = req.body;
    const newResult = new Result({
      student_email: email,
      course,
      score,
      total
    });
    await newResult.save();
    res.json({ status: "success" });
  } catch (err) {
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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});