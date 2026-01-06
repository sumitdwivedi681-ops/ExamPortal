const student = JSON.parse(localStorage.getItem("loggedUser")) || null;

// Fill student name in header if needed
document.addEventListener("DOMContentLoaded", () => {
    if(student){
        const header = document.querySelector("header");
        header.innerHTML += `<p>Hello, ${student.full_name} 👋</p>`;
    }
});

const buttons = document.querySelectorAll(".subject-card button");
buttons.forEach(btn => {
    if(!student){
        btn.disabled = true;
        btn.innerText = "Login to Start";
    }

    btn.addEventListener("click", () => {
        const course = btn.getAttribute("data-course");
        window.location.href = `test.html?course=${encodeURIComponent(course)}`;
    });
});
