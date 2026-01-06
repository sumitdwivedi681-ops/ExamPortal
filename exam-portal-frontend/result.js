// =====================
// Student Result Logic
// =====================

// DOM Elements
const studentInfo = document.getElementById("studentInfo");
const resultTableBody = document.querySelector("#resultTable tbody");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");

// Logged user
const student = JSON.parse(localStorage.getItem("loggedUser"));

// ---------------------
// Utility Functions
// ---------------------

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

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {

  if (!student) {
    showPopup("Login required to view results");
    redirectToLogin();
    return;
  }

  // Show student info
  studentInfo.innerText = `Name: ${student.full_name} | Email: ${student.email}`;

  // Fetch Results
  fetch(`http://localhost:5000/get-results?email=${encodeURIComponent(student.email)}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch results");
      return res.json();
    })
    .then(results => {
      if (!results.length) {
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

// ---------------------
// Render Table
// ---------------------
function renderResults(data) {
  resultTableBody.innerHTML = "";

  data.forEach((item, index) => {
    const percentage = Math.round((item.score / item.total) * 100);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.course}</td>
      <td>${item.score} / ${item.total}</td>
      <td>${percentage}%</td>
      <td>${new Date(item.exam_date).toLocaleString()}</td>
    `;

    // Highlight best attempt
    if (percentage >= 80) {
      tr.style.backgroundColor = "#e6f4ff";
      tr.style.fontWeight = "600";
    }

    resultTableBody.appendChild(tr);
  });
}

// ---------------------
// Render Chart
// ---------------------
function renderChart(data) {

  // Ensure canvas exists
  const canvas = document.getElementById("resultChart");
  if (!canvas) return;

  const labels = [];
  const scores = [];

  data.forEach((item, idx) => {
    const percent = Math.round((item.score / item.total) * 100);
    labels.push(`${item.course} (Attempt ${idx + 1})`);
    scores.push(percent);
  });

  // Destroy existing chart if any
  if (window.resultChartInstance) {
    window.resultChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  window.resultChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Score (%)",
        data: scores,
        backgroundColor: "rgba(0, 43, 92, 0.7)",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: value => value + "%"
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Score: ${ctx.raw}%`
          }
        }
      }
    }
  });
}
