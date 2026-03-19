async function loadTag(targetURL) {
    // 开发调试，即时刷新
    let data;
    if (fastUpdate.checked) {
        const meta = await fetch("Filter.json");
        data = await meta.json();
    } else {
        data = await loadToMemory();
    }

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