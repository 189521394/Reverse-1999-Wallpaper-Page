function clean() {
    const target = document.getElementById("submitPool");
    const isResult = document.getElementById("cleanResult").checked;
    const isText = document.getElementById("cleanText").checked;

    const result = document.getElementById("result");
    const imgBox = document.getElementById("select");
    const inputBox = document.getElementById("input");

    target.replaceChildren();

    if (isResult) {
        imgBox.replaceChildren();
        result.textContent = "0个筛选结果";
        alreadySubmit = false;
    }

    if (isText) {
        inputBox.value = "";
    }
}