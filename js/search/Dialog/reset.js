async function reset() {
    const result = await showDialog("将会重置所有设置项且刷新页面，是否确认？", false);

    if (result) {
        // 清空且刷新
        localStorage.clear();
        location.reload();
    }
    // 没有else分支，为false就什么都不做
}