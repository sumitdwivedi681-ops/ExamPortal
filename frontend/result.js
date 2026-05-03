// ---------------- SELECTORS ----------------
const studentInfo = document.getElementById("studentInfo");
const resultTableBody = document.querySelector("#resultTable tbody");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");
const canvas = document.getElementById("resultChart");

// ---------------- STUDENT DATA ----------------
const student = JSON.parse(localStorage.getItem("loggedUser"));

// ---------------- POPUP ----------------
function showPopup(message) {
  popupText.innerText = message;
  popup.style.display = "flex";
}

popupBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

function redirectToLogin() {
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
}

// ---------------- DOM LOADED ----------------
document.addEventListener("DOMContentLoaded", () => {

  if (!student || !student.email) {
    showPopup("Login required to view results");
    redirectToLogin();
    return;
  }

  // Student info
  studentInfo.innerText = `Name: ${student.full_name} | Email: ${student.email}`;

  // Fetch results from MongoDB API
  fetch(`${window.API_URL}/get-result?email=${encodeURIComponent(student.email)}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch results");
      return res.json();
    })
    .then(results => {
      if (!Array.isArray(results) || results.length === 0) {
        showPopup("No test attempts found");
        return;
      }

      renderResults(results);
      renderChart(results);
    })
    .catch(err => {
      console.error("Fetch Error:", err);
      showPopup("Server error while fetching results");
    });
});


// ---------------- TABLE RENDER ----------------
function renderResults(data) {
  resultTableBody.innerHTML = "";

  data.forEach((item, index) => {
    const percentage = Math.round((item.score / item.total) * 100);

    const tr = document.createElement("tr");
    tr.style.animationDelay = `${index * 0.08}s`;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.course}</td>
      <td>${item.score} / ${item.total}</td>
      <td>${percentage}%</td>
      <td>${new Date(item.exam_date).toLocaleString()}</td>
    `;

    // Highlight excellent score
    if (percentage >= 80) {
      tr.style.background = "linear-gradient(90deg, #e6f4ff, #ffffff)";
      tr.style.fontWeight = "600";
    }

    resultTableBody.appendChild(tr);
  });
}


// ---------------- CHART RENDER ----------------
function renderChart(data) {
  if (!canvas || typeof Chart === "undefined") return;

  const labels = data.map((_, i) => `Attempt ${i + 1}`);
  const scores = data.map(item =>
    Math.round((item.score / item.total) * 100)
  );

  const avgScore = Math.round(
    scores.reduce((a, b) => a + b, 0) / scores.length
  );

  const ctx = canvas.getContext("2d");

  // Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0077ff");
  gradient.addColorStop(1, "#00c6ff");

  // Destroy old chart
  if (window.resultChartInstance) {
    window.resultChartInstance.destroy();
  }

  window.resultChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Score (%)",
          data: scores,
          backgroundColor: gradient,
          borderRadius: 12,
          barThickness: 45
        },
        {
          type: "line",
          label: "Average",
          data: Array(scores.length).fill(avgScore),
          borderColor: "#ff4e4e",
          borderWidth: 3,
          borderDash: [6, 6],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + "%" }
        }
      },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: ctx => {
              const score = ctx.raw;
              let status =
                score >= 80 ? "Excellent 🏆" :
                score >= 60 ? "Good 👍" :
                score >= 40 ? "Average 🙂" :
                "Needs Improvement ⚠️";
              return `${ctx.dataset.label}: ${score}% — ${status}`;
            }
          }
        }
      }
    }
  });
}
