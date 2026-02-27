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