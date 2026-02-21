const input = document.getElementById("input");
const button = document.getElementById("searchButton");

function executeFilter() {
    let rawText = input.value.trim();

    // 如果没输入，直接拦截
    if (rawText === "") return;

    // 把内容按照空格分割，存入数组，进行筛选
    let select = rawText.split(/\s+/);
    DisplayImg(select);
    // 并标记上加载变量
    alreadySubmit = true;
}

// 点击搜索触发
button.addEventListener("click", executeFilter);

// 搜索框内按下回车触发
input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        executeFilter();
    }
});