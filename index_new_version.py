#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为指定版本目录的新图片自动生成 Filter.json 条目。

用法: python index_new_version.py

用户输入版本目录名（如 3_8），脚本自动:
  - 将 *_* 转为 *.* 版本号（3_8 → 3.8）
  - 对 story_atcg/ 下的新文件 → tags: [版本号, 类型, 章节名]
  - 对 story_bg/ 下的新文件   → tags: [版本号, 类型, 章节名, "背景图像"]
  - tone 统一留空 []
  - 跳过 Filter.json 中已有的文件，仅追加新条目
"""

import json
import re
import sys
from pathlib import Path

# ── 路径配置 ──────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
RESOURCE_DIR = SCRIPT_DIR / "resource"
FILTER_JSON_PATH = SCRIPT_DIR / "Filter.json"


# ═══════════════════════════════════════════════════════════
# 扫描指定目录中未索引的文件
# ═══════════════════════════════════════════════════════════

def scan_version_dir(dir_name: str, existing_files: set) -> dict:
    """
    扫描指定版本目录，返回其中未被 Filter.json 索引的 PNG 文件。

    参数:
        dir_name: 版本目录名，如 "3_8"
        existing_files: Filter.json 中已有的 file 路径集合

    返回:
        {
            "atcg": ["resource/singlebg/storybg/story_atcg/3_8/3_8_at_01.png", ...],
            "bg":   ["resource/singlebg/storybg/story_bg/3_8/3_8_bg_01.png", ...]
        }
    """
    result = {"atcg": [], "bg": []}
    base = RESOURCE_DIR / "singlebg" / "storybg"

    for parent, key in [("story_atcg", "atcg"), ("story_bg", "bg")]:
        target_dir = base / parent / dir_name
        if not target_dir.is_dir():
            continue

        for img_file in sorted(target_dir.glob("*.png")):
            # 过滤掉 _zone 变体文件（这些是局部区域裁切，不需要索引）
            if "zone" in img_file.stem.lower():
                continue
            # 统一用正斜杠的相对路径，与 Filter.json 保持一致
            rel_path = str(img_file.relative_to(SCRIPT_DIR)).replace("\\", "/")
            if rel_path not in existing_files:
                result[key].append(rel_path)

    return result


# ═══════════════════════════════════════════════════════════
# JSON 格式化（数组单行，匹配项目现有风格）
# ═══════════════════════════════════════════════════════════

def format_entry(file_path: str, tags: list, tone: list) -> str:
    """格式化单条条目为项目要求的缩进风格"""
    tags_str = json.dumps(tags, ensure_ascii=False)
    tone_str = json.dumps(tone, ensure_ascii=False)
    return (
        f'  {{\n'
        f'    "file": "{file_path}",\n'
        f'    "tags": {tags_str},\n'
        f'    "tone": {tone_str}\n'
        f'  }}'
    )


def write_filter_json(data: list) -> None:
    """按项目格式覆写 Filter.json"""
    with open(FILTER_JSON_PATH, "w", encoding="utf-8") as f:
        f.write("[\n")
        for i, item in enumerate(data):
            entry = format_entry(item["file"], item["tags"], item.get("tone", []))
            comma = "," if i < len(data) - 1 else ""
            f.write(entry + comma + "\n")
        f.write("]\n")


# ═══════════════════════════════════════════════════════════
# 版本号解析
# ═══════════════════════════════════════════════════════════

def resolve_version(dir_name: str) -> str | None:
    """
    解析版本号:
      - "*_*" 格式（如 3_8）→ 自动转为 "3.8"
      - 其他格式        → 返回 None，由调用方手动输入
    """
    if re.match(r"^\d+_\d+$", dir_name):
        return dir_name.replace("_", ".")
    return None


# ═══════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("  R9 Wallpaper - 新版本自动索引工具")
    print("=" * 60)

    # ── 1. 读取现有 Filter.json ──
    print("\n[1/4] 读取现有 Filter.json ...")
    if not FILTER_JSON_PATH.exists():
        print(f"  ✗ 找不到 {FILTER_JSON_PATH}")
        sys.exit(1)

    with open(FILTER_JSON_PATH, "r", encoding="utf-8") as f:
        existing_data = json.load(f)

    existing_files = {item["file"] for item in existing_data}
    print(f"  已加载 {len(existing_data)} 条索引记录")

    # ── 2. 用户输入版本目录 ──
    print("\n[2/4] 指定要索引的版本目录")
    print("  示例: 3_8  对应目录 resource/singlebg/storybg/story_atcg/3_8/")
    dir_name = input("  请输入版本目录名: ").strip()

    if not dir_name:
        print("  ✗ 目录名不能为空，退出。")
        sys.exit(1)

    # 解析版本号
    auto_version = resolve_version(dir_name)
    if auto_version:
        print(f"  自动识别版本号: \"{auto_version}\"")
        version_tag = auto_version
    else:
        print(f"  目录名 \"{dir_name}\" 不符合 *_* 格式，无法自动转换")
        version_tag = input("  请手动输入版本号标签（如 SP01）: ").strip()
        if not version_tag:
            print("  ✗ 版本号不能为空，退出。")
            sys.exit(1)

    # ── 3. 扫描该目录下未索引的文件 ──
    print(f"\n[3/4] 扫描 {dir_name}/ 下未索引的 PNG 文件 ...")
    new_files = scan_version_dir(dir_name, existing_files)

    atcg_files = new_files["atcg"]
    bg_files = new_files["bg"]

    if not atcg_files and not bg_files:
        print(f"  ✓ {dir_name}/ 下的所有文件均已索引，无需操作。")
        atcg_dir = RESOURCE_DIR / "singlebg" / "storybg" / "story_atcg" / dir_name
        bg_dir = RESOURCE_DIR / "singlebg" / "storybg" / "story_bg" / dir_name
        if not atcg_dir.is_dir() and not bg_dir.is_dir():
            print(f"  ⚠ 同时注意：目录 {dir_name}/ 在 story_atcg 和 story_bg 下都不存在。")
        return

    print(f"  story_atcg/{dir_name}/: {len(atcg_files)} 个新文件")
    print(f"  story_bg/{dir_name}/:  {len(bg_files)} 个新文件")
    print(f"  待处理总计: {len(atcg_files) + len(bg_files)} 个")

    # 输入标签信息
    print(f"\n  内容类型:")
    print(f"    1) 所有主线")
    print(f"    2) 所有活动")
    choice = input(f"  请选择 (1/2，或直接输入自定义文本): ").strip()
    type_map = {"1": "所有主线", "2": "所有活动"}
    content_type = type_map.get(choice, choice)
    if not content_type:
        print("  ✗ 内容类型不能为空，退出。")
        sys.exit(1)

    chapter_name = input("  请输入章节名称: ").strip()
    if not chapter_name:
        print("  ✗ 章节名称不能为空，退出。")
        sys.exit(1)

    # 确认预览
    print(f"\n  将要生成:")
    print(f"    版本标签: \"{version_tag}\"")
    print(f"    内容类型: \"{content_type}\"")
    print(f"    章节名称: \"{chapter_name}\"")
    if atcg_files:
        print(f"    AT CG ({len(atcg_files)}个) → tags: [\"{version_tag}\", \"{content_type}\", \"{chapter_name}\"]")
    if bg_files:
        print(f"    BG   ({len(bg_files)}个) → tags: [\"{version_tag}\", \"{content_type}\", \"{chapter_name}\", \"背景图像\"]")
    print(f"    tone → [] (留空)")

    confirm = input("\n  确认写入 Filter.json? [Y/n]: ").strip().lower()
    if confirm and confirm not in ("y", "yes", ""):
        print("  已取消，未修改任何文件。")
        return

    # ── 4. 生成条目并写入 ──
    print(f"\n[4/4] 生成条目并写入 Filter.json ...")

    new_entries = []

    for f in atcg_files:
        new_entries.append({
            "file": f,
            "tags": [version_tag, content_type, chapter_name],
            "tone": [],
        })

    for f in bg_files:
        new_entries.append({
            "file": f,
            "tags": [version_tag, content_type, chapter_name, "背景图像"],
            "tone": [],
        })

    all_data = existing_data + new_entries
    write_filter_json(all_data)

    print(f"  ✓ 完成！")
    print(f"    原有: {len(existing_data)} 条")
    print(f"    新增: {len(new_entries)} 条")
    print(f"    当前: {len(all_data)} 条")
    print(f"\n  提示: 使用 git diff 检查变更，如有问题可 git checkout -- Filter.json 回滚。")


if __name__ == "__main__":
    main()
