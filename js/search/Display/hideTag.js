function hideTag() {
    let showBox = document.getElementById("returnTag");

    showBox.replaceChildren();
    showBox.classList.remove("show");
}