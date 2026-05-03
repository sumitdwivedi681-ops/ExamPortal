document.addEventListener("DOMContentLoaded", async () => {
    const student = JSON.parse(localStorage.getItem("loggedUser"));
    if (!student) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("studentName").innerText = student.full_name;

    // Elements
    const resultBody = document.getElementById("result-history");
    const totalExamsEl = document.getElementById("total-exams");
    const avgScoreEl = document.getElementById("avg-score");

    // Logout
    document.getElementById("logout").onclick = () => {
        localStorage.removeItem("loggedUser");
        window.location.href = "index.html";
    };

    // Fetch Results
    try {
        const res = await fetch(`${window.API_URL}/get-result?email=${encodeURIComponent(student.email)}`);
        const results = await res.json();

        if (results && results.length > 0) {
            totalExamsEl.innerText = results.length;
            
            let totalPercent = 0;
            resultBody.innerHTML = results.map(r => {
                const percent = ((r.score / r.total) * 100).toFixed(0);
                totalPercent += parseInt(percent);
                const status = percent >= 40 ? 'Pass' : 'Fail';
                const color = percent >= 40 ? 'success' : 'danger';

                return `
                    <tr>
                        <td><div class="fw-bold">${r.course}</div></td>
                        <td>${r.score} / ${r.total} <small class="text-muted">(${percent}%)</small></td>
                        <td><span class="badge bg-${color}">${status}</span></td>
                        <td>${new Date(r.exam_date).toLocaleDateString()}</td>
                    </tr>
                `;
            }).join('');

            avgScoreEl.innerText = (totalPercent / results.length).toFixed(1) + "%";
        }
    } catch (err) {
        console.error("Dashboard error:", err);
        resultBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading history</td></tr>';
    }
});