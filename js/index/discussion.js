// 复制用户群组
async function copyDiss(copyButton, text) {
    try {
        await copyText(text);
        showButtonFeedback(copyButton, "✔");
    } catch (err) {
        console.log(err);
        showButtonFeedback(copyButton, "✘");
    }
}
