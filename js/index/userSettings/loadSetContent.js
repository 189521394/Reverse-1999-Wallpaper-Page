const setItemContainer = document.getElementById("setItem");

// 状态机全局变量
let isAnimating = false;    // 防止狂点破坏动画的锁
let cloneEl = null;         // 替身克隆体
let cachedRect = null;      // 缓存的坐标
let originalActiveTab = null; // 记录当前真正处于激活态的原生节点

// 我们将事件监听挂载到 document 上，因为克隆体会直接 append 到 body 上
document.addEventListener("click", function(e) {
    // 拦截动画期间的所有相关点击
    if (isAnimating) return;

    const clickTab = e.target.closest(".setItem");
    const clickClone = e.target.closest(".clone-item");

    // 既没点到菜单也没点到克隆体，直接返回
    if (!clickTab && !clickClone) return;

    // ================移动端首次点击提示================
    if (isMobileLayout && typeof returnMenu === 'function' && clickTab) {
        returnMenu();
    }
    // ======================================================================

    // ------------------- PC 端逻辑 (恢复原生形态) -------------------
    if (!isMobileLayout) {
        if (!clickTab) return;

        // 1. 完全恢复你原本的清理逻辑
        const activatedTab = setItemContainer.querySelector(".setItem.active");
        if (activatedTab) {
            activatedTab.classList.remove("active");
        }
        const waitingTab = setItemContainer.querySelector(".setItem.activeWait");
        if (waitingTab) {
            waitingTab.classList.remove("activeWait");
        }

        // 2. 赋予正常的高亮状态
        clickTab.classList.add("active");

        // 3. 切换内容
        switchContent(clickTab.getAttribute("data-Content"));
        return; // 提前退出，绝不执行下方的移动端动画
    }

    // ------------------- 移动端逻辑：点击顶部克隆体（返回大菜单） -------------------
    if (clickClone) {
        closeMenuAnimation();
        return;
    }

    // ------------------- 移动端逻辑：点击原生菜单项（展开设置内容） -------------------
    if (clickTab && !clickTab.classList.contains("clone-item")) {
        openMenuAnimation(clickTab);
    }
});


// ======== 核心动画函数：展开 ========
function openMenuAnimation(targetTab) {
    isAnimating = true; // 上锁

    // 【修改点1：限制范围】清除其他选项的 activeWait 痕迹，只在容器内查找
    setItemContainer.querySelectorAll(".setItem").forEach(el => el.classList.remove("activeWait"));

    // 1. 获取坐标快照
    cachedRect = targetTab.getBoundingClientRect();
    originalActiveTab = targetTab;

    // 生成克隆体
    cloneEl = targetTab.cloneNode(true);
    cloneEl.classList.add("clone-item");

    // （已删除窃取 CSS 变量的代码，因为你的变量在 :root，天然支持继承）

    // 初始化克隆体坐标
    cloneEl.style.top = `${cachedRect.top}px`;
    cloneEl.style.left = `${cachedRect.left}px`;
    cloneEl.style.width = `${cachedRect.width}px`;
    cloneEl.style.height = `${cachedRect.height}px`;

    document.body.appendChild(cloneEl);

    cloneEl.offsetHeight; // 强制重排

    // 3. 障眼法：隐藏原生大菜单
    // 【修改点2：限制范围】只让容器内的原生项变透明，放过克隆体！
    setItemContainer.querySelectorAll(".setItem").forEach(item => {
        item.classList.add("hidden-item");
    });
    setItemContainer.classList.add("shifted");

    // 4. 克隆体飞升与变形
    cloneEl.classList.add("clone-animating");
    cloneEl.style.setProperty('--flip-y', `-${cachedRect.top}px`);

    const scaleX = window.innerWidth / cachedRect.width;
    const bgEl = cloneEl.querySelector(".setItem-bg");
    if (bgEl) {
        bgEl.style.transform = `scaleX(${scaleX})`;
    }

    cloneEl.classList.add("active-clone");

    // 5. 切换内容展示
    switchContent(targetTab.getAttribute("data-Content"));

    // 6. 解锁
    setTimeout(() => {
        isAnimating = false;
    }, 260);
}

// ======== 核心动画函数：收起 ========
function closeMenuAnimation() {
    if (!cloneEl || !cachedRect) return;
    isAnimating = true; // 上锁，开启无敌护盾，无视一切点击

    // 1. 克隆体返航
    cloneEl.style.setProperty('--flip-y', `0px`);
    const bgEl = cloneEl.querySelector(".setItem-bg");
    if (bgEl) {
        bgEl.style.transform = `scaleX(1)`;
    }

    // 2. 障眼法恢复：大菜单平移下来并显现
    setItemContainer.classList.remove("shifted");

    // 遍历所有菜单项，让除了目标项以外的其他选项开始平滑显现
    setItemContainer.querySelectorAll(".setItem").forEach(item => {
        if (item !== originalActiveTab) {
            item.classList.remove("hidden-item");
        }
    });

    // 3. 动画结束：完美的【两步交接法】

    // 第一步：等待 250ms 飞行结束，让实体在底层悄悄准备好
    setTimeout(() => {
        if (originalActiveTab) {
            // 1. 挂上“强权静止”牌子，镇压父元素及所有子元素的动画
            originalActiveTab.classList.add('force-no-transition');

            // 2. 瞬间显现并高亮 (此时它正被克隆体完美盖住)
            originalActiveTab.classList.remove("hidden-item");
            originalActiveTab.classList.add("activeWait");

            // 3. 强制浏览器立即执行渲染，把它画在屏幕上
            originalActiveTab.offsetHeight;

            // 4. 摘掉牌子，重新恢复它们的动画能力，准备迎接下一次交互
            originalActiveTab.classList.remove('force-no-transition');
        }

        // 第二步：再等 50ms（确信浏览器已经把底层画好了），安全销毁替身
        setTimeout(() => {
            if (cloneEl) {
                cloneEl.remove();
                cloneEl = null;
            }

            // 卸下无敌护盾，允许用户再次点击
            isAnimating = false;
        }, 50);

    }, 250);
}

// 提取公共的内容切换方法
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

// 初始化：非移动端默认点开第一个
if (!isMobileLayout) {
    const prefTab = document.getElementById("preference");
    if (prefTab) prefTab.click();
}