const shareBtn = document.getElementById('share');
const shareContent = document.getElementById("shareButton");

shareBtn.addEventListener('click', async () => {
    // 获取当前网页的链接/图片链接
    const shareUrl = window.location.href;

    // 浏览器支持 Web Share API
    if (navigator.share) {
        try {
            // 分享成功
            await navigator.share({
                title: 'Reverse: 1999 Wallpapers',
                text: 'Timekeeper向您分享了一部分见闻...',
                url: shareUrl
            });
            shareSuccess();
        } catch (error) {
            // 用户点击了取消，或者分享失败
            shareWhatttttttHappen();
        }
    } else {
        // 不支持 Web Share API
        try {
            await copyText(shareUrl);
            shareSuccess();
            showDialog("当前环境不支持原生分享，已为您复制链接到剪贴板！", true);
        } catch (err) {
            console.error('复制失败:', err);
            shareWhatttttttHappen();
            showDialog("复制链接失败！请手动复制浏览器地址栏链接。", true);
        }
    }
});

// 分享成功!
function shareSuccess() {
    shareContent.textContent = "✔";
    shareContent.style.backgroundColor = "#ffffff";

    setTimeout(() => {
        shareContent.textContent = "分享";
        shareContent.style.backgroundColor = "";
    }, 3000);
}

// 分享失败...
// noinspection SpellCheckingInspection
function shareWhatttttttHappen() {
    shareContent.textContent = "？";
    shareContent.style.backgroundColor = "#ffffff";

    setTimeout(() => {
        shareContent.textContent = "分享";
        shareContent.style.backgroundColor = "";
    }, 3000);
}