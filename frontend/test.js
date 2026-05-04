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
  let answers = {}; // { _id: "Selected Text" }

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

    const allQuestions = await res.json();

    if (!allQuestions || !allQuestions.length) {
      loader.innerText = "No questions found for this course!";
      return;
    }

    // Shuffle and pick 20
    questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);

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

    optionsBox.innerHTML = ""; 
    
    ["optionA", "optionB", "optionC", "optionD"].forEach((optKey, index) => {
      const optVal = q[optKey] || "";
      const letter = ["A", "B", "C", "D"][index];
      
      const optionDiv = document.createElement("div");
      optionDiv.className = "option-item";
      
      const label = document.createElement("label");
      
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "option";
      radio.value = optVal;
      if (selected === optVal) radio.checked = true;
      
      label.appendChild(radio);
      label.appendChild(document.createTextNode(` ${letter}. `));
      
      const span = document.createElement("span");
      span.textContent = optVal; // Safe text rendering
      label.appendChild(span);
      
      optionDiv.appendChild(label);
      optionsBox.appendChild(optionDiv);
    });

    prevBtn.disabled = currentIndex === 0;
    nextBtn.style.display = currentIndex === questions.length - 1 ? "none" : "inline-block";
    submitBtn.style.display = currentIndex === questions.length - 1 ? "inline-block" : "none";
  }

  function saveAnswer() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected) {
      answers[questions[currentIndex]._id] = selected.value;
    }
  }

  nextBtn.onclick = () => { saveAnswer(); currentIndex++; loadQuestion(); };
  prevBtn.onclick = () => { saveAnswer(); currentIndex--; loadQuestion(); };

  // ---------------- SUBMIT TEST ----------------
  submitBtn.onclick = async () => {
    saveAnswer();

    let score = 0;

    questions.forEach(q => {
      const userSelectedText = (answers[q._id] || "").trim().toLowerCase();
      const dbCorrectAnswer = (q.answer || "").trim().toLowerCase();

      // Check 1: Direct match (Text vs Text)
      if (userSelectedText === dbCorrectAnswer) {
        score++;
      } 
      // Check 2: Letter match (e.g. if DB answer is "A" and user picked optionA text)
      else if (dbCorrectAnswer === "a" && userSelectedText === (q.optionA || "").trim().toLowerCase()) {
        score++;
      }
      else if (dbCorrectAnswer === "b" && userSelectedText === (q.optionB || "").trim().toLowerCase()) {
        score++;
      }
      else if (dbCorrectAnswer === "c" && userSelectedText === (q.optionC || "").trim().toLowerCase()) {
        score++;
      }
      else if (dbCorrectAnswer === "d" && userSelectedText === (q.optionD || "").trim().toLowerCase()) {
        score++;
      }
    });

    // SAVE LOCALLY FOR RESULT PAGE
    localStorage.setItem("lastResult", JSON.stringify({ score, total: questions.length }));

    // SAVE RESULT TO DB
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
      console.error("Submit Error:", err);
      alert("Server error while submitting!");
    }
  };

});
