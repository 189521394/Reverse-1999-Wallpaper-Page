// 定义 R2 域名
const R2_DOMAIN = "https://img.r9wallpaper.org";

// 开发调试，即时刷新
const fastUpdate = document.getElementById("fastUpdate");

async function loadURL(targetTagDisplayWords) {
    const isPrecise = document.getElementById("preciseScreening").checked;

    // 调用引擎，把用户输入的文本解析成纯 ID 数组
    const targetTagIds = targetTagDisplayWords.map(word => I18n.parse(word));

    let urlPrefix = isLocal ? "../" : (R2_DOMAIN + "/");
    let filteredData;

    // 精确筛选和模糊筛选
    if (isPrecise) {
        filteredData = runtimeDatabase.filter(
            item => targetTagIds.every(id =>
                (item.tags && item.tags.includes(id)) ||
                (item.tone && item.tone.includes(id))
            )
        );
    } else {
        filteredData = runtimeDatabase.filter(
            item => targetTagIds.some(id =>
                (item.tags && item.tags.includes(id)) ||
                (item.tone && item.tone.includes(id))
            )
        );
    }

    // 加上前缀并返回
    return filteredData.map(item => urlPrefix + item.file);
}