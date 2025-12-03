const student = JSON.parse(localStorage.getItem("loggedUser")) || null;
const studentInfo = document.getElementById("studentInfo");
const resultTableBody = document.querySelector("#resultTable tbody");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");

// Show popup
function showPopup(msg){
    popupText.innerText = msg;
    popup.style.display = "flex";
}

popupBtn.addEventListener("click", () => {
    popup.style.display = "none";
});

if(!student){
    studentInfo.innerText = "Please login to view your results.";
    showPopup("Login required!");
} else {
    studentInfo.innerText = `Name: ${student.full_name} | Email: ${student.email}`;

    // Fetch results from backend
    fetch(`http://localhost:5000/get-results?email=${encodeURIComponent(student.email)}`)
    .then(res => res.json())
    .then(data => {
        if(!data.length){
            showPopup("No results found!");
            return;
        }

        let labels = [];
        let scores = [];

        data.forEach((item, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx+1}</td>
                <td>${item.course}</td>
                <td>${item.score}</td>
                <td>${item.total}</td>
                <td>${new Date(item.exam_date).toLocaleString()}</td>
            `;
            resultTableBody.appendChild(tr);

            labels.push(item.course);
            scores.push(item.score);
        });

        // Draw chart
        const ctx = document.getElementById("resultChart").getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score',
                    data: scores,
                    backgroundColor: 'rgba(0, 43, 92, 0.7)',
                    borderColor: 'rgba(0, 43, 92, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, max: 100 }
                },
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    })
    .catch(err => {
        console.error(err);
        showPopup("Server error! Cannot fetch results.");
    });
}
