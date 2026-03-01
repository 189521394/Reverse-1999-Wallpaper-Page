const SETTINGS_CONFIG = [
    {
        logic: "preciseScreening",
        animation: "PSSlider",
        callback: null
    },
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
        logic: "autoReplaceAndSubmit",
        animation: "ARASSlider",
        callback: null,
        dependsOn: ["autoReplace"]
    },
    {
        logic: "autoSubmit",
        animation: "ASSlider",
        callback: null
    },
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