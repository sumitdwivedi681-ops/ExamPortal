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
        'settings': 'Admin Settings'
    };
    document.getElementById('tab-title').innerText = titles[tab];

    // Toggle Sections
    if (tab === 'settings') {
        document.getElementById('data-section').classList.add('d-none');
        document.getElementById('settings-section').classList.remove('d-none');
    } else {
        document.getElementById('data-section').classList.remove('d-none');
        document.getElementById('settings-section').classList.add('d-none');
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
            tableHead.innerHTML = `<tr><th>Student</th><th>Course</th><th>Joined</th><th>Actions</th></tr>`;
            tableBody.innerHTML = allUsers.map(u => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar">${u.full_name.charAt(0)}</div>
                            <div>
                                <div class="fw-bold">${u.full_name}</div>
                                <div class="small text-muted">${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${u.course}</span></td>
                    <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-action btn-delete" onclick="deleteItem('users', '${u._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

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
