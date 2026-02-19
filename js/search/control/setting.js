function openSettings() {
    const overlay = document.getElementById('overlay');
    const setFrame = document.getElementById("setFrame");

    // 滚动锁定，防止背景滚动
    toggleScrollLock(true);
    overlay.classList.add('show');
    setFrame.classList.add('show');

    overlay.addEventListener('click', closeSettings);
    function closeSettings() {
        toggleScrollLock(false);
        overlay.classList.remove('show');
        setFrame.classList.remove('show');
    }
}