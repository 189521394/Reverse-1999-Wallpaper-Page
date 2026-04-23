document.getElementById("tagList").addEventListener("click",function (e) {
    let ele = e.target.closest(".item");
    if (!ele) return;

    updateLayoutWidth(ele.id);
});

// =========================布局与宽度控制器=========================
function updateLayoutWidth(activeElementId) {
    let tagPool = document.getElementById("tagPool");
    let filterPool = document.getElementById("submitPool");

    // 定义哪些 ID 是属于“宽标签”的
    const wideID = ["anecdote", "event", "mainLine", "Tone", "special"];

    if (isMobileLayout) {
        // 手机端逻辑
        if (wideID.includes(activeElementId)) {
            tagPool.classList.add("wide");
            filterPool.classList.add("wide");
        } else {
            tagPool.classList.remove("wide");
            filterPool.classList.remove("wide");
        }
    } else {
        // 电脑端逻辑
        if (currentLanguage === "en" && wideID.includes(activeElementId)) {
            tagPool.classList.add("wide");
            filterPool.classList.add("wide");
        } else if (activeElementId === "anecdote") {
            tagPool.classList.add("wide");
            filterPool.classList.add("wide");
        } else {
            tagPool.classList.remove("wide");
            filterPool.classList.remove("wide");
        }
    }
}