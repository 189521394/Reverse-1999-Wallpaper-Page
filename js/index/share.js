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
                shareSuccess(shareContent);
            } catch (error) {
                // 用户点击了取消，或者分享失败
                shareWhatttttttHappen(shareContent);
            }
        } else {
            // 不支持 Web Share API
            try {
                await copyText(shareURL);
                shareSuccess(shareContent);
                showDialog("当前环境不支持原生分享，已为您复制链接到剪贴板！", true);
            } catch (err) {
                console.error('复制失败:', err);
                shareWhatttttttHappen(shareContent);
                showDialog("复制可能失败！请手动复制浏览器地址栏链接。", true);
            }
        }
        // 只复制到剪切板
    } else {
        try {
            await copyText(shareURL);
            shareSuccess(shareContent, getTranslation("settings.about.share.copied", currentLangPack));
        } catch (err) {
            console.error('复制失败:', err);
            shareWhatttttttHappen(shareContent);
            showDialog("复制可能失败！请手动复制浏览器地址栏链接。", true);
        }
    }
});

// 分享反馈统一时长：按钮复原与 toast 淡出同刻开始（过渡时长均为 250ms），视觉上同步收尾
const SHARE_FEEDBACK_MS = 3000;

// 按钮反馈展示（含恢复锁）：
// 反馈展示期间再次触发时，保留最初缓存的原始文本——
// 否则当前显示的 ✔/? 等反馈字符会被当成"原始文本"写进缓存，复原后按钮永久变形
// 全站所有"点击后显示反馈、定时恢复"的按钮统一走此函数
function showButtonFeedback(targetBtn, feedbackText, duration = SHARE_FEEDBACK_MS) {
    // 恢复锁：仅第一次进入时缓存原始文本（如 ↗ / 分享）
    if (!targetBtn.dataset.feedbackActive) {
        targetBtn.dataset.originalText = targetBtn.textContent;
        targetBtn.dataset.feedbackActive = 'true';
    }
    targetBtn.textContent = feedbackText;
    targetBtn.style.backgroundColor = '#ffffff';

    // 重置该按钮独立的复原计时器（从最后一次触发起算完整展示时长）
    if (targetBtn.dataset.feedbackTimer) {
        clearTimeout(parseInt(targetBtn.dataset.feedbackTimer, 10));
    }
    targetBtn.dataset.feedbackTimer = String(setTimeout(() => {
        targetBtn.textContent = targetBtn.dataset.originalText || targetBtn.textContent;
        targetBtn.style.backgroundColor = '';
        delete targetBtn.dataset.feedbackActive;
        delete targetBtn.dataset.originalText;
        delete targetBtn.dataset.feedbackTimer;
    }, duration));
}

// 分享成功!
// targetBtn 为反馈所在按钮，custom 为自定义反馈文本（默认 ✔）
function shareSuccess(targetBtn, custom) {
    showButtonFeedback(targetBtn, custom || '✔');
}

// 分享失败...
// 这个注释只是为了让IDE不报错，因为t太多了...
// noinspection SpellCheckingInspection
function shareWhatttttttHappen(targetBtn) {
    showButtonFeedback(targetBtn, '?');
}

// ===================== 大图分享按钮 =====================
// 大图预览右上角的分享按钮：分享当前单图链接 /i/<pic_id>/（不附加任何筛选参数）
async function shareImg() {
    const imgShareBtn = document.getElementById('imgShare');
    if (!imgShareBtn) return;

    const shareURL = window.location.origin + getStatePath();

    // 支持系统分享：弹出原生分享面板（面板本身就是反馈，无需 toast）
    if (shareWithAPI.checked && navigator.share) {
        try {
            await navigator.share({
                title: 'Reverse: 1999 Wallpapers',
                text: '司辰向您分享了一部分见闻...',
                url: shareURL
            });
            shareSuccess(imgShareBtn);
        } catch (error) {
            // 用户取消系统分享，静默处理
        }
        return;
    }

    // 回退：复制到剪贴板 + toast 提示
    try {
        await copyText(shareURL);
        shareSuccess(imgShareBtn);
        showToast(getTranslation("settings.about.share.copiedToast", currentLangPack));
    } catch (err) {
        console.error('复制失败:', err);
        shareWhatttttttHappen(imgShareBtn);
        showToast(getTranslation("settings.about.share.copyFailedToast", currentLangPack));
    }
}

// ===================== 轻量提示气泡 =====================
// 样式（定位/外观）由 CSS 负责，这里只管理文本与显隐
let toastTimer = null;

function showToast(text) {
    const toast = document.getElementById('toast');
    if (!toast || !text) return;

    toast.textContent = text;
    toast.classList.remove('hide');

    // 重复触发时重置计时器，保证完整展示时长
    // 时长与按钮反馈统一（SHARE_FEEDBACK_MS），淡出与按钮复原同刻开始
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('hide');
        toastTimer = null;
    }, SHARE_FEEDBACK_MS);
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

    // 当前筛选状态对应的规范路径（语言已通过虚拟目录 /en/ 编码在路径中）
    // 注意：不能直接用 location.pathname——设置面板打开时它可能是 /about/ 等设置页路径
    const baseUrl = window.location.origin + getStatePath();
    const params = new URLSearchParams();

    // 单图预览中：直接分享单图链接 /i/<pic_id>/，不附加任何筛选参数
    if (activeImg && activeImg.dataset && activeImg.dataset.original) {
        return baseUrl;
    }

    // 如果不需要高级分享（分享纯净状态链接）
    if (!shareWithTag.checked) {
        return baseUrl;
    }

    // 处理精确筛选参数
    const preciseCheck = document.getElementById("preciseScreening");
    const isPrecise = preciseCheck ? preciseCheck.checked : false;

    if (window.currentActiveSearchMode === 'text') {
        // 文本筛选：沿用 Base64 参数机制
        const rawText = document.getElementById("input").value.trim();
        if (rawText) {
            params.set('mode', 'text');
            params.set('q', encodeBase64(rawText));
            params.set('precise', isPrecise);
        }
    } else if (window.currentActiveSearchMode === 'tag') {
        const pool = document.getElementById("submitPool");
        const waiting = pool.querySelectorAll('.waiting');
        if (waiting.length === 1) {
            // 单标签：路径已承载标签（/c/vertin/），仅在开启精确筛选时附参数
            if (isPrecise) {
                params.set('precise', isPrecise);
            }
        } else if (waiting.length > 1) {
            // 多标签：沿用 Base64 参数机制
            let tags = [];
            for (let child of waiting) {
                tags.push(child.textContent);
            }
            params.set('mode', 'tag');
            params.set('q', encodeBase64(tags.join(','))); // 标签之间用逗号隔开
            params.set('precise', isPrecise);
        }
    }

    const queryStr = params.toString();
    return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
}

// ===================== 路径路由控制器 =====================
// 设置面板路由 → DOM ID 反查表
const SETTING_ROUTE_TO_ITEM = {
    '/preference/': 'preference',
    '/mail/': 'mail',
    '/about/': 'about',
    '/debug/': 'deBug'
};

// 设置内容区 ID → 路由名（syncUrlWithState 反查用）
const SETTING_CONTENT_TO_ROUTE = {
    setList: 'preference',
    mailList: 'mail',
    aboutList: 'about',
    debugList: 'debug'
};

// 计算当前筛选状态对应的规范路径（不含查询参数、含语言前缀）
// 供分享链接生成与地址栏同步共用；不含设置面板分支——分享时取背后筛选状态
function getStatePath() {
    const langPrefix = (currentLanguage === 'en') ? '/en' : '';

    // 优先级 1：单图预览打开中 → /i/<pic_id>/
    if (activeImg && activeImg.dataset && activeImg.dataset.original) {
        const picId = getPicIdFromFile(activeImg.dataset.original);
        return `${langPrefix}/i/${picId}/`;
    }

    // 文本搜索模式：结果由文本框内容决定，不适用标签与汇总路由
    // （即使筛选池里残留标签，地址栏也应回根路径）
    if (window.currentActiveSearchMode === 'text') {
        return langPrefix + '/';
    }

    const pool = document.getElementById('submitPool');
    const waiting = pool.querySelectorAll('.waiting');

    // 优先级 2：恰好选中 1 个标签 → 单标签落地页路由
    if (waiting.length === 1) {
        const rawTag = waiting[0].getAttribute('data-raw-tag');
        const tagId = rawTag || I18n.parse(waiting[0].textContent);
        const route = I18n.idToRouteMap[tagId];
        // 不收录的标签（year/Tone/special）退回根路径
        if (route) return langPrefix + route;
    }

    // 优先级 3：分类汇总页（/c/ /v/）且未做任何筛选 → 保持当前汇总路径
    // 注意：__INITIAL_ROUTE__ 只是页面加载时的初始标记，用户后续筛选后它不再代表当前状态，
    // 因此必须同时要求筛选池为空（清空筛选后才回到汇总页路径）
    if (window.__INITIAL_ROUTE__ && window.__INITIAL_ROUTE__.type === 'summary' && waiting.length === 0) {
        const cleanPath = window.location.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
        return langPrefix + cleanPath;
    }

    // 其余（0 个、多个标签）→ 根路径
    return langPrefix + '/';
}

// 路由处理期间的中间同步抑制标志：
// handleUrlRouting 内部调用 closeImage/closeSettings 时，它们的 syncUrlWithState 会按
// 中间状态 push 多余的历史记录（如从 /i/A/ 前进到 /i/B/ 时中间插入一条标签页路径），
// 污染前进/后退栈。由 handleUrlRouting 在 try/finally 中统一开启与关闭
let suppressUrlSync = false;

// 根据当前状态同步地址栏路径（replace=true 时使用 replaceState）
function syncUrlWithState(replace = false) {
    if (suppressUrlSync) return;

    let targetPath;

    // 设置面板打开中（且无大图预览）→ 以当前显示的内容区反查路由
    // （移动端激活态是 activeWait 而非 active，故不依赖 .setItem.active）
    const hasActiveImg = activeImg && activeImg.dataset && activeImg.dataset.original;
    if (!hasActiveImg && setBackground.classList.contains('show')) {
        const langPrefix = (currentLanguage === 'en') ? '/en' : '';
        const visibleContent = document.querySelector('#setBox .setContent.show');
        const routeName = visibleContent ? SETTING_CONTENT_TO_ROUTE[visibleContent.id] : 'preference';
        targetPath = `${langPrefix}/${routeName}/`;
    } else {
        targetPath = getStatePath();
    }

    if (window.location.pathname !== targetPath) {
        if (replace) {
            window.history.replaceState({ path: targetPath }, '', targetPath);
        } else {
            window.history.pushState({ path: targetPath }, '', targetPath);
        }
    }
}

// 等待图片加载完成后自动弹出大图预览
function openSinglePic(targetImg) {
    const doOpen = () => {
        // 图片加载失败（naturalWidth 为 0）时不弹出
        if (targetImg.naturalWidth === 0) return;
        calculateAnimation(targetImg);
        openImage(targetImg);
    };
    if (targetImg.complete && targetImg.naturalWidth > 0) {
        doOpen();
    } else {
        targetImg.addEventListener('load', doOpen, { once: true });
    }
}

// 渲染单图上下文图集：目标图所在版本（tags[0]，约定恒为版本号）的全部图片，
// 目标图置于首位并自动放大；关闭大图后由 syncUrlWithState 自然落入版本页 /v/<ver>/
async function renderPicContext(picItem) {
    const contextTagId = (picItem.tags && picItem.tags[0]) || null;
    const urlPrefix = isLocal ? '/' : (R2_DOMAIN + '/');
    const targetUrl = urlPrefix + picItem.file;

    // 计算该版本的图片集合
    let full;
    if (contextTagId) {
        full = await loadURL([contextTagId]);
    } else {
        // 无任何标签的极端情况：退化为单图集合
        full = [];
    }

    // 目标图必须位于集合首位（可能因背景图过滤被排除，兜底插入）
    if (!full.includes(targetUrl)) {
        full.unshift(targetUrl);
    } else {
        const idx = full.indexOf(targetUrl);
        if (idx > 0) {
            full = [targetUrl, ...full.slice(0, idx), ...full.slice(idx + 1)];
        }
    }
    allOutSet = full;

    // 填充筛选池（版本标签）——注意不触发 submit，
    // 让地址栏保持 /i/；关闭大图后 closeImage 的 syncUrlWithState 会自然推到版本页
    if (contextTagId) {
        window.currentActiveSearchMode = 'tag';
        const pool = document.getElementById('submitPool');
        pool.replaceChildren();
        const div = document.createElement('div');
        div.className = 'waiting';
        div.textContent = I18n.Translate(contextTagId);
        div.setAttribute('data-raw-tag', contextTagId);
        const entry = I18n.dictionary[contextTagId];
        if (entry && entry.category) div.setAttribute('data-category', entry.category);
        pool.appendChild(div);
    } else {
        window.currentActiveSearchMode = 'none';
    }

    // 渲染首批图片（复用 loadMoreImages，含 alt 补齐与懒加载）
    const resultCount = document.getElementById('resultCount');
    if (resultCount) resultCount.textContent = full.length;
    currentLoaded = 0;
    alreadySubmit = true;
    loadMoreImages();

    // 定位目标图并自动放大
    const targetImg = document.querySelector(`#select img.imgs[data-original$="${picItem.file}"]`);
    if (targetImg) {
        openSinglePic(targetImg);
    }
}

// 单图路径 /i/<pic_id>/：渲染目标图所在版本图集，自动弹出大图预览
function handlePicRoute(picId) {
    const picItem = window.picIdToFileMap[picId];
    if (!picItem) return;

    if (setBackground.classList.contains('show')) closeSettings();

    // 先在 #select 中找这张图（popstate 后退回来时图集已在）
    const targetImg = document.querySelector(`#select img.imgs[data-original$="${picItem.file}"]`);
    if (!targetImg) {
        // 首次进入：渲染上下文图集（完成后自动放大目标图）
        renderPicContext(picItem);
        return;
    }

    // 这张图还没打开时，等待加载完成后弹出大图预览
    if (activeImg !== targetImg) {
        if (activeImg) closeImage();
        openSinglePic(targetImg);
    }
}

// 设置面板路径（/preference/ /mail/ /about/ /debug/）：打开面板并激活对应页签
function handleSettingRoute(normalizedPath) {
    if (activeImg) closeImage();

    const itemId = SETTING_ROUTE_TO_ITEM[normalizedPath];
    if (!setBackground.classList.contains('show')) {
        openSettings();
    } else {
        // 静态设置落地页初始即为打开状态（预置 .show），不会经过 openSettings，
        // 这里补申请滚动锁，与运行时打开设置的行为保持一致
        requestScrollLock(setLockID);
    }
    const item = document.getElementById(itemId);
    if (item) item.click();
}

// 单标签路径：重建筛选池并提交（popstate 后退回来的情况）
function handleTagRoute(tagId) {
    // 先关闭可能开着的覆盖层（手机返回键从设置/大图退回落地页）
    if (activeImg) closeImage();
    if (setBackground.classList.contains('show')) closeSettings();

    // 还原精确筛选参数（单标签分享链接 /c/vertin/?precise=true）
    const params = new URLSearchParams(window.location.search);
    const precise = params.get('precise');
    if (precise === 'true' || precise === 'false') {
        const preciseCheck = document.getElementById('preciseScreening');
        if (preciseCheck && preciseCheck.checked !== (precise === 'true')) {
            preciseCheck.click();
        }
        // 拨动开关后清掉参数，防止刷新残留导致重复触发
        params.delete('precise');
        const cleanQuery = params.toString();
        window.history.replaceState({}, document.title,
            window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ''));
    }

    const pool = document.getElementById('submitPool');
    const waiting = pool.querySelectorAll('.waiting');
    const alreadySelected = waiting.length === 1 && waiting[0].getAttribute('data-raw-tag') === tagId;

    // 静态落地页首屏：接管预渲染内容，不重复清空重绘
    if (alreadySelected && window.__INITIAL_ROUTE__ &&
        window.__INITIAL_ROUTE__.type === 'tag' && window.__INITIAL_ROUTE__.tagId === tagId) {
        hydrateTagPage();
        return;
    }

    // 重建池子中的单个标签并提交筛选
    pool.replaceChildren();
    const div = document.createElement('div');
    div.className = 'waiting';
    div.textContent = I18n.Translate(tagId);
    div.setAttribute('data-raw-tag', tagId);
    const entry = I18n.dictionary[tagId];
    if (entry && entry.category) div.setAttribute('data-category', entry.category);
    pool.appendChild(div);
    submit();
}

// 分类汇总页 /c/ /v/：接管预渲染的全库非背景首屏
// hydrateSummaryPage 内部会校验 DOM 是否为预渲染内容，不匹配则动态重建，
// 因此 normal 模式（SPA 回退、无 __INITIAL_ROUTE__）刷新汇总页也能正常出图
function handleSummaryRoute() {
    if (activeImg) closeImage();
    if (setBackground.classList.contains('show')) closeSettings();

    hydrateSummaryPage();
}

// 首屏防闪烁接管（Hydration）：不重复创建前 48 张 DOM，只补齐状态供滚动无缝续载
function hydrateTagPage() {
    const route = window.__INITIAL_ROUTE__;
    const expected = Math.min(48, route.count);
    const existing = document.querySelectorAll('#select .imgs').length;

    // DOM 已被改动过（如单图页覆盖渲染），无法直接接管，走正常重建流程
    if (existing !== expected) {
        submit();
        return;
    }

    // 用 tagId 直接计算完整结果集（I18n.parse 对纯 ID 原样返回，命中 tags 数组）
    loadURL([route.tagId]).then(full => {
        allOutSet = full;
        currentLoaded = existing;
        alreadySubmit = true;
        window.currentActiveSearchMode = 'tag';
        const resultCount = document.getElementById('resultCount');
        if (resultCount) resultCount.textContent = full.length;
    });
}

// 汇总页首屏接管：全库非背景图（与前端 showBackgrounds=false 一致）
function hydrateSummaryPage() {
    const urlPrefix = isLocal ? '/' : (R2_DOMAIN + '/');
    const full = runtimeDatabase
        .filter(item => !(item.tags && item.tags.includes('background')))
        .map(item => urlPrefix + item.file);

    const existing = document.querySelectorAll('#select .imgs').length;
    const firstImg = document.querySelector('#select .imgs');

    // 校验当前 DOM 确实是汇总页预渲染内容（首图与全库首图一致），
    // 否则（如 popstate 从标签页返回、normal 模式无预渲染）重建汇总页首屏
    if (existing !== 48 || !firstImg || firstImg.dataset.original !== full[0]) {
        const box = document.getElementById('select');
        box.replaceChildren();
        allOutSet = full;
        currentLoaded = 0;
        alreadySubmit = true;
        window.currentActiveSearchMode = 'none';
        loadMoreImages();
        const resultCount = document.getElementById('resultCount');
        if (resultCount) resultCount.textContent = full.length;
        return;
    }

    allOutSet = full;
    currentLoaded = existing;
    alreadySubmit = true;
    window.currentActiveSearchMode = 'none';
    const resultCount = document.getElementById('resultCount');
    if (resultCount) resultCount.textContent = full.length;
}

// 解析 URL 并还原路由状态（新路径路由 + 旧 ?mode= 分享参数）
// 处理期间抑制中间同步，由各个 handleXxx 自行决定最终地址栏状态
function handleUrlRouting() {
    suppressUrlSync = true;
    try {
        routeByPathAndQuery();
    } finally {
        suppressUrlSync = false;
    }
}

function routeByPathAndQuery() {
    // ========== 新路由体系：路径解析 ==========
    const rawPath = window.location.pathname;
    // 剥离 /en 前缀得到纯净路径，并统一补尾斜杠
    const cleanPath = rawPath.replace(/^\/en(?=\/|$)/, '');
    const normalizedPath = (cleanPath || '/').replace(/\/?$/, '/');

    // 1. 单图路径 /i/<pic_id>/
    const picMatch = normalizedPath.match(/^\/i\/([^/]+)\/$/);
    if (picMatch) {
        handlePicRoute(picMatch[1]);
        return;
    }

    // 2. 设置面板路径
    if (SETTING_ROUTE_TO_ITEM[normalizedPath]) {
        handleSettingRoute(normalizedPath);
        return;
    }

    // 3. 单标签落地页路径
    const routeTagId = I18n.routeToIdMap[normalizedPath];
    if (routeTagId) {
        handleTagRoute(routeTagId);
        return;
    }

    // 4. 分类汇总页 /c/ /v/
    if (normalizedPath === '/c/' || normalizedPath === '/v/') {
        handleSummaryRoute();
        return;
    }

    // 5. 根路径：清空筛选池、关闭覆盖层后继续走旧 ?mode= 参数解析
    if (normalizedPath === '/') {
        // 先清空池子，否则 closeSettings/closeImage 内部的 syncUrlWithState
        // 会因残留标签把地址栏重新推回标签页路由，导致后退失效
        const rootPool = document.getElementById('submitPool');
        if (rootPool.children.length > 0) {
            rootPool.replaceChildren();
        }
        if (activeImg) closeImage();
        if (setBackground.classList.contains('show')) closeSettings();
    }

    // ========== 旧链接 ?mode= 分享参数解析（向后兼容） ==========
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

                // 补齐 data-raw-tag，供路由同步反查使用
                const tagId = I18n.parse(tagText);
                if (I18n.dictionary[tagId]) {
                    tagDiv.setAttribute('data-raw-tag', tagId);
                    if (I18n.dictionary[tagId].category) {
                        tagDiv.setAttribute('data-category', I18n.dictionary[tagId].category);
                    }
                }

                pool.appendChild(tagDiv);
            });
            submit();
        }
    }
    params.delete('mode');
    params.delete('q');
    params.delete('precise');

    // 重新构建干净的 URL（语言信息已由 /en/ 路径承载，不再有 ?lang= 参数）
    const newQueryStr = params.toString();
    const newUrl = window.location.pathname + (newQueryStr ? `?${newQueryStr}` : '');

    // 还原地址栏，防止刷新残留导致重复触发搜索，路径中的语言状态自然保留
    window.history.replaceState({}, document.title, newUrl);
}

// 浏览器前进/后退：复用同一套路径解析逻辑
window.addEventListener('popstate', () => {
    handleUrlRouting();
});

// 等待核心数据就绪后再还原分享状态，防止 I18n 字典或 Filter.json 尚未加载完成
// 导致 handleUrlRouting 拿到空的 runtimeDatabase 而静默失败
document.addEventListener("DOMContentLoaded", async () => {
    if (window._coreReady) {
        await window._coreReady;
    }
    handleUrlRouting();
});