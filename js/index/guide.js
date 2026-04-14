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

// 初始化页面：读取本地存储，设置默认选项
function initLanguage() {
    // 判断本地是否已经存了语言
    const isFirstVisit = localStorage.getItem("preferredLanguage") === null;

    // 获取语言，如果因为是第一次来获取不到，默认给 'zh'
    const savedLang = localStorage.getItem("preferredLanguage") || "zh";

    // 根据语言设置状态和 UI
    if (savedLang === "en") {
        optionEN.checked = true;
        ENChecked();
    } else {
        optionZH.checked = true;
        ZHChecked();
    }

    // 只有第一次来才打开引导页面
    if (isFirstVisit) {
        openGuide();
    }
}

// 选择语言和保存设置
function ZHChecked() {
    choiceZHApper.classList.add("checked");
    choiceENApper.classList.remove("checked");

    localStorage.setItem("preferredLanguage", "zh");
}
function ENChecked() {
    choiceENApper.classList.add("checked");
    choiceZHApper.classList.remove("checked");

    localStorage.setItem("preferredLanguage", "en");
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
// document.addEventListener('DOMContentLoaded', initLanguage);