import re
import os
import shutil
import json
import sys
import html
import hashlib
import glob

# 项目根目录：脚本位于 tools/ 下，无论从哪个目录运行都以此定位源码
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 修复 Windows 中文系统 GBK 控制台无法打印 emoji 的问题
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# ==========================================
# 🛠️ 构建配置区 (可在此处自由增删需要打包的文件)
# ==========================================

# 1. 需要进行 JS/CSS 合并压缩的 HTML 页面
HTML_FILES_TO_PROCESS = [
    'index.html',
    'propaganda.html',
    '404.html'
]

# 2. 需要原样拷贝到 dist 目录的静态资源 (文件/文件夹)
# 注意：Filter.json 由编译器单独处理，无需写在这里
# 注意：sitemap.xml 不再原样拷贝，由 generate_sitemap() 动态生成
STATIC_ASSETS_TO_COPY = [
    'font',
    'favicon.png',
    'lang',
    '_worker.js'    # Worker（拷贝后由 inject_worker_pic_map() 注入单图映射字典）
]

# 3. 构建输出目录
DIST_DIR = 'dist'

# ==========================================
# SEO 落地页生成配置
# ==========================================

SITE_URL = 'https://r9wallpaper.org'
IMG_DOMAIN = 'https://img.r9wallpaper.org'

# 拥有落地页路由的分类（year/Tone/special 不收录）
SEO_CATEGORIES = ('character', 'versionCode', 'mainLine', 'event', 'anecdote')

# 分类 → 路由前缀
CATEGORY_ROUTE_PREFIX = {
    'character': '/c/',
    'versionCode': '/v/',
    'mainLine': '/s/',
    'event': '/e/',
    'anecdote': '/a/'
}

# 汇总标签（slug 为空，映射到分类根路径）
AGGREGATE_TAGS = ('zhu_xian_ju_qing', 'huo_dong_ju_qing', 'yi_shi')

# 设置面板 4 页签路由配置：路径名 → (DOM ID, 内容区 ID, 标题键)
SETTING_PAGES = {
    'preference': {'itemId': 'preference', 'listId': 'setList', 'robots': 'noindex, follow'},
    'mail': {'itemId': 'mail', 'listId': 'mailList', 'robots': 'index, follow'},
    'about': {'itemId': 'about', 'listId': 'aboutList', 'robots': 'index, follow'},
    'debug': {'itemId': 'deBug', 'listId': 'debugList', 'robots': 'noindex, follow'}
}

# 首页元信息（英文版在生成 /en/index.html 时使用）
HOME_ZH_TITLE = '重返未来：1999 壁纸资源站 | 官方高清 CG 与壁纸收藏 (Reverse: 1999)'
HOME_EN_TITLE = 'Reverse: 1999 Wallpapers & Backgrounds | Official HD CG & Wallpaper Collection'
HOME_ZH_DESCRIPTION = '专为《重返未来：1999》(Reverse: 1999) 设计的高清壁纸网站。收录大量官方CG图像，可供快速筛选与下载。'
HOME_EN_DESCRIPTION = 'An HD wallpaper website designed exclusively for Reverse: 1999. It features a massive collection of official CG wallpapers & backgrounds, available for quick filtering and download.'
HOME_ZH_KEYWORDS = 'Reverse 1999, 重返未来1999, 1999壁纸, 重返未来1999壁纸, 1999CG, 重返未来壁纸, wallpapers, 游戏壁纸, 重返未来官方CG, 重返未来高清壁纸, 重返未来手机壁纸, 重返未来桌面壁纸, Reverse1999 wallpaper, 1999官方壁纸'
HOME_EN_KEYWORDS = 'Reverse 1999, 1999 wallpaper, Reverse: 1999 wallpapers, Reverse 1999 official CG, HD wallpapers, desktop wallpapers, mobile wallpapers, anime game wallpapers, Reverse 1999 wallpaper download, Reverse 1999 phone wallpaper, Reverse 1999 character art, anime artwork'

# ==========================================
# 以下为核心构建逻辑，通常无需修改
# ==========================================

def content_hash(content: str, length: int = 8) -> str:
    """计算文本内容的 MD5 哈希（取前 N 位），用于缓存绕过"""
    return hashlib.md5(content.encode('utf-8')).hexdigest()[:length]

def hash_rename(filepath: str) -> str:
    """读取文件内容，计算哈希，重命名文件并返回新文件名
    例：dist/Filter.json → dist/Filter.a3f8c201.json
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        file_content = f.read()
    h = content_hash(file_content)
    base, ext = os.path.splitext(filepath)
    new_path = f'{base}.{h}{ext}'
    os.rename(filepath, new_path)
    return os.path.basename(new_path)


def minify_css(css_text):
    """极简 CSS 压缩：去注释、去换行"""
    css_text = re.sub(r'/\*[\s\S]*?\*/', '', css_text)
    css_text = re.sub(r'\s+', ' ', css_text)
    css_text = re.sub(r'\s*([\{\}\:\;\,\>])\s*', r'\1', css_text)
    return css_text.strip()

def minify_js(js_text):
    """安全 JS 压缩：移除注释和多余空行"""
    js_text = re.sub(r'/\*[\s\S]*?\*/', '', js_text)
    js_text = re.sub(r'(?<![:])//.*', '', js_text)
    js_text = re.sub(r'\n\s*\n', '\n', js_text)
    return js_text.strip()

def process_html(html_file, dist_dir, data_paths=None):
    if not os.path.exists(html_file):
        print(f"⚠️ 警告：找不到 {html_file}")
        return

    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 精准匹配 css/ 和 js/ 目录下的文件（兼容带前导 / 和不带的写法）
    css_links = re.findall(r'<link rel="stylesheet" href="/?(css/[^"]+)">', html_content)
    # 兼容带有 defer 和没有 defer 的 script 标签
    js_links = re.findall(r'<script src="/?(js/[^"]+)"[^>]*></script>', html_content)

    # 去重并保持顺序
    css_links = list(dict.fromkeys(css_links))
    js_links = list(dict.fromkeys(js_links))

    base_name = html_file.split('.')[0]

    # 合并压缩
    combined_css = ""
    for css in css_links:
        if os.path.exists(css):
            with open(css, 'r', encoding='utf-8') as f:
                combined_css += minify_css(f.read()) + "\n"
        else:
            print(f"⚠️ 警告: 找不到 CSS 文件 {css}")

    combined_js = ""
    for js in js_links:
        if os.path.exists(js):
            with open(js, 'r', encoding='utf-8') as f:
                combined_js += f";\n{minify_js(f.read())}\n"
        else:
            print(f"⚠️ 警告: 找不到 JS 文件 {js}")

    # 计算内容哈希并生成带哈希的文件名
    css_hash = content_hash(combined_css)
    js_hash = content_hash(combined_js)
    bundle_css_name = f'bundle_{base_name}.{css_hash}.css'
    bundle_js_name = f'bundle_{base_name}.{js_hash}.js'

    # 写入 dist 目录
    with open(os.path.join(dist_dir, bundle_css_name), 'w', encoding='utf-8') as f:
        f.write(combined_css)
    with open(os.path.join(dist_dir, bundle_js_name), 'w', encoding='utf-8') as f:
        f.write(combined_js)

    # 替换原 HTML 中的散装引用（兼容带前导 / 和不带的写法）
    prod_html = re.sub(r'<link rel="stylesheet" href="/?css/[^"]+">\n?', '', html_content)
    prod_html = re.sub(r'<script src="/?js/[^"]+"[^>]*></script>\n?', '', prod_html)

    # 构建注入代码段
    inject_parts = []

    # 仅 index.html 需要注入 DATA_PATHS（它是主站入口）
    if data_paths and html_file == 'index.html':
        # 注入 DATA_PATHS 全局变量（内联 script，无 defer，先于 bundle 执行）
        paths_json = json.dumps(data_paths, ensure_ascii=False, separators=(',', ':'))
        inject_parts.append(f'<script>var DATA_PATHS={paths_json}</script>')

        # 更新 preload 标签中的 Filter.json 路径
        prod_html = re.sub(
            r'<link rel="preload" href="/Filter\.json"',
            f'<link rel="preload" href="{data_paths["filter"]}"',
            prod_html
        )

    # bundle 引用必须带前导 /（根路径），否则子目录落地页（如 /c/vertin/index.html）会找不到 CSS 和 JS
    inject_parts.append(f'<link rel="stylesheet" href="/{bundle_css_name}">')
    inject_parts.append(f'<script src="/{bundle_js_name}" defer></script>')

    inject_str = '\n    '.join(inject_parts) + '\n</head>'
    prod_html = prod_html.replace('</head>', inject_str)

    # 保存新的生产版 HTML
    with open(os.path.join(dist_dir, html_file), 'w', encoding='utf-8') as f:
        f.write(prod_html)

def compile_filter_json(dist_dir):
    """
    【核心预编译环节】: 读取 Filter.json，清洗中文为 ID，并极限压缩
    返回 (compiled_data, dictionary)，供 SEO 落地页生成使用
    """
    filter_file = 'Filter.json'
    dict_file = os.path.join('lang', 'tagData.json')

    print("正在编译 Filter.json...")

    if not os.path.exists(dict_file):
        print(f"❌ 致命错误: 找不到字典文件 {dict_file}")
        sys.exit(1)

    if not os.path.exists(filter_file):
        print(f"❌ 致命错误: 找不到数据文件 {filter_file}")
        sys.exit(1)

    # 1. 构建中文反查表
    with open(dict_file, 'r', encoding='utf-8') as f:
        dictionary = json.load(f)

    zh_to_id = {}
    for tag_id, item in dictionary.items():
        if 'zh' in item:
            zh_to_id[item['zh']] = tag_id

    # 2. 处理图片标签数据
    with open(filter_file, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    compiled_data = []
    for item in raw_data:
        new_item = item.copy()

        # 处理 tags
        new_tags = []
        for zh_tag in item.get('tags', []):
            if zh_tag in zh_to_id:
                new_tags.append(zh_to_id[zh_tag])
            else:
                print(f"\n❌ 构建中断！存在未注册的标签: [{zh_tag}]")
                print(f"   定位: {item.get('file')}")
                print(f"   排错指引: 请先在 lang/tagData.json 中补充该词条再打包！\n")
                sys.exit(1)
        new_item['tags'] = new_tags

        # 处理 tone
        new_tones = []
        for zh_tone in item.get('tone', []):
            if zh_tone in zh_to_id:
                new_tones.append(zh_to_id[zh_tone])
            else:
                print(f"\n❌ 构建中断！存在未注册的色调标签: [{zh_tone}]")
                print(f"   定位: {item.get('file')}")
                print(f"   排错指引: 请先在 lang/tagData.json 中补充该词条再打包！\n")
                sys.exit(1)
        new_item['tone'] = new_tones

        compiled_data.append(new_item)

    # 3. 写入 dist 并极致压缩
    dist_file = os.path.join(dist_dir, filter_file)
    with open(dist_file, 'w', encoding='utf-8') as f:
        json.dump(compiled_data, f, ensure_ascii=False, separators=(',', ':'))

    return compiled_data, dictionary

def build_project():
    print("开始构建生产环境代码...")

    # 每次打包前清空旧的 dist
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

    # ========== 阶段 1: 编译 & 拷贝所有静态资源 ==========

    # 1a. 预编译 Filter.json（中文→ID + 极限压缩）
    compiled_data, dictionary = compile_filter_json(DIST_DIR)

    # 1b. 白名单拷贝
    print("正在拷贝必需的静态资源...")
    for item in STATIC_ASSETS_TO_COPY:
        if not os.path.exists(item):
            print(f"⚠️ 警告: 找不到资源 {item}")
            continue

        dst_path = os.path.join(DIST_DIR, item)
        if os.path.isdir(item):
            shutil.copytree(item, dst_path)
        else:
            shutil.copy2(item, dst_path)

    # ========== 阶段 2: 对 JSON 文件做内容哈希重命名 ==========
    print("正在为 JSON 文件生成缓存哈希...")

    data_paths = {'lang': {}}

    # 2a. Filter.json → Filter.{hash}.json
    filter_hashed = hash_rename(os.path.join(DIST_DIR, 'Filter.json'))
    data_paths['filter'] = f'/{filter_hashed}'
    print(f"  Filter.json → {filter_hashed}")

    # 2b. lang/ 目录下的所有 JSON 文件
    lang_dir = os.path.join(DIST_DIR, 'lang')
    for json_file in sorted(glob.glob(os.path.join(lang_dir, '*.json'))):
        basename = os.path.basename(json_file)
        name_without_ext = os.path.splitext(basename)[0]  # "zh", "en", "tagData"

        hashed_name = hash_rename(json_file)

        if name_without_ext == 'tagData':
            data_paths['tagData'] = f'/lang/{hashed_name}'
        else:
            # 语言包：zh, en, 以及未来可能新增的 ja 等
            data_paths['lang'][name_without_ext] = f'/lang/{hashed_name}'

        print(f"  lang/{basename} → {hashed_name}")

    # ========== 阶段 3: 处理 HTML 页面，生成带哈希的 bundle ==========
    for html_file in HTML_FILES_TO_PROCESS:
        process_html(html_file, DIST_DIR, data_paths)

    # ========== 阶段 4: 生成 SEO 落地页 + 图片 Sitemap + Worker 注入 ==========
    generate_seo_pages(DIST_DIR, compiled_data, dictionary)

    # ========== 完成 ==========
    print(f"\n[OK] 构建成功！（已启用内容哈希缓存绕过）")
    print(f"Cloudflare 将发布 /{DIST_DIR} 中的内容。")

# ==========================================
# SEO 落地页生成（阶段 4 调用）
# ==========================================

# 设置面板页签 → 语言包 settingsMenu 键
MENU_KEYS = {'preference': 'preferences', 'mail': 'mail', 'about': 'about', 'debug': 'devOpt'}

# head 元信息块（title 到 hreflang x-default）替换正则
HEAD_SEO_RE = re.compile(r'<title>.*?</title>.*?<link rel="alternate" hreflang="x-default"[^>]*/>', re.S)
H1_RE = re.compile(r'(<h1 id="h1-title" class="h1-title">).*?(</h1>)', re.S)
# data-i18n 元素的直接文本节点（用于静态注入最新语言包文本）
DATA_I18N_TEXT_RE = re.compile(r'(<(?:div|span|label)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[^<]*(?=<)', re.S)

SUBMIT_POOL_EMPTY = '<div id="submitPool" class="custom-scroll" data-i18n-before="searchWithTag.submitPool.tips"></div>'
SELECT_EMPTY = '<div id="select" data-i18n-before="gallery.tips"></div>'


def get_pic_id(file):
    """图片路径 → 全局唯一单图 ID（大写前缀 + 下划线 + 原文件名，不带扩展名）"""
    base = os.path.basename(file).replace('.png', '')
    if '/story_atcg/' in file:
        return 'ATCG_' + base
    if '/story_bg/' in file:
        return 'BG_' + base
    return 'CG_' + base


def thumb_path(file):
    """原图路径 → 缩略图路径"""
    return file.replace('resource/', 'resource/thumbnails/', 1).replace('.png', '.webp')


def is_background(item):
    """判断是否为背景图（与前端 showBackgrounds=false 严格一致：tags 含 background 标签）
    注意：不能用 /story_bg/ 路径判断——有 183 张该路径下的图并未打 background 标签，前端会正常显示"""
    return 'background' in (item.get('tags') or [])


def collect_tag_info(item, dictionary, lang):
    """提取图片的角色/章节/版本标签显示名（跳过汇总标签）"""
    chars, chapters, versions = [], [], []
    for t in (item.get('tags') or []):
        if t in AGGREGATE_TAGS:
            continue
        entry = dictionary.get(t, {})
        cat = entry.get('category', '')
        name = entry.get(lang) or entry.get('zh', '') or t
        if cat == 'character':
            chars.append(name)
        elif cat in ('mainLine', 'event', 'anecdote'):
            chapters.append(name)
        elif cat == 'versionCode':
            versions.append(name)
    return chars, chapters, versions


def build_alt_text(item, dictionary, lang):
    """生成 img 的 alt 文本，如：维尔汀, 十四行诗 - 此即明日 (1.0) | 重返未来：1999 官方CG壁纸"""
    chars, chapters, versions = collect_tag_info(item, dictionary, lang)
    parts = []
    if chars:
        parts.append(', '.join(chars))
    if chapters:
        ch = ', '.join(chapters)
        if versions:
            ch += f' ({versions[0]})'
        parts.append(ch)
    elif versions:
        parts.append(f'({versions[0]})')
    middle = ' - '.join(parts)
    suffix = '重返未来：1999 官方CG壁纸' if lang == 'zh' else 'Reverse: 1999 Official CG Wallpaper'
    return f'{middle} | {suffix}' if middle else suffix


def build_short_title(item, dictionary, lang):
    """生成简短标题（Worker 单图卡片用），如：维尔汀, 1.0"""
    chars, chapters, versions = collect_tag_info(item, dictionary, lang)
    names = chars or chapters
    prefix = ', '.join(names[:2])
    if versions:
        prefix = f'{prefix}, {versions[0]}' if prefix else versions[0]
    return prefix or os.path.basename(item['file']).replace('.png', '')


def natural_key(s):
    """版本号自然排序键：1.0 < 1.9 < 2.0"""
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)]


def build_seo_description(tag_id, matches, dictionary, lang):
    """生成单标签落地页的描述文本（张数 + 版本跨度 + 常同框角色）"""
    entry = dictionary.get(tag_id, {})
    name = entry.get(lang) or entry.get('zh', '') or tag_id
    n = len(matches)
    versions = set()
    co_chars = {}
    for m in matches:
        chars, _chapters, vers = collect_tag_info(m, dictionary, lang)
        versions.update(vers)
        for c in chars:
            co_chars[c] = co_chars.get(c, 0) + 1
    sorted_versions = sorted(versions, key=natural_key)
    top_chars = [c for c, _ in sorted(co_chars.items(), key=lambda kv: -kv[1])][:5]
    if lang == 'zh':
        # 中文：版本与角色名均用顿号分隔，截断加"等"
        version_str = '、'.join(sorted_versions) or '未知'
        if len(sorted_versions) > 8:
            version_str = '、'.join(sorted_versions[:8]) + ' 等'
        char_str = '、'.join(top_chars)
        desc = f'{name}官方高清CG壁纸合集，共收录{n}张，涵盖版本{version_str}。'
        if char_str:
            desc += f'常与{char_str}同框出现。'
        desc += '重返未来：1999 壁纸资源站，提供官方CG高清壁纸的快速筛选与下载。'
    else:
        # 英文：版本与角色名均用英文逗号分隔，截断加 etc（不带句号，模板末尾已有点号）
        version_str = ', '.join(sorted_versions) or 'unknown'
        if len(sorted_versions) > 8:
            version_str = ', '.join(sorted_versions[:8]) + ', etc'
        char_str = ', '.join(top_chars)
        desc = f'Official HD CG wallpapers & backgrounds of {name}: {n} images across versions {version_str}.'
        if char_str:
            desc += f' Frequently featuring {char_str}.'
        desc += ' Reverse: 1999 gallery with fast filtering and downloads.'
    return desc


def build_head_block(lang, title, description, keywords, page_path, og_image, robots=None):
    """生成 <title> 到 hreflang x-default 的完整元信息块（page_path 以 / 开头，恒为中文路径）"""
    page_url = SITE_URL + page_path if lang == 'zh' else SITE_URL + '/en' + page_path
    lines = []
    if robots:
        lines.append(f'<meta name="robots" content="{robots}">')
    lines += [
        f'<title>{html.escape(title)}</title>',
        f'<meta name="description" content="{html.escape(description)}">',
        f'<meta name="keywords" content="{html.escape(keywords)}">',
        f'<meta property="og:url" content="{page_url}">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:title" content="{html.escape(title)}">',
        f'<meta property="og:description" content="{html.escape(description)}">',
        f'<meta property="og:image" content="{og_image}">',
        '<link rel="icon" type="image/png" href="/favicon.png">',
        f'<link rel="canonical" href="{page_url}" />',
        f'<link rel="alternate" hreflang="zh" href="{SITE_URL + page_path}" />',
        f'<link rel="alternate" hreflang="en" href="{SITE_URL + "/en" + page_path}" />',
        f'<link rel="alternate" hreflang="x-default" href="{SITE_URL + page_path}" />',
    ]
    return '\n    '.join(lines)


def replace_head_seo(html_text, lang, title, description, keywords, page_path, og_image, robots=None):
    """替换模板 head 中的元信息块"""
    new_block = build_head_block(lang, title, description, keywords, page_path, og_image, robots)
    return HEAD_SEO_RE.sub(lambda m: new_block, html_text, count=1)


def replace_h1(html_text, title):
    """替换 h1 文本为页面标题"""
    return H1_RE.sub(lambda m: m.group(1) + html.escape(title) + m.group(2), html_text, count=1)


def fill_submit_pool(html_text, tag_id, category, display_name):
    """预填 submitPool（严禁换行和空格，submit.js 依赖 :empty 与 children.textContent）"""
    filled = (SUBMIT_POOL_EMPTY[:-len('</div>')]
              + f'<div class="waiting" data-raw-tag="{tag_id}" data-category="{category}">{html.escape(display_name)}</div>'
              + '</div>')
    return html_text.replace(SUBMIT_POOL_EMPTY, filled, 1)


def build_img_tag(item, dictionary, lang):
    """生成预渲染的 img 标签（含完整 alt 属性）"""
    orig = IMG_DOMAIN + '/' + item['file']
    thumb = IMG_DOMAIN + '/' + thumb_path(item['file'])
    alt = html.escape(build_alt_text(item, dictionary, lang))
    return (f'<img class="imgs" src="{thumb}" data-original="{orig}" data-thumb="{thumb}" '
            f'alt="{alt}" loading="lazy" crossorigin="anonymous">')


def fill_select(html_text, items, dictionary, lang):
    """预渲染前 N 张图片到 #select 容器"""
    imgs = '\n'.join('        ' + build_img_tag(it, dictionary, lang) for it in items)
    return html_text.replace(SELECT_EMPTY, SELECT_EMPTY[:-len('</div>')] + '\n' + imgs + '\n    </div>', 1)


def inject_initial_route(html_text, route_obj):
    """在 </head> 前注入页面预设路由状态，供前端 JS 无缝接管预渲染首屏"""
    script = '<script>window.__INITIAL_ROUTE__=' + json.dumps(route_obj, ensure_ascii=False, separators=(',', ':')) + ';</script>'
    return html_text.replace('</head>', script + '\n</head>', 1)


def get_translation(key, data):
    """Python 版语言包嵌套键解析（与前端 getTranslation 行为一致，数组用换行连接）"""
    obj = data
    for part in key.split('.'):
        if isinstance(obj, dict) and part in obj:
            obj = obj[part]
        else:
            return None
    if isinstance(obj, list):
        return '\n'.join(obj)
    return obj


def inject_static_texts(html_text, lang_pack):
    """将带 data-i18n 元素的直接文本节点替换为语言包最新文本（爬虫/无 JS 环境可见）"""
    def repl(m):
        key = m.group(2)
        text = get_translation(key, lang_pack)
        if text is None:
            return m.group(0)
        return m.group(1) + html.escape(str(text)) + '<'
    return DATA_I18N_TEXT_RE.sub(repl, html_text)


def write_page(dist_dir, rel_dir, html_text):
    """将页面 HTML 写入 dist 下的相对目录（自动创建目录）"""
    target_dir = os.path.join(dist_dir, rel_dir.strip('/'))
    os.makedirs(target_dir, exist_ok=True)
    with open(os.path.join(target_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html_text)


def build_noscript_links(dictionary, category, lang):
    """为汇总页生成 noscript 内链锚点列表，供爬虫抓取"""
    links = []
    for tag_id, entry in dictionary.items():
        if entry.get('category') != category:
            continue
        slug = entry.get('slug')
        if not slug:
            continue
        name = entry.get(lang) or entry.get('zh', '') or tag_id
        links.append(f'<a href="{CATEGORY_ROUTE_PREFIX[category]}{slug}/">{html.escape(name)}</a>')
    return '<noscript><div class="seo-links">' + ' '.join(links) + '</div></noscript>'


def generate_tag_page(dist_dir, zh_template, en_template, tag_id, entry, compiled_data, dictionary, lang_packs):
    """生成单标签落地页（中英双语），返回 (中文路由路径, 展示图片列表)"""
    category = entry['category']
    slug = entry.get('slug', '')
    prefix = CATEGORY_ROUTE_PREFIX[category]
    rel_path = prefix + (slug + '/' if slug else '')

    # 匹配图片：tags 含该标签；展示集排除背景图（与前端 showBackgrounds=false 一致）
    matches = [i for i in compiled_data if tag_id in (i.get('tags') or [])]
    visible = [i for i in matches if not is_background(i)]
    n = len(visible)
    og_list = visible if visible else matches
    og_image = (IMG_DOMAIN + '/' + thumb_path(og_list[0]['file'])) if og_list else f'{SITE_URL}/favicon.png'

    for lang, template in (('zh', zh_template), ('en', en_template)):
        name = entry.get(lang) or entry.get('zh', '') or tag_id
        if lang == 'zh':
            title = f'{name}壁纸与官方CG合集 (共{n}张) | 重返未来：1999 壁纸站'
        else:
            title = f'{name} Wallpapers & Backgrounds ({n} HD CGs) | Reverse: 1999 Gallery'
        keywords = f'{name}, ' + (HOME_ZH_KEYWORDS if lang == 'zh' else HOME_EN_KEYWORDS)
        description = build_seo_description(tag_id, visible, dictionary, lang)

        html_text = template
        html_text = replace_head_seo(html_text, lang, title, description, keywords, rel_path, og_image)
        html_text = replace_h1(html_text, title)
        html_text = fill_submit_pool(html_text, tag_id, category, name)
        html_text = html_text.replace('<span id="resultCount">0</span>', f'<span id="resultCount">{n}</span>', 1)
        html_text = fill_select(html_text, visible[:48], dictionary, lang)
        html_text = inject_initial_route(html_text, {'type': 'tag', 'tagId': tag_id, 'count': n})
        html_text = inject_static_texts(html_text, lang_packs[lang])

        write_page(dist_dir, ('en/' if lang == 'en' else '') + rel_path, html_text)

    return rel_path, visible


def generate_summary_page(dist_dir, zh_template, en_template, key, category, compiled_data, dictionary, lang_packs):
    """生成 /c/ 与 /v/ 分类汇总页（无对应标签，展示全库非背景 CG 前 48 张）"""
    rel_path = f'/{key}/'
    all_visible = [i for i in compiled_data if not is_background(i)]
    n = len(all_visible)
    og_image = (IMG_DOMAIN + '/' + thumb_path(all_visible[0]['file'])) if all_visible else f'{SITE_URL}/favicon.png'

    titles = {
        'c': ('角色汇总 | 重返未来：1999 壁纸站', 'Characters Index | Reverse: 1999 Gallery'),
        'v': ('版本汇总 | 重返未来：1999 壁纸站', 'Versions Index | Reverse: 1999 Gallery'),
    }
    descriptions = {
        'c': ('《重返未来：1999》全部角色官方高清CG壁纸合集索引，共收录{0}张，点击进入各角色专属壁纸页面。',
              'Index of every Reverse: 1999 character with {0} official HD CG wallpapers & backgrounds.'),
        'v': ('《重返未来：1999》按版本号整理的官方高清CG壁纸合集索引，共收录{0}张。',
              'Reverse: 1999 official HD CG wallpapers & backgrounds indexed by game version, {0} images in total.'),
    }

    for lang, template in (('zh', zh_template), ('en', en_template)):
        title = titles[key][0] if lang == 'zh' else titles[key][1]
        description = descriptions[key][0].format(n) if lang == 'zh' else descriptions[key][1].format(n)
        keywords = HOME_ZH_KEYWORDS if lang == 'zh' else HOME_EN_KEYWORDS

        html_text = template
        html_text = replace_head_seo(html_text, lang, title, description, keywords, rel_path, og_image)
        html_text = replace_h1(html_text, title)
        html_text = html_text.replace('<span id="resultCount">0</span>', f'<span id="resultCount">{n}</span>', 1)
        html_text = fill_select(html_text, all_visible[:48], dictionary, lang)
        html_text = inject_initial_route(html_text, {'type': 'summary', 'count': n})
        html_text = html_text.replace('</body>', build_noscript_links(dictionary, category, lang) + '\n</body>', 1)
        html_text = inject_static_texts(html_text, lang_packs[lang])

        write_page(dist_dir, ('en/' if lang == 'en' else '') + rel_path, html_text)

    return rel_path


def open_settings_statically(html_text, page_key):
    """给设置面板相关容器直接加 .show / .active 类，让爬虫和用户一打开就看到对应页签"""
    cfg = SETTING_PAGES[page_key]
    html_text = html_text.replace('<div id="setBackground">', '<div id="setBackground" class="show">', 1)
    html_text = html_text.replace('<div id="setFrame">', '<div id="setFrame" class="show">', 1)
    html_text = html_text.replace('<div id="setItem">', '<div id="setItem" class="show">', 1)
    html_text = html_text.replace('<div id="setPadding">', '<div id="setPadding" class="show">', 1)
    html_text = html_text.replace('<div id="setBox" class="custom-scroll">', '<div id="setBox" class="custom-scroll show">', 1)
    # 所有设置项加 show，目标页签额外加 active
    for key, info in SETTING_PAGES.items():
        old_item = f'<div id="{info["itemId"]}" class="setItem" data-Content="{info["listId"]}">'
        extra = ' show active' if key == page_key else ' show'
        html_text = html_text.replace(old_item, f'<div id="{info["itemId"]}" class="setItem{extra}" data-Content="{info["listId"]}">', 1)
    # 目标内容区加 show
    html_text = html_text.replace(f'<div id="{cfg["listId"]}" class="setContent">', f'<div id="{cfg["listId"]}" class="setContent show">', 1)
    return html_text


def generate_settings_page(dist_dir, zh_template, en_template, page_key, lang_packs):
    """生成设置面板 4 页签路由页（中英双语，preference/debug 设 noindex）"""
    cfg = SETTING_PAGES[page_key]
    menu_key = MENU_KEYS[page_key]
    zh_menu = get_translation('settingsMenu.' + menu_key, lang_packs['zh']) or page_key
    en_menu = get_translation('settingsMenu.' + menu_key, lang_packs['en']) or page_key

    descriptions = {
        'preference': ('《重返未来：1999》壁纸站的用户偏好设置页面，可自定义筛选、显示与主题选项。',
                       'Preferences page of the Reverse: 1999 wallpaper gallery.'),
        'mail': ('《重返未来：1999》壁纸站的内容更新进度，跟随游戏版本同步更新。',
                 'Update progress of the Reverse: 1999 wallpaper gallery.'),
        'about': ('关于《重返未来：1999》壁纸站：图像来源、时间线说明、社区群组与联系方式。',
                  'About the Reverse: 1999 wallpaper gallery: image sources, timeline notes, community groups and contact.'),
        'debug': ('《重返未来：1999》壁纸站的开发者选项页面。',
                  'Developer options page of the Reverse: 1999 wallpaper gallery.'),
    }

    for lang, template in (('zh', zh_template), ('en', en_template)):
        title = (f'{zh_menu} | 重返未来：1999 壁纸站') if lang == 'zh' else (f'{en_menu} | Reverse: 1999 Gallery')
        description = descriptions[page_key][0] if lang == 'zh' else descriptions[page_key][1]
        keywords = HOME_ZH_KEYWORDS if lang == 'zh' else HOME_EN_KEYWORDS

        html_text = template
        html_text = replace_head_seo(html_text, lang, title, description, keywords, f'/{page_key}/',
                                     f'{SITE_URL}/favicon.png', robots=cfg['robots'])
        html_text = replace_h1(html_text, title)
        html_text = open_settings_statically(html_text, page_key)
        html_text = inject_static_texts(html_text, lang_packs[lang])

        write_page(dist_dir, ('en/' if lang == 'en' else '') + page_key, html_text)


def generate_sitemap(dist_dir, entries, dictionary):
    """动态生成包含图片节点的 dist/sitemap.xml（不收录 noindex 页面与 /i/ 单图页）"""
    print("正在生成 sitemap.xml...")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for entry in entries:
        path = entry['path']
        lang = 'en' if path.startswith('/en') else 'zh'
        kind = entry['kind']
        url = SITE_URL + path
        if kind == 'home':
            changefreq, priority = 'daily', '1.0'
        elif kind == 'summary':
            changefreq, priority = 'weekly', '0.8'
        elif kind == 'page':
            changefreq, priority = 'monthly', '0.4'
        else:
            changefreq, priority = 'weekly', '0.6'
        lines.append('    <url>')
        lines.append(f'        <loc>{html.escape(url)}</loc>')
        lines.append(f'        <changefreq>{changefreq}</changefreq>')
        lines.append(f'        <priority>{priority}</priority>')
        lines.append(f'        <xhtml:link rel="alternate" hreflang="zh" href="{html.escape(SITE_URL + path)}" />')
        lines.append(f'        <xhtml:link rel="alternate" hreflang="en" href="{html.escape(SITE_URL + "/en" + path)}" />')
        lines.append(f'        <xhtml:link rel="alternate" hreflang="x-default" href="{html.escape(SITE_URL + path)}" />')
        # 标签落地页：写入全部图片（最多 1000 张）
        if kind == 'tag' and entry.get('images'):
            for item in entry['images'][:1000]:
                lines.append('        <image:image>')
                lines.append(f'            <image:loc>{html.escape(IMG_DOMAIN + "/" + item["file"])}</image:loc>')
                lines.append(f'            <image:title>{html.escape(build_alt_text(item, dictionary, lang))}</image:title>')
                lines.append('        </image:image>')
        lines.append('    </url>')
    lines.append('</urlset>')
    with open(os.path.join(dist_dir, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"  已写入 {len(entries)} 个 URL")


def inject_worker_pic_map(dist_dir, compiled_data, dictionary):
    """将全库单图映射字典注入 dist/_worker.js（单图路由 OG 卡片用，零外部 IO）"""
    print("正在注入 Worker 单图映射字典...")
    worker_path = os.path.join(dist_dir, '_worker.js')
    with open(worker_path, 'r', encoding='utf-8') as f:
        content = f.read()
    pic_map = {}
    for item in compiled_data:
        pic_id = get_pic_id(item['file'])
        pic_map[pic_id] = [
            thumb_path(item['file']),
            build_short_title(item, dictionary, 'zh'),
            build_short_title(item, dictionary, 'en')
        ]
    json_str = json.dumps(pic_map, ensure_ascii=False, separators=(',', ':'))
    inject = ('// 构建时注入：单图 ID → [缩略图路径, 中文短标题, 英文短标题]\n'
              'const PIC_ID_TO_THUMB = ' + json_str + ';\n\n')
    with open(worker_path, 'w', encoding='utf-8') as f:
        f.write(inject + content)
    print(f"  已注入 {len(pic_map)} 条单图映射")


def generate_seo_pages(dist_dir, compiled_data, dictionary):
    """SEO 落地页生成主流程：英文首页模板 → 单标签落地页 → 汇总页 → 设置页 → sitemap → Worker 注入"""
    print("正在生成 SEO 落地页...")

    with open(os.path.join(dist_dir, 'index.html'), 'r', encoding='utf-8') as f:
        zh_template = f.read()

    # 语言包（设置页标题 + 静态文本注入）
    with open(os.path.join('lang', 'zh.json'), 'r', encoding='utf-8') as f:
        zh_pack = json.load(f)
    with open(os.path.join('lang', 'en.json'), 'r', encoding='utf-8') as f:
        en_pack = json.load(f)
    lang_packs = {'zh': zh_pack, 'en': en_pack}

    # 英文首页模板 dist/en/index.html
    en_template = zh_template.replace('<html lang="zh"', '<html lang="en"', 1)
    en_template = replace_head_seo(en_template, 'en', HOME_EN_TITLE, HOME_EN_DESCRIPTION,
                                   HOME_EN_KEYWORDS, '/', f'{SITE_URL}/favicon.png')
    en_template = replace_h1(en_template, HOME_EN_TITLE)
    en_template = inject_static_texts(en_template, en_pack)
    write_page(dist_dir, 'en', en_template)

    sitemap_entries = [
        {'path': '/', 'kind': 'home'},
        {'path': '/en/', 'kind': 'home'}
    ]

    # 单标签落地页（/s/ /e/ /a/ 汇总标签按同一逻辑生成）
    tag_page_count = 0
    for tag_id, entry in dictionary.items():
        if entry.get('category') not in SEO_CATEGORIES:
            continue
        if not isinstance(entry.get('slug'), str):
            continue
        rel_path, visible = generate_tag_page(dist_dir, zh_template, en_template,
                                              tag_id, entry, compiled_data, dictionary, lang_packs)
        sitemap_entries.append({'path': rel_path, 'kind': 'tag', 'images': visible})
        sitemap_entries.append({'path': '/en' + rel_path, 'kind': 'tag', 'images': visible})
        tag_page_count += 1
    print(f"  单标签落地页：{tag_page_count} 个标签 × 2 语言 = {tag_page_count * 2} 页")

    # /c/ /v/ 分类汇总页
    for key, category in (('c', 'character'), ('v', 'versionCode')):
        rel_path = generate_summary_page(dist_dir, zh_template, en_template,
                                         key, category, compiled_data, dictionary, lang_packs)
        sitemap_entries.append({'path': rel_path, 'kind': 'summary'})
        sitemap_entries.append({'path': '/en' + rel_path, 'kind': 'summary'})
    print("  汇总页：/c/ /v/ × 2 语言 = 4 页")

    # 设置面板 4 页签（仅 mail/about 开启收录并写入 sitemap，preference/debug 为 noindex 不收录）
    for page_key in SETTING_PAGES:
        generate_settings_page(dist_dir, zh_template, en_template, page_key, lang_packs)
        if page_key in ('mail', 'about'):
            sitemap_entries.append({'path': f'/{page_key}/', 'kind': 'page'})
            sitemap_entries.append({'path': f'/en/{page_key}/', 'kind': 'page'})
    print("  设置页：/preference/ /mail/ /about/ /debug/ × 2 语言 = 8 页")

    # sitemap + Worker 注入
    generate_sitemap(dist_dir, sitemap_entries, dictionary)
    inject_worker_pic_map(dist_dir, compiled_data, dictionary)

if __name__ == '__main__':
    # 切换到项目根目录，保证所有相对路径（HTML/资源/dist）正确解析
    os.chdir(PROJECT_ROOT)
    build_project()