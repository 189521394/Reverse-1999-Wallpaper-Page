function openSettings() {
    const overlay = document.getElementById('overlay');
    const setBox = document.getElementById("setBox");

    toggleScrollLock(true);
    setBox.classList.add('show');
    overlay.classList.add('show');

    overlay.addEventListener('click', closeSettings);
    function closeSettings() {
        toggleScrollLock(false);
        overlay.classList.remove('show');
        setBox.classList.remove('show');
    }
}