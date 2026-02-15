function copyMode() {
    const allow = document.getElementById("allowCopy").checked;

    if (allow) {
        document.body.classList.add("mode-copy");
    } else {
        document.body.classList.remove("mode-copy");
    }
}