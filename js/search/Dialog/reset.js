async function reset() {
    const result = await showDialog("将会重置所有设置项且刷新页面，是否确认？", false);

    if (result) {
        // 清空且刷新
        localStorage.clear();
        location.reload();
    } else {
        // 点取消之后重新锁定一下，因为对话框会取消锁定
        toggleScrollLock(true);
    }
}