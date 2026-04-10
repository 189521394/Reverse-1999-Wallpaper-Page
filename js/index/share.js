const shareBtn = document.getElementById('share');
const shareContent = document.getElementById("shareButton");
const shareWithAPI = document.getElementById("shareWithAPI");

shareBtn.addEventListener('click', async () => {
    // 获取当前网页的链接/图片链接
    const shareURL = generateShareUrl();

    // 使用 Web Share API
    if (shareWithAPI.checked) {
        // 支持 Web Share API
        if (navigator.share) {
            try {
                // 分享成功
                await navigator.share({
                    title: 'Reverse: 1999 Wallpapers',
                    text: '司辰向您分享了一部分见闻...',
                    url: shareURL
                });
                shareSuccess();
            } catch (error) {
                // 用户点击了取消，或者分享失败
                shareWhatttttttHappen();
            }
        } else {
            // 不支持 Web Share API
            try {
                await copyText(shareURL);
                shareSuccess();
                showDialog("当前环境不支持原生分享，已为您复制链接到剪贴板！", true);
            } catch (err) {
                console.error('复制失败:', err);
                shareWhatttttttHappen();
                showDialog("复制可能失败！请手动复制浏览器地址栏链接。", true);
            }
        }
        // 只复制到剪切板
    } else {
        try {
            await copyText(shareURL);
            shareSuccess("已复制");
        } catch (err) {
            console.error('复制失败:', err);
            shareWhatttttttHappen();
            showDialog("复制可能失败！请手动复制浏览器地址栏链接。", true);
        }
    }
});

// 分享成功!
function shareSuccess(custom) {
    if (custom) {
        shareContent.textContent = `${custom}`;
    } else {
        shareContent.textContent = "✔";
    }
    shareContent.style.backgroundColor = "#ffffff";

    setTimeout(() => {
        shareContent.textContent = "分享";
        shareContent.style.backgroundColor = "";
    }, 3000);
}

// 分享失败...
// noinspection SpellCheckingInspection
function shareWhatttttttHappen() {
    shareContent.textContent = "?";
    shareContent.style.backgroundColor = "#ffffff";

    setTimeout(() => {
        shareContent.textContent = "分享";
        shareContent.style.backgroundColor = "";
    }, 3000);
}

// 把中文替换为base64编码，方便分享
function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// 将 Base64 还原为中文
function decodeBase64(base64) {
    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    } catch (e) {
        // 如果别人乱改了参数导致解密失败，直接返回 null
        return null;
    }
}

// 生成带有参数的高级分享链接
function generateShareUrl() {
    // 是否需要高级分享链接
    const shareWithTag = document.getElementById("shareWithTag");

    // 获取当前纯净的网址
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (!shareWithTag.checked) {
        return baseUrl;
    }

    // 获取精确筛选的状态
    const preciseCheck = document.getElementById("preciseScreening");
    const isPrecise = preciseCheck ? preciseCheck.checked : false;

    if (window.currentActiveSearchMode === 'text') {
        // 文本筛选
        const rawText = document.getElementById("input").value.trim();
        if (rawText) {
            params.set('mode', 'text');
            params.set('q', encodeBase64(rawText));
            params.set('precise', isPrecise);
            return `${baseUrl}?${params.toString()}`;
        }
    } else if (window.currentActiveSearchMode === 'tag') {
        // 标签筛选
        const pool = document.getElementById("submitPool");
        let tags = [];
        for (let child of pool.children) {
            tags.push(child.textContent);
        }
        if (tags.length > 0) {
            params.set('mode', 'tag');
            params.set('q', encodeBase64(tags.join(','))); // 标签之间用逗号隔开
            params.set('precise', isPrecise);
            return `${baseUrl}?${params.toString()}`;
        }
    }

    // 如果什么都没搜，就分享干净的首页链接
    return baseUrl;
}

// 解析 URL 并还原搜索状态
function handleUrlRouting() {
    // 读取网址里的参数
    const params = new URLSearchParams(window.location.search);

    // 如果没有 mode 参数，说明是普通访问，直接退出
    if (!params.has('mode')) return;

    const mode = params.get('mode');
    const rawQ = params.get('q');
    const precise = params.get('precise');

    if (!rawQ) return;
    const q = decodeBase64(rawQ);
    if (!q) return;

    // 还原精确筛选
    if (precise !== null) {
        if (!(precise === 'true' || precise === 'false')) {
            // 防止用户填入奇怪的参数 导致设置选项发生变化
            return;
        }
        const isPrecise = (precise === 'true');
        const preciseCheck = document.getElementById("preciseScreening");

        if (preciseCheck) {
            // 只有当当前的开关状态，与分享链接里要求的不一致时，才去拨动它
            if (preciseCheck.checked !== isPrecise) {
                // 模拟点击
                preciseCheck.click();
            }
        }
    }

    // 还原搜索内容并触发搜索
    if (mode === 'text') {
        const input = document.getElementById("input");
        if (input) {
            input.value = q;
            executeFilter();
        }
    } else if (mode === 'tag') {
        const pool = document.getElementById("submitPool");
        if (pool) {
            // 先清空
            pool.replaceChildren();
            const tags = q.split(','); // 把逗号隔开的标签还原成数组

            tags.forEach(tagText => {
                // 创建标签元素并塞进池子
                const tagDiv = document.createElement("div");
                tagDiv.textContent = tagText;
                tagDiv.className = "waiting";

                pool.appendChild(tagDiv);
            });
            submit();
        }
    }

    // 还原地址栏参数，防止刷新残留
    window.history.replaceState({}, document.title, window.location.pathname);
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        handleUrlRouting();
    }, 1);
});