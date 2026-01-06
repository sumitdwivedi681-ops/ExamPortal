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
  let answers = {}; 

  const student = JSON.parse(localStorage.getItem("loggedUser"));
  if (!student) {
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const course = decodeURIComponent(params.get("course"));
  courseTitle.innerText = course;

  // Fetch questions
  try {
    const res = await fetch(
      `https://examportal-backend-0zjj.onrender.com/get-questions?course=${encodeURIComponent(course)}`
    );

    questions = await res.json();

    // ✅ NORMALIZE CORRECT ANSWERS
    questions = questions.map(q => ({
      ...q,
      answer: q.answer.toString().trim().toUpperCase()
    }));

    if (!questions.length) {
      loader.innerText = "No questions found!";
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

  // Load question
  function loadQuestion() {
    const q = questions[currentIndex];

    questionText.innerText = `${currentIndex + 1}. ${q.question_title}`;

    optionsBox.innerHTML = `
      <label><input type="radio" name="option" value=${q.optionA} ${q.id === q.optionA ? "checked" : ""}> ${q.optionA}</label><br>
      <label><input type="radio" name="option" value=${q.optionB} ${q.id === q.optionB ? "checked" : ""}> ${q.optionB}</label><br>
      <label><input type="radio" name="option" value=${q.optionC} ${q.id === q.optionC ? "checked" : ""}> ${q.optionC}</label><br>
      <label><input type="radio" name="option" value=${q.optionD} ${q.id === q.optionD ? "checked" : ""}> ${q.optionD}</label>
    `;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.style.display =
      currentIndex === questions.length - 1 ? "none" : "inline-block";
    submitBtn.style.display =
      currentIndex === questions.length - 1 ? "inline-block" : "none";
  }

  // Save selected answer
  function saveAnswer() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected) {
      answers[questions[currentIndex].id] =
        selected.value.toString().trim().toUpperCase();
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

  // ✅ SUBMIT TEST (FIXED)
  submitBtn.onclick = async () => {
    saveAnswer();

    let score = 0;

questions.forEach(q => {
  const userAns = answers[q.id];
  const correctAns = q.answer;


  console.log(
    "QID:", q.id,
    "User:", userAns,
    "Correct:", correctAns
  );

  if (userAns === correctAns) {
    score++;
    console.log("Correct answer for QID:", q.id);
  }
});


    console.log("Final Answers:", answers);
    console.log("Final Score:", score);

    // ✅ SAVE RESULT TO DATABASE
    try {
      const res = await fetch("https://examportal-backend-0zjj.onrender.com/save-result", {
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
      console.log("Server response:", data);

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
