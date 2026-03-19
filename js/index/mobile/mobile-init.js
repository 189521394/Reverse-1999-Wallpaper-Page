// 获取当前状态(true就是手机布局)
const mobileQuery = window.matchMedia('(max-width: 768px)');
let isMobileLayout = mobileQuery.matches;

// 切换到主页
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("wallpaper").classList.add("active");
});

// 如果切换了布局，自动刷新页面
mobileQuery.addEventListener('change', (e) => {
    // 检查新的状态是否和之前的状态不同
    if (e.matches !== isMobileLayout) {
        // 更新状态并直接刷新页面
        isMobileLayout = e.matches;
        window.location.reload();
    }
});

// 一个唯一计数器
// 这个计数器非常重要，但是写在这个文件中了，因为我不想重新开一个文件
let lockCounter = 0;