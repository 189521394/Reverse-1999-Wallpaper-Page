// 获取tab父元素
const setItem = document.getElementById("setItem");

setItem.addEventListener("click", function(e) {
    // 获取点击到的设置栏位
    const clickTab = e.target.closest(".setItem");
    // 点到空白处返回，防止控制台刷红
    if (!clickTab) return;

    // 状态判断
    const isRolled = setItem.classList.contains("roll");
    const isAlreadyActive = clickTab.classList.contains("active");

    // ==========================展开菜单（从标题返回全屏列表）==========================
    if (isMobileLayout && isAlreadyActive && isRolled) {
        // 打开菜单
        setItem.classList.remove("roll");

        // 放出隐藏的元素
        const allItem = document.querySelectorAll('.setItem');
        allItem.forEach(item => {
            item.classList.remove("hide");
        });

        // 取消置顶和位移，保留颜色高亮
        clickTab.classList.remove("active");
        clickTab.classList.add("activeWait");

        // 不执行下方的切换逻辑
        return;
    }

    // ========================== 正常 tab 切换（首次选中 / 再次选中） ==========================

    // 清理正在当标题的 active
    const activatedTab = setItem.querySelector(".setItem.active");
    if (activatedTab) {
        activatedTab.classList.remove("active");
    }

    // 清理在队伍中候补的 activeWait
    const waitingTab = setItem.querySelector(".setItem.activeWait");
    if (waitingTab) {
        waitingTab.classList.remove("activeWait");
    }

    // 移动端排版控制
    if (isMobileLayout) {
        // 隐藏导航
        setItem.classList.add("roll");

        const allItem = document.querySelectorAll('.setItem');
        allItem.forEach((item) => {
            if (item !== clickTab) {
                // 如果不是当前点击的选项，隐藏
                item.classList.add("hide");
            } else {
                // 当前点击的，显示
                item.classList.remove("hide");
            }
        });
    }

    // 给当前点击的选项添加标题样式
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

// 默认点击
if (!isMobileLayout) {
    document.getElementById("preference").click();
}