// 用于锁定滚动条，同时防止页面因为滚动条抖动

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