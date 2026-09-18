// ============================================================
//  ELITE EXAM PORTAL — UNIFIED SPA JAVASCRIPT
//  Hash-based router + all page logic merged
// ============================================================

// Pre-warm backend immediately to eliminate cold-start wait
let isPrewarming = false;
function prewarmBackend() {
    if (isPrewarming || !window.API_URL) return;
    isPrewarming = true;
    try {
        fetch(`${window.API_URL}/ping`, { mode: 'cors', cache: 'no-store' })
            .catch(() => {})
            .finally(() => { isPrewarming = false; });
    } catch (e) {
        isPrewarming = false;
    }
}
prewarmBackend();
document.addEventListener('DOMContentLoaded', prewarmBackend);

// ============= SPA ROUTER =============

const pages = ['home', 'dashboard', 'subjects', 'instruction', 'test', 'result'];
let currentPage = null;
let performanceChart = null;
let resultChart = null;

function navigateTo(hash) {
    window.location.hash = hash;
}

function getHashParams() {
    const hash = window.location.hash.slice(1) || 'home';
    const [page, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');
    return { page, params };
}

function handleRoute() {
    const { page, params } = getHashParams();
    const targetPage = pages.includes(page) ? page : 'home';

    // Hide all pages
    document.querySelectorAll('.spa-page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    // Show target page
    const el = document.getElementById(`page-${targetPage}`);
    if (el) {
        el.classList.add('active');
        // Flex pages need display:flex, others display:block
        if (['instruction', 'test', 'result'].includes(targetPage)) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'block';
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Initialize page logic
    currentPage = targetPage;
    switch (targetPage) {
        case 'home': initHome(); break;
        case 'dashboard': initDashboard(); break;
        case 'subjects': initSubjects(); break;
        case 'instruction': initInstruction(params.get('course')); break;
        case 'test': initTest(params.get('course')); break;
        case 'result': initResult(); break;
    }

    // Setup feedback links
    setupFeedbackLinks();
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', handleRoute);


// ============= SHARED: FEEDBACK LINKS =============
function setupFeedbackLinks() {
    const student = JSON.parse(localStorage.getItem("loggedUser"));
    const feedbackBtns = document.querySelectorAll('.feedback-link');
    if (student && feedbackBtns.length) {
        const subject = encodeURIComponent("Feedback for Exam Portal");
        const body = encodeURIComponent(`Hello Sumit,\n\nI have some feedback regarding the portal.\n\nFrom: ${student.full_name}\nEmail: ${student.email}`);
        feedbackBtns.forEach(btn => {
            btn.href = `mailto:sumitdwivedi681@gmail.com?subject=${subject}&body=${body}`;
        });
    }
}


// ============= PAGE: HOME (Login/Register) =============
let homeInitialized = false;
let googleTokenClient = null;

function initHome() {
    if (homeInitialized) return;
    homeInitialized = true;

    const popup = document.getElementById("successPopup");
    const popupText = document.getElementById("popupText");
    const popupBtn = document.getElementById("popupBtn");

    popupBtn.onclick = () => { popup.style.display = "none"; };

    // Register
    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const loader = document.getElementById("home-loader");
        loader.style.display = "flex";

        const full_name = document.getElementById("full_name").value.trim();
        const email = document.getElementById("register_email").value.trim();
        const password = document.getElementById("register_password").value;
        const course = document.getElementById("course").value;

        try {
            const res = await fetch(`${window.API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_name, email, password, course })
            });
            const data = await res.json();
            loader.style.display = "none";
            if (data.status === "success") {
                popupText.innerText = "Registration Successful! Please Login.";
                popup.style.display = "flex";
                showTab('loginTab');
            } else {
                popupText.innerText = data.error || "Registration failed";
                popup.style.display = "flex";
            }
        } catch (err) {
            loader.style.display = "none";
            popupText.innerText = "Connection error!";
            popup.style.display = "flex";
        }
    });

    // Login
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const loader = document.getElementById("home-loader");
        loader.style.display = "flex";

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        try {
            const res = await fetch(`${window.API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            loader.style.display = "none";
            if (data.status === "success") {
                localStorage.setItem("loggedUser", JSON.stringify(data.user));
                popupText.innerText = "Login Successful! Redirecting...";
                popup.style.display = "flex";
                setTimeout(() => {
                    loader.style.display = "flex";
                    navigateTo('#dashboard');
                    loader.style.display = "none";
                }, 500);
            } else {
                popupText.innerText = data.error || "Invalid credentials";
                popup.style.display = "flex";
            }
        } catch (err) {
            loader.style.display = "none";
            popupText.innerText = "Connection failed!";
            popup.style.display = "flex";
        }
    });
}

function initGoogleAuth() {
    if (googleTokenClient) return true;

    if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID === "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE") {
        showHomePopup("Add your Google Client ID in config.js first.");
        return false;
    }

    if (!window.google || !google.accounts || !google.accounts.oauth2) {
        showHomePopup("Google sign-in is still loading. Please try again.");
        return false;
    }

    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        prompt: "select_account",
        callback: handleGoogleTokenResponse
    });

    return true;
}

function triggerGoogleSignIn() {
    if (!initGoogleAuth()) return;
    googleTokenClient.requestAccessToken({ prompt: "select_account" });
}

async function handleGoogleTokenResponse(response) {
    if (!response || response.error || !response.access_token) {
        showHomePopup("Google sign-in was cancelled or failed.");
        return;
    }

    const loader = document.getElementById("home-loader");
    loader.style.display = "flex";

    try {
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${response.access_token}` }
        });
        const profile = await profileRes.json();
        loader.style.display = "none";

        if (!profileRes.ok || !profile.email) {
            showHomePopup("Could not read your Google profile.");
            return;
        }

        showGoogleCoursePopup(profile, response.access_token);
    } catch (err) {
        loader.style.display = "none";
        showHomePopup("Connection failed during Google sign-in.");
    }
}

function showGoogleCoursePopup(profile, accessToken) {
    const oldOverlay = document.querySelector(".google-course-overlay");
    if (oldOverlay) oldOverlay.remove();

    const courseOptions = document.getElementById("course").innerHTML;
    const overlay = document.createElement("div");
    overlay.className = "google-course-overlay";
    overlay.innerHTML = `
        <div class="google-course-popup">
            <h3>Complete Google Sign-In</h3>
            <p>Select your course to continue to the portal.</p>
            <div class="google-user-info">
                <img src="${profile.picture || "https://ui-avatars.com/api/?name=Google+User&background=random"}" alt="Google profile">
                <div>
                    <div class="g-name">${escapeHtml(profile.name || "Google User")}</div>
                    <div class="g-email">${escapeHtml(profile.email)}</div>
                </div>
            </div>
            <select id="google-course-select" required>${courseOptions}</select>
            <div class="popup-actions">
                <button type="button" class="btn-cancel">Cancel</button>
                <button type="button" class="btn-continue">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".btn-cancel").onclick = () => overlay.remove();
    overlay.querySelector(".btn-continue").onclick = () => {
        const course = document.getElementById("google-course-select").value;
        if (!course) {
            showHomePopup("Please select your course.");
            return;
        }
        overlay.remove();
        completeGoogleLogin(accessToken, course);
    };
}

async function completeGoogleLogin(accessToken, course) {
    const loader = document.getElementById("home-loader");
    loader.style.display = "flex";

    try {
        const res = await fetch(`${window.API_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accessToken,
                course,
                clientId: window.GOOGLE_CLIENT_ID
            })
        });
        const data = await res.json();
        loader.style.display = "none";

        if (data.status === "success") {
            localStorage.setItem("loggedUser", JSON.stringify(data.user));
            showHomePopup("Google Login Successful! Redirecting...");
            setTimeout(() => navigateTo("#dashboard"), 500);
        } else {
            showHomePopup(data.error || "Google login failed.");
        }
    } catch (err) {
        loader.style.display = "none";
        showHomePopup("Server error during Google login.");
    }
}

function showHomePopup(message) {
    document.getElementById("popupText").innerText = message;
    document.getElementById("successPopup").style.display = "flex";
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

// Tab switching (global for onclick handlers in HTML)
function showTab(tabId, ev) {
    const tabs = document.querySelectorAll("#page-home .tab-content");
    const buttons = document.querySelectorAll("#page-home .tab-btn");
    tabs.forEach(tab => tab.classList.remove("active"));
    buttons.forEach(btn => btn.classList.remove("active"));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");

    const e = ev || (typeof window !== 'undefined' ? window.event : null);
    if (e && e.currentTarget && e.currentTarget.classList) {
        e.currentTarget.classList.add("active");
    } else {
        buttons.forEach(btn => {
            const expected = tabId === 'loginTab' ? 'Login' : 'Register';
            if (btn.textContent && btn.textContent.trim().includes(expected)) {
                btn.classList.add('active');
            }
        });
    }
}


// ============= PAGE: DASHBOARD =============
let dashboardChartRendered = false;

function initDashboard() {
    let student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) { navigateTo('#home'); return; }

    updateDashboardUI(student);
    loadDashboardStats(student);

    // Profile Form
    const profileForm = document.getElementById("profileForm");
    document.getElementById("edit-name").value = student.full_name;
    document.getElementById("edit-img").value = student.profile_img || "";

    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const full_name = document.getElementById("edit-name").value;
        const profile_img = document.getElementById("edit-img").value;
        const password = document.getElementById("edit-pass").value;
        try {
            const res = await fetch(`${window.API_URL}/update-profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: student.email, full_name, profile_img, password })
            });
            const data = await res.json();
            if (data.status === "success") {
                localStorage.setItem("loggedUser", JSON.stringify(data.user));
                alert("Profile Updated!");
                navigateTo('#dashboard');
            }
        } catch (err) { alert("Update failed!"); }
    };
}

function updateDashboardUI(student) {
    document.getElementById("studentName").innerText = student.full_name;
    if (student.profile_img) {
        document.getElementById("topProfileImg").src = student.profile_img;
    } else {
        document.getElementById("topProfileImg").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=random`;
    }
}

function showSection(sectionId, ev) {
    document.querySelectorAll('#page-dashboard .dashboard-section').forEach(s => s.classList.add('d-none'));
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) targetSection.classList.remove('d-none');
    document.querySelectorAll('#page-dashboard .nav-link').forEach(l => l.classList.remove('active'));
    const e = ev || (typeof window !== 'undefined' ? window.event : null);
    if (e && e.currentTarget && e.currentTarget.classList) {
        e.currentTarget.classList.add('active');
    }
}

async function loadDashboardStats(student) {
    const resultBody = document.getElementById("result-history");
    const totalExamsEl = document.getElementById("total-exams");
    const avgScoreEl = document.getElementById("avg-score");

    try {
        const res = await fetch(`${window.API_URL}/get-result?email=${encodeURIComponent(student.email)}`);
        const results = await res.json();

        if (results && results.length > 0) {
            totalExamsEl.innerText = results.length;
            let totalPercent = 0;
            const subjectScores = {};

            resultBody.innerHTML = results.map(r => {
                const percent = ((r.score / r.total) * 100).toFixed(0);
                totalPercent += parseInt(percent);
                if (!subjectScores[r.course]) subjectScores[r.course] = [];
                subjectScores[r.course].push(parseInt(percent));
                const color = percent >= 40 ? 'success' : 'danger';
                return `<tr>
                    <td><div class="fw-bold">${r.course}</div></td>
                    <td>${r.score} / ${r.total} <small class="text-muted">(${percent}%)</small></td>
                    <td><span class="badge bg-${color}">${percent >= 40 ? 'Pass' : 'Fail'}</span></td>
                    <td>${new Date(r.exam_date).toLocaleDateString()}</td>
                </tr>`;
            }).join('');

            avgScoreEl.innerText = (totalPercent / results.length).toFixed(0) + "%";

            const labels = Object.keys(subjectScores);
            const data = labels.map(l => {
                const arr = subjectScores[l];
                return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0);
            });
            renderPerformanceChart(labels, data);
        }
    } catch (err) { console.error(err); }
}

function renderPerformanceChart(labels, data) {
    // Destroy existing chart to prevent memory leak
    if (performanceChart) { performanceChart.destroy(); performanceChart = null; }

    const ctx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Avg Score %', data: data, backgroundColor: 'rgba(99, 102, 241, 0.6)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 8 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, grid: { display: false } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function logout() {
    localStorage.removeItem("loggedUser");
    navigateTo('#home');
}


// ============= PAGE: SUBJECTS =============
let subjectsInitialized = false;

function initSubjects() {
    const student = JSON.parse(localStorage.getItem("loggedUser")) || null;

    // Welcome message
    if (student) {
        const header = document.querySelector("#page-subjects .navbar-dashboard .container");
        // Remove old welcome message if exists
        const oldMsg = header.querySelector('.welcome-msg');
        if (oldMsg) oldMsg.remove();
        if (header) {
            const welcomeMsg = document.createElement("p");
            welcomeMsg.className = "mb-0 ms-3 text-muted d-none d-md-block welcome-msg";
            welcomeMsg.innerHTML = `Hello, <strong>${student.full_name}</strong> 👋`;
            header.appendChild(welcomeMsg);
        }
    }

    // Button setup
    const buttons = document.querySelectorAll("#page-subjects .subject-card button");
    buttons.forEach(btn => {
        if (!student) {
            btn.disabled = true;
            btn.innerText = "Login to Start";
        } else {
            btn.disabled = false;
            // Restore original text if was previously disabled
            if (btn.innerText === "Login to Start") btn.innerText = "Start Test";
        }
        // Remove old listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("mouseenter", prewarmBackend);
        newBtn.addEventListener("click", () => {
            const course = newBtn.getAttribute("data-course");
            navigateTo(`#test?course=${encodeURIComponent(course)}`);
        });
    });

    // Intersection Observer for card reveal animation
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => { entry.target.classList.add("revealed"); }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll("#page-subjects .subject-card");
    cards.forEach(card => {
        card.classList.remove("revealed");
        observer.observe(card);
    });
}


// ============= PAGE: INSTRUCTION =============
function initInstruction(course) {
    if (!course) { navigateTo('#subjects'); return; }
    document.getElementById("courseTitle").textContent = decodeURIComponent(course) + " Test";
}

function startTest() {
    const courseTitle = document.getElementById("courseTitle").textContent.replace(" Test", "");
    navigateTo(`#test?course=${encodeURIComponent(courseTitle)}`);
}


// ============= PAGE: TEST =============
let testQuestions = [];
let testCurrentIndex = 0;
let testAnswers = {};
let testCourse = '';

// Helper to fetch course questions with sessionStorage caching and retry
async function fetchQuestionsWithCache(courseName) {
    const cacheKey = `exam_questions_${encodeURIComponent(courseName)}`;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    // Fetch from backend with 1 retry for cold start resilience
    let res;
    try {
        res = await fetch(`${window.API_URL}/get-questions?course=${encodeURIComponent(courseName)}`);
    } catch (fetchErr) {
        // Retry once after 2s if backend was waking up
        await new Promise(r => setTimeout(r, 2000));
        res = await fetch(`${window.API_URL}/get-questions?course=${encodeURIComponent(courseName)}`);
    }

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
    }
    return data;
}

async function initTest(course) {
    if (!course) { navigateTo('#subjects'); return; }
    testCourse = decodeURIComponent(course);

    const student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) { alert("Login required!"); navigateTo('#home'); return; }

    const courseTitle = document.getElementById("course-title");
    const loader = document.getElementById("test-loader");
    const testArea = document.getElementById("test-area");

    courseTitle.innerText = testCourse;
    loader.style.display = "block";
    loader.innerHTML = '<div class="spinner-border text-primary me-2" role="status" style="width: 1.5rem; height: 1.5rem; vertical-align: middle;"></div> Preparing test questions...';
    testArea.style.display = "none";

    // Reset state
    testQuestions = [];
    testCurrentIndex = 0;
    testAnswers = {};

    try {
        const allQuestions = await fetchQuestionsWithCache(testCourse);

        if (!allQuestions || !allQuestions.length) {
            loader.innerText = "No questions found for this course!";
            return;
        }

        testQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);
        loader.style.display = "none";
        testArea.style.display = "block";
        loadTestQuestion();
    } catch (err) {
        console.error(err);
        loader.innerHTML = 'Failed to load questions. <button class="btn btn-sm btn-outline-primary ms-2" onclick="initTest(testCourse)">Retry</button>';
    }

    // Wire up buttons
    document.getElementById("nextBtn").onclick = () => { saveTestAnswer(); testCurrentIndex++; loadTestQuestion(); };
    document.getElementById("prevBtn").onclick = () => { saveTestAnswer(); testCurrentIndex--; loadTestQuestion(); };
    document.getElementById("submitBtn").onclick = submitTest;
}

function loadTestQuestion() {
    const q = testQuestions[testCurrentIndex];
    const questionText = document.getElementById("question-text");
    const optionsBox = document.getElementById("options");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    questionText.innerText = `${testCurrentIndex + 1}. ${q.question_title}`;
    const selected = testAnswers[q._id];

    optionsBox.innerHTML = "";
    ["optionA", "optionB", "optionC", "optionD"].forEach((optKey, index) => {
        const optVal = q[optKey] || "";
        const letter = ["A", "B", "C", "D"][index];
        const optionDiv = document.createElement("div");
        optionDiv.className = "option-item";
        const label = document.createElement("label");
        const radio = document.createElement("input");
        radio.type = "radio"; radio.name = "option"; radio.value = optVal;
        if (selected === optVal) radio.checked = true;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${letter}. `));
        const span = document.createElement("span");
        span.textContent = optVal;
        label.appendChild(span);
        optionDiv.appendChild(label);
        optionsBox.appendChild(optionDiv);
    });

    prevBtn.disabled = testCurrentIndex === 0;
    nextBtn.style.display = testCurrentIndex === testQuestions.length - 1 ? "none" : "inline-block";
    submitBtn.style.display = testCurrentIndex === testQuestions.length - 1 ? "inline-block" : "none";
}

function saveTestAnswer() {
    const selected = document.querySelector('#page-test input[name="option"]:checked');
    if (selected) testAnswers[testQuestions[testCurrentIndex]._id] = selected.value;
}

async function submitTest() {
    saveTestAnswer();
    const student = JSON.parse(localStorage.getItem("loggedUser"));
    let score = 0;

    testQuestions.forEach(q => {
        const userSelectedText = (testAnswers[q._id] || "").trim().toLowerCase();
        const dbCorrectAnswer = (q.answer || "").trim().toLowerCase();

        if (userSelectedText === dbCorrectAnswer) { score++; }
        else if (dbCorrectAnswer === "a" && userSelectedText === (q.optionA || "").trim().toLowerCase()) { score++; }
        else if (dbCorrectAnswer === "b" && userSelectedText === (q.optionB || "").trim().toLowerCase()) { score++; }
        else if (dbCorrectAnswer === "c" && userSelectedText === (q.optionC || "").trim().toLowerCase()) { score++; }
        else if (dbCorrectAnswer === "d" && userSelectedText === (q.optionD || "").trim().toLowerCase()) { score++; }
    });

    localStorage.setItem("lastResult", JSON.stringify({ score, total: testQuestions.length }));

    try {
        const res = await fetch(`${window.API_URL}/save-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: student.email, course: testCourse, score: score, total: testQuestions.length })
        });
        const data = await res.json();
        if (data.status === "success") {
            navigateTo('#result');
        } else { alert("Submission failed!"); }
    } catch (err) {
        console.error("Submit Error:", err);
        alert("Server error while submitting!");
    }
}


// ============= PAGE: RESULT =============
function initResult() {
    const lastResult = JSON.parse(localStorage.getItem("lastResult"));
    if (!lastResult) { navigateTo('#dashboard'); return; }

    const { score, total } = lastResult;
    const wrong = total - score;

    document.getElementById("score-display").innerText = `${score}/${total}`;

    // Destroy old chart
    if (resultChart) { resultChart.destroy(); resultChart = null; }

    const ctx = document.getElementById('resultChart').getContext('2d');
    resultChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Incorrect'],
            datasets: [{ data: [score, wrong], backgroundColor: ['#0ea5e9', '#f1f5f9'], borderColor: ['#fff', '#fff'], borderWidth: 2, cutout: '70%' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true, callbacks: { label: (context) => ` ${context.label}: ${context.raw}` } } }
        }
    });
}
