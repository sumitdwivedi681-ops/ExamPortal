const student = JSON.parse(localStorage.getItem("loggedUser")) || null;

const studentNameSpan = document.getElementById("studentName");
if(student){
    studentNameSpan.innerText = student.full_name;
} else {
    studentNameSpan.innerText = "Guest";
}

document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html"; 
});

const courseButtons = document.querySelectorAll(".course-card button");

courseButtons.forEach(btn => {
    if(!student){
        btn.disabled = true;
        btn.innerText = "Login to Start";
    }

    btn.addEventListener("click", () => {
        const course = btn.getAttribute("data-course");
        window.location.href = `test.html?course=${encodeURIComponent(course)}`;
    });
});

function goHome(){ window.scrollTo(0,0); }
function goCourses(){ document.querySelector(".course-section").scrollIntoView({ behavior: 'smooth' }); }
function startTest(){ if(student) courseButtons[0].scrollIntoView({ behavior: 'smooth' }); }
function goResult(){ window.location.href = "result.html"; } 
