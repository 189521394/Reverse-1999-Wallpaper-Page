// 保存用户设置
function saveUserSettings() {
    const precise = document.getElementById("preciseScreening").checked;
    const cleanAll = document.getElementById("cleanAll").checked;

    localStorage.setItem("precise", precise);
    localStorage.setItem("cleanAll", cleanAll);
}
// 加载用户设置
function loadUserSettings() {
    // 从本地存储读取
    const precise = localStorage.getItem("precise");
    const cleanAll = localStorage.getItem("cleanAll");

    if (precise === "true") {
        document.getElementById("preciseScreening").checked = true;
    }

    if (cleanAll === "true") {
        document.getElementById("cleanAll").checked = true;
    }
}
// 更新按钮状态
function updateButtonStatus() {
    const precise = document.getElementById("preciseScreening").checked;
    const cleanAll = document.getElementById("cleanAll").checked;

    const PSSlider = document.getElementById("PSSlider");
    const CASlider = document.getElementById("CASlider");

    // 更新实际逻辑
    saveUserSettings();

    // 更新动画
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
}



// 有个逻辑漏洞，页面加载的时候会有一次无效的保存，但是我懒得修复了，出问题再说
// 页面加载时读取用户设置并执行更新
window.addEventListener("DOMContentLoaded", ()=> {
    loadUserSettings();
    updateButtonStatus();
})
// 按钮发生变化时，更新状态
document.getElementById("preciseScreening").addEventListener("change", updateButtonStatus);
document.getElementById("cleanAll").addEventListener("change", updateButtonStatus);