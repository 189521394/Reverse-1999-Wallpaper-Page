const setBackground = document.getElementById("setBackground");

function openSettings() {
    // 滚动锁定，防止背景滚动
    toggleScrollLock(true);
    setBackground.classList.add('show');
}

function closeSettings() {
    toggleScrollLock(false);
    setBackground.classList.remove('show');
}

setBackground.addEventListener('click', function (event) {
    // 一定要确保点击的是背景，不要让子元素冒泡
    // 最伟大，事件冒泡✋😭✋
    if (event.target === setBackground) {
        closeSettings();
    }
});