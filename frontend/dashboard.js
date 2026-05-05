document.addEventListener("DOMContentLoaded", async () => {
    let student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) {
        window.location.href = "index.html";
        return;
    }

    updateUI(student);
    loadStats(student);

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
                location.reload();
            }
        } catch (err) {
            alert("Update failed!");
        }
    };
});

function updateUI(student) {
    document.getElementById("studentName").innerText = student.full_name;
    if (student.profile_img) {
        document.getElementById("topProfileImg").src = student.profile_img;
    } else {
        document.getElementById("topProfileImg").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.full_name)}&background=random`;
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('d-none'));
    document.getElementById(`section-${sectionId}`).classList.remove('d-none');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

async function loadStats(student) {
    const resultBody = document.getElementById("result-history");
    const totalExamsEl = document.getElementById("total-exams");
    const avgScoreEl = document.getElementById("avg-score");

    try {
        const res = await fetch(`${window.API_URL}/get-result?email=${encodeURIComponent(student.email)}`);
        const results = await res.json();

        if (results && results.length > 0) {
            totalExamsEl.innerText = results.length;
            let totalPercent = 0;
            
            const subjectScores = {}; // { course: [percents] }

            resultBody.innerHTML = results.map(r => {
                const percent = ((r.score / r.total) * 100).toFixed(0);
                totalPercent += parseInt(percent);
                
                // Track for chart
                if(!subjectScores[r.course]) subjectScores[r.course] = [];
                subjectScores[r.course].push(parseInt(percent));

                const color = percent >= 40 ? 'success' : 'danger';
                return `
                    <tr>
                        <td><div class="fw-bold">${r.course}</div></td>
                        <td>${r.score} / ${r.total} <small class="text-muted">(${percent}%)</small></td>
                        <td><span class="badge bg-${color}">${percent >= 40 ? 'Pass' : 'Fail'}</span></td>
                        <td>${new Date(r.exam_date).toLocaleDateString()}</td>
                    </tr>
                `;
            }).join('');
            
            avgScoreEl.innerText = (totalPercent / results.length).toFixed(0) + "%";

            // PREPARE CHART
            const labels = Object.keys(subjectScores);
            const data = labels.map(l => {
                const arr = subjectScores[l];
                return (arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(0);
            });

            renderChart(labels, data);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Score %',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
function logout() {
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html";
}
