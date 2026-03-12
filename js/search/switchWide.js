document.getElementById("tagList").addEventListener("click",function (e) {
    let tagPool = document.getElementById("tagPool");
    let filterPool = document.getElementById("submitPool");
    let ele = e.target.closest(".item");

    if (!ele) return;

    if (isMobileLayout) {
        // 手机布局较为紧凑，把三个比较宽的都切换一下
        if (ele.id === "anecdote" || ele.id === "event" || ele.id === "mainLine") {
            tagPool.classList.add("wide");
            filterPool.classList.add("wide");
        } else {
            tagPool.classList.remove("wide");
            filterPool.classList.remove("wide");
        }
    } else {
        // 电脑布局空间足够，只设置比较宽的轶事
        if (ele.id === "anecdote") {
            tagPool.classList.add("wide");
            filterPool.classList.add("wide");
        } else {
            tagPool.classList.remove("wide");
            filterPool.classList.remove("wide");
        }
    }
});