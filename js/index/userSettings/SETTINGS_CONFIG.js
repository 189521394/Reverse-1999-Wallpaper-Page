// 背景图像开关回调：切换后重跑当前筛选，即时生效
function toggleBackgroundFilter() {
    if (window.currentActiveSearchMode === 'text') {
        const text = document.getElementById("input").value.trim();
        if (text) {
            executeFilter();
            return;
        }
    }
    submit();
}

const SETTINGS_CONFIG = [
    // ================================通用================================
    {
        logic: "preciseScreening",
        animation: "PSSlider",
        callback: null
    },
    {
        logic: "autoReplace",
        animation: "ARSlider",
        callback: null
    },
    {
        logic: "autoSubmit",
        animation: "ASSlider",
        callback: null
    },
    {
        logic: "autoFocus",
        animation: "AFSlider",
        callback: null
    },
    // ================================语言和文本================================
    {
        logic: "allowCopy",
        animation: "COPYSlider",
        callback: copyMode
    },
    // ================================显示================================
    {
        logic: "showBackgrounds",
        animation: "SBSlider",
        callback: toggleBackgroundFilter
    },
    {
        logic: "showTags",
        animation: "STSlider",
        callback: null
    },
    {
        logic: "showTone",
        animation: "SToSlider",
        callback: null
    },
    {
        logic: "useTexture",
        animation: "UTSlider",
        callback: switchTexture
    },
    {
        logic: "hideTips",
        animation: "HTSlider",
        callback: conciseMode
    },
    // ================================主题控制================================
    {
        logic: "autoSwitchTheme",
        animation: "ASTSlider",
        callback: switchTheme
    },
    {
        logic: "manualSwitchTheme",
        animation: "MSTSlider",
        callback: switchTheme,
        conflictWith: ["autoSwitchTheme"]
    },
    // ================================移动端设置================================
    {
        logic: "onlyTopShowTab",
        animation: "OTSTSlider",
        callback: refreshTab,
    },
    {
        logic: "clickToWallpaper",
        animation: "CTWSlider",
        callback: null,
    },
    // ================================关于================================
    {
        logic: "shareWithAPI",
        animation: "SWASlider",
        callback: null
    },
    {
        logic: "shareWithTag",
        animation: "SWTSlider",
        callback: null
    },
    // ================================开发者选项================================
    {
        logic: "copyFileName",
        animation: "CFNSlider",
        callback: null
    },
    {
        logic: "fastUpdate",
        animation: "FUSlider",
        callback: null
    }
]