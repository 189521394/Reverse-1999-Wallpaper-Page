// ================= 获取单张图片的标签 =================

// 开发调试，即时刷新
const fastUpdate = document.getElementById("fastUpdate");

async function loadTag(targetURL) {
    const cleanURL = decodeURIComponent(targetURL);

    // 本地调试模式：即时刷新，重新拉取 Filter.json 拿到最新标签
    if (isLocal && fastUpdate.checked) {
        try {
            const response = await fetch("/Filter.json");
            const rawData = await response.json();
            const freshDB = rawData.map(item => ({
                ...item,
                tags: item.tags.map(zh => I18n.convert(zh)),
                tone: (item.tone || []).map(zh => I18n.convert(zh))
            }));
            // 同步更新全局数据库，使筛选结果也能即时反映 Filter.json 的变动
            runtimeDatabase = freshDB;
            const result = freshDB.find(item => cleanURL.endsWith(item.file));
            if (result) {
                return { tags: result.tags || [], tone: result.tone || [] };
            }
            return { tags: [], tone: [] };
        } catch (e) {
            console.error("即时刷新失败，回退内存数据:", e);
        }
    }

    // 线上模式 / 刷新失败：查内存 runtimeDatabase
    const result = runtimeDatabase.find(item => cleanURL.endsWith(item.file));

    if (result) {
        return {
            tags: result.tags || [],
            tone: result.tone || []
        };
    } else {
        return { tags: [], tone: [] };
    }
}