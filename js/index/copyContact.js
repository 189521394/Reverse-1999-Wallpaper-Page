// 用于复制联系方式
async function copyContact() {
    const copyButton = document.getElementById("copyButton");
    let mail = "2221771663@qq.com";

    try {
        const cache = copyButton.textContent;
        await copyText(mail);
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