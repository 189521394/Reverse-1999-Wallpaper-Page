const guidePage = document.getElementById('guide');

const optionZH = document.getElementById('optionZH');
const optionEN = document.getElementById('optionEN');

const choiceZHApper = document.getElementById('choiceZH');
const choiceENApper = document.getElementById("choiceEN");

// guidePage.classList.add("show");

// const lockID = "guide_" + (++lockCounter)
// requestScrollLock(lockID);

// 统一刷新按钮
function refreshRadioOption() {
    if (optionZH.checked) {
        choiceZHApper.classList.add("checked");
        choiceENApper.classList.remove("checked");
    } else {
        choiceENApper.classList.add("checked");
        choiceZHApper.classList.remove("checked");
    }
}

// 点击刷新
optionZH.addEventListener('click', refreshRadioOption);
optionEN.addEventListener('click', refreshRadioOption);

document.addEventListener('DOMContentLoaded', refreshRadioOption);