// 复制用户群组
async function copyDiss(copyButton, text) {
    try {
        const cache = copyButton.textContent;
        await copyText(text);
        copyButton.textContent = "✔";
        copyButton.style.backgroundColor = "#ffffff";

        setTimeout(() => {
            copyButton.textContent = cache;
            copyButton.style.backgroundColor = "";
        }, 3000);
    } catch (err) {
        const cache = copyButton.textContent;
        copyButton.textContent = "✘";
        copyButton.style.backgroundColor = "#ffffff";
        console.log(err);

        setTimeout(() => {
            copyButton.textContent = cache;
            copyButton.style.backgroundColor = "";
        }, 3000);
    }
}