// ---------------- SELECTORS ----------------
const studentInfo = document.getElementById("studentInfo");
const resultTableBody = document.querySelector("#resultTable tbody");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");
const canvas = document.getElementById("resultChart");

//  STUDENT DATA
const student = JSON.parse(localStorage.getItem("loggedUser"));

//  POPUP 
function showPopup(message) {
  popupText.innerText = message;
  popup.style.display = "flex";
}

popupBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

function redirectToLogin() {
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
}

//  DOM LOADED
document.addEventListener("DOMContentLoaded", () => {

  if (!student) {
    showPopup("Login required to view results");
    redirectToLogin();
    return;
  }

  // Show student info
  studentInfo.innerText = `Name: ${student.full_name} | Email: ${student.email}`;

  // Fetch results
  fetch(`http://localhost:5000/get-results?email=${encodeURIComponent(student.email)}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch results");
      return res.json();
    })
    .then(results => {
      if (!results || results.length === 0) {
        showPopup("No test attempts found");
        return;
      }

      renderResults(results);
      renderChart(results);
    })
    .catch(err => {
      console.error(err);
      showPopup("Server error while fetching results");
    });
});

//  TABLE RENDER 
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

//  CHART RENDER 
function renderChart(data) {
  if (!canvas) return;

  const labels = [];
  const scores = [];

  data.forEach(item => {
    labels.push(item.course);
    scores.push(Math.round((item.score / item.total) * 100));
  });

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const ctx = canvas.getContext("2d");

  // Gradient for bars
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0077ff");
  gradient.addColorStop(1, "#00c6ff");

  // Destroy previous chart
  if (window.resultChartInstance) {
    window.resultChartInstance.destroy();
  }

  window.resultChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Score (%)",
          data: scores,
          backgroundColor: gradient,
          borderRadius: 12,
          barThickness: 45,
          hoverBackgroundColor: "#004aad"
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
      animation: {
        duration: 1500,
        easing: "easeOutQuart"
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + "%" },
          grid: { color: "rgba(0,0,0,0.08)" }
        },
        x: {
          ticks: { font: { size: window.innerWidth < 600 ? 10 : 13 } }
        }
      },
      plugins: {
        legend: { position: "top", labels: { usePointStyle: true, padding: 20 } },
        tooltip: {
          backgroundColor: "#002b5c",
          padding: 12,
          callbacks: {
            label: ctx => {
              const score = ctx.raw;
              let status =
                score >= 80 ? "Excellent 🏆" :
                score >= 60 ? "Good 👍" :
                score >= 40 ? "Average 🙂" :
                "Needs Improvement ⚠️";
              return ` ${ctx.dataset.label}: ${score}% — ${status}`;
            }
          }
        }
      }
    }
  });
}
