document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');

    // 获取存储图片的父容器
    const imgContainer = document.getElementById("select");

    if (!isMobileLayout) {
        // 定义全局状态变量
        let lastX = 0;
        let lastY = 0;
        let isMouseDown = false; // 记录物理鼠标是否按着

        // 更新鼠标状态
        const updateCursorState = () => {
            // 如果还没拿到坐标，先别乱动
            if (lastX === 0 && lastY === 0) return;

            // 物理位置跟随
            cursor.style.left = `${lastX}px`;
            cursor.style.top = `${lastY}px`;

            // 看看现在坐标底下是什么元素
            const elementUnderCursor = document.elementFromPoint(lastX, lastY);

            // 判断底下是不是图片
            if (elementUnderCursor && elementUnderCursor.closest('.imgs')) {
                cursor.classList.add('visible');

                // 只有底下是图片，且鼠标处于按下状态，才激活 active
                if (isMouseDown) {
                    cursor.classList.add('active');
                } else {
                    cursor.classList.remove('active');
                }
            } else {
                // 如果底下不是图片，扒掉所有样式
                cursor.classList.remove('visible');
                cursor.classList.remove('active');
            }
        };

        // 事件监听器
        // 鼠标移动汇报
        window.addEventListener('mousemove', (e) => {
            lastX = e.clientX;
            lastY = e.clientY;
            updateCursorState();
        });
        // 鼠标按下汇报
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 只认左键
                isMouseDown = true;
                updateCursorState();
            }
        });
        // 鼠标松开汇报 (放在 window 上防止在外面松手监听不到)
        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            updateCursorState();
        });
        // 拖拽结束汇报
        // 浏览器原生拖拽会吞掉 mouseup，但会触发 dragend
        window.addEventListener('dragend', () => {
            isMouseDown = false; // 强行解除按下状态
            updateCursorState();
        });
        // 滚动汇报
        // 被动监听，提升滚动性能
        window.addEventListener('scroll', updateCursorState, { passive: true });
        imgContainer.addEventListener('scroll', updateCursorState, { passive: true });
    } else {
        imgContainer.addEventListener('touchstart', (e) => {
            // 只有点击图片时才触发
            if (e.target.closest('.imgs')) {
                const touch = e.touches[0];

                cursor.style.left = `${touch.clientX}px`;
                cursor.style.top = `${touch.clientY}px`;

                cursor.classList.add('visible');

                // 参考transition时间 + 10ms
                setTimeout(() => {
                    cursor.classList.remove('visible');
                }, 260);
            }
        }, { passive: true });
    }
});