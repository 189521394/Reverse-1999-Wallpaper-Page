function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    element.scrollIntoView({behavior:"smooth"});
}