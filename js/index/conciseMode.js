const hideTips = document.getElementById("hideTips");

// 挂到body，全局切换，具体切换写css里面即可
function conciseMode() {
    if (hideTips.checked) {
        document.body.classList.add("conciseMode");
    } else {
        document.body.classList.remove("conciseMode");
    }
}