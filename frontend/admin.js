let currentTab = 'users';

// Pre-warm backend immediately when admin page is accessed
(function prewarm() {
    if (window.API_URL) {
        fetch(`${window.API_URL}/ping`, { mode: 'cors', cache: 'no-store' }).catch(() => {});
    }
})();

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
        
        if (data.status === "success") {
            document.getElementById("login-overlay").classList.add("d-none");
            document.getElementById("admin-sidebar").classList.remove("d-none");
            document.getElementById("admin-main").classList.remove("d-none");
            loadData();
            setupPasswordUpdate(); // Initialize form listener
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
                const res = await fetch(`${window.API_URL}/admin/update-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newPassword })
                });
                const data = await res.json();
                if (data.status === "success") {
                    alert("Admin Password Updated Successfully!");
                    location.reload(); // Force re-login
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

function showTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    el.classList.add('active');
    
    const titles = {
        'users': 'Student Directory',
        'results': 'Exam Results',
        'questions': 'Question Bank (Top 100)',
        'saarthi': 'Saarthi AI Insights & Student Inquiries',
        'settings': 'Admin Settings'
    };
    document.getElementById('tab-title').innerText = titles[tab] || 'Admin Dashboard';

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

    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const totalUsersEl = document.getElementById('total-users');
    const totalResultsEl = document.getElementById('total-results');

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        // Fetch users and results in parallel for 2x faster load
        const [uRes, rRes] = await Promise.all([
            fetch(`${window.API_URL}/admin/users`),
            fetch(`${window.API_URL}/admin/results`)
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

        } else if (currentTab === 'questions') {
            const res = await fetch(`${window.API_URL}/admin/questions`);
            const questions = await res.json();
            tableHead.innerHTML = `<tr><th>Question</th><th>Course</th><th>Correct Answer</th></tr>`;
            tableBody.innerHTML = questions.map(q => {
                const row = document.createElement('tr');
                
                const qTitleTd = document.createElement('td');
                const qTitleDiv = document.createElement('div');
                qTitleDiv.className = "text-truncate";
                qTitleDiv.style.maxWidth = "400px";
                qTitleDiv.textContent = q.question_title; // Safe text
                qTitleTd.appendChild(qTitleDiv);
                
                const courseTd = document.createElement('td');
                courseTd.innerHTML = `<span class="badge bg-info text-white">${q.course}</span>`;
                
                const answerTd = document.createElement('td');
                answerTd.innerHTML = `<span class="text-success fw-bold">${q.answer}</span>`;
                
                row.appendChild(qTitleTd);
                row.appendChild(courseTd);
                row.appendChild(answerTd);
                
                return row.outerHTML;
            }).join('');
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading data</td></tr>';
    }
}

async function deleteItem(type, id) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
        const res = await fetch(`${window.API_URL}/admin/${type}/${id}`, { method: 'DELETE' });
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
        const res = await fetch(`${window.API_URL}/admin/saarthi/logs`);
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
