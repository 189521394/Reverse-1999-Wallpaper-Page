// ================= 自动加载更多 =================
// 加载锁定
let loadLock = false;
window.addEventListener('scroll', () => {
    if (alreadySubmit) {
        if (loadLock) return;

        // 文档总高度
        const docHeight = document.documentElement.scrollHeight;
        // 当前滚动条滚下来的距离
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        // 屏幕窗口的高度
        const winHeight = window.innerHeight;

        // 如果 (滚下来的距离 + 屏幕高度) 接近 (总高度)，说明快到底了
        // 这里预留 200 像素的余量，让用户感觉是无缝连接
        if (scrollTop + winHeight >= docHeight - 200) {
            loadLock = true;
            loadMoreImages();
            // 设置加载延迟，防止直接拉到底部
            setTimeout(() => {
                loadLock = false;
            }, 3000);
        }
    }
});