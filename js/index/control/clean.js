function clean() {
    // 默认清空筛选标签
    const target = document.getElementById("submitPool");
    // 清空结果和输入框
    const isResult = document.getElementById("cleanResult").checked;
    const isText = document.getElementById("cleanText").checked;

    const resultCount = document.getElementById("resultCount");
    const imgBox = document.getElementById("select");
    const inputBox = document.getElementById("input");

    const allImg = document.querySelectorAll(".imgs");

    target.replaceChildren();

    if (isResult) {
        // 清空结果之前先停止网络流下载
        allImg.forEach((img) => img.src = "");

        imgBox.replaceChildren();
        resultCount.textContent = "0";
        alreadySubmit = false;
    }

    if (isText) {
        inputBox.value = "";
    }
}