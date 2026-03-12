// 回到顶部函数
function toTop(elementId) {
    const element = document.getElementById(elementId);
    element.scrollIntoView({behavior:"smooth"});
    // mobileTab 在其他文件声明，按住ctrl点击访问文件
    // 回到顶部就自动显示tab
    mobileTab.classList.remove("down");
}

// 自动隐藏回到顶部按钮
function hideToTopButton() {
    const toTopBtn = document.getElementById('toTop');

    // 获取视口高度
    const vh = window.innerHeight;
    // 计算 vh 对应的像素值
    // 这里的vh对应着，从控制栏上边距开始算起，向上到顶部的高度值，如果变化需要更新(仅电脑端)
    const threshold = vh * 0.75;

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

// 添加监听和初始化
document.addEventListener('DOMContentLoaded', function() {
    // 页面加载时执行一次
    hideToTopButton();

    // 监听滚动事件/
    window.addEventListener('scroll', hideToTopButton);
});