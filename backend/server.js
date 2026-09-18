const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");

dotenv.config();

const Student = require("./config/Student");
const Question = require("./Question");
const Result = require("./Result");
const connectDB = require("./config/db");

const app = express();

// High performance Gzip compression for all responses
app.use(compression());

// SUPER OPEN CORS FOR PRODUCTION
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true
}));

app.use(express.json());

// Connect Database
connectDB();

// Admin Settings Schema (Store Password)
const AdminSchema = new mongoose.Schema({
  password: { type: String, default: "Admin@123" }
});
const AdminSettings = mongoose.model("AdminSettings", AdminSchema);

// Ensure admin password is set and migrated to Admin@123
async function initAdmin() {
  try {
    const admin = await AdminSettings.findOne();
    if (!admin) {
      await new AdminSettings({ password: "Admin@123" }).save();
      console.log("Admin password initialized to: Admin@123");
    } else if (admin.password === "admin" || admin.password === "admin123") {
      admin.password = "Admin@123";
      await admin.save();
      console.log("Admin password migrated to: Admin@123");
    }
  } catch (err) {
    console.error("Failed to init admin password:", err.message);
  }
}
initAdmin();

// In-memory course questions cache with 10-minute TTL for lightning-fast test loading (<5ms)
const questionCache = new Map();
const QUESTION_CACHE_TTL_MS = 10 * 60 * 1000;

function getCachedQuestions(course) {
  const cached = questionCache.get(course);
  if (cached && (Date.now() - cached.timestamp < QUESTION_CACHE_TTL_MS)) {
    return cached.data;
  }
  return null;
}

function setCachedQuestions(course, data) {
  questionCache.set(course, { data, timestamp: Date.now() });
}

// Test Route to check if server is live (with pre-warm header)
app.get("/ping", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ status: "alive", message: "Exam Portal Backend is working!", timestamp: Date.now() });
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

// Google Student Login/Register
app.post("/auth/google", async (req, res) => {
  try {
    const { accessToken, course, clientId } = req.body;
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || clientId;

    if (!accessToken) return res.status(400).json({ error: "Google access token is required" });
    if (!expectedClientId || expectedClientId === "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE") {
      return res.status(500).json({ error: "Google Client ID is not configured" });
    }

    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    const tokenInfo = await tokenInfoRes.json();
    if (!tokenInfoRes.ok || tokenInfo.aud !== expectedClientId) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email || profile.email_verified === false) {
      return res.status(401).json({ error: "Unable to verify Google account" });
    }

    let user = await Student.findOne({ email: profile.email });
    if (user) {
      user.full_name = user.full_name || profile.name || profile.email;
      user.profile_img = user.profile_img || profile.picture || "";
      user.google_sub = user.google_sub || profile.sub || "";
      const providers = new Set((user.auth_provider || "password").split(",").filter(Boolean));
      providers.add("google");
      user.auth_provider = Array.from(providers).join(",");
      if (!user.course && course) user.course = course;
      await user.save();
    } else {
      if (!course) return res.status(400).json({ error: "Please select your course" });
      user = new Student({
        full_name: profile.name || profile.email,
        email: profile.email,
        password: `google-${profile.sub}`,
        course,
        profile_img: profile.picture || "",
        google_sub: profile.sub || "",
        auth_provider: "google"
      });
      await user.save();
    }

    res.json({ status: "success", user });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
});

// Get Questions by Course (Cached & Lean for fast response)
app.get("/get-questions", async (req, res) => {
  const { course } = req.query;
  if (!course) return res.status(400).json({ error: "Course parameter is required" });

  const cached = getCachedQuestions(course);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  try {
    const questions = await Question.find({ course: course }).lean();
    setCachedQuestions(course, questions);
    res.setHeader("X-Cache", "MISS");
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

// Get User Results (Lean for speed)
app.get("/get-result", async (req, res) => {
  const { email } = req.query;
  try {
    const results = await Result.find({ student_email: email }).sort({ exam_date: -1 }).lean();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Fetch error" });
  }
});

/* ================= ADMIN ROUTES ================= */

// Get all users (Lean)
app.get("/admin/users", async (req, res) => {
  try {
    const users = await Student.find({}, "-password").sort({ createdAt: -1 }).lean();
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

// Get all results (Lean)
app.get("/admin/results", async (req, res) => {
  try {
    const results = await Result.find().sort({ exam_date: -1 }).lean();
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

// Manage Questions (Get All, Lean)
app.get("/admin/questions", async (req, res) => {
  try {
    const questions = await Question.find().limit(100).lean();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// Admin Login (Verify with DB)
app.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await AdminSettings.findOne();
    if (admin && admin.password === password) {
      res.json({ status: "success" });
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

// Update Admin Password
app.post("/admin/update-password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    const admin = await AdminSettings.findOne();
    if (admin) {
      admin.password = newPassword;
      await admin.save();
      res.json({ status: "success", message: "Admin password updated!" });
    } else {
      res.status(404).json({ error: "Admin settings not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
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
