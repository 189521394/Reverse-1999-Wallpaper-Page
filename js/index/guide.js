const guidePage = document.getElementById('guide');

const optionZH = document.getElementById('optionZH');
const optionEN = document.getElementById('optionEN');

const choiceZHApper = document.getElementById('choiceZH');
const choiceENApper = document.getElementById("choiceEN");

const confirmBtn = document.getElementById("guideCONFIRM");

// 屏幕锁定唯一编码
const lockID = "guide_" + (++lockCounter);

// 显示引导页面
function openGuide() {
    guidePage.classList.add("show");

    requestScrollLock(lockID);
}

// 初始化页面：决定使用什么语言，以及是否弹引导页
async function initLanguage() {
    const pathStartsWithEN = window.location.pathname.startsWith('/en');
    const localLang = localStorage.getItem("preferredLanguage");

    let targetLang = "zh"; // 默认兜底语言
    let shouldShowGuide = false; // 是否显示引导页

    // 逻辑判定开始（基于虚拟目录 /en/ 替代旧的 ?lang=en 参数）
    if (pathStartsWithEN) {
        // 场景 A：路径明确为 /en/ → 英文环境（比如通过分享链接 /en/ 进入）
        // 最高优先级！无条件信任路径，存入本地，且【不弹引导页】
        targetLang = "en";
        localStorage.setItem("preferredLanguage", targetLang);
        shouldShowGuide = false;
    }
    else if (localLang === "en") {
        // 场景 B：路径是 /，但 localStorage 存的是 "en" → 老用户回访
        // 静默更新地址栏为 /en/，保持路径与语言一致
        history.replaceState(null, '', '/en/' + window.location.search);
        targetLang = "en";
        shouldShowGuide = false;
    }
    else if (localLang) {
        // 场景 C：有本地缓存且是中文 → 老用户回访
        // 使用缓存，且【不弹引导页】
        targetLang = localLang;
        shouldShowGuide = false;
    }
    else {
        // 场景 D：没有缓存（纯新用户直接访问首页）
        // 暂定默认中文，并且【弹出引导页】让用户自己选
        targetLang = "zh";
        shouldShowGuide = true;
    }

    // --- 逻辑判定结束，开始执行 UI 和 数据渲染 ---

    // 1. 同步语言选择框的 UI 状态
    if (targetLang === "en") {
        optionEN.checked = true;
        choiceENApper.classList.add("checked");
        choiceZHApper.classList.remove("checked");
    } else {
        optionZH.checked = true;
        choiceZHApper.classList.add("checked");
        choiceENApper.classList.remove("checked");
    }

    // 2. 核心：执行语言切换并拉取数据
    await switchLanguage(targetLang);

    // 3. 决定是否显示引导页
    if (shouldShowGuide) {
        openGuide();
    }
}

// 选择语言和保存设置
function ZHChecked() {
    choiceZHApper.classList.add("checked");
    choiceENApper.classList.remove("checked");

    localStorage.setItem("preferredLanguage", "zh");
    switchLanguage("zh");
}
function ENChecked() {
    choiceENApper.classList.add("checked");
    choiceZHApper.classList.remove("checked");

    localStorage.setItem("preferredLanguage", "en");
    switchLanguage("en");
}

// 监听用户操作
optionZH.addEventListener('change', ZHChecked);
optionEN.addEventListener('change', ENChecked);

// 确定按钮
confirmBtn.addEventListener('click', () => {
    // 隐藏语言选择页
    guidePage.classList.remove("show");

    // 释放屏幕锁定
    releaseScrollLock(lockID);
});

// 初始化
document.addEventListener('DOMContentLoaded', initLanguage);