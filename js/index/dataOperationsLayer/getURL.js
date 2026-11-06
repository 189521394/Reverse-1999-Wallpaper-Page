// 定义 R2 域名
const R2_DOMAIN = "https://img.r9wallpaper.org";

async function loadURL(targetTagDisplayWords) {
    const isPrecise = document.getElementById("preciseScreening").checked;

    // 调用引擎，把用户输入的文本解析成纯 ID 数组
    const targetTagIds = targetTagDisplayWords.map(word => I18n.parse(word));

    // 本地模式使用绝对路径：SPA 回退后页面可能处于 /c/vertin/ 等子路径，
    // 相对路径 ../ 会按子路径层级解析导致 404；runServer.py 是根路径服务器，/resource/ 映射始终有效
    let urlPrefix = isLocal ? "/" : (R2_DOMAIN + "/");
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

    // 背景图像开关过滤
    const showBg = document.getElementById("showBackgrounds");
    if (showBg && !showBg.checked) {
        filteredData = filteredData.filter(item => !(item.tags && item.tags.includes("background")));
    }

    // 加上前缀并返回
    return filteredData.map(item => urlPrefix + item.file);
}