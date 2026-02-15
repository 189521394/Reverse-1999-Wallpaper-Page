// 回到顶部函数
function toTop(elementId) {
    const element = document.getElementById(elementId);
    element.scrollIntoView({behavior:"smooth"});
}

document.addEventListener('DOMContentLoaded', function() {
    const toTopBtn = document.getElementById('toTop');

    // 核心逻辑函数
    function hideToTopButton() {
        // 获取视口高度
        const vh = window.innerHeight;
        // 计算 62vh 对应的像素值
        const threshold = vh * 0.62;

        // 获取当前垂直滚动距离
        const scrollTop = window.scrollY || document.documentElement.scrollTop;

        // 如果滚动距离 >= 固定值
        if (scrollTop >= threshold) {
            // 显示
            toTopBtn.classList.remove('hide');
        } else {
            // 隐藏
            toTopBtn.classList.add('hide');
        }
    }

    // 页面加载时执行一次
    hideToTopButton();

    // 监听滚动事件
    window.addEventListener('scroll', hideToTopButton);
});