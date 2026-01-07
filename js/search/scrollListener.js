// 获取标签容器
const scrollContainer = document.getElementById("returnTag");

// 添加滚轮事件监听 (Wheel Event)
scrollContainer.addEventListener("wheel", (evt) => {
    // 只有当容器内容溢出（确实需要滚动）时才拦截
    // scrollWidth > clientWidth 说明内容比容器宽
    if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {

        // 1. 阻止默认的垂直滚动行为（防止页面跟着动）
        evt.preventDefault();

        // 2. 将垂直滚动的距离 (deltaY) 映射给水平滚动 (scrollLeft)
        // += evt.deltaY : 向下滚 -> 向右动
        // -= evt.deltaY : 向下滚 -> 向左动 (如果你觉得方向反了，改这个符号)
        scrollContainer.scrollLeft += evt.deltaY;
    }
}, { passive: false }); // 注意：passive: false 是必须的，否则无法 preventDefault