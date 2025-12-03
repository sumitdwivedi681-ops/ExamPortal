let questions = [];
let current = 0;
let answers = {};

async function loadQuestions() {
    const course = new URLSearchParams(window.location.search).get("course");
    const res = await fetch(`http://localhost:5000/get-questions?course=${course}`);
    questions = await res.json();

    showQuestion();
}

function showQuestion() {
    const q = questions[current];
    document.getElementById("question").innerText = q.question;

    const opts = document.getElementById("options");
    opts.innerHTML = "";

    q.options.forEach((opt, i) => {
        opts.innerHTML += `
            <div>
                <input type="radio" name="option" value="${i}">
                <label>${opt}</label>
            </div>
        `;
    });
}

function next() {
    saveAnswer();
    if (current < questions.length - 1) {
        current++;
        showQuestion();
    }
}

function prev() {
    saveAnswer();
    if (current > 0) {
        current--;
        showQuestion();
    }
}

function saveAnswer() {
    const val = document.querySelector("input[name='option']:checked");
    if (val) answers[current] = parseInt(val.value);
}

async function submitTest() {
    saveAnswer();

    let score = 0;
    let total = questions.length;

    questions.forEach((q, i) => {
        if (answers[i] === q.answer) score++;
    });

    // Send to server
    const email = localStorage.getItem("email");
    const course = localStorage.getItem("course");

    await fetch("http://localhost:5000/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, course, score, total })
    });

    window.location.href = `result.html?score=${score}&total=${total}`;
}

loadQuestions();
