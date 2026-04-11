document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('custom-cursor');

    // 获取存储图片的父容器
    const imgContainer = document.getElementById("select");

    // 定义全局状态变量
    let lastX = 0;
    let lastY = 0;
    let isMouseDown = false;
    // 记录交互方式（鼠标触屏切换）
    let lastInputType = 'mouse';

    // 更新用户的操作样式
    const updateCursorState = () => {
        // 如果当前是触摸操作，强行隐藏鼠标跟随样式
        if (lastInputType !== 'mouse') {
            cursor.classList.remove('visible', 'active');
            return;
        }

        // 如果还没拿到坐标，先别乱动
        if (lastX === 0 && lastY === 0) return;

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
            cursor.classList.remove('visible', 'active');
        }
    };

    // 事件监听器
    // =========================鼠标操作汇报=========================
    // 鼠标移动汇报
    window.addEventListener('pointermove', (e) => {
        // 动态更新当前输入类型 ('mouse', 'touch', 'pen')
        lastInputType = e.pointerType;

        if (lastInputType === 'mouse') {
            lastX = e.clientX;
            lastY = e.clientY;
            updateCursorState();
        }
    });
    // 鼠标按下汇报
    window.addEventListener('pointerdown', (e) => {
        lastInputType = e.pointerType;
        if (lastInputType === 'mouse' && e.button === 0) {
            isMouseDown = true;
            updateCursorState();
        }
    });
    // 鼠标松开汇报 (放在 window 上防止在外面松手监听不到)
    window.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse') {
            isMouseDown = false;
            updateCursorState();
        }
    });

    // =========================拖拽汇报=========================
    // Drag 事件没有 pointerType，所以依靠上一次记录的 lastInputType
    window.addEventListener('drag', (e) => {
        if (lastInputType === 'mouse' && (e.clientX !== 0 || e.clientY !== 0)) {
            lastX = e.clientX;
            lastY = e.clientY;
            updateCursorState();
        }
    });
    // 拖拽结束汇报
    // 浏览器原生拖拽会吞掉 mouseup，但会触发 dragend
    window.addEventListener('dragend', () => {
        if (lastInputType === 'mouse') {
            isMouseDown = false;
            updateCursorState();
        }
    });

    // =========================鼠标和窗口交互汇报=========================
    // 鼠标离开浏览器窗口汇报
    document.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') {
            cursor.classList.remove('visible', 'active');
            isMouseDown = false;
        }
    });
    // 鼠标重新进入浏览器窗口汇报
    document.addEventListener('pointerenter', (e) => {
        lastInputType = e.pointerType;
        if (lastInputType === 'mouse') {
            lastX = e.clientX;
            lastY = e.clientY;
            if (e.buttons === 1) isMouseDown = true;
            updateCursorState();
        }
    });

    // =========================滚动汇报=========================
    // 滚动事件处理
    const handleScroll = () => {
        if (lastInputType === 'mouse') {
            updateCursorState();
        }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    imgContainer.addEventListener('scroll', handleScroll, { passive: true });

    // =========================单点触摸汇报=========================
    imgContainer.addEventListener('pointerdown', (e) => {
        // 如果是鼠标，让上面的鼠标逻辑去管
        if (e.pointerType === 'mouse') return;

        // 只有点击图片时才触发
        if (e.target.closest('.imgs')) {
            // pointer API 的好处是直接用 e.clientX，不需要去解析 e.touches[0]
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;

            cursor.classList.add('visible');

            // 参考transition时间 + 10ms
            setTimeout(() => {
                cursor.classList.remove('visible');
            }, 260);
        }
    }, { passive: true });
});