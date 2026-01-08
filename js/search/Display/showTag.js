async function showTag(targetURL) {
    let showBox = document.getElementById("returnTag");
    let Tags = await loadTag(targetURL);
    console.log(Tags);

    showBox.replaceChildren();
    showBox.classList.add("show");

    let cache = document.createDocumentFragment();

    for (let i = 0; i < Tags.length; i++) {
        let div = document.createElement("div");

        div.textContent = Tags[i];
        div.className = "tags";

        cache.appendChild(div);
    }

    showBox.appendChild(cache);
}