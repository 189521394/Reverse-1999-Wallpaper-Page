let remove = document.getElementById("submitPool");

remove.addEventListener("click",function (e) {
    let tag = e.target.closest(".waiting");

    // 防止点击空白处报错
    if (!tag) return;

    tag.remove();
});