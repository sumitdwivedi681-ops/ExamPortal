document.addEventListener("DOMContentLoaded", () => {
    const lastResult = JSON.parse(localStorage.getItem("lastResult"));

    if (!lastResult) {
        window.location.href = "dashboard.html";
        return;
    }

    const { score, total } = lastResult;
    const wrong = total - score;

    // Display Digital Score
    document.getElementById("score-display").innerText = `${score}/${total}`;

    // Render Pie Chart
    const ctx = document.getElementById('resultChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Incorrect'],
            datasets: [{
                data: [score, wrong],
                backgroundColor: ['#0ea5e9', '#f1f5f9'],
                borderColor: ['#fff', '#fff'],
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
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw}`
                    }
                }
            }
        }
    });
});
