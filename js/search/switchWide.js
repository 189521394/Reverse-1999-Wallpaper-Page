document.getElementById("tagList").addEventListener("click",function (e) {
    let tagPool = document.getElementById("tagPool");
    let filterPool = document.getElementById("submitPool");
    let ele = e.target.closest(".item");

    if (!ele) return;

    if (ele.id === "anecdote") {
        tagPool.classList.add("wide");
        filterPool.classList.add("wide");
    } else {
        tagPool.classList.remove("wide");
        filterPool.classList.remove("wide");
    }
});