// 保存用户设置
function saveUserSettings() {
    const precise = document.getElementById("preciseScreening").checked;
    const cleanAll = document.getElementById("cleanAll").checked;
    const showTags = document.getElementById("showTags").checked;
    const autoSwitchTheme = document.getElementById("autoSwitchTheme").checked;
    const manualSwitchTheme = document.getElementById("manualSwitchTheme").checked;

    localStorage.setItem("precise", precise);
    localStorage.setItem("cleanAll", cleanAll);
    localStorage.setItem("showTags", showTags);
    localStorage.setItem("autoSwitchTheme", autoSwitchTheme);
    localStorage.setItem("manualSwitchTheme", manualSwitchTheme);
}
// 加载用户设置
function loadUserSettings() {
    // 从本地存储读取
    const precise = localStorage.getItem("precise");
    const cleanAll = localStorage.getItem("cleanAll");
    const showTags = localStorage.getItem("showTags");
    const autoSwitchTheme = localStorage.getItem("autoSwitchTheme");
    const manualSwitchTheme = localStorage.getItem("manualSwitchTheme");

    if (precise === "true") {
        document.getElementById("preciseScreening").checked = true;
    }

    if (cleanAll === "true") {
        document.getElementById("cleanAll").checked = true;
    }

    if (showTags === "true") {
        document.getElementById("showTags").checked = true;
    }

    if (autoSwitchTheme === "true") {
        document.getElementById("autoSwitchTheme").checked = true;
    }

    if (manualSwitchTheme === "true") {
        document.getElementById("manualSwitchTheme").checked = true;
    }
}
// 更新按钮状态
function updateButtonStatus() {
    const precise = document.getElementById("preciseScreening").checked;
    const cleanAll = document.getElementById("cleanAll").checked;
    const showTags = document.getElementById("showTags").checked;
    const autoSwitchTheme = document.getElementById("autoSwitchTheme").checked;
    const manualSwitchTheme = document.getElementById("manualSwitchTheme").checked;

    const PSSlider = document.getElementById("PSSlider");
    const CASlider = document.getElementById("CASlider");
    const STSlider = document.getElementById("STSlider");
    const ASTSlider = document.getElementById("ASTSlider");
    const MSTSlider = document.getElementById("MSTSlider");

    // 更新实际逻辑
    saveUserSettings();

    // 更新动画
    // active类写在setButton.css文件内
    if (precise) {
        PSSlider.classList.add("active");
    } else {
        PSSlider.classList.remove("active");
    }

    if (cleanAll) {
        CASlider.classList.add("active");
    } else {
        CASlider.classList.remove("active");
    }

    if (showTags) {
        STSlider.classList.add("active");
    } else {
        STSlider.classList.remove("active");
    }

    if (autoSwitchTheme) {
        ASTSlider.classList.add("active");
    } else {
        ASTSlider.classList.remove("active");
    }

    if (manualSwitchTheme) {
        MSTSlider.classList.add("active");
    } else {
        MSTSlider.classList.remove("active");
    }

    switchTheme();
}



// 有个逻辑漏洞，页面加载的时候会有一次无效的保存，但是我懒得修复了，出问题再说
// 页面加载时读取用户设置并执行更新
window.addEventListener("DOMContentLoaded", ()=> {
    loadUserSettings();
    updateButtonStatus();
});
// 按钮发生变化时，更新状态
document.getElementById("preciseScreening").addEventListener("change", updateButtonStatus);
document.getElementById("cleanAll").addEventListener("change", updateButtonStatus);
document.getElementById("showTags").addEventListener("change", updateButtonStatus);
document.getElementById("autoSwitchTheme").addEventListener("change", updateButtonStatus);
document.getElementById("manualSwitchTheme").addEventListener("change", ()=> {
    // 如果跟随系统开着，但是用户手动修改了主题，就自动关掉跟随系统
    const autoSwitchTheme = document.getElementById("autoSwitchTheme");
    if (autoSwitchTheme.checked) {
        autoSwitchTheme.checked = false;
    }

    updateButtonStatus();
});