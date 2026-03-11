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
const wallpaperLockID = "wallpaper_lock_" + (++lockCounter);

function setAnimation(imgList) {
    imgList.forEach(img => {
        img.addEventListener('click', (e) => {
            // 防止冒泡
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

            // 计算图像位置
            calculateAnimation(img);

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
    releaseScrollLock(wallpaperLockID);

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

    // 滚动锁定
    requestScrollLock(wallpaperLockID);

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

    // 显示图片标签
    if (showTags.checked) {
        showTag(imgInfo.src)
    }
}
// 图片最终样式计算
function calculateAnimation(imgInfo) {
    // 获取图片的详细信息
    const rect = imgInfo.getBoundingClientRect();

    // 获取图片中心点坐标
    const imgCenterX = rect.left + rect.width / 2;
    const imgCenterY = rect.top + rect.height / 2;

    // 获取屏幕中心点坐标
    const viewportCenterX = window.innerWidth / 2;
    // 设置高度偏移量(仅pc)，由用户选项决定
    let offsetUp = showTags.checked ? window.innerHeight * 0.03 : 0;
    const viewportCenterY = (window.innerHeight / 2) - offsetUp;

    // 计算需要移动的距离
    const moveX = viewportCenterX - imgCenterX;
    const moveY = viewportCenterY - imgCenterY;

    // 提取图片真实大小，用于移动端图片显示
    // 仅在移动端布局进行计算
    let realImgWidth, realImgHeight;
    if (isMobileLayout) {
        const naturalRatio = imgInfo.naturalWidth / imgInfo.naturalHeight;
        const boxRatio = rect.width / rect.height;
        if (naturalRatio > boxRatio) {
            // 图片比盒子更扁，左右撑满，上下有留白
            realImgWidth = rect.width;
            realImgHeight = rect.width / naturalRatio;
        } else {
            // 图片比盒子更瘦，上下撑满，左右有留白
            realImgWidth = rect.height * naturalRatio;
            realImgHeight = rect.height;
        }
    }

    // 计算缩放比例
    // 第一个参数，0.87，是图片占据屏幕空间的比例，留有一定空白
    const baseRatio = showTags.checked ? 0.87 : 0.90;

    // 第二个参数，0.93，取自img的初始缩放值transform: scale(0.93)
    const baseScale = 0.93;

    // 详见css文件：imgs.css
    // 如果修改缩放值，也要修改这个，不然图片大小会显示异常
    //==================================================================
    // 根据不同选项设置不同大小
    // 关闭标签时显示大一点，不然显得开启标签很挤
    let scaleX;
    let scaleY;
    if (isMobileLayout) {
        // 如果是移动端就根据图片真实大小缩放
        scaleX = (window.innerWidth * baseRatio * baseScale) / realImgHeight;
        scaleY = (window.innerHeight * baseRatio * baseScale) / realImgWidth;
    } else {
        scaleX = (window.innerWidth * baseRatio * baseScale) / rect.width;
        scaleY = (window.innerHeight * baseRatio * baseScale) / rect.height;
    }

    // 保持比例(取最小值)
    const scale = Math.min(scaleX, scaleY);

    // 将计算结果赋值给 CSS 变量
    imgInfo.style.setProperty('--tx', `${moveX}px`);
    imgInfo.style.setProperty('--ty', `${moveY}px`);
    imgInfo.style.setProperty('--scale', scale);
}