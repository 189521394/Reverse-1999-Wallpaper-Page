async function loadTag(targetURL) {
    const meta = await fetch("Filter.json");
    const data = await meta.json();

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