// 回到顶部函数
function toTop(elementId) {
    const element = document.getElementById(elementId);
    element.scrollIntoView({
        behavior:"smooth"
    });
}

let toTopBtn = null;

// 更新按钮状态
function updateToTopBtnVisibility() {
    if (!toTopBtn) {
        toTopBtn = document.getElementById('toTop');
        if (!toTopBtn) return;
    }

    // 是否在浏览页
    const isWallpaperPage = document.body.classList.contains('tab-wallpaper');

    // 有没有图片在预览状态
    const overlay = document.getElementById("imgOverlay");
    const isImgPreviewing = overlay && overlay.classList.contains('show');

    // 滚动距离够不够
    const vh = window.innerHeight;
    const threshold = vh * 0.75;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const isScrolledEnough = scrollTop >= threshold;

    // 在浏览器且，没有在预览状态且，滚动距离足够，才显示
    if (isWallpaperPage && !isImgPreviewing && isScrolledEnough) {
        toTopBtn.classList.remove('hide');
    } else {
        toTopBtn.classList.add('hide');
    }
}

// 绑定滚轮事件和初始化
document.addEventListener('DOMContentLoaded', function() {
    toTopBtn = document.getElementById('toTop');
    updateToTopBtnVisibility();
    window.addEventListener('scroll', updateToTopBtnVisibility);
});