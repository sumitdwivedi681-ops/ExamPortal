const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config(); // fallback to root .env if present

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
const connectDB = require("./config/db");

const app = express();

// ── Admin Authentication Middleware ───────────────────────────────────────
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


  //  4. BODY PARSER — Limit payload size to prevent abuse

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));


  //  5. TRUST PROXY — Needed for rate limiting behind Render/Nginx

app.set("trust proxy", 1);

/* ═══════════════════════════════════════════════════════════════
  //  6. RATE LIMITING — DDoS protection per IP
═══════════════════════════════════════════════════════════════ */

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
const adminCache    = new TTLCache(30 * 1000);         // 30 sec

/* ═══════════════════════════════════════════════════════════════
   8. DATABASE CONNECTION
═══════════════════════════════════════════════════════════════ */
connectDB();

/* ═══════════════════════════════════════════════════════════════
   9. MODELS & ADMIN INIT
═══════════════════════════════════════════════════════════════ */
const AdminSchema = new mongoose.Schema({
  password: { type: String, default: "Admin@123" }
});
const AdminSettings = mongoose.model("AdminSettings", AdminSchema);

async function initAdmin() {
  try {
    const admin = await AdminSettings.findOne().lean();
    if (!admin) {
      await new AdminSettings({ password: "Admin@123" }).save();
      console.log("Admin password initialized to: Admin@123");
    } else if (admin.password === "admin" || admin.password === "admin123") {
      await AdminSettings.updateOne({}, { password: "Admin@123" });
      console.log("Admin password migrated to: Admin@123");
    }
  } catch (err) {
    console.error("Failed to init admin:", err.message);
  }
}
initAdmin();

/* ═══════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════ */

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

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Student.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    const newStudent = new Student({
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      course: String(course).trim()
    });
    await newStudent.save();

    const safeUser = newStudent.toObject();
    delete safeUser.password;
    res.json({ status: "success", user: safeUser });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Login ───────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await Student.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let isMatch = false;
    const rawPass = String(password).trim();
    if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
      isMatch = await bcrypt.compare(rawPass, user.password);
    } else {
      isMatch = (user.password === rawPass);
      if (isMatch) {
        // Transparently upgrade legacy plain-text password to bcrypt hash
        user.password = await bcrypt.hash(rawPass, 10);
        await user.save();
      }
    }

    if (isMatch) {
      const safeUser = user.toObject();
      delete safeUser.password;
      res.json({ status: "success", user: safeUser });
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const updateFields = {};
    if (full_name && full_name.trim()) updateFields.full_name = full_name.trim();
    if (profile_img !== undefined) updateFields.profile_img = profile_img;
    if (password && password.trim()) {
      updateFields.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await Student.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: updateFields },
      { new: true }
    ).select("-password -__v").lean();

    if (!updatedUser) return res.status(404).json({ error: "Student not found" });

    // Invalidate users cache on profile update
    adminCache.invalidate("all-users");

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

/* ═══════════════════════════════════════════════════════════════
   ADMIN ROUTES (PROTECTED VIA JWT TOKEN)
═══════════════════════════════════════════════════════════════ */

// ── Admin Login ─────────────────────────────────────────────────
app.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const cached = adminCache.get("admin-settings");
    const admin = cached || await AdminSettings.findOne().lean();
    if (!cached && admin) adminCache.set("admin-settings", admin, 5 * 60 * 1000);

    if (admin && admin.password === password) {
      // Generate signed JWT token valid for 12 hours
      const token = jwt.sign(
        { role: "admin", timestamp: Date.now() },
        ADMIN_JWT_SECRET,
        { expiresIn: "12h" }
      );
      res.json({ status: "success", token });
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

// ── Update Admin Password (Protected) ───────────────────────────
app.post("/admin/update-password", authenticateAdmin, async (req, res) => {
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

// ── Get All Users (Protected, Cached) ───────────────────────────
app.get("/admin/users", authenticateAdmin, async (req, res) => {
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

// ── Delete User (Protected) ─────────────────────────────────────
app.delete("/admin/users/:id", authenticateAdmin, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    adminCache.invalidate("all-users");
    res.json({ status: "success", message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Get All Results (Protected, Cached) ─────────────────────────
app.get("/admin/results", authenticateAdmin, async (req, res) => {
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

// ── Delete Result (Protected) ───────────────────────────────────
app.delete("/admin/results/:id", authenticateAdmin, async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    adminCache.invalidate("all-results");
    res.json({ status: "success", message: "Result deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Get Questions (Admin, Protected, Cached) ────────────────────
app.get("/admin/questions", authenticateAdmin, async (req, res) => {
  try {
    const cached = adminCache.get("admin-questions");
    if (cached) return res.json(cached);

    const questions = await Question.find().limit(100).select("-__v").lean();
    adminCache.set("admin-questions", questions);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SAARTHI (सारथी) — AI ASSISTANT & CREATOR INSIGHTS ENDPOINTS
═══════════════════════════════════════════════════════════════ */

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

// ── Admin: View Saarthi Analytics, Creator Inquiries & Requests (Protected) ─
app.get("/admin/saarthi/logs", authenticateAdmin, async (req, res) => {
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

/* ═══════════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER — Never crash on unhandled errors
═══════════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Catch unhandled promise rejections — keep worker alive
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

/* ═══════════════════════════════════════════════════════════════
   SERVER STARTUP
═══════════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Worker [PID: ${process.pid}] running on port ${PORT}`);
});

// Keep-alive tuning — prevent connection drops under heavy load
server.keepAliveTimeout = 65000;      // 65s (must be > Render's 60s LB timeout)
server.headersTimeout  = 66000;       // Must be > keepAliveTimeout

module.exports = app;
