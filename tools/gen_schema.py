import json
import sys
from pathlib import Path

# ================= 配置区 =================
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent  # 脚本位于 tools/ 下，项目根在上一级
TAG_DATA_JSON = ROOT_DIR / "lang" / "tagData.json"  # 唯一数据源，只读
SCHEMA_JSON = ROOT_DIR / "schemas.json"             # 增量同步目标
ENUM_INDENT = " " * 12                              # enum 条目的缩进（与现有文件一致）


# ==========================================

def main():
    """
    从 tagData.json 增量同步标签中文名到 schemas.json 的 tags 枚举：
    1. 只读 tagData.json（绝不写它），取所有非 Tone 类标签的 zh 值
    2. 与 schemas.json 的 tags.items.enum 逐个查重
    3. 缺失的追加到 enum 末尾，已存在则跳过（只增不减）
    配合 WebStorm File Watcher 使用：保存 tagData.json 时自动运行，
    即可在编辑 Filter.json 时获得新标签的自动补全。

    实现为文本级插入而非 json.dump 整文件重写，保证除新增行外
    文件内容与格式（缩进、行尾、末尾换行）保持原样。
    """
    # 读取唯一数据源（只读，不做任何写操作）
    with open(TAG_DATA_JSON, encoding="utf-8") as f:
        tag_data = json.load(f)

    # 只要中文名；色调标签（Tone 类）由 update_tone.py 自动生成，不参与 tags 补全
    zh_names = [v["zh"] for v in tag_data.values() if v.get("category") != "Tone"]

    # 解析现有 schema，取 tags 枚举（仅用于查重与定位）
    with open(SCHEMA_JSON, encoding="utf-8", newline="") as f:
        text = f.read()
    schema = json.loads(text)
    enum = schema["items"]["properties"]["tags"]["items"]["enum"]

    # 查重：已存在跳过，缺失的按 tagData 顺序收集
    # （existing 动态更新，即使 tagData 自身出现重复 zh 也只会插入一次）
    existing = set(enum)
    added = []
    for name in zh_names:
        if name not in existing:
            existing.add(name)
            added.append(name)

    if not added:
        print(f"✅ schemas.json 无需更新：{len(zh_names)} 条标签均已存在")
        return 0

    # 文本级插入：在 enum 最后一项的行尾追加新条目（"最后一项",\n"新条目"）
    # 先定位 enum 数组范围："enum": [ 与配对的 ]（中文标签名不含 ]，第一个 ] 即数组结尾）
    enum_start = text.index('"enum": [')
    close_pos = text.index(']', enum_start)

    # 再定位枚举最后一项（带引号），插入点即该项字符串的结尾
    marker = f'"{enum[-1]}"'
    marker_pos = text.rfind(marker)
    if not (enum_start < marker_pos < close_pos):
        raise ValueError(f"无法在 schemas.json 中定位标签枚举末尾（{marker}）")
    insert_pos = marker_pos + len(marker)

    insertion = "".join(f",\n{ENUM_INDENT}\"{name}\"" for name in added)
    new_text = text[:insert_pos] + insertion + text[insert_pos:]

    # newline="" 保证行尾原样写回（Linux 风格的 LF 不会被 Windows 转成 CRLF）
    with open(SCHEMA_JSON, "w", encoding="utf-8", newline="") as f:
        f.write(new_text)

    # 控制台输出，便于在 File Watcher 面板查看结果
    print(f"✅ schemas.json 已同步：新增 {len(added)} 条，跳过 {len(zh_names) - len(added)} 条")
    for name in added:
        print(f"  + {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
