// 当前语言包
let currentTranslations = {};

// 拉取 JSON 语言包
async function loadLanguagePack(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        if (!response.ok) {
            console.log("多语言文件加载失败：", response.status);
        }

        currentTranslations = await response.json();
        return currentTranslations;
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
function applyTranslations(translations) {
    if (!translations) return;

    // --- 替换标准文本 ---
    // 选中所有带有 data-i18n 属性的元素
    const textElements = document.querySelectorAll('[data-i18n]');
    textElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = getTranslation(key, translations);
        if (text !== null) {
            el.textContent = text;
        }
    });

    // --- 替换伪元素文本 ---
    // 选中所有带有 data-i18n-before 属性的元素
    const beforeElements = document.querySelectorAll('[data-i18n-before]');
    beforeElements.forEach(el => {
        const key = el.getAttribute('data-i18n-before');
        const text = getTranslation(key, translations);
        if (text !== null) {
            // 将读取到的文本写入 data-before-text 属性
            el.setAttribute('data-before-text', text);
        }
    });
}

// 切换语言，主函数
async function switchLanguage(lang) {
    // 修改 <html> 标签的 lang 属性
    document.documentElement.lang = lang;

    // 拉取数据并渲染
    const data = await loadLanguagePack(lang);
    applyTranslations(data);
}