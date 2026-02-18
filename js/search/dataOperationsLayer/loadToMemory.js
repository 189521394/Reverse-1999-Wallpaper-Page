// 存储文件
let FilterData = null;
// 存储标签映射表
let fileMap = null;

async function loadToMemory() {
    // 如果已经加载到内存了，直接返回
    if (FilterData) {
        return FilterData;
    }

    // 如果没有，加载到内存
    const response = await fetch("Filter.json");
    FilterData = await response.json();

    // 建立标签加速映射表
    fileMap = new Map();
    FilterData.forEach((item) => {
        fileMap.set(item.file, item);
    });

    return FilterData;
}