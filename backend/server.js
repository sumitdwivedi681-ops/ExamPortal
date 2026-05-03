require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const Student = require("./config/Student");
const Question = require("./Question");
const Result = require("./Result");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= DB CONNECT ================= */
connectDB();

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("API is running with MongoDB... 🚀");
});

/* ================= REGISTER ================= */
app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, course } = req.body;

    if (!full_name || !email || !password || !course) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await Student.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await Student.create({
      full_name,
      email,
      password: hashed,
      course,
    });

    res.json({ status: "success", message: "Registration successful" });
  } catch (err) {
    console.error("DETAILED REGISTER ERROR:", err); // This will show in your terminal
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/* ================= LOGIN ================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      status: "success",
      user: {
        full_name: user.full_name,
        email: user.email,
        course: user.course,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET QUESTIONS ================= */
app.get("/get-questions", async (req, res) => {
  try {
    const { course } = req.query;

    if (!course) {
      return res.status(400).json({ error: "Course required" });
    }

    const questions = await Question.aggregate([
      { $match: { course } },
      { $sample: { size: 20 } },
    ]);

    res.json(questions);
  } catch (err) {
    console.error("Question Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/* ================= SAVE RESULT ================= */
app.post("/save-result", async (req, res) => {
  try {
    const { email, course, score, total } = req.body;

    if (!email || !course || score === undefined || !total) {
      return res.status(400).json({ error: "Missing data" });
    }

    await Result.create({
      student_email: email,
      course,
      score,
      total,
    });

    res.json({ status: "success", message: "Result saved" });
  } catch (err) {
    console.error("Save Result Error:", err);
    res.status(500).json({ error: "Failed to save result" });
  }
});

/* ================= GET RESULTS ================= */
app.get("/get-result", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const results = await Result.find({ student_email: email }).sort({
      exam_date: -1,
    });

    res.json(results);
  } catch (err) {
    console.error("Result Fetch Error:", err);
    res.status(500).json({ error: "Cannot fetch results" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
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
    const questions = await Question.find().limit(100); // Limit to 100 for performance
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});