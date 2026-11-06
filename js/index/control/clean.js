function clean() {
    // 清空筛选标签
    const target = document.getElementById("submitPool");
    target.replaceChildren();
    // 地址栏退回根路径
    syncUrlWithState();
}