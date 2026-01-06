const student = JSON.parse(localStorage.getItem("loggedUser"));
const nameSpan = document.getElementById("studentName");
const buttons = document.querySelectorAll(".course-card button");

nameSpan.innerText = student ? student.full_name : "Guest";

buttons.forEach(btn=>{
    if(!student){
        btn.disabled = true;
        btn.innerText = "Login Required";
    }

    btn.addEventListener("click",()=>{
        const course = btn.dataset.course;
        window.location.href = `test.html?course=${encodeURIComponent(course)}`;
    });
});

document.getElementById("logout").onclick = ()=>{
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html";
};

function scrollToCourses(){
    document.querySelector(".course-section").scrollIntoView({behavior:'smooth'});
}

function goResult(){
    window.location.href="result.html";
}
