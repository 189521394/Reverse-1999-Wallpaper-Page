let pool = document.getElementById("submitPool");

function submit() {
    let select = [];
    for (let child of pool.children) {
        select.push(child.textContent);
    }
    DisplayImg(select);
}