// 存储文件
let FilterData = null;
// 存储标签映射表
let fileMap = null;
// 存储加载状态的 Promise (用于防止并发重复请求)
let loadPromise = null;

async function loadToMemory() {
    // 如果已经有正在进行的请求，或者已经加载完毕，直接返回该 Promise
    if (loadPromise) {
        return loadPromise;
    }

    // 封装并缓存这个 Promise
    loadPromise = (async () => {
        try {
            const response = await fetch("Filter.json");
            FilterData = await response.json();

            // 建立标签加速映射表
            fileMap = new Map();
            FilterData.forEach((item) => {
                fileMap.set(item.file, item);
            });

            return FilterData;
        } catch (error) {
            // 如果加载失败，清空 Promise 允许重试
            loadPromise = null;
            console.error("数据加载失败:", error);
            throw error;
        }
    // 后面这个空的小括号是立即执行函数的意思，不可以删除
    })();

    return loadPromise;
}

// 页面加载到这里时，立刻开始加载json文件
loadToMemory();