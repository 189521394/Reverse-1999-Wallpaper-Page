// 定义滑块跳转函数
function moveSliderTo(element) {
    let slider = document.getElementById("activeSlider");

    // 设置滑块的height
    slider.style.height = element.offsetHeight + "px";

    // 将 top 替换为 transform: translateY
    slider.style.transform = `translateY(${element.offsetTop}px)`;
}

// ================= 定义获取标签函数 =================
function getTagList(loadButtonID) {
    let box = document.getElementById("tagPool");
    let element = document.getElementById(loadButtonID);

    element.addEventListener("click",function (){
        // =================滑块动画控制=================
        // 先移除其他的active
        document.querySelectorAll('.item').forEach(item => item.classList.remove('active'));

        // 给自己添加active
        element.classList.add('active');

        // 动画移动过去
        moveSliderTo(element);

        // =================实际逻辑控制=================
        // 实际逻辑延迟到下一个事件循环
        setTimeout(() => {
            // 先清空再追加
            box.replaceChildren();

            // 创建一个虚拟对象，防止多次触发重绘
            let cache = document.createDocumentFragment();

            // 直接从 I18n 引擎获取当前分类的 ID 数组
            let targetObjectPool = I18n.categoryMap[loadButtonID] || [];

            // 角色名称按当前语言显示文本排序（中文按拼音，英文按字母，数字自然排序）
            if (loadButtonID === 'character') {
                const sortLocale = currentLanguage === 'zh' ? 'zh' : 'en';
                targetObjectPool = [...targetObjectPool].sort((a, b) => {
                    const textA = I18n.Translate(a);
                    const textB = I18n.Translate(b);
                    return textA.localeCompare(textB, sortLocale, { numeric: true, sensitivity: 'base' });
                });
            }

            for (let i = 0; i < targetObjectPool.length; i++) {
                let div = document.createElement("div");
                let tagId = targetObjectPool[i]; // 已经是纯 ID 了

                // 调用引擎翻译显示
                div.textContent = I18n.Translate(tagId);
                div.className = "waiting";

                // 标记分类属性
                div.setAttribute("data-category", loadButtonID);
                // 设置一个属性存储id
                div.setAttribute("data-raw-tag", tagId);

                // 先放到虚拟对象里面
                cache.appendChild(div);
            }

            // 把虚拟对象追加进去，仅触发一次重绘
            box.appendChild(cache)
        }, 1);
    });
}

// 绑定所有按钮
["character", "mainLine", "event", "anecdote", "versionCode", "year", "Tone", "special"].forEach(btn => {
    let el = document.getElementById(btn);
    if(el) getTagList(btn);
});

// 默认选项由 i18n.js 的 initData() 在 I18n 初始化完成后统一触发
// 此处不再重复调用，避免 I18n 未就绪时渲染原始 ID