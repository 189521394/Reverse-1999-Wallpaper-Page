// 调试开关
const copyFileName = document.getElementById("copyFileName");

async function showTag(targetURL) {
    let showBox = document.getElementById("returnTag");

    // 先清空，动画放在最后，等里面的标签准备完毕了再加载动画，不然动画会抽搐
    showBox.replaceChildren();

    let Tags = await loadTag(targetURL);
    let cache = document.createDocumentFragment();

    // ======================================调试模式：快速复制文件名称======================================
    if (copyFileName.checked) {
        // 提取文件名
        // 使用 decodeURIComponent 防止文件名中有中文乱码
        let fileName = decodeURIComponent(targetURL.substring(targetURL.lastIndexOf('/') + 1));

        // 创建特殊标签元素
        let copyBtn = document.createElement("div");
        copyBtn.textContent = "复制文件名称";

        // 赋予它 .tags 类名，让它长得和普通标签一样
        copyBtn.className = "tags";

        // 给个特殊样式区分一下
        copyBtn.style.fontSize = "22px";

        // 绑定独立的点击事件
        copyBtn.addEventListener("click", async function(e) {
            // 阻止事件冒泡
            // 这样点击它时，事件不会传给父元素，也就不会触发下面的“添加到 submitPool”逻辑
            e.stopPropagation();

            // 执行复制到剪切板
            await copyText(fileName);

            // 变成“已复制”1秒钟
            let originalText = copyBtn.textContent;
            copyBtn.textContent = "✅ 已复制";
            copyBtn.style.backgroundColor = "#fff"; // 闪烁一下白底

            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = ""; // 恢复原样
            }, 1000);
        });

        // 将这个特殊标签添加到最前面
        cache.appendChild(copyBtn);
    }
    // 调试就不加try了，自己修
    // ======================================调试结束======================================

    for (let i = 0; i < Tags.length; i++) {
        let div = document.createElement("div");

        div.textContent = Tags[i];
        div.className = "tags";

        cache.appendChild(div);
    }

    showBox.appendChild(cache);

    // 放在最后显示动画
    showBox.classList.add("show");
}



// 复制文本函数
const copyText = async (text) => {
    // 如果在 localhost 或 HTTPS 环境，直接用现代 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }

    // 如果在局域网 HTTP 环境，使用老式黑科技
    return new Promise((resolve, reject) => {
        let textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "-99999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            resolve();
        } catch (err) {
            reject(err);
        } finally {
            document.body.removeChild(textArea);
        }
    });
};