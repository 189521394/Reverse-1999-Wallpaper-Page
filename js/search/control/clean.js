function clean() {
    let target = document.getElementById("submitPool");
    let isAll = document.getElementById("cleanAll").checked;
    let box = document.getElementById("select");
    let result = document.getElementById("result");

    if (isAll) {
        target.replaceChildren();
        box.replaceChildren();
        result.textContent = "0个筛选结果";
        alreadySubmit = false;
    } else {
        target.replaceChildren();
    }
}