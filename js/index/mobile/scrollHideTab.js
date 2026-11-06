// 获取页面容器
const container = document.documentElement
// 获取tab栏
const mobileTab = document.getElementById("mobileTab");
// 获取用户选项
const onlyTopShowTab = document.getElementById("onlyTopShowTab");

// ============= tab 隐藏/显示锁 =============
// 仿照滚动锁：多个持有者共同登记，全部释放才恢复显示；锁存续期间 tab 强制隐藏
const tabLockRegistry = new Set();

function requestTabLock(lockerID) {
    tabLockRegistry.add(lockerID);
    if (tabLockRegistry.size > 0) {
        mobileTab.classList.add("down");
    }
}

function releaseTabLock(lockerID) {
    tabLockRegistry.delete(lockerID);
    if (tabLockRegistry.size === 0) {
        mobileTab.classList.remove("down");
        // 重新交给滚动逻辑校准（"仅顶部显示"模式需按滚动位置决定显隐）
        if (onlyTopShowTab.checked) {
            inTop();
        }
    }
}

// 查询锁定状态
const isTabLocked = () => {
    return tabLockRegistry.size > 0;
}

// =============按照触摸动作显示=============
// 记录触摸开始时的Y坐标
let startY = 0;

function touchStart(e) {
    startY = e.touches[0].clientY;
}
function touchEnd(e) {
    if (isScrollLocked()) return;
    // tab 被锁住（如大图预览）时，触摸动作不得改变显隐
    if (isTabLocked()) return;

    const endY = e.changedTouches[0].clientY;
    // 向下滑动：distance > 0，向上滑动：distance < 0
    const distance = startY - endY;

    // 设置滑动阈值，避免小幅度滑动误触发
    const threshold = 20;

    if (Math.abs(distance) > threshold) {
        if (distance > 0) {
            // 向下滑动(隐藏)
            mobileTab.classList.add("down");
        } else {
            // 向上滑动(显示)
            mobileTab.classList.remove("down");
        }
    }
}
// =============仅在顶部显示tab=============
function inTop() {
    // tab 被锁住时滚动逻辑让位，保持隐藏
    if (isTabLocked()) return;

    // 获取当前页面位置
    const body = document.body;
    if (body.classList.contains('tab-tags') || setBackground.classList.contains('show')) {
        // 在tag和设置要常驻，set是特殊状态
        mobileTab.classList.remove("down");
        return;
    }

    // 判定为顶部的像素值
    const threshold = 5;

    // 获取当前垂直滚动距离
    const scrollTop = window.scrollY || document.documentElement.scrollTop;


    // 如果滚动距离 >= 固定值
    if (scrollTop >= threshold) {
        // 隐藏
        mobileTab.classList.add("down");
    } else {
        // 显示
        mobileTab.classList.remove("down");
    }
}
function touchShow() {
    // =============按照触摸动作显示=============
    window.removeEventListener('scroll', inTop);

    // 打开自动显出tab
    mobileTab.classList.remove("down");

    // 绑定触摸事件
    container.addEventListener('touchstart', touchStart, {passive: true});
    container.addEventListener('touchend', touchEnd, {passive: true});
}
function onlyTop() {
    // =============仅在顶部显示tab=============
    container.removeEventListener('touchstart', touchStart);
    container.removeEventListener('touchend', touchEnd);

    window.addEventListener('scroll', inTop);
    // 切换时刷新一次
    inTop();
}



// 按钮变化时执行
function refreshTab() {
    if (onlyTopShowTab.checked) {
        onlyTop();
    } else {
        touchShow();
    }
}