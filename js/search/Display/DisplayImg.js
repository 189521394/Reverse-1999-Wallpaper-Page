let allOutSet = [];   // 用来存筛选出来的所有图片链接
let currentLoaded = 0;   // 记录当前已经显示了多少张
const BATCH_SIZE = 48;   // 每次加载多少张 (50 是个比较舒服的数字)

// ================= DisplayImg =================
async function DisplayImg(tags) {
    // 获取所有结果
    allOutSet = await loadURL(tags);

    let box = document.getElementById("select");
    let result = document.getElementById("result");
    let quantity = allOutSet.length;

    // 显示结果数量
    result.textContent = quantity + "个筛选结果";

    // 清空现有内容
    box.replaceChildren();

    // 重置计数器
    currentLoaded = 0;

    // 加载第一批图片
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

    // 计算这一批的结束位置 (要么是加48张，要么是到了最后一张)
    let endLimit = Math.min(currentLoaded + BATCH_SIZE, allOutSet.length);

    // 创建数组用于存储新增的图片
    let imgList = [];

    // 只处理从 currentLoaded 到 endLimit 这一小段
    for (let i = currentLoaded; i < endLimit; i++) {
        let img = document.createElement("img");
        img.className = "imgs";
        img.src = allOutSet[i];

        // 加上懒加载属性，浏览器会自动管理下载
        img.loading = "lazy";
        // 添加跨域身份请求
        img.crossOrigin = "anonymous";

        cache.appendChild(img);
        imgList.push(img);
    }

    // 追加到页面
    box.appendChild(cache);

    // 更新计数器，记录现在加载到哪里了
    currentLoaded = endLimit;

    // 有新图片加入，单独给新图片增加动画
    setAnimation(imgList);
}