// 它的调用在 图片被追加进去之后
// 详见文件：DisplayImg.js
// 因为图片是动态获取的，如果直接调用，会获取不到图片
function setAnimation() {
    const imgs = document.querySelectorAll('.imgs');
    const overlay = document.getElementById('overlay');
    // 记录当前哪张图被放大了
    let activeImg = null;

    imgs.forEach(img => {
        img.addEventListener('click', () => {
            // 如果当前点击的图已经是激活状态，则关闭
            if (img.classList.contains('active')) {
                closeImage();
                return;
            }

            // 如果有其他图开着，先关掉
            if (activeImg) {
                activeImg.classList.remove('active');
            }

            // 获取图片的详细信息
            const rect = img.getBoundingClientRect();

            // 获取图片中心点坐标
            const imgCenterX = rect.left + rect.width / 2;
            const imgCenterY = rect.top + rect.height / 2;

            // 获取屏幕中心点坐标
            const viewportCenterX = window.innerWidth / 2;
            // 设置高度偏移量
            const offsetUp = window.innerHeight * 0.03;
            const viewportCenterY = (window.innerHeight / 2) - offsetUp;

            // 计算需要移动的距离
            const moveX = viewportCenterX - imgCenterX;
            const moveY = viewportCenterY - imgCenterY;

            // 计算缩放比例
            // 第一个参数，0.9，是让图片占屏幕的80%，留有一定空白
            // 第二个参数，0.93，取自img的初始缩放值transform: scale(0.93)
            // 详见css文件：imgs.css
            // 如果修改缩放值，也要修改这个，不然图片大小会显示异常
            const scaleX = (window.innerWidth * 0.87 * 0.93) / rect.width;
            const scaleY = (window.innerHeight * 0.87 * 0.93) / rect.height;
            // 保持比例，取最小值
            const scale = Math.min(scaleX, scaleY);

            // 将计算结果赋值给 CSS 变量
            img.style.setProperty('--tx', `${moveX}px`);
            img.style.setProperty('--ty', `${moveY}px`);
            img.style.setProperty('--scale', scale);

            // 添加激活类和遮罩
            document.body.style.overflow = "hidden";
            overlay.classList.add('show');
            img.classList.add('active');
            activeImg = img;

            // 显示图片标签
            showTag(img.src)
        });
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', closeImage);

    // 关闭函数
    function closeImage() {
        if (activeImg) {
            activeImg.classList.remove('active');
            activeImg = null;
        }
        document.body.style.overflow = "";
        overlay.classList.remove('show');
        hideTag();
    }
}