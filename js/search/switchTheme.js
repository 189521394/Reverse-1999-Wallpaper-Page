// 该函数调用在 saveUserSettings.js 文件中，当用户调整深色按钮时会调用该函数
function switchTheme() {
    const autoSwitchTheme = document.getElementById("autoSwitchTheme").checked;
    const manualSwitchTheme = document.getElementById("manualSwitchTheme").checked;
    const HTMLTag = document.documentElement;

    if (autoSwitchTheme) {
        HTMLTag.removeAttribute("data-theme");
    } else {
        if (manualSwitchTheme) {
            HTMLTag.setAttribute("data-theme", "light");
        } else {
            HTMLTag.setAttribute("data-theme", "dark");
        }
    }
}