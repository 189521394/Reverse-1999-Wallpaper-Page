// ================= 获取单张图片的标签 =================
async function loadTag(targetURL) {
    const cleanURL = decodeURIComponent(targetURL);

    // 直接查内存
    const result = runtimeDatabase.find(item => cleanURL.endsWith(item.file));

    if (result) {
        // 直接返回底层的 tags (纯 ID 数组)
        return {
            tags: result.tags || [],
            tone: result.tone || []
        };
    } else {
        return { tags: [], tone: [] };
    }
}