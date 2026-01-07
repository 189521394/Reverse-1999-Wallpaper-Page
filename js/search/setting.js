function openSettings() {
    const overlay = document.getElementById('overlay');
    const setBox = document.getElementById("setBox");

    document.body.style.overflow = "hidden";
    setBox.classList.add('show');
    overlay.classList.add('show');

    overlay.addEventListener('click', closeSettings);
    function closeSettings() {
        document.body.style.overflow = "";
        overlay.classList.remove('show');
        setBox.classList.remove('show');
    }
}