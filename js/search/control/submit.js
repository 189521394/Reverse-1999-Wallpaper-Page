let pool = document.getElementById("submitPool");
// 加载锁定，因为清空之后滚动还会触发加载，所以增加一个锁定
// 只有在提交之后，清空之前，进行加载
let alreadySubmit = false;

function submit() {
    // =================移动端一次性对话框=================
    if (isMobileLayout) {
        browseToMain();
    }
    // =================移动端一次性对话框=================
    // 获取用户选择的标签，存进select数组，提交筛选
    let select = [];
    for (let child of pool.children) {
        select.push(child.textContent);
    }
    DisplayImg(select);
    alreadySubmit = true;
}



// 提交后自动跳转(移动端)
const submitBtn = document.getElementById("submit");
const clickToWallpaper = document.getElementById("clickToWallpaper");
submitBtn.addEventListener("click", ()=> {
    if (isMobileLayout && clickToWallpaper.checked) {
        // 一会修改
        switchWallpaper();
    }
});