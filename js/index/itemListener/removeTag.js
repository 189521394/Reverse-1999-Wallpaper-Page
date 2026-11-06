let remove = document.getElementById("submitPool");

remove.addEventListener("click",function (e) {
    let tag = e.target.closest(".waiting");

    // 防止点击空白处报错
    if (!tag) return;

    tag.remove();

    // 移除后同步路由：池子里还有标签且开启自动提交 → 重新筛选；
    // 池子清空 → 地址栏退回根路径
    const pool = document.getElementById("submitPool");
    if (pool.children.length > 0 && autoSubmit.checked) {
        submit();
    } else if (pool.children.length === 0) {
        syncUrlWithState();
    }
});