const student = JSON.parse(localStorage.getItem("loggedUser")) || null;

// Fill student name in header if needed
document.addEventListener("DOMContentLoaded", () => {
    if(student){
        const header = document.querySelector(".navbar-dashboard .container");
        if(header) {
            const welcomeMsg = document.createElement("p");
            welcomeMsg.className = "mb-0 ms-3 text-muted d-none d-md-block";
            welcomeMsg.innerHTML = `Hello, <strong>${student.full_name}</strong> 👋`;
            header.appendChild(welcomeMsg);
        }
    }

    // Intersection Observer for revealing cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add a small delay for cascading effect
                setTimeout(() => {
                    entry.target.classList.add("revealed");
                }, index * 100); 
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll(".subject-card");
    cards.forEach(card => observer.observe(card));
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
