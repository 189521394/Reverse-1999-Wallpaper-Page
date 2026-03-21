const dock = document.getElementById("dock");

dock.addEventListener("mouseenter",function (e) {
    dock.classList.add('dockin');
    dock.classList.remove('dockout');
});
dock.addEventListener("mouseleave",function (e) {
    dock.classList.add('dockout');
    dock.classList.remove('dockin');
});