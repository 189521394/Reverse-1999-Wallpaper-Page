async function DisplayImg(tags) {
    let outSet = await loadURL(tags);

    let box = document.getElementById("select");
    let result = document.getElementById("result");
    let quantity = outSet.length;

    // 在这里直接输出筛选结果数量，不要重复计算
    result.textContent = quantity + "个筛选结果";

    // 清空
    box.replaceChildren();
    // 创建一个虚拟对象，防止多次触发重绘
    let cache = document.createDocumentFragment();

    for (let i = 0; i < quantity; i++) {
        // 创建元素
        let img = document.createElement("img");
        // 添加类名
        img.className = "imgs";
        // 设置图片
        img.src = "" + outSet[i] + ""
        // 先放到虚拟对象里面
        cache.appendChild(img);
    }
    // 把虚拟对象追加进去，仅触发一次重绘
    box.appendChild(cache)

    // 设置动画，必须在此设置，因为图片是动态追加进去的，不然js会获取不到图片
    setAnimation();
}