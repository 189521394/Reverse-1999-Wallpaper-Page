document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('DIY-cursor');
    // 如果页面上不存在这个元素，直接退出，防止报错
    if (!cursor) return;

    const imgContainer = document.getElementById("select"); // 💡 假设你的瀑布流图片都在这个大容器里
    if (!imgContainer) return;

    // 1. 【核心：跟随鼠标】监听整个图片容器的鼠标移动事件
    // （如果要在整个网页都显示反色鼠标，就监听 document）
    imgContainer.addEventListener('mousemove', (e) => {
        // e.clientX 和 clientY 是鼠标相对于浏览器视口（Viewport）的坐标
        // 我们不需要自己算偏移量了，因为 CSS 里的 transform: translate(-50%, -50%) 已经把圆心对准坐标点了。
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });

    // 2. 【核心：显示与隐藏】利用“事件委托”监听整个容器，效率最高
    imgContainer.addEventListener('mouseover', (e) => {
        // 只有当鼠标“第一次划入”类名为 .imgs 的元素（或者其子元素）时
        if (e.target.closest('.imgs')) {
            cursor.classList.add('visible');
        }
    });

    imgContainer.addEventListener('mouseout', (e) => {
        // 当鼠标“彻底离开”类名为 .imgs 的元素区域时
        if (e.target.closest('.imgs')) {
            cursor.classList.remove('visible');
        }
    });
});