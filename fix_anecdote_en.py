"""
修复 tagData.json 中轶事（anecdote）条目的英文翻译。

中文轶事格式为 "角色名·轶事名"，但英文翻译缺少角色名前缀。
本脚本为每个轶事项自动匹配角色英文名，组合为 "CharacterName·AnecdoteName" 格式。

用法：python fix_anecdote_en.py

Create by DeepSeek
"""

import json
import shutil
import sys
from pathlib import Path

TAGDATA_PATH = Path("lang/tagData.json")
BACKUP_PATH = Path("lang/tagData.json.bak")


def main():
    # 1. 备份原文件
    if not BACKUP_PATH.exists():
        shutil.copy(TAGDATA_PATH, BACKUP_PATH)
        print(f"[备份] 已创建备份: {BACKUP_PATH}")
    else:
        overwrite = input(f"[警告] 备份文件 {BACKUP_PATH} 已存在，是否覆盖？(y/N): ")
        if overwrite.lower() == "y":
            shutil.copy(TAGDATA_PATH, BACKUP_PATH)
            print(f"[备份] 已覆盖备份: {BACKUP_PATH}")
        else:
            print("[跳过] 保留已有备份，继续处理...")

    # 2. 加载数据
    with open(TAGDATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 3. 构建角色中文名 → 英文名的映射
    char_map = {}  # {zh_name: en_name}
    for key, val in data.items():
        if val.get("category") == "character":
            char_map[val["zh"]] = val["en"]

    print(f"\n[信息] 共加载 {len(char_map)} 个角色条目")

    # 4. 处理每条轶事
    updated_count = 0
    skipped = []

    for key, val in data.items():
        if val.get("category") != "anecdote":
            continue

        zh = val["zh"]
        en = val["en"]

        # 跳过不包含 · 的特殊条目（如"所有轶事"）
        if "·" not in zh:
            skipped.append(f"[特殊] {key}: zh={zh} (不包含·分隔符，保持原样)")
            continue

        # 提取角色中文名（· 之前的部分）
        char_zh = zh.split("·")[0]

        if char_zh not in char_map:
            skipped.append(f"[缺失] {key}: zh={zh} → 角色'{char_zh}'在tagData中无对应条目，跳过")
            continue

        char_en = char_map[char_zh]
        new_en = f"{char_en}·{en}"

        if val["en"] == new_en:
            continue  # 已经是正确格式

        print(f"  {key}")
        print(f"    zh: {zh}")
        print(f"    en: {en}  →  {new_en}")

        val["en"] = new_en
        updated_count += 1

    # 5. 输出摘要
    print(f"\n{'='*50}")
    print(f"[完成] 共更新 {updated_count} 条轶事翻译")

    if skipped:
        print(f"[跳过] {len(skipped)} 条未处理:")
        for s in skipped:
            print(f"  {s}")

    if updated_count == 0:
        print("[信息] 没有需要更新的条目，不写入文件")
        return

    # 6. 写回文件
    with open(TAGDATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[写入] 已保存到 {TAGDATA_PATH}")


if __name__ == "__main__":
    main()
