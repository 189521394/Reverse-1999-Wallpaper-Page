let allOutSet = [];   // 用来存筛选出来的所有图片链接
let currentLoaded = 0;   // 记录当前已经显示了多少张
const BATCH_SIZE = 48;   // 每次加载多少张

// 汇总标签（生成 alt 时跳过，无信息量）
const AGGREGATE_TAG_IDS = new Set(['zhu_xian_ju_qing', 'huo_dong_ju_qing', 'yi_shi']);

// 根据纯 ID 标签数组生成 img 的 alt 文本（与 build.py 的 build_alt_text 逻辑保持一致）
function buildAltFromTagIds(tagIds) {
    const chars = [], chapters = [], versions = [];
    for (const t of tagIds) {
        if (AGGREGATE_TAG_IDS.has(t)) continue;
        const entry = I18n.dictionary[t];
        if (!entry) continue;
        const cat = entry.category;
        const name = entry[currentLanguage] || entry.zh || t;
        if (cat === 'character') {
            chars.push(name);
        } else if (cat === 'mainLine' || cat === 'event' || cat === 'anecdote') {
            chapters.push(name);
        } else if (cat === 'versionCode') {
            versions.push(name);
        }
    }
    const parts = [];
    if (chars.length) parts.push(chars.join(', '));
    if (chapters.length) {
        let ch = chapters.join(', ');
        if (versions.length) ch += ` (${versions[0]})`;
        parts.push(ch);
    } else if (versions.length) {
        parts.push(`(${versions[0]})`);
    }
    const middle = parts.join(' - ');
    const suffix = currentLanguage === 'zh' ? '重返未来：1999 官方CG壁纸' : 'Reverse: 1999 Official CG Wallpaper';
    return middle ? `${middle} | ${suffix}` : suffix;
}

// ================= DisplayImg =================
async function DisplayImg(tags) {
    // 获取所有结果
    allOutSet = await loadURL(tags);

    let box = document.getElementById("select");
    let resultCount = document.getElementById("resultCount");
    let quantity = allOutSet.length;

    // 显示结果数量
    resultCount.textContent = quantity;

    // 清空结果之前先停止网络流下载
    const allImg = document.querySelectorAll(".imgs");
    allImg.forEach((img) => {
        // 释放还没销毁的原图 blob，防止筛选提交时泄漏
        if (img.dataset.blobURL) {
            URL.revokeObjectURL(img.dataset.blobURL);
            delete img.dataset.blobURL;
        }
        img.src = "";
        img.removeAttribute('src');
    });
    // 清空现有内容
    box.replaceChildren();

    // 重置计数器
    currentLoaded = 0;

    // 加载一批图片
    loadMoreImages();

    // 结果集就绪后同步浏览器标签页标题（张数 n 以 allOutSet 为准）
    updateDocumentTitle();
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

        // 异步补齐 SEO 友好的 alt 属性（角色/章节/版本名）
        loadTag(originalPath).then(tagData => {
            img.alt = buildAltFromTagIds(tagData.tags);
        }).catch(() => {
            // alt 获取失败保持空，不影响展示
        });

        cache.appendChild(img);
    }

    // 追加到页面
    box.appendChild(cache);

    // 更新计数器，记录现在加载到哪里了
    currentLoaded = endLimit;
}