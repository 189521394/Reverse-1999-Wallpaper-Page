const setBackground = document.getElementById("setBackground");
// setItemContainer 在 loadSetContent.js 中定义，直接用
const setPadding = document.getElementById("setPadding");
const setBox = document.getElementById("setBox");
const setItems = document.querySelectorAll(".setItem");

// 封装动画
function setAni(isOpen) {
    // 统一管理需要切换 .show 的容器
    [setBackground, setItemContainer, setPadding, setBox, ...setItems].forEach(el => {
        if (el) el.classList.toggle('show', isOpen);
    });

    // 直接使用全局变量 cloneEl，无需重新查询 DOM
    if (cloneEl) {
        cloneEl.classList.toggle('global-hide', !isOpen);
    }
}

const setLockID = "set_lock_id";

function openSettings() {
    // 滚动锁定，防止背景滚动
    requestScrollLock(setLockID);
    setAni(true);
}

function closeSettings() {
    releaseScrollLock(setLockID)
    setAni(false);
}

setBackground.addEventListener('click', function (event) {
    // 一定要确保点击的是背景，不要让子元素冒泡
    // 最伟大，事件冒泡✋😭✋
    if (event.target === setBackground) {
        closeSettings();
    }
});