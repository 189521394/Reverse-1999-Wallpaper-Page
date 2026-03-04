// 获取当前状态(true就是手机布局)
const mobileQuery = window.matchMedia('(max-width: 768px)');
let isMobileLayout = mobileQuery.matches;

// 切换到主页
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("wallpaper").classList.add("active");
});