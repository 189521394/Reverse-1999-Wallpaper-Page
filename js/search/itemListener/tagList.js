// 定义滑块跳转函数
function moveSliderTo(element) {
    let slider = document.getElementById("activeSlider");

    // 设置滑块的height和top
    slider.style.height = element.offsetHeight + "px";
    slider.style.top = element.offsetTop + "px";
}
// 定义获取标签函数
function getTag(loadButtonID,targetObjectPool) {
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
        // 先清空再追加
        box.replaceChildren();

        // 创建一个虚拟对象，防止多次触发重绘
        let cache = document.createDocumentFragment();

        for (let i = 0; i < targetObjectPool.length; i++) {
            let div = document.createElement("div");

            div.textContent = targetObjectPool[i];
            div.className = "waiting allow-copy";

            // 先放到虚拟对象里面
            cache.appendChild(div);
        }

        // 把虚拟对象追加进去，仅触发一次重绘
        box.appendChild(cache)
    });
}



// 角色筛选
getTag("character",characterPool);

// 主线章节筛选
getTag("mainLine",mainLinePool);

// 活动章节筛选
getTag("event",eventPool);

// 角色轶事筛选
getTag("anecdote",anecdotePool);

// 按版本号筛选
getTag("version",versionCodePool);

// 按时间线筛选
getTag("year",yearPool);

// 亮色/暗色筛选
getTag("lightAndDark",lightAndDarkPool);

// 特殊标签筛选
getTag("special",specialPool);

// 添加默认选项，按主线章节筛选
document.getElementById("mainLine").click();