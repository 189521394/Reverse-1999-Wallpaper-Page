// ================= 自动加载更多 =================
window.addEventListener('scroll', () => {
    if (alreadySubmit) {
        // 文档总高度
        const docHeight = document.documentElement.scrollHeight;
        // 当前滚动条滚下来的距离
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        // 屏幕窗口的高度
        const winHeight = window.innerHeight;

        // 如果 (滚下来的距离 + 屏幕高度) 接近 (总高度)，说明快到底了
        // 这里预留 200 像素的余量，让用户感觉是无缝连接
        if (scrollTop + winHeight >= docHeight - 200) {
            loadMoreImages();
        }
    }
});