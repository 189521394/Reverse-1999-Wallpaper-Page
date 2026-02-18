async function loadTag(targetURL) {
    const data = await loadToMemory();

    // 解码，防止中文乱码
    const cleanURL = decodeURIComponent(targetURL);

    // 查找
    const result = data.find(item => cleanURL.endsWith(item.file));

    if (result) {
        return result.tag_ZH;
    } else {
        return null;
    }
}