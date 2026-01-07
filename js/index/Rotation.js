// 获取显示图片的容器
const current = document.getElementById("currentIMG");
const next = document.getElementById("nextIMG");

// 图片索引，5张，0---4
let index = 0;

// 每张图片停留时长，默认4000ms
const load = 4000

// 动画时常，默认800ms
const animation = 800

// 动画锁，防止快速切换图片导致的鬼畜
let isAnimating = false;

// 图片集合，存储所有显示的图片
const imgList = [
            "../Reverse-1999-CN-Asset-HD/Home/1_7_at_chudengtaji1.png",
            "../Reverse-1999-CN-Asset-HD/Home/1_9_at_shatangaobie1.png",
            "../Reverse-1999-CN-Asset-HD/Home/2_6_at_hangchuan.png",
            "../Reverse-1999-CN-Asset-HD/Home/2_7_at_yuanlv.png",
            "../Reverse-1999-CN-Asset-HD/Home/2_8_at_yuzhong.png"
        ]

current.style.backgroundImage = `url(${imgList[index]})`;

// 切换图片
function showImage(newIndex, direction = 1) {
    if (isAnimating) {
        return
    } else {
        isAnimating = true;
    }

    // 防止溢出
    if (newIndex < 0) newIndex = imgList.length - 1;
    if (newIndex >= imgList.length) newIndex = 0;

    // 设置下一张图
    next.style.backgroundImage = `url(${imgList[newIndex]})`;

    // 根据方向决定滑动动画
    if (direction === 1) {
        next.style.left = "100%";
        current.style.left = "0";
    } else {
        next.style.left = "-100%";
        current.style.left = "0";
    }

    // 强制重绘
    next.offsetHeight;

    // 执行动画
    next.style.transition = "left " + animation + "ms ease-in-out";
    current.style.transition = "left " + animation + "ms ease-in-out";

    if (direction === 1) {
        next.style.left = "0";
        current.style.left = "-100%";
    } else {
        next.style.left = "0";
        current.style.left = "100%";
    }

    // 动画完成后交换
    setTimeout(() => {
        current.style.transition = "none";
        next.style.transition = "none";
        current.style.backgroundImage = `url(${imgList[newIndex]})`;
        current.style.left = "0";
        next.style.left = "100%";
        index = newIndex;
        isAnimating = false;
    }, animation);
}

// 自动轮播
let timer = setInterval(() => {
    showImage(index + 1, 1);
}, load);

// 清除/重启计时器
function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        showImage(index + 1, 1);
    }, load);
}

// 切换上一张和下一张
function nextImage() {
    showImage(index + 1, 1);
    resetTimer();
}
function prevImage() {
    showImage(index - 1, -1);
    resetTimer();
}