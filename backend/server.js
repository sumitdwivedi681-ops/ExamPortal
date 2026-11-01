const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const os = require("os");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "examportal_admin_jwt_secret_sumit2026_secure";

const Student = require("./config/Student");
const Question = require("./Question");
const Result = require("./Result");
const ChatLog = require("./config/ChatLog");
const { processSaarthiMessage } = require("./saarthiEngine");
const { firewallMiddleware, getFirewallStats } = require("./firewall");
const connectDB = require("./config/db");

const app = express();

// Admin Authentication Middleware

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing or malformed admin token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin privileges required." });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
  }
};


//  1. SECURITY — Helmet (HTTP security headers)

app.use(helmet({ crossOriginResourcePolicy: false }));


//  2. COMPRESSION — Gzip all responses (saves 60-80% bandwidth)

app.use(compression({ level: 6, threshold: 1024 }));


//  3. CORS — Open for all origins (production CDN-friendly)

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true
}));


//  4. BODY PARSER — Limit payload size & block prototype pollution attacks

app.use(express.json({
  limit: "5mb",
  verify: (req, res, buf) => {
    if (buf && buf.length) {
      const raw = buf.toString("utf8");
      if (raw.includes('"__proto__"')) {
        const err = new Error("Security Violation: Prototype pollution attempt detected");
        err.status = 400;
        throw err;
      }
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));


//  5. WEB APPLICATION FIREWALL (WAF) — Threat & Bot Shield

app.use(firewallMiddleware);


//  6. TRUST PROXY — Needed for rate limiting behind Render/Nginx

app.set("trust proxy", 1);


//  6. RATE LIMITING — DDoS protection per IP


// General API: 300 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in a minute." },
  skip: (req) => req.path === "/ping", // Never rate-limit health checks
});

// Auth routes: stricter — 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes." },
});

app.use("/api", apiLimiter);
app.use("/login", authLimiter);
app.use("/register", authLimiter);
app.use("/admin/login", authLimiter);

/* ═══════════════════════════════════════════════════════════════
   7. IN-MEMORY CACHE — Multi-layer, high-performance cache
      Layer 1: Questions per course (10-min TTL)
      Layer 2: Admin results (30-sec TTL)
      Layer 3: All users list (30-sec TTL)
═══════════════════════════════════════════════════════════════ */
class TTLCache {
  constructor(defaultTTL = 60000) {
    this.store = new Map();
    this.defaultTTL = defaultTTL;
    // Auto-purge expired entries every 2 minutes
    setInterval(() => this._purge(), 2 * 60 * 1000);
  }

  set(key, value, ttl = this.defaultTTL) {
    this.store.set(key, { value, expires: Date.now() + ttl });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { this.store.delete(key); return null; }
    return entry.value;
  }

  invalidate(key) { this.store.delete(key); }

  _purge() {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (now > v.expires) this.store.delete(k);
    }
  }
}

const questionCache = new TTLCache(10 * 60 * 1000);  // 10 min
const adminCache = new TTLCache(30 * 1000);         // 30 sec

/*8. DATABASE CONNECTION*/
connectDB();

/*9. MODELS & ADMIN INIT*/
const AdminSchema = new mongoose.Schema({
  password: { type: String, default: "admin@2004" }
});
const AdminSettings = mongoose.model("AdminSettings", AdminSchema);

async function initAdmin() {
  try {
    const admin = await AdminSettings.findOne().lean();
    if (!admin) {
      await new AdminSettings({ password: "admin@2004" }).save();
      console.log("Admin password initialized to: admin@2004");
    } else if (admin.password === "admin" || admin.password === "admin123" || admin.password === "Admin@123") {
      await AdminSettings.updateOne({}, { password: "admin@2004" });
      console.log("Admin password migrated to: admin@2004");
    }
  } catch (err) {
    console.error("Failed to init admin:", err.message);
  }
}
initAdmin();

/*ROUTES*/

// ── Health Check (never cached, never rate-limited) ─────────────
app.get("/ping", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: "alive",
    message: "Exam Portal Backend is working!",
    worker: process.pid,
    uptime: process.uptime().toFixed(0) + "s",
    timestamp: Date.now()
  });
});

// ── Register ────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, course } = req.body;
    if (!full_name || !email || !password || !course)
      return res.status(400).json({ error: "All fields are required" });

    const existing = await Student.findOne({ email }).lean();
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const newStudent = new Student({ full_name, email, password, course });
    await newStudent.save();
    res.json({ status: "success", user: newStudent });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Login ───────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Student.findOne({ email, password }).lean();
    if (user) {
      res.json({ status: "success", user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// ── Google Auth ─────────────────────────────────────────────────
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

// ── Update Profile (Avatar photo, name, password) ──────────────
app.post("/update-profile", async (req, res) => {
  try {
    const { email, full_name, profile_img, password } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const updateFields = {};
    if (full_name && full_name.trim()) updateFields.full_name = full_name.trim();
    if (profile_img !== undefined) updateFields.profile_img = profile_img;
    if (password && password.trim()) updateFields.password = password.trim();

    const updatedUser = await Student.findOneAndUpdate(
      { email },
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!updatedUser) return res.status(404).json({ error: "Student not found" });

    res.json({ status: "success", user: updatedUser });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── Get Questions (Cached with ETag) ───────────────────────────
app.get("/get-questions", async (req, res) => {
  const { course } = req.query;
  if (!course) return res.status(400).json({ error: "Course parameter is required" });

  // Set aggressive cache headers for CDN (Cloudflare etc.)
  res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=60");
  res.setHeader("Vary", "Accept-Encoding");

  // Serve from in-memory cache instantly
  const cached = questionCache.get(course);
  if (cached) {
    // ETag for conditional GET (304 Not Modified) — saves bandwidth
    const etag = `"q-${course}-${cached.length}"`;
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }
    res.setHeader("X-Cache", "HIT");
    res.setHeader("ETag", etag);
    return res.json(cached);
  }

  try {
    const questions = await Question.find({ course }).select("-__v").lean();
    questionCache.set(course, questions);
    res.setHeader("X-Cache", "MISS");
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Database Error" });
  }
});

// ── Save Result ─────────────────────────────────────────────────
app.post("/save-result", async (req, res) => {
  try {
    const { email, course, score, total } = req.body;
    if (!email || !course || score === undefined || !total)
      return res.status(400).json({ error: "Missing required fields" });

    const existingResult = await Result.findOne({ student_email: email, course }).lean();

    if (existingResult) {
      if (score > existingResult.score) {
        await Result.updateOne(
          { student_email: email, course },
          { score, total, exam_date: Date.now() }
        );
        // Invalidate admin results cache on new high score
        adminCache.invalidate("all-results");
        return res.json({ status: "success", message: "New High Score saved!" });
      } else {
        return res.json({ status: "success", message: "Previous score was better, kept old record." });
      }
    } else {
      await Result.create({ student_email: email, course, score, total });
      adminCache.invalidate("all-results");
      res.json({ status: "success", message: "First attempt saved!" });
    }
  } catch (err) {
    console.error("Save Result Error:", err);
    res.status(500).json({ error: "Failed to save result" });
  }
});

// ── Get User Results ────────────────────────────────────────────
app.get("/get-result", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const results = await Result.find({ student_email: email })
      .sort({ exam_date: -1 })
      .select("-__v")
      .lean();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Fetch error" });
  }
});

// ── Update Profile ──────────────────────────────────────────────
app.post("/update-profile", async (req, res) => {
  try {
    const { email, full_name, password, profile_img } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const update = {};
    if (full_name) update.full_name = full_name;
    if (password) update.password = password;
    if (profile_img) update.profile_img = profile_img;

    const user = await Student.findOneAndUpdate({ email }, update, { new: true }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Invalidate users cache
    adminCache.invalidate("all-users");
    res.json({ status: "success", user });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/*ADMIN ROUTES*/

// ── Admin Login ─────────────────────────────────────────────────
app.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const cached = adminCache.get("admin-settings");
    const admin = cached || await AdminSettings.findOne().lean();
    if (!cached && admin) adminCache.set("admin-settings", admin, 5 * 60 * 1000);

    if (admin && admin.password === password) {
      res.json({ status: "success" });
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

// ── Update Admin Password ───────────────────────────────────────
app.post("/admin/update-password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const admin = await AdminSettings.findOne();
    if (!admin) return res.status(404).json({ error: "Admin settings not found" });

    admin.password = newPassword;
    await admin.save();
    adminCache.invalidate("admin-settings"); // Bust cache on change
    res.json({ status: "success", message: "Admin password updated!" });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ── Get All Users (Cached) ──────────────────────────────────────
app.get("/admin/users", async (req, res) => {
  try {
    const cached = adminCache.get("all-users");
    if (cached) return res.json(cached);

    const users = await Student.find({}, "-password -__v").sort({ createdAt: -1 }).lean();
    adminCache.set("all-users", users);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── Delete User ─────────────────────────────────────────────────
app.delete("/admin/users/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    adminCache.invalidate("all-users");
    res.json({ status: "success", message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Get All Results (Cached) ────────────────────────────────────
app.get("/admin/results", async (req, res) => {
  try {
    const cached = adminCache.get("all-results");
    if (cached) return res.json(cached);

    const results = await Result.find().sort({ exam_date: -1 }).select("-__v").lean();
    adminCache.set("all-results", results);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// ── Delete Result ───────────────────────────────────────────────
app.delete("/admin/results/:id", async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    adminCache.invalidate("all-results");
    res.json({ status: "success", message: "Result deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Admin: Firewall Status & Live Threat Monitoring ─────────────
app.get("/admin/firewall/stats", authenticateAdmin, (req, res) => {
  try {
    res.json({
      status: "success",
      firewall: getFirewallStats()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch firewall stats" });
  }
});

// ── Helper: Parse CSV / TSV / Semicolon Delimited Questions ──────────────
function parseCSVQuestions(text) {
  if (!text || typeof text !== "string") return [];
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // Strip UTF-8 BOM
  
  const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (!firstLine.includes(",") && firstLine.includes(";")) delimiter = ";";

  const rows = [];
  let currentRow = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentVal.trim());
        if (currentRow.some(c => c !== "")) rows.push(currentRow);
        currentRow = [];
        currentVal = "";
      } else if (char === "\n") {
        currentRow.push(currentVal.trim());
        if (currentRow.some(c => c !== "")) rows.push(currentRow);
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c !== "")) rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  // Match header row case-insensitively
  const headerRow = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const fieldMap = {
    course: ["course", "subject", "topic"],
    question_title: ["question_title", "question", "title", "q", "questiontext", "questionname"],
    optionA: ["optiona", "opta", "a", "option_a", "option1"],
    optionB: ["optionb", "optb", "b", "option_b", "option2"],
    optionC: ["optionc", "optc", "c", "option_c", "option3"],
    optionD: ["optiond", "optd", "d", "option_d", "option4"],
    answer: ["answer", "ans", "correct", "correctanswer", "correct_answer"],
    id: ["_id", "id"]
  };

  const colIndices = {};
  for (const [field, aliases] of Object.entries(fieldMap)) {
    for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
      if (aliases.includes(headerRow[colIdx])) {
        colIndices[field] = colIdx;
        break;
      }
    }
  }

  const questions = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const qObj = {};
    for (const [field, colIdx] of Object.entries(colIndices)) {
      if (row[colIdx] !== undefined) {
        qObj[field] = row[colIdx];
      }
    }
    if (qObj.question_title && qObj.course) {
      questions.push(qObj);
    }
  }
  return questions;
}

// ── Helper: Parse Questions From Any Input Format (JSON, CSV, TSV) ───────
function parseQuestionsInput(body) {
  let questions = [];

  if (Array.isArray(body)) {
    questions = body;
  } else if (body && Array.isArray(body.questions)) {
    questions = body.questions;
  } else if (body && typeof body.rawData === "string") {
    const raw = body.rawData.trim();
    if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) questions = parsed;
        else if (parsed && Array.isArray(parsed.questions)) questions = parsed.questions;
        else if (parsed && typeof parsed === "object") questions = [parsed];
      } catch (e) {
        questions = parseCSVQuestions(raw);
      }
    } else {
      questions = parseCSVQuestions(raw);
    }
  } else if (body && body.question_title && body.course) {
    questions = [body];
  }

  return questions;
}

// ── Get All Unique Courses (Admin, Protected) ───────────────────────────
app.get("/admin/courses", authenticateAdmin, async (req, res) => {
  try {
    const courses = await Question.distinct("course");
    res.json({
      status: "success",
      courses: courses.filter(Boolean).sort()
    });
  } catch (err) {
    console.error("Fetch courses error:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// ── Get Questions (Admin, Protected, Filterable, Paginated) ─────────────
app.get("/admin/questions", authenticateAdmin, async (req, res) => {
  try {
    const { course, search, page = 1, limit = 50, all } = req.query;

    const query = {};
    if (course && course !== "all") {
      query.course = course;
    }
    if (search && search.trim()) {
      query.question_title = { $regex: search.trim(), $options: "i" };
    }

    // Export all matching questions without pagination limit
    if (all === "true") {
      const questions = await Question.find(query).sort({ course: 1, _id: 1 }).select("-__v").lean();
      return res.json({
        status: "success",
        questions,
        total: questions.length
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, questions, courses] = await Promise.all([
      Question.countDocuments(query),
      Question.find(query).sort({ _id: -1 }).skip(skip).limit(limitNum).select("-__v").lean(),
      Question.distinct("course")
    ]);

    res.json({
      status: "success",
      questions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      courses: courses.filter(Boolean).sort()
    });
  } catch (err) {
    console.error("Fetch admin questions error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// ── Create Single Question (Admin, Protected) ───────────────────────────
app.post("/admin/questions", authenticateAdmin, async (req, res) => {
  try {
    const { course, question_title, optionA, optionB, optionC, optionD, answer } = req.body;
    if (!course || !question_title || !optionA || !optionB || !answer) {
      return res.status(400).json({ error: "Course, question title, option A, option B, and correct answer are required." });
    }

    const newQuestion = new Question({
      course: String(course).trim(),
      question_title: String(question_title).trim(),
      optionA: String(optionA).trim(),
      optionB: String(optionB).trim(),
      optionC: String(optionC || "").trim(),
      optionD: String(optionD || "").trim(),
      answer: String(answer).trim()
    });

    await newQuestion.save();

    // Invalidate caches
    questionCache.invalidate(newQuestion.course);
    adminCache.invalidate("admin-questions");

    res.json({
      status: "success",
      message: "Question added successfully!",
      question: newQuestion
    });
  } catch (err) {
    console.error("Create question error:", err);
    res.status(500).json({ error: "Failed to create question: " + err.message });
  }
});

// ── Update Single Question (Admin, Protected) ───────────────────────────
app.put("/admin/questions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid question ID format" });
    }

    const { course, question_title, optionA, optionB, optionC, optionD, answer } = req.body;
    if (!course || !question_title || !optionA || !optionB || !answer) {
      return res.status(400).json({ error: "Course, question title, option A, option B, and correct answer are required." });
    }

    const existing = await Question.findById(id);
    if (!existing) {
      return res.status(404).json({ error: "Question not found" });
    }

    const oldCourse = existing.course;
    const newCourse = String(course).trim();

    existing.course = newCourse;
    existing.question_title = String(question_title).trim();
    existing.optionA = String(optionA).trim();
    existing.optionB = String(optionB).trim();
    existing.optionC = String(optionC || "").trim();
    existing.optionD = String(optionD || "").trim();
    existing.answer = String(answer).trim();

    await existing.save();

    // Invalidate caches for both old and new course
    questionCache.invalidate(oldCourse);
    if (oldCourse !== newCourse) questionCache.invalidate(newCourse);
    adminCache.invalidate("admin-questions");

    res.json({
      status: "success",
      message: "Question updated successfully!",
      question: existing
    });
  } catch (err) {
    console.error("Update question error:", err);
    res.status(500).json({ error: "Failed to update question: " + err.message });
  }
});

// ── Delete Single Question (Admin, Protected) ───────────────────────────
app.delete("/admin/questions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid question ID format" });
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    questionCache.invalidate(question.course);
    adminCache.invalidate("admin-questions");

    res.json({
      status: "success",
      message: "Question deleted successfully!"
    });
  } catch (err) {
    console.error("Delete question error:", err);
    res.status(500).json({ error: "Failed to delete question: " + err.message });
  }
});

// ── Bulk Create / Update Questions in Any Format (Admin, Protected) ───────
app.post("/admin/questions/bulk", authenticateAdmin, async (req, res) => {
  try {
    const rawItems = parseQuestionsInput(req.body);
    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({
        error: "No valid questions found in payload. Provide a JSON array or CSV/TSV format."
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const affectedCourses = new Set();

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const course = item.course ? String(item.course).trim() : "";
      const question_title = item.question_title ? String(item.question_title).trim() : "";
      const optionA = item.optionA ? String(item.optionA).trim() : "";
      const optionB = item.optionB ? String(item.optionB).trim() : "";
      const optionC = item.optionC ? String(item.optionC).trim() : "";
      const optionD = item.optionD ? String(item.optionD).trim() : "";
      const answer = item.answer ? String(item.answer).trim() : "";
      const id = item._id || item.id;

      if (!course || !question_title || !optionA || !optionB || !answer) {
        errors.push({
          index: i + 1,
          question: question_title || "Unnamed",
          reason: "Missing required fields (course, question_title, optionA, optionB, answer)"
        });
        continue;
      }

      affectedCourses.add(course);

      const updateDoc = {
        course,
        question_title,
        optionA,
        optionB,
        optionC,
        optionD,
        answer
      };

      try {
        if (id && mongoose.Types.ObjectId.isValid(id)) {
          const existing = await Question.findById(id);
          if (existing) {
            affectedCourses.add(existing.course);
            await Question.findByIdAndUpdate(id, { $set: updateDoc });
            updatedCount++;
            continue;
          }
        }

        // Upsert by matching course and question_title
        const existing = await Question.findOne({ course, question_title });
        if (existing) {
          await Question.updateOne({ _id: existing._id }, { $set: updateDoc });
          updatedCount++;
        } else {
          await Question.create(updateDoc);
          createdCount++;
        }
      } catch (err) {
        errors.push({ index: i + 1, question: question_title, reason: err.message });
      }
    }

    // Invalidate caches for all affected courses and admin cache
    for (const c of affectedCourses) {
      questionCache.invalidate(c);
    }
    adminCache.invalidate("admin-questions");

    res.json({
      status: "success",
      message: `Processed ${rawItems.length} questions successfully! (${createdCount} created, ${updatedCount} updated)`,
      totalProcessed: rawItems.length,
      created: createdCount,
      updated: updatedCount,
      failed: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (err) {
    console.error("Bulk questions error:", err);
    res.status(500).json({ error: "Failed to process bulk questions: " + err.message });
  }
});


//  SAARTHI (सारथी) — AI ASSISTANT & CREATOR INSIGHTS ENDPOINTS


// ── User asks Saarthi a question ───────────────────────────────
app.post("/api/saarthi/chat", async (req, res) => {
  try {
    const { message, user_email, user_name, lastSuggestedCourse } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await processSaarthiMessage(message, {
      lastSuggestedCourse,
      user_email,
      user_name
    });

    // Log asynchronously to MongoDB Atlas (keeps response instant)
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    ChatLog.create({
      user_email: user_email || "Guest Student",
      user_name: user_name || "Guest",
      message: message.trim(),
      response: result.reply,
      topic: result.topic,
      asked_about_owner: result.askedAboutOwner || false,
      course_requested: result.courseRequested || "",
      language: result.language || "hinglish",
      user_ip: String(clientIp).split(",")[0].trim()
    }).catch(err => console.error("ChatLog Save Error:", err.message));

    res.json({
      status: "success",
      reply: result.reply,
      topic: result.topic,
      askedAboutOwner: result.askedAboutOwner,
      courseRequested: result.courseRequested,
      lastSuggestedCourse: result.lastSuggestedCourse || ""
    });
  } catch (err) {
    console.error("Saarthi Chat Error:", err);
    res.status(500).json({ error: "Saarthi is temporarily unavailable." });
  }
});

// ── Admin: View Saarthi Analytics, Creator Inquiries & Requests ─
app.get("/admin/saarthi/logs", async (req, res) => {
  try {
    const [totalQueries, ownerInquiries, courseRequests, recentLogs] = await Promise.all([
      ChatLog.countDocuments(),
      ChatLog.countDocuments({ asked_about_owner: true }),
      ChatLog.countDocuments({ course_requested: { $ne: "" } }),
      ChatLog.find().sort({ createdAt: -1 }).limit(100).lean()
    ]);

    res.json({
      status: "success",
      stats: {
        totalQueries,
        ownerInquiries,
        courseRequests
      },
      logs: recentLogs
    });
  } catch (err) {
    console.error("Fetch Saarthi Logs Error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});


//  GLOBAL ERROR HANDLER — Never crash on unhandled errors

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Catch unhandled promise rejections — keep worker alive
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});


//  SERVER STARTUP

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Worker [PID: ${process.pid}] running on port ${PORT}`);
});

// Keep-alive tuning — prevent connection drops under heavy load
server.keepAliveTimeout = 65000;      // 65s (must be > Render's 60s LB timeout)
server.headersTimeout = 66000;       // Must be > keepAliveTimeout

module.exports = app;
