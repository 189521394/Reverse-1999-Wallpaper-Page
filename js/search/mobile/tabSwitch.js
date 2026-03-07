// 浏览页
function switchWallpaper() {
    closeSettings();
    switchTab('tab-wallpaper', 'wallpaper');
    toggleScrollLock(false);
}

// 标签页
function switchTags() {
    closeSettings();
    switchTab('tab-tags', 'selectTag');

    // 防止tab隐藏
    toggleScrollLock(true);
}

// 设置页
function switchSet() {
    openSettings();
    switchTab('tab-set', 'set', true);
    toggleScrollLock(true);
}

// 每个页面的信息
const allTabClasses = ['tab-wallpaper', 'tab-tags', 'tab-set'];
const allButtonIds = ['wallpaper', 'selectTag', 'set'];

// 三页切换逻辑
function switchTab(targetClass, targetBtnID, isSet) {
    // 删除设置切换逻辑，设置作为一个独立悬浮窗存在，而不是第三个页面
    if (!isSet) {
        document.body.classList.remove(...allTabClasses);
        document.body.classList.add(targetClass);
    }

    // tab按钮切换逻辑
    allButtonIds.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(targetBtnID).classList.add('active');
}

// 给筛选挂个监听器，且只有首次触发，后续不需要
document.getElementById("selectTag").addEventListener('click', () => {
    // 点一下按主线筛选，防止错位
    // 点过直接丢掉，因为用户可能选择了自己需要的选项
    document.getElementById("mainLine").click();
}, {once: true});