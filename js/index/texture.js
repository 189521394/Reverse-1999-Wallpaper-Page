// ==================== 胶片质感通用动画 ====================
// 颗粒由滤镜 + 混合模式生成，而 filter 的 url() 引用不可插值、mix-blend-mode 不可动画，
// 主题切换瞬间两者会突变。这里用 opacity 动画掩盖突变：突变发生的同一渲染帧内
// 纹理从 0 透明度开始淡入，保证滤镜/混合模式突变时纹理不可见。
//
// 动画全部使用 Web Animations API（element.animate）：
//   - 完成时机由 onfinish 精确回调，比 setTimeout 可靠——页面卡顿时动画实际耗时
//     会超过 250ms，setTimeout 到点就隐藏元素会截断动画造成闪烁
//   - 显式指定起止关键帧，避免 CSS transition 的"起点回弹"问题（原方案需要
//     禁过渡 + 强制 reflow 才能让透明度瞬时归零，会阻塞渲染流水线）
// ==========================================================

const textureOverlay = document.getElementById("texture");
let textureAnim = null;

// 统一的透明度动画：取消进行中的动画，从 from 过渡到 to。
// 动画结束后样式回到 CSS 计算值，因此淡入终点必须与静止值一致。
function animateTexture(from, to, onFinish) {
    if (textureAnim) textureAnim.cancel();
    textureAnim = textureOverlay.animate(
        [{ opacity: from }, { opacity: to }],
        { duration: 250, easing: "ease" }
    );
    textureAnim.onfinish = onFinish || null;
}

// 淡入到静止值（读取计算样式：一次性且 opacity 非布局属性，开销可忽略）
function fadeTextureIn() {
    const rest = parseFloat(getComputedStyle(textureOverlay).opacity);
    animateTexture(0, rest);
}

// 淡出到 0：动画真正结束后固化透明度（防止样式回弹到静止值）再执行回调
function fadeTextureOut(onFinish) {
    animateTexture(parseFloat(getComputedStyle(textureOverlay).opacity), 0, () => {
        textureOverlay.style.opacity = "0";
        onFinish && onFinish();
    });
}

// 主题切换后的刷新：纹理从不可见淡入新配置的颗粒。
// 与属性突变同帧触发（MutationObserver 在样式重算前的微任务阶段执行），
// 动画第一帧 opacity 即为 0，突变帧纹理不可见。
function refreshTexture() {
    if (!textureOverlay || textureOverlay.classList.contains("hide")) return;
    // 有动画在进行（pending/running 等非结束状态）时跳过重复触发。
    // 注意不能只判 running：动画刚创建时是 pending，初始化时 refreshSet 先触发
    // switchTheme 改属性（observer 排队）再触发 switchTexture 淡出动画，
    // 若放行会让淡入动画 cancel 掉淡出，导致关闭偏好的纹理永远无法隐藏。
    if (textureAnim && textureAnim.playState !== "finished") return;
    fadeTextureIn();
}

// 切换胶片质感（开启淡入 / 关闭淡出）
function switchTexture() {
    const enabled = document.getElementById("useTexture").checked;
    if (enabled) {
        // 开启：清除关闭时固化的内联透明度（恢复 CSS 静止值），从 0 淡入
        textureOverlay.classList.remove("hide");
        textureOverlay.style.opacity = "";
        fadeTextureIn();
    } else {
        // 关闭：淡出完成后才隐藏（display 突变会截断动画，必须等动画真正结束）
        fadeTextureOut(() => {
            textureOverlay.classList.add("hide");
        });
    }
}

// 监听主题切换：data-theme 属性变化（手动按钮 / 自动模式开关切换）
new MutationObserver(refreshTexture).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
});

// 监听系统深浅色自动切换（跟随系统模式下 <html> 没有 data-theme 属性，
// 属性观察不到，必须单独监听 media query）
const prefersLight = window.matchMedia("(prefers-color-scheme: light)");
prefersLight.addEventListener("change", () => {
    // 手动模式下系统切换不影响主题，无需刷新
    if (!document.documentElement.hasAttribute("data-theme")) {
        refreshTexture();
    }
});
