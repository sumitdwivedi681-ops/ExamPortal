// Using global window.API_URL from config.js

/* ================= TAB SWITCH ================= */
function showTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-btn");

  tabs.forEach((tab) => tab.classList.remove("active"));
  buttons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

const popup = document.getElementById("successPopup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");

popupBtn.onclick = () => {
  popup.style.display = "none";
};

/* ================= REGISTER ================= */
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("register_email").value.trim();
  const password = document.getElementById("register_password").value;
  const course = document.getElementById("course").value;

  try {
    const res = await fetch(`${window.API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password, course })
    });

    const data = await res.json();
    if (data.status === "success") {
      popupText.innerText = "Registration Successful! Please Login.";
      popup.style.display = "flex";
      showTab('loginTab');
    } else {
      popupText.innerText = data.error || "Registration failed";
      popup.style.display = "flex";
    }
  } catch (err) {
    popupText.innerText = "Connection error!";
    popup.style.display = "flex";
  }
});

/* ================= LOGIN ================= */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${window.API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.status === "success") {
      localStorage.setItem("loggedUser", JSON.stringify(data.user));
      popupText.innerText = "Login Successful! Redirecting...";
      popup.style.display = "flex";
      setTimeout(() => {
        window.location.href = "subject.html";
      }, 1500);
    } else {
      popupText.innerText = data.error || "Invalid credentials";
      popup.style.display = "flex";
    }
  } catch (err) {
    console.error("Login Error:", err);
    popupText.innerText = "Connection failed!";
    popup.style.display = "flex";
  }
});
