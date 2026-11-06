// 用于复制联系方式
async function copyContact() {
    const copyButton = document.getElementById("copyButton");
    const text = document.getElementById("email").textContent;

    try {
        // 用正则精确提取邮箱地址，兼容中英文不同格式
        const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        let mail = match[0];

        await copyText(mail);
        showButtonFeedback(copyButton, "✔");
    } catch (err) {
        console.log(err);
        showButtonFeedback(copyButton, "✘");
    }
}
