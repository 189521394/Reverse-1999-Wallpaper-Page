// mobileTab元素已在其他js文件获取
// container已经在其他js文件获取

const tabObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const isHidden = mobileTab.classList.contains("down");

            if (isHidden) {
                container.style.setProperty('--bottom-for-tab', '0px');
            } else {
                container.style.setProperty('--bottom-for-tab', '70px');
            }
        }
    }
});

// 监控配置
tabObserver.observe(mobileTab, {
    attributes: true,
    attributeFilter: ['class']
});

// 初始化
function initObserver() {
    if (mobileTab.classList.contains("down")) {
        container.style.setProperty('--bottom-for-tab', '0px');
    } else {
        container.style.setProperty('--bottom-for-tab', '70px');
    }
}

// 加载执行
window.addEventListener('DOMContentLoaded', () => initObserver());