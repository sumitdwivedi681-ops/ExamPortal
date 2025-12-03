require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();


//middlewares

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//database connection pool

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "student_portal",
});

// Promise-based DB Query

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });


  // api root route

app.get("/", (req, res) => res.send("API is running..."));

// user registration route

app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, course } = req.body;

    if (!full_name || !email || !password || !course) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const exists = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await query(
      "INSERT INTO users (full_name, email, password, course) VALUES (?, ?, ?, ?)",
      [full_name, email, hashed, course]
    );

    res.json({ status: "success" });
  } catch (err) {
    console.log("Register Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//login route

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
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
    console.log("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// get questions for a course

app.get("/get-questions", async (req, res) => {
  try {
    const { course } = req.query;

    if (!course) {
      return res.status(400).json({ error: "Course missing" });
    }

    const questions = await query(
      "SELECT id, question, option_a, option_b, option_c, option_d, answer FROM questions WHERE course = ? ORDER BY RAND() LIMIT 20",
      [course]
    );

    res.json(questions);
  } catch (err) {
    console.log("Question Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});


// save test result

app.post("/save-result", async (req, res) => {
  try {
    const { email, course, score, total } = req.body;

    if (!email || !course || score == undefined || !total) {
      return res.status(400).json({ error: "Missing result data" });
    }

    await query(
      "INSERT INTO result(student_email, course, score, total, exam_date) VALUES(?,?,?,?,NOW())",
      [email, course, score, total]
    );

    res.json({ status: "success", message: "Result saved" });
  } catch (err) {
    console.log("Save Result Error:", err);
    res.status(500).json({ error: "Failed to save result" });
  }
});


// get results for a student

app.get("/get-results", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: "Email missing" });

    const results = await query(
      "SELECT course, score, total, exam_date FROM result WHERE student_email = ? ORDER BY exam_date ASC",
      [email]
    );

    res.json(results);
  } catch (err) {
    console.error("Result Fetch Error:", err);
    res.status(500).json({ error: "Cannot fetch results" });
  }
});

//  Start Server 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

