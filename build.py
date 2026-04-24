import re
import os
import shutil
import json
import sys

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
    'sitemap.xml'    # 有利于 SEO
]

# 3. 构建输出目录
DIST_DIR = 'dist'

# ==========================================
# 以下为核心构建逻辑，通常无需修改
# ==========================================

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

def process_html(html_file, dist_dir):
    if not os.path.exists(html_file):
        print(f"⚠️ 警告：找不到 {html_file}")
        return

    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 精准匹配 css/ 和 js/ 目录下的文件
    css_links = re.findall(r'<link rel="stylesheet" href="(css/[^"]+)">', html_content)
    # 兼容带有 defer 和没有 defer 的 script 标签
    js_links = re.findall(r'<script src="(js/[^"]+)"[^>]*></script>', html_content)

    # 去重并保持顺序
    css_links = list(dict.fromkeys(css_links))
    js_links = list(dict.fromkeys(js_links))

    base_name = html_file.split('.')[0]
    bundle_css_name = f'bundle_{base_name}.css'
    bundle_js_name = f'bundle_{base_name}.js'

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

    # 写入 dist 目录
    with open(os.path.join(dist_dir, bundle_css_name), 'w', encoding='utf-8') as f:
        f.write(combined_css)
    with open(os.path.join(dist_dir, bundle_js_name), 'w', encoding='utf-8') as f:
        f.write(combined_js)

    # 替换原 HTML 中的散装引用
    prod_html = re.sub(r'<link rel="stylesheet" href="css/[^"]+">\n?', '', html_content)
    prod_html = re.sub(r'<script src="js/[^"]+"[^>]*></script>\n?', '', prod_html)

    inject_str = f'<link rel="stylesheet" href="{bundle_css_name}">\n    <script src="{bundle_js_name}" defer></script>\n</head>'
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

    print("正在编译 Filter.json (中文标签洗白与极限压缩)...")

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

    # 1. 预编译 JSON
    compile_filter_json(DIST_DIR)

    # 2. 处理页面，生成对应的 bundle
    for html_file in HTML_FILES_TO_PROCESS:
        process_html(html_file, DIST_DIR)

    # 3. 白名单拷贝
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

    print(f"\n🚀 构建成功！🎉")
    print(f"Cloudflare 将发布 /{DIST_DIR} 中的内容。")

if __name__ == '__main__':
    build_project()