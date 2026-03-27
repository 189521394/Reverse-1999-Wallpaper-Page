const SETTINGS_CONFIG = [
    // ================================通用================================
    {
        logic: "preciseScreening",
        animation: "PSSlider",
        callback: null
    },
    {
        logic: "showTags",
        animation: "STSlider",
        callback: null
    },
    {
        logic: "allowCopy",
        animation: "COPYSlider",
        callback: copyMode
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
        logic: "hideTips",
        animation: "HTSlider",
        callback: conciseMode
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
    // ================================清空按钮控制================================
    {
        logic: "cleanResult",
        animation: "CRSlider",
        callback: null
    },
    {
        logic: "cleanText",
        animation: "CTSlider",
        callback: null
    },
    // ================================关于================================
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