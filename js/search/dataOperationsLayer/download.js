async function download() {
    if (!activeImg) return;

    // 获取图片链接
    const imgURL = activeImg.src;
    let fileName = imgURL.split('/').pop().split('?')[0];
    if (!fileName) {
        fileName = "1999_wallpaper.png";
    }

    // 尝试下载
    try {
        // 此为测试
        // 添加时间戳，让浏览器强制绕过缓存，从服务器申请图片
        // const bypassCacheUrl = imgURL + (imgURL.includes('?') ? '&' : '?') + '_t=' + new Date().getTime();
        // const response = await fetch(bypassCacheUrl);

        // 走正常路径下载
        const response = await fetch(imgURL);
        const blob = await response.blob();

        // 内存中生成专属链接并点击下载
        const blobURL = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobURL;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();

        // 释放内存
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobURL);
    } catch (error) {
        try {
            const a = document.createElement('a');
            a.href = imgURL;
            a.download = fileName;
            a.click();
        } catch (error) {
            console.error(error);
            showDialog("下载失败，未知错误，详情查看控制台。", true);
        }
    }
}