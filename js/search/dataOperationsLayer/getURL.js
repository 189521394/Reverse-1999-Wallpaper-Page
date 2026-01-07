async function loadURL(targetTag) {
    const meta = await fetch("Filter.json");
    const data = await meta.json();
    const isPrecise = document.getElementById("preciseScreening").checked;

    // 精确筛选和模糊筛选
    if (isPrecise) {
        return data.filter(
            item => targetTag.every(tag => item.tag_ZH.includes(tag))
        ).map(item => "../" + item.file);
    } else {
        return data.filter(
            item => targetTag.some(tag => item.tag_ZH.includes(tag))
        ).map(item => "../" + item.file);
    }
}