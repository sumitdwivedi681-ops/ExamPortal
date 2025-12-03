    const params = new URLSearchParams(window.location.search);
    const course = params.get("course");
    document.getElementById("courseTitle").textContent = course + " Test";

    function startTest() {
        alert("Test Starting Now!");
        window.location.href = "test.html"; 
    }