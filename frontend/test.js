document.addEventListener("DOMContentLoaded", async () => {

  const courseTitle = document.getElementById("course-title");
  const loader = document.getElementById("loader");
  const testArea = document.getElementById("test-area");
  const questionText = document.getElementById("question-text");
  const optionsBox = document.getElementById("options");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  let questions = [];
  let currentIndex = 0;
  let answers = {}; // { _id: "The Text of Option" }

  const student = JSON.parse(localStorage.getItem("loggedUser"));
  if (!student) {
    alert("Login required!");
    location.href = "index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const course = decodeURIComponent(params.get("course"));
  courseTitle.innerText = course;

  // ---------------- FETCH QUESTIONS ----------------
  try {
    const res = await fetch(
      `${window.API_URL}/get-questions?course=${encodeURIComponent(course)}`
    );

    questions = await res.json();

    if (!questions || !questions.length) {
      loader.innerText = "No questions found for this course!";
      return;
    }

    loader.style.display = "none";
    testArea.style.display = "block";
    loadQuestion();

  } catch (err) {
    console.error(err);
    loader.innerText = "Server error!";
    return;
  }

  // ---------------- LOAD QUESTION ----------------
  function loadQuestion() {
    const q = questions[currentIndex];

    questionText.innerText = `${currentIndex + 1}. ${q.question_title}`;

    const selected = answers[q._id];

    optionsBox.innerHTML = `
      <label>
        <input type="radio" name="option" value="${q.optionA}" ${selected === q.optionA ? "checked" : ""}>
        A. ${q.optionA}
      </label><br>

      <label>
        <input type="radio" name="option" value="${q.optionB}" ${selected === q.optionB ? "checked" : ""}>
        B. ${q.optionB}
      </label><br>

      <label>
        <input type="radio" name="option" value="${q.optionC}" ${selected === q.optionC ? "checked" : ""}>
        C. ${q.optionC}
      </label><br>

      <label>
        <input type="radio" name="option" value="${q.optionD}" ${selected === q.optionD ? "checked" : ""}>
        D. ${q.optionD}
      </label>
    `;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.style.display =
      currentIndex === questions.length - 1 ? "none" : "inline-block";
    submitBtn.style.display =
      currentIndex === questions.length - 1 ? "inline-block" : "none";
  }

  // ---------------- SAVE ANSWER ----------------
  function saveAnswer() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected) {
      answers[questions[currentIndex]._id] = selected.value;
    }
  }

  nextBtn.onclick = () => {
    saveAnswer();
    currentIndex++;
    loadQuestion();
  };

  prevBtn.onclick = () => {
    saveAnswer();
    currentIndex--;
    loadQuestion();
  };

  // ---------------- SUBMIT TEST ----------------
  submitBtn.onclick = async () => {
    saveAnswer();

    let score = 0;

    questions.forEach(q => {
      const userAns = answers[q._id]; 
      // Compare the full text of the answer
      if (userAns && userAns.trim() === q.answer.trim()) {
        score++;
      }
    });

    // SAVE RESULT
    try {
      const res = await fetch(`${window.API_URL}/save-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: student.email,
          course: course,
          score: score,
          total: questions.length
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        location.href = "result.html";
      } else {
        alert("Submission failed!");
      }

    } catch (err) {
      console.error("Fetch error:", err);
      alert("Server error while submitting!");
    }
  };

});
