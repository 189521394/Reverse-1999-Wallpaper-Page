// 用于复制联系方式
async function copyContact() {
    const copyButton = document.getElementById("copyButton");
    const text = document.getElementById("email").textContent;

    try {
        // 用正则精确提取邮箱地址，兼容中英文不同格式
        const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        let mail = match[0];

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