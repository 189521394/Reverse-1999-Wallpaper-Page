// 切换胶片质感
function switchTexture() {
    const texture = document.getElementById("useTexture").checked;
    const textureOverlay = document.getElementById("texture");

    if (texture) {
        textureOverlay.classList.remove("hide");
    } else {
        textureOverlay.classList.add("hide");
    }
}