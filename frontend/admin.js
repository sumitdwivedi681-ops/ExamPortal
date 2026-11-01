let currentTab = 'users';

// Pre-warm backend immediately when admin page is accessed
(function prewarm() {
    if (window.API_URL) {
        fetch(`${window.API_URL}/ping`, { mode: 'cors', cache: 'no-store' }).catch(() => {});
    }
})();

// SECURE ADMIN API CALL HELPER (Includes JWT Bearer Token)
async function adminFetch(endpoint, options = {}) {
    const token = sessionStorage.getItem("admin_jwt_token");
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const url = endpoint.startsWith("http") ? endpoint : `${window.API_URL}${endpoint}`;
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("admin_jwt_token");
        alert("Admin session expired or unauthorized. Please log in again.");
        location.reload();
        throw new Error("Unauthorized");
    }

    return res;
}

// UNLOCK DASHBOARD
function unlockDashboard() {
    const overlay = document.getElementById("login-overlay");
    const sidebar = document.getElementById("admin-sidebar");
    const main = document.getElementById("admin-main");
    if (overlay) overlay.classList.add("d-none");
    if (sidebar) sidebar.classList.remove("d-none");
    if (main) main.classList.remove("d-none");
    loadData();
    setupPasswordUpdate();
}

// LOGOUT ADMIN
function logoutAdmin() {
    sessionStorage.removeItem("admin_jwt_token");
    sessionStorage.removeItem("adminAuthActive");
    location.replace("index.html");
}

// AUTO-UNLOCK ON LOAD IF VALID TOKEN EXISTS
document.addEventListener("DOMContentLoaded", () => {
    const token = sessionStorage.getItem("admin_jwt_token");
    if (token) {
        unlockDashboard();
    }
});

// VERIFY ADMIN LOGIN WITH BACKEND
async function checkAdminLogin() {
    const passInput = document.getElementById("admin-pass-input");
    const password = passInput ? passInput.value.trim() : "";
    if (!password) {
        alert("Please enter the admin password.");
        return;
    }
    
    const btn = document.querySelector("#login-overlay button");
    const originalBtnHtml = btn ? btn.innerHTML : "Unlock Dashboard";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Verifying...';
    }

    try {
        const res = await fetch(`${window.API_URL}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        
        const data = await res.json();
        
        if (data.status === "success" && data.token) {
            // Securely store JWT token in sessionStorage
            sessionStorage.setItem("admin_jwt_token", data.token);
            unlockDashboard();
        } else {
            alert(data.error || "Incorrect Admin Password!");
            if (passInput) passInput.focus();
        }
    } catch (err) {
        alert("Server connection error during login. Please try again in a few seconds.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
        }
    }
}

// SETUP PASSWORD UPDATE FORM
function setupPasswordUpdate() {
    const form = document.getElementById("updateAdminPassForm");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById("new-admin-pass").value;
            
            if (!confirm("Are you sure you want to change the admin password?")) return;

            try {
                const res = await adminFetch("/admin/update-password", {
                    method: "POST",
                    body: JSON.stringify({ newPassword })
                });
                const data = await res.json();
                if (data.status === "success") {
                    alert("Admin Password Updated Successfully! Please log in again.");
                    logoutAdmin();
                }
            } catch (err) {
                alert("Update failed!");
            }
        };
    }
}

// Support 'Enter' key for login
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !document.getElementById("login-overlay").classList.contains("d-none")) {
        checkAdminLogin();
    }
});

// Questions Management State
let questionsPage = 1;
const questionsLimit = 25;
let questionsTotalPages = 1;
let questionsTotal = 0;
let questionsFilterCourse = 'all';
let questionsSearchQuery = '';
let cachedQuestions = [];
let allCoursesList = [];

function showTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    el.classList.add('active');
    
    const titles = {
        'users': 'Student Directory',
        'results': 'Exam Results',
        'questions': 'Question Bank & Database Manager',
        'saarthi': 'Saarthi AI Insights & Student Inquiries',
        'settings': 'Admin Settings'
    };
    document.getElementById('tab-title').innerText = titles[tab] || 'Admin Dashboard';

    // Toggle Toolbar & Pagination for questions
    const qToolbar = document.getElementById('questions-toolbar');
    const qPagination = document.getElementById('questions-pagination');
    if (qToolbar) {
        if (tab === 'questions') qToolbar.classList.remove('d-none');
        else qToolbar.classList.add('d-none');
    }
    if (qPagination) {
        if (tab === 'questions') qPagination.classList.remove('d-none');
        else qPagination.classList.add('d-none');
    }

    // Toggle Sections
    if (tab === 'settings') {
        document.getElementById('data-section').classList.add('d-none');
        document.getElementById('saarthi-section').classList.add('d-none');
        document.getElementById('settings-section').classList.remove('d-none');
    } else if (tab === 'saarthi') {
        document.getElementById('data-section').classList.add('d-none');
        document.getElementById('settings-section').classList.add('d-none');
        document.getElementById('saarthi-section').classList.remove('d-none');
        loadSaarthiLogs();
    } else {
        document.getElementById('data-section').classList.remove('d-none');
        document.getElementById('settings-section').classList.add('d-none');
        document.getElementById('saarthi-section').classList.add('d-none');
        loadData();
    }
}

async function loadData() {
    if (currentTab === 'settings') return;

    if (currentTab === 'questions') {
        return loadQuestionsTab();
    }

    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const totalUsersEl = document.getElementById('total-users');
    const totalResultsEl = document.getElementById('total-results');

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        // Fetch users and results in parallel for 2x faster load with JWT token
        const [uRes, rRes] = await Promise.all([
            adminFetch("/admin/users"),
            adminFetch("/admin/results")
        ]);
        const [allUsers, allResults] = await Promise.all([
            uRes.json(),
            rRes.json()
        ]);
        
        totalUsersEl.innerText = allUsers.length;
        totalResultsEl.innerText = allResults.length;

        if (currentTab === 'users') {
            tableHead.innerHTML = `<tr><th>Student</th><th>Photo</th><th>Course</th><th>Joined</th><th>Actions</th></tr>`;
            tableBody.innerHTML = allUsers.map(u => {
                const avatarHtml = u.profile_img 
                    ? `<img src="${u.profile_img}" class="user-avatar shadow-sm" style="object-fit: cover; border: 2px solid #6366f1; cursor: pointer;" onclick="openImageModal('${u.profile_img}', '${u.full_name}')" title="Click to view full photo">`
                    : `<div class="user-avatar">${(u.full_name || 'U').charAt(0).toUpperCase()}</div>`;
                return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            ${avatarHtml}
                            <div>
                                <div class="fw-bold">${u.full_name}</div>
                                <div class="small text-muted">${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        ${u.profile_img ? `<button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1" onclick="openImageModal('${u.profile_img}', '${u.full_name}')"><i class="fas fa-eye me-1"></i>View Photo</button>` : `<span class="badge bg-light text-muted border">No Photo</span>`}
                    </td>
                    <td><span class="badge bg-light text-dark border">${u.course}</span></td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteItem('users', '${u._id}')" title="Delete Candidate"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
                `;
            }).join('');

        } else if (currentTab === 'results') {
            tableHead.innerHTML = `<tr><th>Student</th><th>Subject</th><th>Score</th><th>Status</th><th>Actions</th></tr>`;
            tableBody.innerHTML = allResults.map(r => {
                const percent = ((r.score / r.total) * 100).toFixed(0);
                const color = percent >= 40 ? 'success' : 'danger';
                return `
                <tr>
                    <td><span class="fw-bold">${r.student_email}</span></td>
                    <td>${r.course}</td>
                    <td>${r.score} / ${r.total} <small class="text-muted">(${percent}%)</small></td>
                    <td><span class="badge bg-${color}">${percent >= 40 ? 'Pass' : 'Fail'}</span></td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteItem('results', '${r._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `}).join('');
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading data</td></tr>';
    }
}

/* ═══════════════════════════════════════════════════════════════
   QUESTIONS MANAGEMENT — FULL CRUD & ANY-FORMAT BULK UPDATES
═══════════════════════════════════════════════════════════════ */

async function loadCoursesList() {
    try {
        const res = await adminFetch("/admin/courses");
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.courses)) {
            allCoursesList = data.courses;
            
            // Populate filter select
            const select = document.getElementById("q-filter-course");
            if (select) {
                const currentVal = select.value;
                select.innerHTML = '<option value="all">All Courses / Subjects</option>' + 
                    allCoursesList.map(c => `<option value="${escapeSaarthiText(c)}">${escapeSaarthiText(c)}</option>`).join('');
                if (currentVal && (currentVal === 'all' || allCoursesList.includes(currentVal))) {
                    select.value = currentVal;
                }
            }

            // Populate datalist for modal input
            const datalist = document.getElementById("course-datalist");
            if (datalist) {
                datalist.innerHTML = allCoursesList.map(c => `<option value="${escapeSaarthiText(c)}"></option>`).join('');
            }
        }
    } catch (e) {
        console.warn("Could not load courses list:", e);
    }
}

async function loadQuestionsTab() {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const totalQuestionsEl = document.getElementById('total-questions');
    const paginationInfoEl = document.getElementById('q-pagination-info');
    const pageNumEl = document.getElementById('q-page-num');
    const prevBtn = document.getElementById('q-prev-btn');
    const nextBtn = document.getElementById('q-next-btn');

    // Ensure courses are fetched for the filter
    if (allCoursesList.length === 0) {
        loadCoursesList();
    }

    tableHead.innerHTML = `
        <tr>
            <th style="width: 50px;">#</th>
            <th>Question</th>
            <th style="width: 140px;">Course</th>
            <th>Options</th>
            <th style="width: 140px;">Correct Answer</th>
            <th style="width: 110px;" class="text-end">Actions</th>
        </tr>
    `;
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div><div class="small text-muted mt-2">Loading question bank...</div></td></tr>';

    try {
        const queryParams = new URLSearchParams({
            course: questionsFilterCourse,
            search: questionsSearchQuery,
            page: String(questionsPage),
            limit: String(questionsLimit)
        });

        const res = await adminFetch(`/admin/questions?${queryParams.toString()}`);
        const data = await res.json();

        let questions = [];
        if (data.status === 'success') {
            questions = data.questions || [];
            questionsTotal = data.total || 0;
            questionsTotalPages = data.totalPages || 1;
            questionsPage = data.page || 1;
        } else if (Array.isArray(data)) {
            // Backward-compatibility
            questions = data;
            questionsTotal = data.length;
            questionsTotalPages = 1;
            questionsPage = 1;
        }

        cachedQuestions = questions;

        // Update counts and pagination elements
        if (totalQuestionsEl) totalQuestionsEl.innerText = questionsTotal > 1000 ? `${(questionsTotal / 1000).toFixed(1)}k+` : questionsTotal;
        
        const startIdx = questionsTotal === 0 ? 0 : (questionsPage - 1) * questionsLimit + 1;
        const endIdx = Math.min(startIdx + questions.length - 1, questionsTotal);
        if (paginationInfoEl) {
            paginationInfoEl.innerText = `Showing ${startIdx}–${endIdx} of ${questionsTotal} Questions`;
        }
        if (pageNumEl) {
            pageNumEl.innerText = `Page ${questionsPage} / ${questionsTotalPages}`;
        }
        if (prevBtn) prevBtn.disabled = questionsPage <= 1;
        if (nextBtn) nextBtn.disabled = questionsPage >= questionsTotalPages;

        if (questions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="fas fa-search text-muted fa-2x mb-2 d-block"></i>
                        <div class="fw-bold text-dark">No questions found</div>
                        <div class="text-muted small">Try changing your search term or course filter, or add questions above.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = questions.map((q, idx) => {
            const rowNumber = (questionsPage - 1) * questionsLimit + idx + 1;
            const titleSafe = escapeSaarthiText(q.question_title);
            const courseSafe = escapeSaarthiText(q.course);
            const ansSafe = escapeSaarthiText(q.answer);

            const optA = escapeSaarthiText(q.optionA || '');
            const optB = escapeSaarthiText(q.optionB || '');
            const optC = escapeSaarthiText(q.optionC || '');
            const optD = escapeSaarthiText(q.optionD || '');

            return `
                <tr>
                    <td class="text-muted fw-bold small">${rowNumber}</td>
                    <td>
                        <div class="fw-bold text-dark mb-1" style="max-width: 380px; word-break: break-word;">
                            ${titleSafe}
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-light text-primary border" style="font-weight: 600; font-size: 0.8rem;">
                            <i class="fas fa-book me-1"></i>${courseSafe}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-1 small" style="max-width: 320px;">
                            <div><span class="badge bg-secondary-subtle text-dark me-1">A</span> ${optA}</div>
                            <div><span class="badge bg-secondary-subtle text-dark me-1">B</span> ${optB}</div>
                            ${optC ? `<div><span class="badge bg-secondary-subtle text-dark me-1">C</span> ${optC}</div>` : ''}
                            ${optD ? `<div><span class="badge bg-secondary-subtle text-dark me-1">D</span> ${optD}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-success-subtle text-success border border-success-subtle fw-bold px-2 py-1">
                            <i class="fas fa-check-circle me-1"></i>${ansSafe}
                        </span>
                    </td>
                    <td class="text-end">
                        <div class="d-inline-flex gap-1">
                            <button class="btn-action btn-edit" onclick="openEditQuestionModal('${q._id}')" title="Edit Question">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteQuestion('${q._id}')" title="Delete Question">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Load Questions Error:", err);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load questions. Please check connection.</td></tr>';
    }
}

function filterQuestionsByCourse(course) {
    questionsFilterCourse = course;
    questionsPage = 1;
    loadQuestionsTab();
}

function searchQuestions() {
    const input = document.getElementById("q-search-input");
    questionsSearchQuery = input ? input.value.trim() : "";
    questionsPage = 1;
    loadQuestionsTab();
}

function changeQuestionsPage(delta) {
    const target = questionsPage + delta;
    if (target >= 1 && target <= questionsTotalPages) {
        questionsPage = target;
        loadQuestionsTab();
    }
}

// ── Single Question: Add & Edit Modals ──────────────────────────────
function openAddQuestionModal() {
    document.getElementById("modal-q-action").innerText = "Add New";
    document.getElementById("modal-q-id").value = "";
    document.getElementById("modal-q-course").value = questionsFilterCourse !== "all" ? questionsFilterCourse : "";
    document.getElementById("modal-q-title").value = "";
    document.getElementById("modal-q-optA").value = "";
    document.getElementById("modal-q-optB").value = "";
    document.getElementById("modal-q-optC").value = "";
    document.getElementById("modal-q-optD").value = "";
    document.getElementById("modal-q-answer").value = "";
    
    const modal = document.getElementById("question-modal");
    if (modal) modal.classList.remove("d-none");
}

function openEditQuestionModal(qId) {
    const q = cachedQuestions.find(item => item._id === qId);
    if (!q) {
        alert("Question details not found. Please refresh the page.");
        return;
    }

    document.getElementById("modal-q-action").innerText = "Edit";
    document.getElementById("modal-q-id").value = q._id;
    document.getElementById("modal-q-course").value = q.course || "";
    document.getElementById("modal-q-title").value = q.question_title || "";
    document.getElementById("modal-q-optA").value = q.optionA || "";
    document.getElementById("modal-q-optB").value = q.optionB || "";
    document.getElementById("modal-q-optC").value = q.optionC || "";
    document.getElementById("modal-q-optD").value = q.optionD || "";
    document.getElementById("modal-q-answer").value = q.answer || "";

    const modal = document.getElementById("question-modal");
    if (modal) modal.classList.remove("d-none");
}

function closeQuestionModal() {
    const modal = document.getElementById("question-modal");
    if (modal) modal.classList.add("d-none");
}

async function saveQuestionForm() {
    const id = document.getElementById("modal-q-id").value.trim();
    const course = document.getElementById("modal-q-course").value.trim();
    const question_title = document.getElementById("modal-q-title").value.trim();
    const optionA = document.getElementById("modal-q-optA").value.trim();
    const optionB = document.getElementById("modal-q-optB").value.trim();
    const optionC = document.getElementById("modal-q-optC").value.trim();
    const optionD = document.getElementById("modal-q-optD").value.trim();
    const answer = document.getElementById("modal-q-answer").value.trim();

    if (!course || !question_title || !optionA || !optionB || !answer) {
        alert("Please fill in all required fields (Course, Question Title, Option A, Option B, and Correct Answer).");
        return;
    }

    const submitBtn = document.getElementById("modal-q-submit-btn");
    const origHtml = submitBtn ? submitBtn.innerHTML : "Save Question";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    }

    try {
        const payload = { course, question_title, optionA, optionB, optionC, optionD, answer };
        const url = id ? `/admin/questions/${id}` : "/admin/questions";
        const method = id ? "PUT" : "POST";

        const res = await adminFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.status === "success") {
            closeQuestionModal();
            loadCoursesList();
            loadQuestionsTab();
        } else {
            alert(data.error || "Failed to save question.");
        }
    } catch (err) {
        alert("Server error while saving question.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
        }
    }
}

async function deleteQuestion(qId) {
    if (!confirm("Are you sure you want to permanently delete this question from the database?")) {
        return;
    }

    try {
        const res = await adminFetch(`/admin/questions/${qId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            loadQuestionsTab();
        } else {
            alert(data.error || "Delete failed.");
        }
    } catch (err) {
        alert("Server error while deleting question.");
    }
}

// ── Bulk Update / Import in Any Format ─────────────────────────────
function openBulkQuestionModal() {
    const feedbackBox = document.getElementById("bulk-feedback-box");
    if (feedbackBox) {
        feedbackBox.className = "d-none alert mb-3 small";
        feedbackBox.innerHTML = "";
    }
    const modal = document.getElementById("bulk-question-modal");
    if (modal) modal.classList.remove("d-none");
}

function closeBulkQuestionModal() {
    const modal = document.getElementById("bulk-question-modal");
    if (modal) modal.classList.add("d-none");
}

function clearBulkInput() {
    const fileInput = document.getElementById("bulk-file-input");
    const rawInput = document.getElementById("bulk-raw-input");
    if (fileInput) fileInput.value = "";
    if (rawInput) rawInput.value = "";
    const feedbackBox = document.getElementById("bulk-feedback-box");
    if (feedbackBox) feedbackBox.classList.add("d-none");
}

function loadSampleTemplate(type) {
    const rawInput = document.getElementById("bulk-raw-input");
    if (!rawInput) return;

    if (type === "json") {
        rawInput.value = JSON.stringify([
            {
                "course": "Python",
                "question_title": "Which keyword is used to define a function in Python?",
                "optionA": "func",
                "optionB": "def",
                "optionC": "function",
                "optionD": "define",
                "answer": "def"
            },
            {
                "course": "Operating Systems",
                "question_title": "What is the primary role of the CPU scheduler?",
                "optionA": "Select from among the ready processes in memory to execute",
                "optionB": "Manage hard disk physical sectors",
                "optionC": "Compile source code to machine language",
                "optionD": "Establish network socket connections",
                "answer": "A"
            }
        ], null, 2);
    } else if (type === "csv") {
        rawInput.value = 
`course,question_title,optionA,optionB,optionC,optionD,answer
Python,"Which data type is immutable in Python?",List,Tuple,Dictionary,Set,Tuple
DBMS,"What does ACID stand for in database transactions?","Atomicity, Consistency, Isolation, Durability","All Columns In Direct order","Automated Control In Databases","Automatic Crash Recovery Mechanism","Atomicity, Consistency, Isolation, Durability"`;
    }
}

function handleBulkFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rawInput = document.getElementById("bulk-raw-input");
        if (rawInput) rawInput.value = text;
    };
    reader.onerror = () => {
        alert("Failed to read file.");
    };
    reader.readAsText(file);
}

async function processBulkQuestions() {
    const rawInput = document.getElementById("bulk-raw-input");
    const feedbackBox = document.getElementById("bulk-feedback-box");
    const rawData = rawInput ? rawInput.value.trim() : "";

    if (!rawData) {
        alert("Please paste question data or upload a JSON/CSV file first.");
        return;
    }

    const btn = document.getElementById("btn-process-bulk");
    const origHtml = btn ? btn.innerHTML : "Process & Update DB";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';
    }

    if (feedbackBox) {
        feedbackBox.className = "alert alert-info mb-3 small";
        feedbackBox.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Parsing data and updating database...';
        feedbackBox.classList.remove("d-none");
    }

    try {
        const res = await adminFetch("/admin/questions/bulk", {
            method: "POST",
            body: JSON.stringify({ rawData })
        });
        const data = await res.json();

        if (data.status === "success") {
            if (feedbackBox) {
                feedbackBox.className = "alert alert-success mb-3 small";
                feedbackBox.innerHTML = `
                    <div class="fw-bold mb-1"><i class="fas fa-check-circle me-1"></i>${data.message}</div>
                    <div>Created: <strong>${data.created}</strong> | Updated: <strong>${data.updated}</strong> | Failed: <strong>${data.failed}</strong></div>
                    ${data.errors && data.errors.length ? `<div class="mt-2 text-danger small">${data.errors.map(e => `• ${e.question || 'Item ' + e.index}: ${e.reason}`).join('<br>')}</div>` : ''}
                `;
            }
            loadCoursesList();
            loadQuestionsTab();
        } else {
            if (feedbackBox) {
                feedbackBox.className = "alert alert-danger mb-3 small";
                feedbackBox.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${data.error || "Failed to process bulk upload."}`;
            }
        }
    } catch (err) {
        if (feedbackBox) {
            feedbackBox.className = "alert alert-danger mb-3 small";
            feedbackBox.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Server error during bulk processing.';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

// ── Export Questions (CSV / JSON) ──────────────────────────────────
function toggleExportMenu() {
    const menu = document.getElementById("export-dropdown-menu");
    if (menu) {
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
}

// Close export menu on outside click
document.addEventListener("click", (e) => {
    const menu = document.getElementById("export-dropdown-menu");
    if (menu && menu.style.display === "block" && !e.target.closest(".dropdown")) {
        menu.style.display = "none";
    }
});

async function exportQuestions(format) {
    toggleExportMenu();
    try {
        const queryParams = new URLSearchParams({
            course: questionsFilterCourse,
            search: questionsSearchQuery,
            all: "true"
        });

        const res = await adminFetch(`/admin/questions?${queryParams.toString()}`);
        const data = await res.json();
        const list = data.questions || [];

        if (list.length === 0) {
            alert("No questions to export for the current filter.");
            return;
        }

        let blob;
        let filename;
        const courseSlug = (questionsFilterCourse === 'all' ? 'all_courses' : questionsFilterCourse).replace(/[^a-z0-9_-]/gi, '_');

        if (format === 'json') {
            const jsonText = JSON.stringify(list, null, 2);
            blob = new Blob([jsonText], { type: "application/json" });
            filename = `questions_${courseSlug}.json`;
        } else {
            // Build CSV with proper quotes
            const header = ["_id", "course", "question_title", "optionA", "optionB", "optionC", "optionD", "answer"];
            const escapeCSV = (val) => {
                if (val === undefined || val === null) return '""';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };
            const csvRows = [header.join(",")];
            list.forEach(q => {
                csvRows.push([
                    escapeCSV(q._id),
                    escapeCSV(q.course),
                    escapeCSV(q.question_title),
                    escapeCSV(q.optionA),
                    escapeCSV(q.optionB),
                    escapeCSV(q.optionC),
                    escapeCSV(q.optionD),
                    escapeCSV(q.answer)
                ].join(","));
            });
            blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
            filename = `questions_${courseSlug}.csv`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Failed to export questions.");
    }
}

async function deleteItem(type, id) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
        const res = await adminFetch(`/admin/${type}/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') loadData();
    } catch (err) {
        alert("Server error");
    }
}

// Lightbox popup to view student photo enlarged
function openImageModal(imgSrc, name) {
    const existing = document.getElementById("admin-photo-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "admin-photo-modal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(15, 23, 42, 0.85)";
    modal.style.backdropFilter = "blur(6px)";
    modal.style.zIndex = "3000";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.padding = "20px";
    modal.onclick = () => modal.remove();

    modal.innerHTML = `
        <div style="background: white; border-radius: 24px; padding: 25px; max-width: 450px; width: 100%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.3); position: relative;" onclick="event.stopPropagation()">
            <button style="position: absolute; top: 12px; right: 15px; background: none; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer;" onclick="document.getElementById('admin-photo-modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            <h5 class="fw-bold mb-3 text-dark">${name || 'Student Photo'}</h5>
            <div style="width: 250px; height: 250px; margin: 0 auto 20px; border-radius: 20px; overflow: hidden; border: 4px solid #6366f1; box-shadow: 0 10px 25px rgba(99,102,241,0.2);">
                <img src="${imgSrc}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <a href="${imgSrc}" download="${(name || 'student').replace(/\\s+/g, '_')}_photo.jpg" class="btn btn-primary rounded-pill px-4 py-2 fw-bold">
                <i class="fas fa-download me-2"></i>Download Photo
            </a>
        </div>
    `;

    document.body.appendChild(modal);
}

/* ═══════════════════════════════════════════════════════════════
   SAARTHI AI — LOGS & CREATOR INSIGHTS IN ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════ */

let saarthiLogsCache = [];
let saarthiActiveFilter = 'all';

function escapeSaarthiText(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadSaarthiLogs() {
    const tbody = document.getElementById('saarthi-logs-body');
    const totalEl = document.getElementById('saarthi-total-queries');
    const ownerEl = document.getElementById('saarthi-owner-inquiries');
    const courseEl = document.getElementById('saarthi-course-requests');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div><div class="small text-muted mt-2">Loading Saarthi AI logs...</div></td></tr>';
    }

    try {
        const res = await adminFetch("/admin/saarthi/logs");
        const data = await res.json();

        if (data.status === 'success') {
            if (totalEl) totalEl.innerText = data.stats.totalQueries || 0;
            if (ownerEl) ownerEl.innerText = data.stats.ownerInquiries || 0;
            if (courseEl) courseEl.innerText = data.stats.courseRequests || 0;

            saarthiLogsCache = Array.isArray(data.logs) ? data.logs : [];
            filterSaarthiLogs(saarthiActiveFilter);
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Failed to fetch logs.</td></tr>';
        }
    } catch (err) {
        console.error('Saarthi Logs Fetch Error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Server connection error while loading Saarthi logs.</td></tr>';
    }
}

function filterSaarthiLogs(filterType) {
    saarthiActiveFilter = filterType;

    // Update filter button styling
    const allBtn = document.getElementById('filter-btn-all');
    const ownerBtn = document.getElementById('filter-btn-owner');
    const courseBtn = document.getElementById('filter-btn-courses');

    if (allBtn) {
        allBtn.className = filterType === 'all' ? 'btn btn-sm btn-primary active' : 'btn btn-sm btn-outline-primary';
    }
    if (ownerBtn) {
        ownerBtn.className = filterType === 'owner' ? 'btn btn-sm btn-warning text-dark active' : 'btn btn-sm btn-outline-warning';
    }
    if (courseBtn) {
        courseBtn.className = filterType === 'courses' ? 'btn btn-sm btn-success active' : 'btn btn-sm btn-outline-success';
    }

    let filtered = saarthiLogsCache;
    if (filterType === 'owner') {
        filtered = saarthiLogsCache.filter(l => l.asked_about_owner === true);
    } else if (filterType === 'courses') {
        filtered = saarthiLogsCache.filter(l => Boolean(l.course_requested && l.course_requested.trim()));
    }

    renderSaarthiLogsTable(filtered);
}

function renderSaarthiLogsTable(logs) {
    const tbody = document.getElementById('saarthi-logs-body');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <i class="fas fa-comment-slash text-muted fa-2x mb-2 d-block"></i>
                    <div class="text-muted">No conversation records match this filter.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        let categoryBadge = '';
        if (log.asked_about_owner) {
            categoryBadge = '<span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-star me-1"></i>About Sumit</span>';
        } else if (log.course_requested) {
            categoryBadge = `<span class="badge bg-success px-2 py-1"><i class="fas fa-lightbulb me-1"></i>${escapeSaarthiText(log.course_requested)}</span>`;
        } else if (log.topic === 'guide') {
            categoryBadge = '<span class="badge bg-info text-white px-2 py-1"><i class="fas fa-compass me-1"></i>Guide</span>';
        } else if (log.topic === 'subject') {
            categoryBadge = '<span class="badge bg-primary px-2 py-1"><i class="fas fa-book me-1"></i>Subject</span>';
        } else {
            categoryBadge = `<span class="badge bg-secondary px-2 py-1">${escapeSaarthiText(log.topic || 'General')}</span>`;
        }

        const langBadge = log.language 
            ? `<span class="badge bg-light text-muted border ms-1" style="font-size: 0.72rem;">${escapeSaarthiText(log.language)}</span>`
            : '';

        const dateStr = log.createdAt 
            ? new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
            : 'N/A';

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar" style="background: linear-gradient(135deg, #6366f1, #a855f7); width: 34px; height: 34px; font-size: 0.85rem;">
                            ${(log.user_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${escapeSaarthiText(log.user_name || 'Guest Student')}</div>
                            <div class="small text-muted">${escapeSaarthiText(log.user_email || 'No email')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="max-width: 250px; font-weight: 500; color: #1e293b; word-break: break-word;">
                        ${escapeSaarthiText(log.message)}
                    </div>
                </td>
                <td>
                    <div style="max-width: 320px; max-height: 75px; overflow-y: auto; font-size: 0.82rem; color: #475569; word-break: break-word; line-height: 1.4;">
                        ${escapeSaarthiText(log.response)}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center flex-wrap gap-1">
                        ${categoryBadge}
                        ${langBadge}
                    </div>
                </td>
                <td>
                    <div class="small text-muted" style="white-space: nowrap;">
                        <i class="far fa-clock me-1"></i>${dateStr}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
