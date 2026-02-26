// 该文件用于创建标准对话框
// 通过函数封装对话框，通过参数决定对话框样式

// 引入公共对象
const dialogBox = document.getElementById("noticeBox");
const noticeTitle = document.getElementById("noticeTitle");
const noticeContent = document.getElementById("noticeContent");
const noticeOption = document.getElementById("noticeOption");

const cancelButton = document.getElementById("CANCEL");
const confirmButton = document.getElementById("CONFIRM");

// 控制动画细节
function dialogAnimation(boolean) {
    if (boolean) {
        dialogBox.classList.add("show");
        noticeTitle.classList.add("show");
        noticeContent.classList.add("show");
        noticeOption.classList.add("show");
    } else {
        noticeTitle.classList.remove("show");
        noticeContent.classList.remove("show");
        noticeOption.classList.remove("show");
        dialogBox.classList.remove("show");
    }
}

// 主对话框逻辑
function showDialog(showText, notice) {
    return new Promise((resolve) => {
        // 设置文本
        noticeContent.textContent = showText;

        // 确定对话框性质
        if (notice) {
            cancelButton.style.display = "none";
        } else {
            cancelButton.style.display = "flex";
        }

        // 显示对话框
        dialogAnimation(true);
        toggleScrollLock(true);

        // 处理返回值
        const handleCONFIRM = () => {
            cleanup();
            resolve(true);
        };
        const handleCANCEL = () => {
            cleanup();
            resolve(false);
        };

        // 清空监听器
        const cleanup = () => {
            confirmButton.removeEventListener("click", handleCONFIRM);
            cancelButton.removeEventListener("click", handleCANCEL);
            // 隐藏对话框
            dialogAnimation(false);
            toggleScrollLock(false);
        };

        // 添加监听器，等待点击
        confirmButton.addEventListener("click", handleCONFIRM);
        cancelButton.addEventListener("click", handleCANCEL);
    });
}