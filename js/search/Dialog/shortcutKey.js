async function showKey() {
    const result = await showDialog(
        "↑/↓：上一个/下一个标签，支持循环滚动。\n" +
        "Tab：选中标签。\n" +
        "-/+：上一页/下一页。",
        true
    );
}