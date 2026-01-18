async function showTag(targetURL) {
    let showBox = document.getElementById("returnTag");
    let Tags = await loadTag(targetURL);
    console.log(Tags);

    showBox.replaceChildren();
    showBox.classList.add("show");

    let cache = document.createDocumentFragment();

    // --- 调试功能：创建复制文件名的特殊标签 ---

    // 1. 提取文件名 (例如：从 ../xx/xx/abc.png 提取出 abc.png)
    // 使用 decodeURIComponent 防止文件名中有中文乱码
    let fileName = decodeURIComponent(targetURL.substring(targetURL.lastIndexOf('/') + 1));

    // 2. 创建特殊标签元素
    let copyBtn = document.createElement("div");
    copyBtn.textContent = "复制文件名称";

    // 3. 赋予它 .tags 类名，让它长得和普通标签一样（继承 CSS）
    copyBtn.className = "tags";

    // 4. 给个特殊样式区分一下
    copyBtn.style.fontSize = "22px";

    // 5. 【核心逻辑】绑定独立的点击事件
    copyBtn.addEventListener("click", async function(e) {
        // 🛑 关键：阻止事件冒泡！
        // 这样点击它时，事件不会传给父元素 #returnTag，也就不会触发下面的“添加到 submitPool”逻辑
        e.stopPropagation();

        try {
            // 执行复制到剪切板
            await navigator.clipboard.writeText(fileName);

            // 交互反馈：变成“已复制”1秒钟
            let originalText = copyBtn.textContent;
            copyBtn.textContent = "✅ 已复制";
            copyBtn.style.backgroundColor = "#fff"; // 闪烁一下白底

            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = ""; // 恢复原样
            }, 1000);

        } catch (err) {
            console.error('复制失败:', err);
            copyBtn.textContent = "❌ 失败";
        }
    });

    // 6. 将这个特殊标签添加到最前面
    cache.appendChild(copyBtn);

    // --- 新增结束 ---

    for (let i = 0; i < Tags.length; i++) {
        let div = document.createElement("div");

        div.textContent = Tags[i];
        div.className = "tags";

        cache.appendChild(div);
    }

    showBox.appendChild(cache);
}