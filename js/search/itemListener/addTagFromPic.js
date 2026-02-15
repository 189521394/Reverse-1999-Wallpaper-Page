document.getElementById("returnTag").addEventListener("click",function (e) {
    let target = document.getElementById("submitPool");
    let tag = e.target.closest(".tags");

    // 防止点击空白处报错
    if (!tag) return;

    let newTag = tag.cloneNode(true);
    // 替换class，适配新的父元素
    newTag.classList.remove("tags");
    newTag.classList.add("waiting");

    target.appendChild(newTag);
});