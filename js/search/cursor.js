document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');

    // 获取存储图片的父容器
    const imgContainer = document.getElementById("select");

    // 基础样式
    imgContainer.addEventListener('mousemove', (e) => {
        // CSS transform: translate(-50%, -50%)对齐圆心
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });

    // 鼠标浮上
    imgContainer.addEventListener('mouseover', (e) => {
        if (e.target.closest('.imgs')) {
            cursor.classList.add('visible');
        }
    });

    // 鼠标离开
    imgContainer.addEventListener('mouseout', (e) => {
        if (e.target.closest('.imgs')) {
            cursor.classList.remove('visible');
        }
    });

    // 鼠标按下
    imgContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.imgs')) {
            cursor.classList.add('active');
        }
    });

    // 鼠标松开
    imgContainer.addEventListener('mouseup', (e) => {
        if (e.target.closest('.imgs')) {
            cursor.classList.remove('active');
        }
    })
});