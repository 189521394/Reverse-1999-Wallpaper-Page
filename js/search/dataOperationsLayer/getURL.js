// 定义 R2 域名
const R2_DOMAIN = "https://pub-ebded49967fb4d42b70fd6fa38d875f9.r2.dev";

// 判断当前是否在本地运行 (localhost调试)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

async function loadURL(targetTag) {
    const meta = await fetch("Filter.json");
    const data = await meta.json();
    const isPrecise = document.getElementById("preciseScreening").checked;

    // 决定图片路径
    let urlPrefix = "";
    if (isLocal) {
        urlPrefix = "../"
    } else {
        urlPrefix = (R2_DOMAIN + "/")
    }

    let filteredData;

    // 精确筛选和模糊筛选
    if (isPrecise) {
        filteredData = data.filter(
            item => targetTag.every(tag => item.tag_ZH.includes(tag))
        );
    } else {
        filteredData = data.filter(
            item => targetTag.some(tag => item.tag_ZH.includes(tag))
        );
    }

    // 加上前缀并返回
    return filteredData.map(item => urlPrefix + item.file);
}