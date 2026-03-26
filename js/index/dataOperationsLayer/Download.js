async function download() {
    if (!activeImg) return;

    // 只获取文件名称，该链接不参与下载
    const imgURL = activeImg.dataset.original;
    let fileName = imgURL.split('/').pop().split('?')[0];
    if (!fileName) {
        fileName = "1999_wallpaper.png";
    }

    // 尝试下载
    try {
        // 判断图片是否还在加载中
        if (activeImg.dataset.loadStatus !== "finished") {
            // 让代码等待进度条
            if (activeImg.fetchResult) {
                await activeImg.fetchResult;
            }
        }

        // 图片下载完成，推送
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = activeImg.src; // 白嫖已经显示在屏幕上的图片的 src
        a.download = fileName;

        document.body.appendChild(a);
        a.click();

        // 释放 a 标签即可，不要释放 blobURL，因为屏幕上的 img 还要用它显示
        document.body.removeChild(a);
    } catch (error) {
        console.error(error);
        showDialog("下载失败，未知错误！", true);
    }
}