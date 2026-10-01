import re
import os
import shutil
import json
import sys
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
STATIC_ASSETS_TO_COPY = [
    'font',
    'favicon.png',
    'lang',
    '_worker.js',    # Worker
    'sitemap.xml'    # SEO
]

# 3. 构建输出目录
DIST_DIR = 'dist'

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

    inject_parts.append(f'<link rel="stylesheet" href="{bundle_css_name}">')
    inject_parts.append(f'<script src="{bundle_js_name}" defer></script>')

    inject_str = '\n    '.join(inject_parts) + '\n</head>'
    prod_html = prod_html.replace('</head>', inject_str)

    # 保存新的生产版 HTML
    with open(os.path.join(dist_dir, html_file), 'w', encoding='utf-8') as f:
        f.write(prod_html)

def compile_filter_json(dist_dir):
    """
    【核心预编译环节】: 读取 Filter.json，清洗中文为 ID，并极限压缩
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

def build_project():
    print("开始构建生产环境代码...")

    # 每次打包前清空旧的 dist
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

    # ========== 阶段 1: 编译 & 拷贝所有静态资源 ==========

    # 1a. 预编译 Filter.json（中文→ID + 极限压缩）
    compile_filter_json(DIST_DIR)

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

    # ========== 完成 ==========
    print(f"\n[OK] 构建成功！（已启用内容哈希缓存绕过）")
    print(f"Cloudflare 将发布 /{DIST_DIR} 中的内容。")

if __name__ == '__main__':
    # 切换到项目根目录，保证所有相对路径（HTML/资源/dist）正确解析
    os.chdir(PROJECT_ROOT)
    build_project()