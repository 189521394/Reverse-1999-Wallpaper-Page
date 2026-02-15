// 这个函数负责设置里面的设置项
// 包括设置项的逻辑更新，动画更新，保存，加载时读取等
function initSettingsSystem() {
    SETTINGS_CONFIG.forEach((config) => {
        const checkbox = document.getElementById(config.logic);
        const slider = document.getElementById(config.animation);

        // 简单检查
        if (!checkbox || !slider) {
            console.log("未获取到元素，请检查拼写是否正确");
            return;
        }

        // 读取用户设置
        const savedValue = localStorage.getItem(config.logic);
        let isChecked;
        if (savedValue === null) {
            // 如果存储里面是空的(新用户)，部分选项默认选中，由html页面负责
            // 这里把它读取过来，保存一下
            isChecked = checkbox.checked;
        } else {
            // 如果是老用户，再进行判断
            // ↓如果savedValue(字符串)等于"true"(字符串)，isChecked就是true，否则isChecked就是false
            isChecked = savedValue === "true";
        }
        checkbox.checked = isChecked;
        // ↓如果选中了，就添加active类，否则移除，toggle是个封装的切换器
        slider.classList.toggle("active", isChecked);

        // 当按钮发生变化时，更新动画，保存设置
        // 部分需要处理互斥和回调函数
        checkbox.addEventListener("change", () => {
            const currentState = checkbox.checked;

            // 这个和上面的一样
            slider.classList.toggle("active", currentState);
            localStorage.setItem(config.logic, currentState.toString());

            // 处理互斥
            // 如果存在互斥，就拿到里面所有的互斥的id，进行处理
            if (config.conflictWith) {
                config.conflictWith.forEach((conflictID) => {
                    // 拿着这个冲突id去找对应的冲突项，把找到的整个对象赋值给targetConfig
                    const targetConfig = SETTINGS_CONFIG.find(config => config.logic === conflictID);
                    // 检查
                    if (targetConfig) {
                        // 拿到逻辑和动画
                        const targetCheckbox = document.getElementById(targetConfig.logic);
                        const targetSlider = document.getElementById(targetConfig.animation);

                        // 如果这个冲突的选项是开着的，也就是真的冲突了，就关掉它
                        // 关掉同时处理动画和存储
                        if (targetCheckbox.checked) {
                            targetCheckbox.checked = false;
                            targetSlider.classList.remove("active");
                            localStorage.setItem(targetConfig.logic, "false");
                        }
                    } else {
                        console.log(`检测到错误的配置文件！at:${conflictID}`);
                    }
                });
            }

            // 处理回调函数
            // 如果callback里面有函数，就执行
            if (typeof config.callback === "function") {
                config.callback();
            }
        });
    });

    // 初始化之后要刷新一些东西
    switchTheme();
    copyMode();
}

// 页面加载的时候初始化
document.addEventListener("DOMContentLoaded", initSettingsSystem);