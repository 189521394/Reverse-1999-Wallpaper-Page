// 它的调用在 图片被追加进去之后
// 详见文件：DisplayImg.js
// 因为图片是动态获取的，如果直接调用，会获取不到图片
// 同时，它只接收图片列表，给传进来的图片添加点击预览动画
// 因为如果一张图绑定两个一样的监听器会出bug

// 如果在这里写了checked，每次修改都需要手动提交筛选才生效
const showTags = document.getElementById("showTags");

// 下载按钮
const downloadButton = document.getElementById("download");

// 图片专属的遮罩层
const overlay = document.getElementById('imgOverlay');

// 获取图片容器
const imgContainer = document.getElementById("select");

// 记录当前哪张图被放大了
let activeImg = null;

// 屏幕滚动锁定id
const wallpaperLockID = "wallpaper_lock_" + (++lockCounter);

// ================================== 图片展示核心逻辑 ==================================
imgContainer.addEventListener('click', (e) => {
    // 检查点击的是不是图片
    const img = e.target.closest('.imgs');
    if (!img) return;

    // 如果当前点击的图已经是激活状态，则关闭
    if (img.classList.contains('active')) {
        closeImage();
        return;
    }

    // 防止图片未加载完成时计算出错
    if (img.naturalWidth === 0) return;

    e.stopPropagation();

    // 如果有其他图开着，先关掉
    if (activeImg) {
        activeImg.classList.remove('active');
    }

    // 计算图像位置并打开
    calculateAnimation(img);
    openImage(img);
});

// 点击遮罩关闭
if (overlay) {
    overlay.addEventListener('click', closeImage);
}
// ================================== 获取图片和进度 ==================================
async function fetchImageWithProgress(url, imgElement) {
    // 创建图片专属进度条
    if (!(imgElement.dataset.loadStatus)) {
        // 获取模板
        const template = document.getElementById("progressTemplate");
        // 用于存储私有进度条的父元素
        const barFolder = document.getElementById("progressFolder");

        // 克隆模板
        const selfTrack = template.cloneNode(true);
        const selfBar = selfTrack.querySelector(".progressBar");
        selfTrack.removeAttribute("id");
        // 把进度条存入专属文件夹
        barFolder.appendChild(selfTrack);

        // 把进度条和图片绑定在一起
        imgElement.exclusiveTrack = selfTrack;
        imgElement.exclusiveBar = selfBar;
    }

    if (imgElement.dataset.loadStatus === "finished") {
        return;
    }

    if (imgElement.dataset.loadStatus === "loading") {
        imgElement.exclusiveTrack.classList.remove('hide');
        return;
    }

    // 标记正在加载
    imgElement.dataset.loadStatus = "loading";

    // 显示进度条
    imgElement.exclusiveTrack.classList.remove('hide');

    // 网络请求
    try {
        // 发起请求
        const response = await fetch(url, { mode: 'cors' });

        if (!response.ok) {
            throw new Error(`HTTPS 错误: ${response.status}`);
        }

        // 获取总大小
        const imgLength = response.headers.get('content-length');

        // 10是进制单位，代表十进制
        const total = parseInt(imgLength, 10);
        let loaded = 0;

        // 记录上一次打印的整数百分比
        let lastLoggedPercent = -1;

        // 下载进度监控
        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            chunks.push(value);
            loaded += value.length;

            if (total) {
                // 计算当前的整数百分比
                const currentPercent = Math.floor((loaded / total) * 100);

                // 只有当整数百分比发生变化时，才更新
                if (currentPercent > lastLoggedPercent) {
                    lastLoggedPercent = currentPercent; // 更新记录

                    // 更新进度条
                    imgElement.exclusiveBar.style.transform = `translateX(${-(100 - currentPercent)}vw)`;
                }
            } else {
                // 防雷：如果没拿到 Content-Length，就按接收次数限流打印
                if (chunks.length % 10 === 0) {
                    console.log(`⏳ 已下载: ${(loaded / 1024 / 1024).toFixed(2)} MB`);
                }
            }
        }

        // 把数据拼接为图像
        const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'image/webp' });

        // 生成本地虚拟链接
        const objectURL = URL.createObjectURL(blob);

        // 显示出图像
        imgElement.src = objectURL;

        // blob存起来
        imgElement.dataset.blobURL = objectURL;

        // 标记已经加载
        imgElement.dataset.loadStatus = "finished";

        // 隐藏进度条
        imgElement.exclusiveTrack.classList.add('hide');

        // 隐藏后销毁进度条
        setTimeout(() => {
            imgElement.exclusiveTrack.remove();
            delete imgElement.exclusiveTrack;
            delete imgElement.exclusiveBar;
        }, 110);
    } catch (error) {
        console.error('获取对象失败：', error);
        showDialog("获取对象失败，回退至普通下载，进度条可能无法显示。", true);
        imgElement.src = url;
    }
}
// ================================== 关闭图像 ==================================
function closeImage() {
    // 隐藏全部进度条
    document.getElementById("progressFolder").querySelectorAll(".downloadTrack").forEach((e) => {e.classList.add('hide');});

    // 清理内存
    if (activeImg.dataset.blobURL) {
        URL.revokeObjectURL(activeImg.dataset.blobURL);
        delete activeImg.dataset.blobURL;
    }

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

    // 更新回到顶部按钮状态
    updateToTopBtnVisibility();

    // 隐藏图片标签
    if (showTags.checked) {
        hideTag();
    }
}
// ================================== 开启图像 ==================================
function openImage(imgInfo) {
    // 取出原图
    let rawPath = imgInfo.dataset.original;

    // 开启图像
    imgInfo.classList.add('active');

    // 加载原图
    fetchImageWithProgress(rawPath, imgInfo);

    // 记录显示图像
    activeImg = imgInfo;

    // 滚动锁定
    requestScrollLock(wallpaperLockID);

    // 打开遮罩
    overlay.classList.add('show');

    // 显示下载按钮
    downloadButton.classList.remove("hide");

    // 更新回到顶部按钮状态
    updateToTopBtnVisibility();

    // 显示图片标签
    if (showTags.checked) {
        showTag(imgInfo.src)
    }
}
// ================================== 图片动画计算 ==================================
function calculateAnimation(imgInfo) {
    // 防止在图片未加载完成时点击导致除以 0 (Infinity) 崩溃
    if (imgInfo.naturalWidth === 0) {
        // 拒绝放大未加载好的图片
        return;
    }

    // 获取图片的详细信息
    const rect = imgInfo.getBoundingClientRect();

    // 获取图片中心点坐标
    const imgCenterX = rect.left + rect.width / 2;
    const imgCenterY = rect.top + rect.height / 2;

    // 获取屏幕中心点坐标
    // 设置高度偏移量，由用户选项决定
    let offsetUp = showTags.checked ? window.innerHeight * 0.03 : 0;
    const viewportCenterX = window.innerWidth / 2;
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
        // pc端
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