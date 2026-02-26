const setBackground = document.getElementById("setBackground");
// setItem 已经定义，直接用
const setPadding = document.getElementById("setPadding");
const setBox = document.getElementById("setBox");
const setItems = document.querySelectorAll(".setItem");

// 封装动画
function setAni(boolean) {
    if (boolean) {
        setBackground.classList.add('show');
        setItem.classList.add('show');
        setPadding.classList.add('show');
        setBox.classList.add('show');
        setItems.forEach((element) => {element.classList.add('show');});
    } else {
        setBackground.classList.remove('show');
        setItem.classList.remove('show');
        setPadding.classList.remove('show');
        setBox.classList.remove('show');
        setItems.forEach((element) => {element.classList.remove('show');});
    }
}

function openSettings() {
    // 滚动锁定，防止背景滚动
    toggleScrollLock(true);
    setAni(true);
}

function closeSettings() {
    toggleScrollLock(false);
    setAni(false);
}

setBackground.addEventListener('click', function (event) {
    // 一定要确保点击的是背景，不要让子元素冒泡
    // 最伟大，事件冒泡✋😭✋
    if (event.target === setBackground) {
        closeSettings();
    }
});