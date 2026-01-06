const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");

const popup = document.getElementById("successPopup");
const popupText = document.getElementById("popupText");
const popupBtn = document.getElementById("popupBtn");

// ===== Tab Functionality =====
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}



// ===== Show popup =====
function showPopup(message) {
    popupText.innerText = message;
    popup.style.display = "flex";
}

// ===== Close popup =====
popupBtn.addEventListener("click", () => {
    popup.style.display = "none";
});

// ================= REGISTER ==================
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = document.getElementById("full_name").value;
    const email = document.getElementById("register_email").value;
    const password = document.getElementById("register_password").value;
    const course = document.getElementById("course").value;

    if (course === "Select Course") {
        showPopup("Please select course");
        return;
    }

    try {
        const response = await fetch("https://examportal-backend-0zjj.onrender.com/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full_name, email, password, course })
        });

        const data = await response.json();

        if (data.status === "success") {
            showPopup("Registration Successful!");
        } else {
            showPopup(data.error || "Registration failed");
        }
    } catch (err) {
        showPopup("Server not responding");
    }
});

// ================= LOGIN ==================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("https://examportal-backend-0zjj.onrender.com/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.status === "success") {
            localStorage.setItem("loggedUser", JSON.stringify(data.user));
            showPopup("Login Successful!");
            // Optional: redirect after 1 sec
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 3000);
        } else {
            showPopup(data.error || "Invalid Email or Password");
        }
    } catch (err) {
        showPopup("Server not responding");
    }
});
