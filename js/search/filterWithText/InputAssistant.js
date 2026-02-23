// 用于输入提示的所有逻辑代码
// 这个js文件的代码由ai完成，我只是做了简单审查

// 引入预设的词库
const allTagsPool = [
    ...characterPool, ...mainLinePool, ...eventPool, ...anecdotePool,
    ...versionCodePool, ...yearPool, ...lightAndDarkPool, ...specialPool
];

const inputBox = document.getElementById('input');
const inputTips = document.getElementById('inputTips');

// 状态变量
// 当前匹配到的所有词
let filteredTags = [];
// 当前页码
let currentPage = 0;
// 每页固定 5 个
const itemsPerPage = 5;
// 当前页高亮的索引
let selectedIndex = 0;

// 监听输入框打字
inputBox.addEventListener('input', function() {
    // 获取光标位置
    const cursor = this.selectionStart;
    // 只截取光标前面的文本
    const textBeforeCursor = this.value.substring(0, cursor);
    // 按空格分割光标前的文本
    const wordsArray = textBeforeCursor.split(/\s+/);
    // 精准获取光标正在修改的词
    const currentWord = wordsArray[wordsArray.length - 1];

    if (!currentWord) {
        // 如果没有输入，直接返回
        inputTips.style.display = 'none';
        return;
    }

    // 进行匹配，结果存入matches
    let matches = allTagsPool.filter(tag => tag.toLowerCase().includes(currentWord.toLowerCase()));

    if (matches.length === 0) {
        // 没匹配到
        inputTips.style.display = 'none';
        return;
    }

    // 权重排序逻辑 (精准匹配 > 开头匹配 > 包含)
    matches.sort((a, b) => {
        // 不区分大小写
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const qLower = currentWord.toLowerCase();

        // 精确匹配
        const aExact = aLower === qLower ? 1 : 0;
        const bExact = bLower === qLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact; // 完全匹配优先

        // 开头匹配
        const aStarts = aLower.startsWith(qLower) ? 1 : 0;
        const bStarts = bLower.startsWith(qLower) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts; // 开头匹配优先

        // 包含
        return a.length - b.length; // 如果都是包含，较短的排前面 (相关性更高)
    });

    // 更新状态并渲染
    filteredTags = matches;
    currentPage = 0;
    selectedIndex = 0;
    renderTips();
});

// 渲染提示框
function renderTips() {
    // 清空旧的 words
    const oldWords = inputTips.querySelectorAll('.words');
    oldWords.forEach(w => w.remove());

    // 切出当前页要展示的五个提示词
    const startIndex = currentPage * itemsPerPage;
    const currentDisplayedTags = filteredTags.slice(startIndex, startIndex + itemsPerPage);

    // 插入，当前选中的要高亮
    currentDisplayedTags.forEach((tag, index) => {
        const div = document.createElement('div');
        div.className = 'words';
        if (index === selectedIndex) div.classList.add('active');
        div.textContent = tag;
        inputTips.appendChild(div);
    });

    // 控制翻页箭头的显示
    const hasPrev = currentPage > 0;
    const hasNext = (currentPage + 1) * itemsPerPage < filteredTags.length;
    inputTips.setAttribute('data-has-prev', hasPrev);
    inputTips.setAttribute('data-has-next', hasNext);

    inputTips.style.display = 'block';
}

// 把用户选择的词汇添加到文本框
function selectTag(wordIndex) {
    // 获取选择的词在总匹配列表(filteredTags)里的真实序号
    const startIndex = currentPage * itemsPerPage;
    const selectedWord = filteredTags[startIndex + wordIndex];
    if (!selectedWord) return;

    // 获取光标之前和之后的文本
    const cursor = inputBox.selectionStart;
    const textBeforeCursor = inputBox.value.substring(0, cursor);
    const textAfterCursor = inputBox.value.substring(cursor);

    // 获取用户正在编辑的文本，进行替换，替换成selectedWord，就是在列表里面选择的文本
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ');
    const newTextBefore = textBeforeCursor.substring(0, lastSpaceIndex + 1) + selectedWord;

    // 最终结果：前半部分 + 后半部分
    inputBox.value = newTextBefore + textAfterCursor;

    inputTips.style.display = 'none';

    // 保持焦点，并把光标放在补全的词的后面
    setTimeout(() => {
        inputBox.focus();
        inputBox.selectionStart = inputBox.selectionEnd = newTextBefore.length;
    }, 0);
}

// 键盘快捷键监听逻辑
inputBox.addEventListener('keydown', function(e) {
    if (inputTips.style.display !== 'block') return; // 没显示提示框时不接管

    // 计算当前显示的提示词数量
    const currentDisplayedCount = Math.min(itemsPerPage, filteredTags.length - currentPage * itemsPerPage);

    if (e.key === 'ArrowUp') { // 上一个词
        e.preventDefault();
        // 循环滚动
        selectedIndex = (selectedIndex - 1 + currentDisplayedCount) % currentDisplayedCount;
        updateHighlight();
    }
    else if (e.key === 'ArrowDown') { // 下一个词
        e.preventDefault();
        // 循环滚动
        selectedIndex = (selectedIndex + 1) % currentDisplayedCount;
        updateHighlight();
    }
    else if (e.key === '-') { // 上一页
        e.preventDefault();
        if (currentPage > 0) {
            currentPage--;
            selectedIndex = 0;
            renderTips();
        }
    }
    else if (e.key === '=') { // 下一页
        e.preventDefault();
        if ((currentPage + 1) * itemsPerPage < filteredTags.length) {
            currentPage++;
            selectedIndex = 0;
            renderTips();
        }
    }
    else if (e.key === 'Tab') { // 选中单词
        e.preventDefault(); // 阻止切走焦点
        selectTag(selectedIndex);
    }
});

// 单独更新高亮
function updateHighlight() {
    const wordElements = inputTips.querySelectorAll('.words');
    wordElements.forEach((el, index) => {
        if (index === selectedIndex) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// 鼠标接管逻辑 (用 mousedown 而不是 click，防止输入框失去焦点)
inputTips.addEventListener('mousedown', function(e) {
    e.preventDefault(); // 点了下拉框，输入框也不会失去焦点

    if (e.target.id === 'previous') { // 点击上一页
        if (currentPage > 0) {
            currentPage--;
            selectedIndex = 0;
            renderTips();
        }
    }
    else if (e.target.id === 'next') { // 下一页
        if ((currentPage + 1) * itemsPerPage < filteredTags.length) {
            currentPage++;
            selectedIndex = 0;
            renderTips();
        }
    }
    else if (e.target.classList.contains('words')) { // 点击候选词
        // 找到点的是第几个
        const wordElements = Array.from(inputTips.querySelectorAll('.words'));
        const clickedIndex = wordElements.indexOf(e.target);
        if (clickedIndex > -1) {
            selectTag(clickedIndex);
        }
    }
});

// 点击空白处关闭，点击文本框打开
document.addEventListener('mousedown', function(e) {
    // 如果点的既不是输入框，也不是提示框，就隐藏
    if (e.target !== inputBox && !inputTips.contains(e.target)) {
        inputTips.style.display = 'none';
    } else if (e.target === inputBox){
        // 打开不需要刷新，省心，虽然会遗留一条
        // 这是特性，当历史记录用了，就酱
        inputTips.style.display = 'block';
    }
});