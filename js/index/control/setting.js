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
    // 地址栏同步为设置面板路由
    syncUrlWithState();
}

function closeSettings() {
    releaseScrollLock(setLockID)
    setAni(false);
    // 移动端通过返回键或遮罩关闭设置面板时，若底部 Tab 仍停留在“设置”，恢复回当前页面对应的 Tab
    const setTabBtn = document.getElementById('set');
    if (setTabBtn && setTabBtn.classList.contains('active') && typeof switchTab === 'function') {
        const isTagsPage = document.body.classList.contains('tab-tags');
        switchTab(isTagsPage ? 'tab-tags' : 'tab-wallpaper', isTagsPage ? 'selectTag' : 'wallpaper', true);
    }
    // 地址栏退回设置面板之前的页面
    syncUrlWithState();
}

setBackground.addEventListener('click', function (event) {
    // 一定要确保点击的是背景，不要让子元素冒泡
    // 最伟大，事件冒泡✋😭✋
    if (event.target === setBackground) {
        closeSettings();
    }
});