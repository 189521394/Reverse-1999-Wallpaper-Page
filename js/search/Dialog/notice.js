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
/**
 * @param {string} showText     -必选，提示文本
 * @param {boolean} [notice]    -可选，true只有确定，false和不写都是确定取消
 * @param {string} [hash]       -可选，不写就是重复性对话框，如果写就是只显示一次的对话框且格式必须是纯字符串
 * @returns {Promise<boolean>}  -true/false 对应 确定/取消 ，如果是一次性对话框，只有true
 */
function showDialog(showText, notice, hash) {
    // 只显示一次的对话框
    if (hash) {
        if (localStorage.getItem(hash)) {
            return Promise.resolve(true);
        }
    }
    return new Promise((resolve) => {
        // 保存屏幕锁定状态，对话框关闭要还原
        let ScrollLockState;
        // 设置文本
        noticeContent.textContent = showText;

        // 确定对话框性质
        if (notice) {
            cancelButton.style.display = "none";
        } else {
            cancelButton.style.display = "flex";
        }

        // 保存记忆
        const saveMemory = () => {
            if (hash) {
                localStorage.setItem(hash, "true");
            }
        }

        // 显示对话框
        dialogAnimation(true);
        ScrollLockState = isScrollLocked();
        toggleScrollLock(true);

        // 处理返回值
        const handleCONFIRM = () => {
            cleanup();
            saveMemory();
            resolve(true);
        };
        const handleCANCEL = () => {
            cleanup();
            saveMemory();
            resolve(false);
        };

        // 清空监听器
        const cleanup = () => {
            confirmButton.removeEventListener("click", handleCONFIRM);
            cancelButton.removeEventListener("click", handleCANCEL);
            // 隐藏对话框
            dialogAnimation(false);

            // 恢复锁定状态
            toggleScrollLock(ScrollLockState);
        };

        // 添加监听器，等待点击
        confirmButton.addEventListener("click", handleCONFIRM);
        cancelButton.addEventListener("click", handleCANCEL);
    });
}