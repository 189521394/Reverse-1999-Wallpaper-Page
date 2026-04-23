async function showKey() {
    let tipsText = getTranslation("searchWithInput.tipsContent", currentLangPack);
    await showDialog(tipsText,true);
}