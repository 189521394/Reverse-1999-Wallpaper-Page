// 当前语言包
let currentLangPack = {};

// 全局变量，查询当前语言
let currentLanguage = localStorage.getItem("preferredLanguage") || "zh";

// 核心运行期数据库，纯 ID 化，常驻内存
let runtimeDatabase = [];

// 判断当前是否在本地运行 (localhost/局域网调试)
const hostname = window.location.hostname;
const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.startsWith('192.168.');

// ===========================================标签翻译===========================================
const I18n = {
    dictionary: {},
    zhToIdMap: {},
    categoryMap: {},   // 自动从 JSON 构建的分类表：{ "mainLine": ["id1", "id2"], ... }
    allTagsPool: [],   // 系统所有纯 ID 集合，给输入提示用

    // 初始化引擎
    async init() {
        try {
            const response = await fetch("lang/tagData.json");
            this.dictionary = await response.json();

            // 遍历字典，一次性构建所有索引
            for (const [id, item] of Object.entries(this.dictionary)) {
                // 构建中文反查表
                this.zhToIdMap[item.zh] = id;

                // 自动收集分类数据，代替原来写死在代码里的 mainLinePool 等
                if (item.category) {
                    if (!this.categoryMap[item.category]) {
                        this.categoryMap[item.category] = [];
                    }
                    this.categoryMap[item.category].push(id);
                }

                // 加入全局 ID 池
                this.allTagsPool.push(id);
            }
        } catch (error) {
            console.error("字典加载失败:", error);
        }
    },

    // 翻译显示词
    Translate(id) {
        if (this.dictionary[id] && this.dictionary[id][currentLanguage]) {
            return this.dictionary[id][currentLanguage];
        }
        // 没查到原样返回
        return id;
    },

    // 查询显示词条的id
    parse(displayWord) {
        const query = displayWord.trim().toLowerCase();
        for (const [id, langs] of Object.entries(this.dictionary)) {
            if (langs.zh.toLowerCase() === query || langs.en.toLowerCase() === query) {
                return id;
            }
        }
        return displayWord;
    },

    // 数据清洗转换: convert(zhString) 代替 washZHtoID
    convert(zhString) {
        return this.zhToIdMap[zhString] || zhString;
    }
};
// ================= 数据装载引擎 =================
// 将加载字典和清洗数据的动作打包
async function initData() {
    // 先启动多语言引擎
    await I18n.init();

    // 拉取工作区数据
    const response = await fetch("Filter.json");
    const rawData = await response.json();

    // 核心分流：本地运行时清洗，线上直接读取
    if (isLocal) {
        runtimeDatabase = rawData.map(item => ({
            ...item,
            // 将 tags 数组映射为纯 ID 的 tags 数组
            tags: item.tags.map(zh => I18n.convert(zh)),
            tone: (item.tone || []).map(zh => I18n.convert(zh))
        }));
    } else {
        // 这里假设 Python 脚本打包时已经把纯 ID 生成到了 tags 字段
        runtimeDatabase = rawData;
    }

    // 系统准备完毕，触发默认主线章节筛选
    const mainLineBtn = document.getElementById("mainLine");
    if (mainLineBtn) mainLineBtn.click();
}

// 启动系统
initData();
// ===========================================显示文本翻译===========================================
// 拉取 JSON 语言包
async function loadLanguagePack(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        if (!response.ok) {
            console.log("多语言文件加载失败：", response.status);
        }

        currentLangPack = await response.json();
        return currentLangPack;
    } catch (error) {
        console.error("多语言文件加载失败：", error);
        return null;
    }
}

// 解析嵌套的 JSON 键值
// 将 "guide.title" 转换为 obj["guide"]["title"]
function getTranslation(key, data) {
    // 使用 reduce 沿着键名路径一层层剥开对象
    return key
        .split('.')
        .reduce(
            (obj, i) => (obj ? obj[i] : null), data
        );
}

// 遍历DOM进行替换
function applyLanguage(translations) {
    if (!translations) return;

    // ==================替换标准文本==================
    // 选中所有带有 data-i18n 属性的元素
    const textElements = document.querySelectorAll('[data-i18n]');
    textElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = getTranslation(key, translations);
        if (text !== null) {
            el.textContent = text;
        }
    });

    // ==================替换伪元素文本==================
    // 选中所有带有 data-i18n-before 属性的元素
    const beforeElements = document.querySelectorAll('[data-i18n-before]');
    beforeElements.forEach(el => {
        // 拿到key，把key翻译为文本
        const key = el.getAttribute('data-i18n-before');
        const text = getTranslation(key, translations);

        // 把翻译的文本写入到显示文本中
        // css负责显示
        if (text !== null) {
            // 将读取到的文本写入 data-before-text 属性
            el.setAttribute('data-before-text', text);
        }
    });

    // ==================替换移动端短文本 (data-short)==================
    // 短文本必须写data-short然后用css attr 伪元素替换
    // data-short是专供移动端的短文本，因为空间不足
    // 逻辑就是，普通(电脑)显示的时候，不使用伪元素
    // 移动端css里面使用伪元素同时，关闭(字体大小设0)普通文本显示
    // 从而实现，移动端独立显示，且独立显示由css自动控制，不需要js介入
    // 所以，控制伪元素的时候，css控制属性都要写在伪元素属性里面
    // data-i18n-short属性只是指定，短文本所在位置
    // data-short才是用来显示的文本，所以 attr(data-short)
    const shortElements = document.querySelectorAll('[data-i18n-short]');
    shortElements.forEach(el => {
        // 读取专属的短文本 Key
        const key = el.getAttribute('data-i18n-short');
        const text = getTranslation(key, translations);

        if (text !== null && text !== undefined) {
            // 将翻译好的短文本写入 data-short 属性（不覆盖 Key！）
            el.setAttribute('data-short', text);
        }
    });

    // ==================替换 Placeholder==================
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = getTranslation(key, translations);
        if (text !== null) {
            // 直接修改 DOM 元素的 placeholder 属性
            el.placeholder = text;
        }
    });

    // ==================替换标签==================
    const tagElements = document.querySelectorAll('[data-raw-tag]');
    tagElements.forEach(el => {
        const rawID = el.getAttribute('data-raw-tag');
        // 直接调用 I18n 引擎，传入纯 ID 获取新语言下的文本
        el.textContent = I18n.Translate(rawID);
    });
}

// 切换语言，主函数
async function switchLanguage(lang) {
    // 修改 <html> 标签的 lang 属性
    document.documentElement.lang = lang;
    // 更新全局变量
    currentLanguage = localStorage.getItem("preferredLanguage") || "zh";
    // 存储的函数写在上层函数，这个函数不会被裸调用

    // 通知布局控制器更新宽度
    const tagList = document.getElementById("tagList");
    let activeItem = tagList.querySelector(".item.active");
    if (activeItem) {
        updateLayoutWidth(activeItem.id);
    }

    // 拉取数据并渲染
    const data = await loadLanguagePack(lang);
    applyLanguage(data);

    // 重新渲染输入提示框
    updateTips();
}