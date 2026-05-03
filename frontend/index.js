// Using global window.API_URL from config.js

/* ================= TAB SWITCH ================= */
function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");

  // Highlight the correct tab button
  if (tabId === "registerTab") {
    document.querySelectorAll(".tab-btn")[0].classList.add("active");
  } else {
    document.querySelectorAll(".tab-btn")[1].classList.add("active");
  }
}

/* ================= POPUP ================= */
const popup = document.getElementById("successPopup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");

popupBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

/* REGISTER  */
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("register_email").value.trim();
  const password = document.getElementById("register_password").value;
  const course = document.getElementById("course").value;

  if (!full_name || !email || !password || !course) {
    popupText.innerText = "All fields are required ";
    popup.style.display = "flex";
    return;
  }

  try {
    console.log("Sending register request...");

    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name,
        email,
        password,
        course
      })
    });

    const result = await res.json();
    console.log("Register response:", result);

    if (!res.ok) {
      popupText.innerText = result.error || "Registration failed ";
      popup.style.display = "flex";
      return;
    }

    popupText.innerText = "Registration Successful ";
    popup.style.display = "flex";

    document.getElementById("registerForm").reset();

    // auto switch to login tab
    showTab("loginTab");

  } catch (error) {
    console.error("Register error:", error);
    popupText.innerText = "Server not responding";
    popup.style.display = "flex";
  }
});

/* ================= LOGIN ================= */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    popupText.innerText = "Email & Password required ";
    popup.style.display = "flex";
    return;
  }

  try {
    console.log("Sending login request...");

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();
    console.log("Login response:", result);

    if (!res.ok) {
      popupText.innerText = result.error || "Login failed ";
      popup.style.display = "flex";
      return;
    }

    popupText.innerText = `Welcome ${result.user.full_name} 👋`;
    popup.style.display = "flex";

    // save logged user
    localStorage.setItem("loggedUser", JSON.stringify(result.user));

    // redirect to subject page
    setTimeout(() => {
      window.location.href = "subject.html";
    }, 1000);

  } catch (error) {
    console.error("Login error:", error);
    popupText.innerText = "Server not responding ";
    popup.style.display = "flex";
  }
});
