let target = document.getElementById("submitPool");
let choose = document.getElementById("tagPool");

choose.addEventListener("click",function (e) {
    let tag = e.target.closest(".waiting");

    // 防止点击空白处报错
    if (!tag) return;

    target.appendChild(tag.cloneNode(true));
});