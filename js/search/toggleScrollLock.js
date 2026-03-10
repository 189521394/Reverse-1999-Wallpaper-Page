// 用于锁定滚动条，同时防止页面因为滚动条抖动
// 废弃
const toggleScrollLock = (isLocked) => {
    const htmlTag = document.documentElement; // 获取 html 标签
    if (isLocked) {
        // 伪类 lock-screen 代码写在初始化(initialize)中
        htmlTag.classList.add("lock-screen");
    } else {
        htmlTag.classList.remove("lock-screen");
    }
}



// 小本本记住锁定逻辑
const scrollLockRegistry = new Set();

function requestScrollLock(lockerID) {
    scrollLockRegistry.add(lockerID);
    if (scrollLockRegistry.size > 0) {
        document.documentElement.classList.add("lock-screen");
    }
}

function releaseScrollLock(lockerID) {
    scrollLockRegistry.delete(lockerID);
    if (scrollLockRegistry.size === 0) {
        document.documentElement.classList.remove("lock-screen");
    }
}

// 查询锁定状态
const isScrollLocked = () => {
    return scrollLockRegistry.size > 0;
}