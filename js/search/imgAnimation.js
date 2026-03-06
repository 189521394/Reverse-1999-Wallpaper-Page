// 它的调用在 图片被追加进去之后
// 详见文件：DisplayImg.js
// 因为图片是动态获取的，如果直接调用，会获取不到图片
// 同时，它只接收图片列表，给传进来的图片添加点击预览动画
// 因为如果一张图绑定两个一样的监听器会出bug

// 如果在这里写了checked，每次修改都需要手动提交筛选才生效
const showTags = document.getElementById("showTags");

const downloadButton = document.getElementById("download");

// 由于一些浏览器本身的bug，个性化鼠标会和toTop的模糊冲突，所以打开图片要关闭回到顶部按钮
const toTopBtn = document.getElementById("toTop");

// 图片专属的遮罩层
const overlay = document.getElementById('imgOverlay');

// 记录当前哪张图被放大了
let activeImg = null;
// 记录回到顶部按钮状态
let topExist = false;

function setAnimation(imgList) {
    imgList.forEach(img => {
        img.addEventListener('click', (e) => {
            // 加上e防止冒泡
            e.stopPropagation();

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
            // 设置高度偏移量，由用户选项决定
            let offsetUp = 0;
            if (showTags.checked) {
                offsetUp = window.innerHeight * 0.03;
            } else {
                offsetUp = 0;
            }
            const viewportCenterY = (window.innerHeight / 2) - offsetUp;

            // 计算需要移动的距离
            const moveX = viewportCenterX - imgCenterX;
            const moveY = viewportCenterY - imgCenterY;

            // 计算缩放比例
            // 第一个参数，0.87，是图片占据屏幕空间的比例，留有一定空白
            // 第二个参数，0.93，取自img的初始缩放值transform: scale(0.93)
            // 详见css文件：imgs.css
            // 如果修改缩放值，也要修改这个，不然图片大小会显示异常
            //==================================================================
            // 根据不同选项设置不同大小
            // 关闭标签时显示大一点，不然显得开启标签很挤
            let scaleX = 0;
            let scaleY = 0;
            if (showTags.checked) {
                scaleX = (window.innerWidth * 0.87 * 0.93) / rect.width;
                scaleY = (window.innerHeight * 0.87 * 0.93) / rect.height;
            } else {
                scaleX = (window.innerWidth * 0.9 * 0.93) / rect.width;
                scaleY = (window.innerHeight * 0.9 * 0.93) / rect.height;
            }

            // 保持比例，取最小值
            const scale = Math.min(scaleX, scaleY);

            // 将计算结果赋值给 CSS 变量
            img.style.setProperty('--tx', `${moveX}px`);
            img.style.setProperty('--ty', `${moveY}px`);
            img.style.setProperty('--scale', scale);

            // 打开图像
            openImage(img);
        });
    });

    // 点击遮罩层关闭
    if (!overlay.hasAttribute('listener-already-exists')) {
        overlay.addEventListener('click', closeImage);
        overlay.setAttribute('listener-already-exists', 'true');
    }
}

// 关闭图像
function closeImage() {
    // 清空记录的图像
    if (activeImg) {
        activeImg.classList.remove('active');
        activeImg = null;
    }

    // 取消滚动锁定
    toggleScrollLock(false);

    // 关闭遮罩
    overlay.classList.remove('show');

    // 隐藏下载按钮
    downloadButton.classList.add("hide");

    // 恢复回到顶部按钮状态
    if (topExist) {
        toTopBtn.classList.remove('hide');
    }

    // 隐藏图片标签
    if (showTags.checked) {
        hideTag();
    }
}
// 开启图像
function openImage(imgInfo) {
    // 开启图像
    imgInfo.classList.add('active');

    // 记录显示图像
    activeImg = imgInfo;

    // 显示图片标签
    if (showTags.checked) {
        showTag(imgInfo.src)
    }

    // 滚动锁定
    toggleScrollLock(true);

    // 打开遮罩
    overlay.classList.add('show');

    // 显示下载按钮
    downloadButton.classList.remove("hide");

    // 如果回到顶部按钮没被隐藏(显示了)
    if (!toTopBtn.classList.contains('hide')) {
        // 隐藏按钮，标记按钮状态
        topExist = true;
        toTopBtn.classList.add('hide');
    } else {
        topExist = false;
    }
}