// 用于锁定滚动条，同时防止页面因为滚动条抖动
const toggleScrollLock = (isLocked) => {
    const htmlTag = document.documentElement; // 获取 html 标签
    if (isLocked) {
        // 伪类 lock-screen 代码写在初始化(initialize)中
        htmlTag.classList.add("lock-screen");
    } else {
        htmlTag.classList.remove("lock-screen");
    }
}