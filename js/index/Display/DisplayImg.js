let allOutSet = [];   // 用来存筛选出来的所有图片链接
let currentLoaded = 0;   // 记录当前已经显示了多少张
const BATCH_SIZE = 48;   // 每次加载多少张

// ================= DisplayImg =================
async function DisplayImg(tags) {
    // 获取所有结果
    allOutSet = await loadURL(tags);

    let box = document.getElementById("select");
    let result = document.getElementById("result");
    let quantity = allOutSet.length;

    // 显示结果数量
    result.textContent = quantity + "个筛选结果";

    // 清空结果之前先停止网络流下载
    const allImg = document.querySelectorAll(".imgs");
    allImg.forEach((img) => {
        img.src = "";
        img.removeAttribute('src');
    });
    // 清空现有内容
    box.replaceChildren();

    // 重置计数器
    currentLoaded = 0;

    // 加载一批图片
    loadMoreImages();
}

// ================= 加载下一批图片 =================
function loadMoreImages() {
    // 如果已经全部加载完了，就什么都不做
    if (currentLoaded >= allOutSet.length) {
        return;
    }

    let box = document.getElementById("select");
    let cache = document.createDocumentFragment();

    // 计算这一批的结束位置 (要么是加x张，要么是到了最后一张)
    let endLimit = Math.min(currentLoaded + BATCH_SIZE, allOutSet.length);

    // 只处理从 currentLoaded 到 endLimit 这一小段
    for (let i = currentLoaded; i < endLimit; i++) {
        // 无损原图
        let originalPath = allOutSet[i];
        // 缩略图
        let thumbPath = originalPath
            .replace("resource/", "resource/thumbnails/")
            .replace(/\.png$/i, ".webp");

        let img = document.createElement("img");
        img.className = "imgs";

        // 保存原图路径
        img.dataset.original = originalPath;
        // 保存缩略图路径
        img.dataset.thumb = thumbPath;

        // 显示缩略图
        img.src = thumbPath;

        // 加上懒加载属性，浏览器会自动管理下载
        img.loading = "lazy";
        // 添加跨域身份请求
        img.crossOrigin = "anonymous";

        cache.appendChild(img);
    }

    // 追加到页面
    box.appendChild(cache);

    // 更新计数器，记录现在加载到哪里了
    currentLoaded = endLimit;
}