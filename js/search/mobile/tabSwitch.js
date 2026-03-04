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

    // 点一下按主线筛选，防止错位
    document.getElementById("mainLine").click();

    // 防止tab隐藏
    toggleScrollLock(true);
}

// 设置页
function switchSet() {
    openSettings();
    switchTab('tab-set', 'set', true);
    toggleScrollLock(true);
}

const allTabClasses = ['tab-wallpaper', 'tab-tags', 'tab-set'];
const allButtonIds = ['wallpaper', 'selectTag', 'set'];

function switchTab(targetClass, targetBtnID, isSet) {
    if (!isSet) {
        document.body.classList.remove(...allTabClasses);
        document.body.classList.add(targetClass);
    }

    allButtonIds.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(targetBtnID).classList.add('active');
}