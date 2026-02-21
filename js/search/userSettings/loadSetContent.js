// 获取tab父元素
const setItem = document.getElementById("setItem");

setItem.addEventListener("click", function(e) {
    // 获取点击到的设置栏位
    const clickTab = e.target.closest(".setItem");
    // 点到空白处返回，防止控制台刷红
    if (!clickTab) return;

    // ==========================tab切换==========================
    const activatedTab = setItem.querySelector(".setItem.active");
    if (activatedTab) {
        activatedTab.classList.remove("active");
    }
    clickTab.classList.add("active");

    // ==========================内容切换==========================
    // 拿到需要切换的内容id
    const targetID = clickTab.getAttribute("data-Content");

    // 隐藏不需要的内容
    const allContent = document.querySelectorAll(".setContent");
    allContent.forEach((item) => {
        item.classList.remove("show");
    });

    // 显示需要的内容
    const targetContent = document.getElementById(targetID);
    if (targetContent) {
        targetContent.classList.add("show");
    }
});

document.getElementById("preference").click();