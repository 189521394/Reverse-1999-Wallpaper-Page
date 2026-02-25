// 用于复制联系方式
async function copyContact() {
    const copyButton = document.getElementById("copyButton");
    let mail = "2221771663@qq.com";

    try {
        await navigator.clipboard.writeText(mail);
        copyButton.textContent = "复制成功";
        copyButton.style.backgroundColor = "#ffffff";

        setTimeout(() => {
            copyButton.textContent = "复制";
            copyButton.style.backgroundColor = "";
        }, 3000);
    } catch (err) {
        copyButton.textContent = "复制失败";
        copyButton.style.backgroundColor = "#ff0000";

        setTimeout(() => {
            copyButton.textContent = "复制";
            copyButton.style.backgroundColor = "";
        }, 3000);
    }
}