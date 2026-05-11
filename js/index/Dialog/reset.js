async function reset() {
    const result = await showDialog(
        getTranslation("settings.dev.resetDialog", currentLangPack),
        false
    );

    if (result) {
        // 清空且刷新
        localStorage.clear();
        location.reload();
    }
}