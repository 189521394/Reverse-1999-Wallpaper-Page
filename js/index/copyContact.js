// 用于复制联系方式
async function copyContact() {
    const copyButton = document.getElementById("copyButton");
    let mail = "2221771663@qq.com";

    try {
        await copyText(mail);
        copyButton.textContent = "✔";
        copyButton.style.backgroundColor = "#ffffff";

        setTimeout(() => {
            copyButton.textContent = "复制";
            copyButton.style.backgroundColor = "";
        }, 3000);
    } catch (err) {
        copyButton.textContent = "✘";
        copyButton.style.backgroundColor = "#ffffff";
        console.log(err);

        setTimeout(() => {
            copyButton.textContent = "复制";
            copyButton.style.backgroundColor = "";
        }, 3000);
    }
}