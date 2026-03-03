// 获取页面容器
const container = document.documentElement
// 获取tab栏
const mobileTab = document.getElementById("mobileTab");

// 记录触摸开始时的Y坐标
let startY = 0;

// 触摸开始时触发
container.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
});

// 触摸结束时触发
container.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    // 向下滑动：distance > 0，向上滑动：distance < 0
    const distance = startY - endY;

    // 设置滑动阈值，避免小幅度滑动误触发
    const threshold = 20;

    if (Math.abs(distance) > threshold) {
        if (distance > 0) {
            // 向下滑动
            mobileTab.classList.add("down");
        } else {
            // 向上滑动
            mobileTab.classList.remove("down");
        }
    }
});