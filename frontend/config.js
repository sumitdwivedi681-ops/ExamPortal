// LIVE BACKEND URL ON RENDER
const API_URL = "https://examportal-backend-fakr.onrender.com";

// Export it for other files to use
if (typeof window !== "undefined") {
    window.API_URL = API_URL;
}

// Auto-setup feedback link if user is logged in
document.addEventListener("DOMContentLoaded", () => {
    const student = JSON.parse(localStorage.getItem("loggedUser"));
    const feedbackBtn = document.getElementById("feedbackBtn");
    
    if (student && feedbackBtn) {
        const subject = encodeURIComponent("Feedback for Exam Portal");
        const body = encodeURIComponent(`Hello Sumit,\n\nI have some feedback regarding the portal.\n\nFrom: ${student.full_name}\nEmail: ${student.email}`);
        feedbackBtn.href = `mailto:sumitdwivedi681@gmail.com?subject=${subject}&body=${body}`;
    }
});
