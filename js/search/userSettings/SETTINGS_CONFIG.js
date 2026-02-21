const SETTINGS_CONFIG = [
    {
        logic: "preciseScreening",
        animation: "PSSlider",
        callback: null
    },
    {
        logic: "cleanAll",
        animation: "CASlider",
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
    }
]