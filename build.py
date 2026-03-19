import re
import os
import shutil

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
        print(f"警告：找不到 {html_file}")
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
            print(f"警告: 找不到 CSS 文件 {css}")

    combined_js = ""
    for js in js_links:
        if os.path.exists(js):
            with open(js, 'r', encoding='utf-8') as f:
                combined_js += f";\n{minify_js(f.read())}\n"
        else:
            print(f"警告: 找不到 JS 文件 {js}")

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

def build_project():
    print("开始构建生产环境代码...")
    dist_dir = 'dist'

    # 每次打包前清空旧的 dist
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    os.makedirs(dist_dir)

    # 1. 分别处理两个主页面，生成对应的 bundle
    process_html('brochure.html', dist_dir)
    process_html('index.html', dist_dir)

    # 2. 白名单模式：明确指定需要拷贝到线上的资源
    # (忽略了 resource、bat、py 等与线上无关的本地文件)
    assets_to_copy = [
        'font',
        'Filter.json',
        'favicon.png'
    ]

    print("正在拷贝必需的静态资源...")
    for item in assets_to_copy:
        if not os.path.exists(item):
            print(f"警告: 找不到资源 {item}")
            continue

        dst_path = os.path.join(dist_dir, item)
        if os.path.isdir(item):
            shutil.copytree(item, dst_path)
        else:
            shutil.copy2(item, dst_path)

    print(f"构建成功！🎉")
    print(f"你的开发目录未受影响。CF Pages 将自动发布 dist/ 中的内容。")

if __name__ == '__main__':
    build_project()