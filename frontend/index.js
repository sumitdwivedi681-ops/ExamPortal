//  ELITE EXAM PORTAL — UNIFIED SPA JAVASCRIPT
//  Hash-based router + all page logic merged

// Pre-warm backend & Cloudflare Worker immediately to eliminate cold-start wait
let isPrewarming = false;
function prewarmBackend() {
    if (isPrewarming) return;
    isPrewarming = true;
    try {
        if (window.API_URL) {
            fetch(`${window.API_URL}/ping`, { mode: 'cors', cache: 'no-store' }).catch(() => {});
        }
        if (window.QUESTIONS_URL && window.QUESTIONS_URL !== window.API_URL) {
            fetch(`${window.QUESTIONS_URL}/get-questions?course=React`, { mode: 'cors' }).catch(() => {});
        }
    } catch (e) {
    } finally {
        setTimeout(() => { isPrewarming = false; }, 3000);
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

    // Fast switch: deactivate inactive pages, activate target page via CSS
    document.querySelectorAll('.spa-page.active').forEach(p => {
        if (p.id !== `page-${targetPage}`) {
            p.classList.remove('active');
            p.style.display = ''; // Clear any inline styles
        }
    });

    const el = document.getElementById(`page-${targetPage}`);
    if (el) {
        el.style.display = ''; // Let CSS rule handle display:block or display:flex
        el.classList.add('active');
    }

    // Scroll to top instantly
    window.scrollTo({ top: 0, behavior: 'instant' });

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
let currentUploadedAvatar = "";

// Helper to compress user photo from phone gallery or PC before uploading
function compressImageFile(file, maxWidth = 350, maxHeight = 350, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Scale proportionally
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Export as compressed base64 JPEG
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function initDashboard() {
    let student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) { navigateTo('#home'); return; }

    updateDashboardUI(student);
    loadDashboardStats(student);

    // Profile Form setup
    const profileForm = document.getElementById("profileForm");
    const editNameInput = document.getElementById("edit-name");
    const editAvatarPreview = document.getElementById("edit-avatar-preview");
    const fileInput = document.getElementById("profile-file-input");
    const saveBtn = document.getElementById("save-profile-btn");

    if (editNameInput) editNameInput.value = student.full_name || "";
    
    // Set initial avatar preview
    currentUploadedAvatar = student.profile_img || "";
    if (editAvatarPreview) {
        editAvatarPreview.src = currentUploadedAvatar 
            ? currentUploadedAvatar 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name || 'Student')}&background=random`;
    }

    // Handle Gallery / File Explorer photo selection
    if (fileInput && !fileInput.dataset.bound) {
        fileInput.dataset.bound = "true";
        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file (JPG, PNG, or WebP).");
                return;
            }

            try {
                // Compress photo for lightning fast upload
                const compressedBase64 = await compressImageFile(file, 350, 350, 0.82);
                currentUploadedAvatar = compressedBase64;
                
                // Show instant live preview on page
                if (editAvatarPreview) editAvatarPreview.src = compressedBase64;
                const topImg = document.getElementById("topProfileImg");
                if (topImg) topImg.src = compressedBase64;
            } catch (err) {
                console.error("Image compression error:", err);
                alert("Could not process image. Please try another photo.");
            }
        });
    }

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const full_name = editNameInput ? editNameInput.value.trim() : student.full_name;
            const password = document.getElementById("edit-pass") ? document.getElementById("edit-pass").value : "";
            
            const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "Save Changes";
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Updating...';
            }

            try {
                const res = await fetch(`${window.API_URL}/update-profile`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: student.email,
                        full_name,
                        profile_img: currentUploadedAvatar,
                        password
                    })
                });

                const data = await res.json();
                if (data.status === "success") {
                    localStorage.setItem("loggedUser", JSON.stringify(data.user));
                    student = data.user;
                    updateDashboardUI(student);
                    alert("Profile photo & details updated successfully! 🎉");
                    showSection('performance');
                } else {
                    alert(data.error || "Update failed. Please try again.");
                }
            } catch (err) {
                console.error("Profile update error:", err);
                alert("Server error during update. Please try again in a few seconds.");
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHtml;
                }
            }
        };
    }
}

function updateDashboardUI(student) {
    if (!student) return;
    const nameEl = document.getElementById("studentName");
    if (nameEl) nameEl.innerText = student.full_name;

    const topImg = document.getElementById("topProfileImg");
    if (topImg) {
        if (student.profile_img) {
            topImg.src = student.profile_img;
        } else {
            topImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name || 'Student')}&background=random`;
        }
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

function renderDashboardResults(results) {
    const resultBody = document.getElementById("result-history");
    const totalExamsEl = document.getElementById("total-exams");
    const avgScoreEl = document.getElementById("avg-score");
    if (!results || !results.length) return;

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

async function loadDashboardStats(student) {
    const cacheKey = `dashboard_results_${student.email}`;

    // Instant render from session cache for zero-wait transition
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                renderDashboardResults(parsed);
            }
        }
    } catch (e) {}

    // Background fetch to ensure newest results are always synced
    try {
        const res = await fetch(`${window.API_URL}/get-result?email=${encodeURIComponent(student.email)}`);
        const results = await res.json();

        if (Array.isArray(results) && results.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify(results));
            renderDashboardResults(results);
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
        const oldMsg = header ? header.querySelector('.welcome-msg') : null;
        if (oldMsg) oldMsg.remove();
        if (header) {
            const welcomeMsg = document.createElement("p");
            welcomeMsg.className = "mb-0 ms-3 text-muted d-none d-md-block welcome-msg";
            welcomeMsg.innerHTML = `Hello, <strong>${student.full_name}</strong> 👋`;
            header.appendChild(welcomeMsg);
        }
    }

    // Set cards visible immediately with zero transition delay
    const cards = document.querySelectorAll("#page-subjects .subject-card");
    cards.forEach(card => card.classList.add("revealed"));

    // Fast Button setup without destructive DOM cloning
    const buttons = document.querySelectorAll("#page-subjects .subject-card button");
    buttons.forEach(btn => {
        if (!student) {
            btn.disabled = true;
            btn.innerText = "Login to Start";
        } else {
            btn.disabled = false;
            if (btn.innerText === "Login to Start") btn.innerText = "Start Test";
        }

        if (!btn.dataset.bound) {
            btn.dataset.bound = "true";
            btn.addEventListener("mouseenter", () => {
                const course = btn.getAttribute("data-course");
                if (course) fetchQuestionsWithCache(course).catch(() => {});
            });
            btn.addEventListener("click", () => {
                const course = btn.getAttribute("data-course");
                navigateTo(`#test?course=${encodeURIComponent(course)}`);
            });
        }
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
let testStatus = {}; // { [qId]: 'notvisited' | 'visited' | 'answered' | 'skipped' | 'review' | 'review-answered' }
let testCourse = '';
let testTimerInterval = null;
let testTimeRemaining = 20 * 60; // 20 minutes in seconds

// Helper to fetch course questions with multi-tier caching (Session + LocalStorage + Edge Worker)
async function fetchQuestionsWithCache(courseName) {
    const cacheKey = `exam_questions_${encodeURIComponent(courseName)}`;
    const cacheTimeKey = `${cacheKey}_time`;
    const MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes

    // 1. Instant SessionStorage check (0ms)
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    // 2. LocalStorage check (persists across tabs/refreshes - 0ms)
    try {
        const localCached = localStorage.getItem(cacheKey);
        const cachedTime = Number(localStorage.getItem(cacheTimeKey) || 0);
        if (localCached && (Date.now() - cachedTime < MAX_CACHE_AGE)) {
            const parsed = JSON.parse(localCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                try { sessionStorage.setItem(cacheKey, localCached); } catch (e) {}
                return parsed;
            }
        }
    } catch (e) {}

    // 3. Fetch from Cloudflare Edge Worker
    const qUrl = window.QUESTIONS_URL || window.API_URL;
    let res;
    try {
        res = await fetch(`${qUrl}/get-questions?course=${encodeURIComponent(courseName)}`);
    } catch (fetchErr) {
        await new Promise(r => setTimeout(r, 1000));
        res = await fetch(`${qUrl}/get-questions?course=${encodeURIComponent(courseName)}`);
    }

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
        const str = JSON.stringify(data);
        try { sessionStorage.setItem(cacheKey, str); } catch (e) {}
        try {
            localStorage.setItem(cacheKey, str);
            localStorage.setItem(cacheTimeKey, String(Date.now()));
        } catch (e) {}
    }
    return data;
}

// ── Exam Timer Management ───────────────────────────────────────────
function startExamTimer() {
    stopExamTimer();
    testTimeRemaining = 20 * 60; // 20 minutes countdown
    updateTimerDisplay();

    testTimerInterval = setInterval(() => {
        testTimeRemaining--;
        updateTimerDisplay();

        if (testTimeRemaining <= 0) {
            stopExamTimer();
            alert("⏰ Time is up! Your examination will be submitted automatically.");
            finalSubmitExam();
        }
    }, 1000);
}

function stopExamTimer() {
    if (testTimerInterval) {
        clearInterval(testTimerInterval);
        testTimerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerText = document.getElementById("exam-timer-text");
    const timerBox = document.getElementById("exam-timer-box");
    if (!timerText) return;

    const mins = Math.floor(Math.max(0, testTimeRemaining) / 60);
    const secs = Math.max(0, testTimeRemaining) % 60;
    timerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (timerBox) {
        if (testTimeRemaining <= 180) { // Under 3 minutes remaining
            timerBox.classList.add("warning");
        } else {
            timerBox.classList.remove("warning");
        }
    }
}

// ── Question Palette Helpers ─────────────────────────────────────────
function renderQuestionPalette() {
    const paletteGrid = document.getElementById("question-palette-grid");
    if (!paletteGrid) return;

    paletteGrid.innerHTML = testQuestions.map((q, idx) => {
        const st = testStatus[q._id] || "notvisited";
        const isCurrent = (idx === testCurrentIndex);
        let stateClass = "";

        if (st === "answered") stateClass = "answered";
        else if (st === "review-answered") stateClass = "review-answered";
        else if (st === "review") stateClass = "review";
        else if (st === "skipped") stateClass = "skipped";
        else if (st === "visited") stateClass = "visited";
        else stateClass = "notvisited";

        const currentClass = isCurrent ? "current" : "";

        return `
            <button class="palette-btn ${stateClass} ${currentClass}" onclick="jumpToQuestion(${idx})" title="Question ${idx + 1} (${st})">
                ${idx + 1}
            </button>
        `;
    }).join("");

    updatePaletteCounts();
}

function updatePaletteCounts() {
    let answered = 0;
    let review = 0;
    let skipped = 0;
    let notvisited = 0;

    testQuestions.forEach(q => {
        const st = testStatus[q._id] || "notvisited";
        if (st === "answered" || st === "review-answered") answered++;
        if (st === "review" || st === "review-answered") review++;
        if (st === "skipped") skipped++;
        if (st === "notvisited") notvisited++;
    });

    const ansEl = document.getElementById("legend-answered-count");
    const revEl = document.getElementById("legend-review-count");
    const skipEl = document.getElementById("legend-skipped-count");
    const notvisEl = document.getElementById("legend-notvisited-count");

    if (ansEl) ansEl.innerText = answered;
    if (revEl) revEl.innerText = review;
    if (skipEl) skipEl.innerText = skipped;
    if (notvisEl) notvisEl.innerText = notvisited;
}

// ── Test Initialization ──────────────────────────────────────────────
async function initTest(course) {
    if (!course) { navigateTo('#subjects'); return; }
    testCourse = decodeURIComponent(course);

    const student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) { alert("Login required!"); navigateTo('#home'); return; }

    const courseTitle = document.getElementById("course-title");
    const courseBadge = document.getElementById("test-course-badge");
    const loader = document.getElementById("test-loader");
    const testArea = document.getElementById("test-area");

    if (courseTitle) courseTitle.innerText = `${testCourse} Practice Test`;
    if (courseBadge) courseBadge.innerText = testCourse;
    if (loader) {
        loader.style.display = "block";
        loader.innerHTML = '<div class="spinner-border text-primary me-2" role="status" style="width: 1.5rem; height: 1.5rem; vertical-align: middle;"></div> Preparing test questions...';
    }
    if (testArea) testArea.style.display = "none";

    // Reset test states
    testQuestions = [];
    testCurrentIndex = 0;
    testAnswers = {};
    testStatus = {};

    try {
        const allQuestions = await fetchQuestionsWithCache(testCourse);

        if (!allQuestions || !allQuestions.length) {
            if (loader) loader.innerText = "No questions found for this course!";
            return;
        }

        // Pick 20 questions randomly
        testQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);

        // Initialize question statuses
        testQuestions.forEach(q => {
            testStatus[q._id] = "notvisited";
        });

        if (loader) loader.style.display = "none";
        if (testArea) testArea.style.display = "block";

        startExamTimer();
        loadTestQuestion();
    } catch (err) {
        console.error(err);
        if (loader) loader.innerHTML = 'Failed to load questions. <button class="btn btn-sm btn-outline-primary ms-2" onclick="initTest(testCourse)">Retry</button>';
    }
}

// ── Render Active Question ───────────────────────────────────────────
function loadTestQuestion() {
    if (!testQuestions || testQuestions.length === 0) return;
    const q = testQuestions[testCurrentIndex];

    // Mark current question as visited if previously unvisited
    if (!testStatus[q._id] || testStatus[q._id] === "notvisited") {
        testStatus[q._id] = "visited";
    }

    const courseTitle = document.getElementById("course-title");
    const courseBadge = document.getElementById("test-course-badge");
    const qCurrentNum = document.getElementById("q-current-num");
    const qTotalNum = document.getElementById("q-total-num");
    const qStatusBadge = document.getElementById("q-status-badge");
    const questionText = document.getElementById("question-text");
    const optionsBox = document.getElementById("options");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtnText = document.getElementById("nextBtnText");

    if (courseTitle) courseTitle.innerText = `${testCourse} Practice Test`;
    if (courseBadge) courseBadge.innerText = testCourse;
    if (qCurrentNum) qCurrentNum.innerText = testCurrentIndex + 1;
    if (qTotalNum) qTotalNum.innerText = testQuestions.length;

    // Status Badge
    const st = testStatus[q._id];
    if (qStatusBadge) {
        if (st === "answered") {
            qStatusBadge.className = "badge bg-success-subtle text-success border border-success-subtle px-2 py-1";
            qStatusBadge.style.background = "";
            qStatusBadge.style.color = "";
            qStatusBadge.innerHTML = '<i class="fas fa-check-circle me-1"></i>Answered';
        } else if (st === "review-answered") {
            qStatusBadge.className = "badge px-2 py-1";
            qStatusBadge.style.background = "#ede9fe";
            qStatusBadge.style.color = "#6d28d9";
            qStatusBadge.innerHTML = '<i class="fas fa-bookmark me-1"></i>Answered & Marked for Review';
        } else if (st === "review") {
            qStatusBadge.className = "badge px-2 py-1";
            qStatusBadge.style.background = "#ede9fe";
            qStatusBadge.style.color = "#6d28d9";
            qStatusBadge.innerHTML = '<i class="fas fa-bookmark me-1"></i>Marked for Review';
        } else if (st === "skipped") {
            qStatusBadge.className = "badge px-2 py-1";
            qStatusBadge.style.background = "#ffedd5";
            qStatusBadge.style.color = "#c2410c";
            qStatusBadge.innerHTML = '<i class="fas fa-forward me-1"></i>Skipped';
        } else {
            qStatusBadge.className = "badge bg-secondary-subtle text-secondary px-2 py-1";
            qStatusBadge.style.background = "";
            qStatusBadge.style.color = "";
            qStatusBadge.innerHTML = '<i class="far fa-circle me-1"></i>Not Answered';
        }
    }

    if (questionText) questionText.innerText = q.question_title;

    const selectedVal = testAnswers[q._id];
    if (optionsBox) {
        optionsBox.innerHTML = "";
        ["optionA", "optionB", "optionC", "optionD"].forEach((optKey, index) => {
            const optVal = q[optKey] || "";
            if (!optVal && index >= 2) return;

            const letter = ["A", "B", "C", "D"][index];
            const isChecked = (selectedVal === optVal);

            const optDiv = document.createElement("div");
            optDiv.className = `option-item ${isChecked ? "selected" : ""}`;
            optDiv.onclick = (e) => {
                const radio = optDiv.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    saveCurrentSelection();
                }
            };

            const label = document.createElement("label");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "option";
            radio.value = optVal;
            radio.checked = isChecked;
            radio.onchange = () => saveCurrentSelection();

            const letterSpan = document.createElement("span");
            letterSpan.className = "option-letter";
            letterSpan.innerText = letter;

            const textSpan = document.createElement("span");
            textSpan.textContent = optVal;

            label.appendChild(radio);
            label.appendChild(letterSpan);
            label.appendChild(textSpan);
            optDiv.appendChild(label);
            optionsBox.appendChild(optDiv);
        });
    }

    if (prevBtn) prevBtn.disabled = (testCurrentIndex === 0);
    if (nextBtnText) {
        nextBtnText.innerText = (testCurrentIndex === testQuestions.length - 1) ? "Save & Finish" : "Save & Next";
    }

    renderQuestionPalette();
}

// Save active selected option into answers cache
function saveCurrentSelection() {
    const q = testQuestions[testCurrentIndex];
    if (!q) return;

    const checkedRadio = document.querySelector('#page-test input[name="option"]:checked');
    if (checkedRadio) {
        testAnswers[q._id] = checkedRadio.value;
        if (testStatus[q._id] === "review" || testStatus[q._id] === "review-answered") {
            testStatus[q._id] = "review-answered";
        } else {
            testStatus[q._id] = "answered";
        }

        document.querySelectorAll('#options .option-item').forEach(item => {
            const r = item.querySelector('input[type="radio"]');
            if (r && r.checked) item.classList.add("selected");
            else item.classList.remove("selected");
        });
    }

    renderQuestionPalette();
}

// ── Question Action Controls ─────────────────────────────────────────

// 1. Save & Next / Finish
function saveAndNext() {
    saveCurrentSelection();
    if (testCurrentIndex < testQuestions.length - 1) {
        testCurrentIndex++;
        loadTestQuestion();
    } else {
        promptSubmitTest();
    }
}

// 2. Skip Question
function skipQuestion() {
    const q = testQuestions[testCurrentIndex];
    if (q) {
        testStatus[q._id] = "skipped";
        delete testAnswers[q._id];
    }
    if (testCurrentIndex < testQuestions.length - 1) {
        testCurrentIndex++;
        loadTestQuestion();
    } else {
        promptSubmitTest();
    }
}

// 3. Mark for Review
function markForReview() {
    const q = testQuestions[testCurrentIndex];
    if (q) {
        const checkedRadio = document.querySelector('#page-test input[name="option"]:checked');
        if (checkedRadio) {
            testAnswers[q._id] = checkedRadio.value;
            testStatus[q._id] = "review-answered";
        } else {
            testStatus[q._id] = "review";
        }
    }
    if (testCurrentIndex < testQuestions.length - 1) {
        testCurrentIndex++;
        loadTestQuestion();
    } else {
        promptSubmitTest();
    }
}

// 4. Clear Response
function clearCurrentAnswer() {
    const q = testQuestions[testCurrentIndex];
    if (q) {
        delete testAnswers[q._id];
        if (testStatus[q._id] === "review-answered") {
            testStatus[q._id] = "review";
        } else {
            testStatus[q._id] = "visited";
        }
    }
    const radios = document.querySelectorAll('#page-test input[name="option"]');
    radios.forEach(r => r.checked = false);
    document.querySelectorAll('#options .option-item').forEach(item => item.classList.remove("selected"));
    loadTestQuestion();
}

// 5. Previous Question
function prevQuestion() {
    saveCurrentSelection();
    if (testCurrentIndex > 0) {
        testCurrentIndex--;
        loadTestQuestion();
    }
}

// 6. Jump to Question from Palette
function jumpToQuestion(idx) {
    if (idx >= 0 && idx < testQuestions.length) {
        saveCurrentSelection();
        testCurrentIndex = idx;
        loadTestQuestion();
    }
}

// ── Submit Test & Confirmation Modal ─────────────────────────────────
function promptSubmitTest() {
    saveCurrentSelection();

    let answered = 0;
    let review = 0;
    let skipped = 0;

    testQuestions.forEach(q => {
        const st = testStatus[q._id] || "notvisited";
        if (st === "answered" || st === "review-answered") answered++;
        if (st === "review" || st === "review-answered") review++;
        if (st === "skipped") skipped++;
    });

    const sumTotal = document.getElementById("modal-sum-total");
    const sumAnswered = document.getElementById("modal-sum-answered");
    const sumReview = document.getElementById("modal-sum-review");
    const sumSkipped = document.getElementById("modal-sum-skipped");

    if (sumTotal) sumTotal.innerText = testQuestions.length;
    if (sumAnswered) sumAnswered.innerText = answered;
    if (sumReview) sumReview.innerText = review;
    if (sumSkipped) sumSkipped.innerText = skipped;

    const modal = document.getElementById("exam-submit-modal");
    if (modal) modal.classList.remove("d-none");
}

function closeSubmitModal() {
    const modal = document.getElementById("exam-submit-modal");
    if (modal) modal.classList.add("d-none");
}

async function finalSubmitExam() {
    closeSubmitModal();
    stopExamTimer();

    const student = JSON.parse(localStorage.getItem("loggedUser"));
    let score = 0;
    let answeredCount = 0;
    let skippedCount = 0;
    let reviewCount = 0;

    testQuestions.forEach(q => {
        const userSelectedText = (testAnswers[q._id] || "").trim().toLowerCase();
        const dbCorrectAnswer = (q.answer || "").trim().toLowerCase();
        const st = testStatus[q._id] || "notvisited";

        if (st === "skipped") skippedCount++;
        if (st === "review" || st === "review-answered") reviewCount++;

        if (userSelectedText) {
            answeredCount++;
            if (userSelectedText === dbCorrectAnswer) {
                score++;
            } else if (dbCorrectAnswer === "a" && userSelectedText === (q.optionA || "").trim().toLowerCase()) {
                score++;
            } else if (dbCorrectAnswer === "b" && userSelectedText === (q.optionB || "").trim().toLowerCase()) {
                score++;
            } else if (dbCorrectAnswer === "c" && userSelectedText === (q.optionC || "").trim().toLowerCase()) {
                score++;
            } else if (dbCorrectAnswer === "d" && userSelectedText === (q.optionD || "").trim().toLowerCase()) {
                score++;
            }
        }
    });

    const resultPayload = {
        score,
        total: testQuestions.length,
        answered: answeredCount,
        skipped: skippedCount,
        review: reviewCount,
        percentage: Math.round((score / testQuestions.length) * 100)
    };
    localStorage.setItem("lastResult", JSON.stringify(resultPayload));

    try {
        const res = await fetch(`${window.API_URL}/save-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: student.email,
                course: testCourse,
                score,
                total: testQuestions.length
            })
        });
        const data = await res.json();
        if (data && data.status === "success") {
            try { sessionStorage.removeItem(`dashboard_results_${student.email}`); } catch (e) {}
        }
        navigateTo('#result');
    } catch (err) {
        console.error("Submit Error:", err);
        navigateTo('#result');
    }
}

// ── Result View ──────────────────────────────────────────────────────
function initResult() {
    stopExamTimer();
    const lastResult = JSON.parse(localStorage.getItem("lastResult"));
    if (!lastResult) { navigateTo('#dashboard'); return; }

    const { score, total, answered = score, skipped = 0 } = lastResult;
    const incorrect = Math.max(0, total - score - skipped);
    const percentage = Math.round((score / total) * 100);

    const scoreDisplay = document.getElementById("score-display");
    if (scoreDisplay) scoreDisplay.innerText = `${score}/${total}`;

    // Render detailed breakdown pills
    const breakdownBox = document.getElementById("result-breakdown");
    if (breakdownBox) {
        breakdownBox.innerHTML = `
            <div class="breakdown-pill bg-success-subtle text-success border border-success-subtle">
                <i class="fas fa-check-circle"></i> Correct: ${score}
            </div>
            <div class="breakdown-pill bg-danger-subtle text-danger border border-danger-subtle">
                <i class="fas fa-times-circle"></i> Incorrect: ${incorrect}
            </div>
            ${skipped > 0 ? `
            <div class="breakdown-pill border" style="background: #ffedd5; color: #c2410c; border-color: #fed7aa !important;">
                <i class="fas fa-forward"></i> Skipped: ${skipped}
            </div>` : ''}
            <div class="breakdown-pill bg-primary-subtle text-primary border border-primary-subtle">
                <i class="fas fa-percentage"></i> Score: ${percentage}%
            </div>
        `;
    }

    // Destroy old chart
    if (resultChart) { resultChart.destroy(); resultChart = null; }

    const ctx = document.getElementById('resultChart').getContext('2d');
    const chartData = [score, incorrect];
    const chartLabels = ['Correct', 'Incorrect'];
    const chartColors = ['#10b981', '#ef4444'];

    if (skipped > 0) {
        chartData.push(skipped);
        chartLabels.push('Skipped');
        chartColors.push('#f97316');
    }

    resultChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: ['#fff', '#fff', '#fff'],
                borderWidth: 2,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: { label: (context) => ` ${context.label}: ${context.raw}` }
                }
            }
        }
    });
}


// STEALTH HIDDEN ADMIN GATEWAY (FOR OWNER ONLY)
//  Invisible to public users — no buttons, links, or clues
  (function initStealthAdmin() {
    const SECRET_KEY = "sumit_portal_master";
    function accessAdmin() {
        sessionStorage.setItem("adminAuthActive", "true");
        window.location.href = `admin.html?auth=${SECRET_KEY}`;
    }

    // Method 1: Desktop Shortcut (Ctrl + Shift + A  OR  Ctrl + Alt + A)
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
            (e.ctrlKey && e.altKey && (e.key === 'A' || e.key === 'a'))) {
            e.preventDefault();
            accessAdmin();
        }
    });

    // Method 2: Mobile / Touch Gesture (Tap Logo 5 times rapidly)
    let logoTaps = 0;
    let tapTimeout = null;
    function handleLogoTap(e) {
        logoTaps++;
        clearTimeout(tapTimeout);
        if (logoTaps >= 5) {
            logoTaps = 0;
            if (e && e.preventDefault) e.preventDefault();
            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
            accessAdmin();
        } else {
            tapTimeout = setTimeout(() => { logoTaps = 0; }, 2500);
        }
    }

    function attachLogoListeners() {
        const logos = document.querySelectorAll('.navbar-brand, .logo-icon');
        logos.forEach(el => {
            el.addEventListener('click', handleLogoTap);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachLogoListeners);
    } else {
        attachLogoListeners();
    }

    // Method 3: Secret URL Hash Check (#master-admin-access)
    if (window.location.hash === '#master-admin-access') {
        history.replaceState(null, document.title, window.location.pathname);
        accessAdmin();
    }
})();
