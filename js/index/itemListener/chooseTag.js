// 需要替换的列表
const autoReplaceList = [
    "mainLine",
    "event",
    "anecdote",
    "versionCode",
    "year",
    "Tone"
]
const autoReplace = document.getElementById("autoReplace");
const autoSubmit = document.getElementById("autoSubmit");

document.getElementById("tagPool").addEventListener("click",function (e) {
    let target = document.getElementById("submitPool");
    let tag = e.target.closest(".waiting");

    // 防止点击空白处报错
    if (!tag) return;

    // 标记筛选模式
    window.currentActiveSearchMode = 'tag';

    // 是否需要替换
    if (autoReplace.checked) {
        // 获取标签分类
        let category = tag.getAttribute("data-category");

        // 检查是否在替换列表内
        if (autoReplaceList.includes(category)) {
            let existingSameCategoryTags = target.querySelectorAll(`.waiting[data-category="${category}"]`);
            // 同类标签情况
            // 0，没有
            // 1，正常，只需要替换一个
            // >1，不可能的情况，这样筛选不出来，何意味？
            if (existingSameCategoryTags.length > 0) {
                existingSameCategoryTags[0].replaceWith(tag.cloneNode(true));

                // 删除剩余的同类标签
                for (let i = 1; i < existingSameCategoryTags.length; i++) {
                    existingSameCategoryTags[i].remove();
                }

                // 检查自动提交
                if (autoSubmit.checked) {
                    // 直接调用最顶层提交函数
                    submit();
                }
                return;
            }
        }
    }
    // 追加新标签
    target.appendChild(tag.cloneNode(true));

    // 自动提交
    if (autoSubmit.checked) {
        submit();
    }
});