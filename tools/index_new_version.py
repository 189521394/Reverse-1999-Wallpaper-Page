#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为新版本目录的图片自动生成 Filter.json 初始条目。

用法:
  python tools/index_new_version.py
  python tools/index_new_version.py --dry-run
  python tools/index_new_version.py --dir 4_2

功能说明:
  - 自动扫描 resource/singlebg/storybg/{story_atcg,story_bg}/ 下所有存在未索引 PNG 的目录
  - 严格按 lang/tagData.json 的 versionCode 规范转换版本号：
      * "3_8" / "4_2" → "3.8" / "4.2"
      * "1.4"         → "1.4"
      * "s02" / "S02" → "SP02"
  - story_atcg/ 下的新文件 → tags: [版本号, 类型, 章节名]
  - story_bg/ 下的新文件   → tags: [版本号, 类型, 章节名, "背景图像"]
  - 过滤文件名含 zone 的局部裁切图，tone 统一留空 []
  - 跳过 Filter.json 中已有的文件，仅追加新条目（原子写入）
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# 修复 Windows 中文系统 GBK 控制台无法打印特殊字符的问题
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ================= 配置区 =================
# 自动扫描时忽略的非版本目录名（如通用背景目录 bg）
IGNORE_DIRS = {"bg"}
# ==========================================

# ── 路径配置 ──────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent  # 脚本位于 tools/ 下，项目根在上一级
RESOURCE_DIR = ROOT_DIR / "resource"
FILTER_JSON_PATH = ROOT_DIR / "Filter.json"
TAG_DATA_PATH = ROOT_DIR / "lang" / "tagData.json"

# 退出码约定：0=成功，1=失败，2=用户取消
EXIT_CANCELLED = 2


# ═══════════════════════════════════════════════════════════
# 版本号解析与排序
# ═══════════════════════════════════════════════════════════

def resolve_version(dir_name: str) -> str | None:
    """
    按 lang/tagData.json 的 versionCode 规范解析版本号:
      - "*_*" 格式（如 3_8、4_2）→ 自动转为 "3.8"、"4.2"
      - "*.*" 格式（如 1.4）     → 保持原样 "1.4"
      - "s##" / "S##" 格式（如 s02）→ 自动转为 "SP02"
      - 其他格式                 → 返回 None，由用户手动输入
    """
    if re.match(r"^\d+_\d+$", dir_name):
        return dir_name.replace("_", ".")
    if re.match(r"^\d+\.\d+$", dir_name):
        return dir_name
    if re.match(r"^[Ss]\d+$", dir_name):
        return "SP" + dir_name[1:]
    return None


def natural_sort_key(text: str) -> list:
    """自然排序键，使 1_9 排在 2_0 前面"""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", text)]


def load_registered_versions() -> set[str]:
    """读取 lang/tagData.json 中已注册的所有 versionCode 中文名"""
    if not TAG_DATA_PATH.exists():
        return set()
    try:
        with open(TAG_DATA_PATH, "r", encoding="utf-8") as f:
            tag_data = json.load(f)
        return {
            v.get("zh", k)
            for k, v in tag_data.items()
            if v.get("category") == "versionCode"
        }
    except Exception:
        return set()


# ═══════════════════════════════════════════════════════════
# 扫描未索引文件
# ═══════════════════════════════════════════════════════════

def scan_version_dir(dir_name: str, existing_files: set[str]) -> dict[str, list[str]]:
    """
    扫描指定版本目录，返回其中未被 Filter.json 索引的 PNG 文件。
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
            rel_path = img_file.relative_to(ROOT_DIR).as_posix()
            if rel_path not in existing_files:
                result[key].append(rel_path)

    return result


def discover_unindexed_dirs(existing_files: set[str]) -> list[dict]:
    """
    自动扫描 story_atcg/ 和 story_bg/ 下所有子目录，
    找出包含未索引 PNG 文件的候选版本目录。
    """
    base = RESOURCE_DIR / "singlebg" / "storybg"
    dir_names: set[str] = set()
    for parent in ("story_atcg", "story_bg"):
        parent_dir = base / parent
        if not parent_dir.is_dir():
            continue
        for child in parent_dir.iterdir():
            if child.is_dir() and child.name not in IGNORE_DIRS:
                dir_names.add(child.name)

    candidates = []
    for d in sorted(dir_names, key=natural_sort_key):
        found = scan_version_dir(d, existing_files)
        if found["atcg"] or found["bg"]:
            candidates.append({
                "dir_name": d,
                "version": resolve_version(d),
                "atcg": found["atcg"],
                "bg": found["bg"],
            })
    return candidates


# ═══════════════════════════════════════════════════════════
# JSON 格式化与原子写入（数组单行，匹配项目现有风格）
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
    """按项目格式原子覆写 Filter.json（先写临时文件再替换）"""
    tmp_path = FILTER_JSON_PATH.parent / f".{FILTER_JSON_PATH.name}.tmp.{os.getpid()}"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write("[\n")
            for i, item in enumerate(data):
                entry = format_entry(item["file"], item["tags"], item.get("tone", []))
                comma = "," if i < len(data) - 1 else ""
                f.write(entry + comma + "\n")
            f.write("]\n")
        os.replace(tmp_path, FILTER_JSON_PATH)
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise


# ═══════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════

def choose_target_dir(
    candidates: list[dict],
    registered_versions: set[str],
    cli_dir: str | None,
) -> str | None:
    """选择要索引的版本目录；返回 None 表示无需处理"""
    if cli_dir:
        return cli_dir

    if not candidates:
        print("  ✓ 所有版本目录的 PNG 均已索引，无需新增条目。")
        return None

    print(f"  自动发现 {len(candidates)} 个包含未索引图片的目录：")
    for idx, c in enumerate(candidates, 1):
        ver = c["version"]
        if ver is None:
            ver_desc = "未识别格式（需手动输入）"
        elif ver in registered_versions:
            ver_desc = f"versionCode={ver} [已注册]"
        else:
            ver_desc = f"versionCode={ver} [新版本-稍后需补入 tagData.json]"
        print(
            f"    {idx}) {c['dir_name']:<8} "
            f"(ATCG: {len(c['atcg']):>2} 张, BG: {len(c['bg']):>2} 张)  → {ver_desc}"
        )

    if len(candidates) == 1:
        tip = f"  请输入编号或目录名（直接回车默认选 1: {candidates[0]['dir_name']}，输入 q 退出）: "
    else:
        tip = "  请输入编号或目录名（输入 q 退出）: "

    raw = input(tip).strip()
    if raw.lower() == "q":
        print("  🛑 用户取消，退出。")
        sys.exit(EXIT_CANCELLED)
    if not raw and len(candidates) == 1:
        return candidates[0]["dir_name"]
    if raw.isdigit():
        idx = int(raw)
        if 1 <= idx <= len(candidates):
            return candidates[idx - 1]["dir_name"]
        print(f"  ✗ 无效编号: {raw}")
        sys.exit(1)
    if not raw:
        print("  ✗ 目录名不能为空，退出。")
        sys.exit(1)
    return raw


def main() -> int:
    parser = argparse.ArgumentParser(description="为新版本目录图片自动生成 Filter.json 条目")
    parser.add_argument("--dry-run", action="store_true", help="仅自动扫描并展示未索引目录，不修改 Filter.json")
    parser.add_argument("--dir", type=str, default=None, help="直接指定要索引的版本目录名（如 4_2 / s02）")
    args = parser.parse_args()

    print("=" * 60)
    print("  R9 Wallpaper - 新版本自动索引工具")
    print("=" * 60)

    # ── 1. 读取现有 Filter.json ──
    print("\n[1/4] 读取现有 Filter.json ...")
    if not FILTER_JSON_PATH.exists():
        print(f"  ✗ 找不到 {FILTER_JSON_PATH}", file=sys.stderr)
        return 1

    with open(FILTER_JSON_PATH, "r", encoding="utf-8") as f:
        existing_data = json.load(f)

    existing_files = {item["file"] for item in existing_data}
    registered_versions = load_registered_versions()
    print(f"  已加载 {len(existing_data)} 条索引记录")

    # ── 2. 自动扫描并选择版本目录 ──
    print("\n[2/4] 自动扫描未索引的版本目录 ...")
    candidates = discover_unindexed_dirs(existing_files)

    if args.dry_run:
        if not candidates:
            print("  ✓ 所有版本目录的 PNG 均已索引，无新增条目。")
        else:
            print(f"  [DRY-RUN] 发现 {len(candidates)} 个包含未索引图片的目录：")
            for c in candidates:
                ver = c["version"] or "未识别"
                print(f"    - {c['dir_name']} (versionCode={ver}): ATCG {len(c['atcg'])} 张, BG {len(c['bg'])} 张")
        return 0

    dir_name = choose_target_dir(candidates, registered_versions, args.dir)
    if not dir_name:
        return 0

    # 解析版本号
    auto_version = resolve_version(dir_name)
    if auto_version:
        status_note = "已注册" if auto_version in registered_versions else "新版本，稍后记得补入 lang/tagData.json"
        print(f"  自动识别版本号: \"{auto_version}\" ({status_note})")
        version_tag = auto_version
    else:
        print(f"  目录名 \"{dir_name}\" 不符合标准版本号命名，无法自动转换")
        version_tag = input("  请手动输入版本号标签（如 SP01）: ").strip()
        if not version_tag:
            print("  ✗ 版本号不能为空，退出。")
            return 1

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
        return 0

    print(f"  story_atcg/{dir_name}/: {len(atcg_files)} 个新文件")
    print(f"  story_bg/{dir_name}/:  {len(bg_files)} 个新文件")
    print(f"  待处理总计: {len(atcg_files) + len(bg_files)} 个")

    # 输入标签信息（版本类型仅有主线/活动两类）
    print("\n  内容类型:")
    print("    1) 所有主线")
    print("    2) 所有活动")
    choice = input("  请选择 (1/2，或直接输入自定义文本): ").strip()
    type_map = {"1": "所有主线", "2": "所有活动"}
    content_type = type_map.get(choice, choice)
    if not content_type:
        print("  ✗ 内容类型不能为空，退出。")
        return 1

    chapter_name = input("  请输入章节名称: ").strip()
    if not chapter_name:
        print("  ✗ 章节名称不能为空，退出。")
        return 1

    # 确认预览
    print("\n  将要生成:")
    print(f"    版本标签: \"{version_tag}\"")
    print(f"    内容类型: \"{content_type}\"")
    print(f"    章节名称: \"{chapter_name}\"")
    if atcg_files:
        print(f"    AT CG ({len(atcg_files)}个) → tags: [\"{version_tag}\", \"{content_type}\", \"{chapter_name}\"]")
    if bg_files:
        print(f"    BG   ({len(bg_files)}个) → tags: [\"{version_tag}\", \"{content_type}\", \"{chapter_name}\", \"背景图像\"]")
    print("    tone → [] (留空)")

    confirm = input("\n  确认写入 Filter.json? [Y/n]: ").strip().lower()
    if confirm and confirm not in ("y", "yes"):
        print("  🛑 已取消，未修改任何文件。")
        return EXIT_CANCELLED

    # ── 4. 生成条目并原子写入 ──
    print("\n[4/4] 生成条目并写入 Filter.json ...")

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

    print("  ✓ 完成！")
    print(f"    原有: {len(existing_data)} 条")
    print(f"    新增: {len(new_entries)} 条")
    print(f"    当前: {len(all_data)} 条")
    print("\n  提示: 使用 git diff 检查变更，如有问题可 git checkout -- Filter.json 回滚。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
