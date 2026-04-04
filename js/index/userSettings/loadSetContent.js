const setItemContainer = document.getElementById("setItem");

// 全局变量
let isAnimating = false;    // 动画锁
let cloneEl = null;         // 克隆元素
let cachedRect = null;      // 缓存的坐标
let originalActiveTab = null; // 当前真正处于激活态的原生节点

// document监听，因为克隆体会直接 append 到 body 上
document.addEventListener("click", function(e) {
    // 拦截动画期间的所有相关点击
    if (isAnimating) return;

    // 获得点击的元素和克隆元素
    const clickTab = e.target.closest(".setItem");
    const clickClone = e.target.closest(".clone-item");

    // 既没点到菜单也没点到克隆体，直接返回
    if (!clickTab && !clickClone) return;

    // ================移动端首次点击提示================
    if (isMobileLayout && typeof returnMenu === 'function' && clickTab) {
        returnMenu();
    }
    // ================PC端逻辑================
    if (!isMobileLayout) {
        if (!clickTab) return;

        // 清除原本的高亮状态
        const activatedTab = setItemContainer.querySelector(".setItem.active");
        if (activatedTab) {
            activatedTab.classList.remove("active");
        }
        const waitingTab = setItemContainer.querySelector(".setItem.activeWait");
        if (waitingTab) {
            waitingTab.classList.remove("activeWait");
        }

        // 赋予点击的高亮状态
        clickTab.classList.add("active");

        // 切换设置内容
        switchContent(clickTab.getAttribute("data-Content"));
        // 退出，下方为移动端动画，不能执行
        return;
    }

    // ================展开全屏菜单================
    if (clickClone) {
        openMenuAnimation();
        return;
    }

    // ================关闭全屏菜单================
    if (clickTab && !clickTab.classList.contains("clone-item")) {
        closeMenuAnimation(clickTab);
    }
});


// ================关闭全屏菜单================
function closeMenuAnimation(targetTab) {
    isAnimating = true; // 上锁

    // 删除所有设置项的wait样式
    setItemContainer.querySelectorAll(".setItem").forEach(el => {
        el.classList.remove("activeWait");
    });

    // 获取坐标快照
    cachedRect = targetTab.getBoundingClientRect();
    originalActiveTab = targetTab;

    // 生成克隆体
    cloneEl = targetTab.cloneNode(true);
    cloneEl.classList.add("clone-item");

    // 初始化克隆体坐标
    cloneEl.style.top = `${cachedRect.top}px`;
    cloneEl.style.left = `${cachedRect.left}px`;
    cloneEl.style.width = `${cachedRect.width}px`;
    cloneEl.style.height = `${cachedRect.height}px`;

    document.body.appendChild(cloneEl);

    // 强制重排
    cloneEl.offsetHeight;

    // 隐藏原生的设置菜单选项
    setItemContainer.querySelectorAll(".setItem").forEach(item => {
        item.classList.add("hidden-item");
    });
    // 给予设置背景展开样式
    setItemContainer.classList.add("shifted");

    // 克隆体位移动画
    cloneEl.classList.add("clone-animating");
    // 移动到顶部
    cloneEl.style.setProperty('--flip-y', `-${cachedRect.top}px`);

    // 宽度要占满屏幕
    const scaleX = window.innerWidth / cachedRect.width;
    const bgEl = cloneEl.querySelector(".setItem-bg");
    if (bgEl) {
        bgEl.style.transform = `scaleX(${scaleX})`;
    }

    // 给与激活样式
    cloneEl.classList.add("active-clone");

    // 切换设置内容
    switchContent(targetTab.getAttribute("data-Content"));

    // 关闭动画锁
    setTimeout(() => {
        isAnimating = false;
    }, 260);
}

// ================展开全屏菜单================
function openMenuAnimation() {
    if (!cloneEl || !cachedRect) return;
    // 开启动画锁
    isAnimating = true;

    // 克隆体回到原来的位置
    cloneEl.style.setProperty('--flip-y', `0px`);
    const bgEl = cloneEl.querySelector(".setItem-bg");
    if (bgEl) {
        bgEl.style.transform = `scaleX(1)`;
    }

    // 展开菜单
    setItemContainer.classList.remove("shifted");

    // 除了要激活的菜单，其他的都是平滑出现
    setItemContainer.querySelectorAll(".setItem").forEach(item => {
        if (item !== originalActiveTab) {
            item.classList.remove("hidden-item");
        }
    });

    // 等待动画，让实体菜单准备好
    setTimeout(() => {
        if (originalActiveTab) {
            // 临时关闭动画
            originalActiveTab.classList.add('force-no-transition');

            // 瞬间赋予应有的状态
            originalActiveTab.classList.remove("hidden-item");
            originalActiveTab.classList.add("activeWait");

            // 渲染
            originalActiveTab.offsetHeight;

            // 恢复正常动画能力
            originalActiveTab.classList.remove('force-no-transition');
        }

        // 销毁克隆体，显出完全一样的实体元素
        if (cloneEl) {
            cloneEl.remove();
            cloneEl = null;
        }

        // 关闭动画锁
        isAnimating = false;
    }, 250);
}

// 切换设置内容
function switchContent(targetID) {
    if (!targetID) return;

    document.querySelectorAll(".setContent").forEach(item => {
        item.classList.remove("show");
    });

    const targetContent = document.getElementById(targetID);
    if (targetContent) {
        targetContent.classList.add("show");
    }
}

// 初始化：电脑端默认打开第一个设置页面
if (!isMobileLayout) {
    const prefTab = document.getElementById("preference");
    if (prefTab) prefTab.click();
}