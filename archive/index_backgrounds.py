#!/usr/bin/env python3
"""
背景图像索引脚本
=================
扫描 resource/singlebg/storybg/story_bg/ 中的所有背景图像，
为尚未编入 Filter.json 的文件自动创建索引条目。

参照：背景图整理-设计文稿.md

用法：
    python index_backgrounds.py          # 在 test/ 目录中生成 Filter.json
    python index_backgrounds.py --apply  # 直接覆盖原 Filter.json（谨慎使用）
"""

import json
import os
import re
import shutil
import sys
from collections import Counter

# ─────────────────────────── 路径常量 ───────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESOURCE_DIR = os.path.join(SCRIPT_DIR, '../resource')
STORY_BG_DIR = os.path.join(RESOURCE_DIR, 'singlebg', 'storybg', 'story_bg')
FILTER_JSON = os.path.join(SCRIPT_DIR, '../Filter.json')
TAG_DATA_JSON = os.path.join(SCRIPT_DIR, '../lang', 'tagData.json')
TEST_DIR = os.path.join(SCRIPT_DIR, 'test')

# ─────────────────────────── 工具函数 ───────────────────────────

def load_json(path):
    """加载 JSON 文件，返回解析后的 Python 对象。"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_filter_json(data, path):
    """
    以项目特有格式保存 Filter.json：
    - 顶级数组，每个元素独占一块
    - 2 空格缩进对象，4 空格缩进字段
    - tags 和 tone 数组保持在一行内（json.dumps 默认行为）
    - 与源文件格式完全一致
    """
    entries = []
    total = len(data)
    for i, item in enumerate(data):
        comma = ',' if i < total - 1 else ''
        entries.append(_format_entry(item) + comma)

    text = '[\n' + '\n'.join(entries) + '\n]\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def _format_entry(entry):
    """将单条 Filter.json 条目格式化为项目风格的文本块。"""
    indent = '  '
    field_indent = '    '
    lines = [f'{indent}{{']
    lines.append(f'{field_indent}"file": {json.dumps(entry["file"], ensure_ascii=False)},')
    lines.append(f'{field_indent}"tags": {json.dumps(entry["tags"], ensure_ascii=False)},')
    lines.append(f'{field_indent}"tone": {json.dumps(entry["tone"], ensure_ascii=False)}')
    lines.append(f'{indent}}}')
    return '\n'.join(lines)


def is_zone_file(filename):
    """判断是否为切图文件（文件名含 'zone'）。"""
    return 'zone' in filename.lower()


# ─────────────────────────── 版本映射 ───────────────────────────

def build_tag_category_map(tag_data):
    """
    构建中文标签名 -> 类别 的反向映射。
    返回: {中文标签名: 类别字符串}
    类别包括: 'mainLine', 'event', 'anecdote', 'character', 'versionCode',
             'year', 'Tone', 'special'
    """
    reverse = {}
    for tag_id, info in tag_data.items():
        zh = info.get('zh', '')
        cat = info.get('category', '')
        if zh and cat:
            reverse[zh] = cat
    return reverse


def build_version_maps(filter_data, tag_data):
    """
    从 Filter.json 现有条目中提取版本 -> {类型, 名称} 映射。

    规则：
    - 一个版本的类型要么是 "所有主线" 要么是 "所有活动"，取出现次数最多的。
    - 版本名称是条目中属于 mainLine 或 event 类别（非"所有"前缀）的标签，
      取出现次数最多的。轶事条目不计入名称统计。
    - SP01 特殊处理：确认为 "所有活动"，名称为 "翡冷翠之春"（已人工确认）。

    参数:
        filter_data: Filter.json 的条目列表
        tag_data: tagData.json 的完整字典 {tag_id: {zh, en, category?}}

    返回: {版本号: {'type': str|None, 'name': str|None}}
    """
    # 收集所有属于 mainLine / event 类别的标签名（用于识别版本名称）
    mainline_event_names = set()
    anecdote_names = set()
    for tag_id, info in tag_data.items():
        zh = info.get('zh', '')
        cat = info.get('category', '')
        if not zh or not cat:
            continue
        if cat in ('mainLine', 'event'):
            mainline_event_names.add(zh)
        elif cat == 'anecdote':
            anecdote_names.add(zh)

    # 排除掉 "所有主线" / "所有活动" / "所有轶事" 这类汇总标签
    meta_zh = {'所有主线', '所有活动', '所有轶事'}
    version_names_pool = mainline_event_names - meta_zh

    # 按版本统计
    version_raw = {}  # {版本: {'types': Counter, 'names': Counter}}

    for item in filter_data:
        tags = item.get('tags', [])
        if not tags:
            continue

        # 查找该条目所属版本（tags 中首个 X.Y 格式 或 SP01）
        version = None
        for t in tags:
            if re.match(r'^\d+\.\d+$', t) or t == 'SP01':
                version = t
                break
        if not version:
            continue

        if version not in version_raw:
            version_raw[version] = {'types': Counter(), 'names': Counter()}

        # 统计类型
        if '所有主线' in tags:
            version_raw[version]['types']['所有主线'] += 1
        if '所有活动' in tags:
            version_raw[version]['types']['所有活动'] += 1

        # 统计名称（跳过轶事条目）
        has_anecdote = any(t in anecdote_names for t in tags)
        if not has_anecdote:
            for t in tags:
                if t in version_names_pool:
                    version_raw[version]['names'][t] += 1

    # 整理为最终映射
    result = {}
    for version, data in version_raw.items():
        vtype = data['types'].most_common(1)[0][0] if data['types'] else None
        vname = data['names'].most_common(1)[0][0] if data['names'] else None
        result[version] = {'type': vtype, 'name': vname}

    # SP01 人工确认覆盖（设计文稿第 5.4 节）
    result['SP01'] = {'type': '所有活动', 'name': '翡冷翠之春'}

    return result


# ─────────────────────────── 目录扫描 ───────────────────────────

def scan_bg_directory(indexed_files_set):
    """
    扫描 bg/ 混装目录（1.4 之前）。
    排除 zone 文件 + 已入库文件 -> 生成 1.0 背景图像条目。
    返回: [(文件路径, 版本号, 标签列表), ...]
    """
    bg_dir = os.path.join(STORY_BG_DIR, 'bg')
    if not os.path.isdir(bg_dir):
        print("  [!] bg/ 目录不存在，跳过")
        return []

    new_entries = []
    for fname in sorted(os.listdir(bg_dir)):
        if not fname.endswith('.png'):
            continue
        if is_zone_file(fname):
            continue

        file_path = f"resource/singlebg/storybg/story_bg/bg/{fname}"
        if file_path in indexed_files_set:
            continue

        new_entries.append({
            'file': file_path,
            'version': '1.0',
            'tags': ['1.0', '背景图像'],
            'tone': [],
        })

    return new_entries


def scan_scattered_files(indexed_files_set):
    """
    扫描 story_bg/ 根目录零散文件（1_0_bg_*, 1_1_bg_*, 1_2_bg_*）。
    按文件名前缀匹配版本号。
    返回: [(文件路径, 版本号, 标签列表), ...]
    """
    new_entries = []
    # 文件名前缀 -> 版本号映射
    prefix_map = {
        '1_0_bg_': '1.0',
        '1_1_bg_': '1.1',
        '1_2_bg_': '1.2',
    }

    for fname in sorted(os.listdir(STORY_BG_DIR)):
        if not fname.endswith('.png'):
            continue
        # 只匹配已知前缀
        matched_version = None
        for prefix, version in prefix_map.items():
            if fname.startswith(prefix):
                matched_version = version
                break
        if not matched_version:
            continue

        file_path = f"resource/singlebg/storybg/story_bg/{fname}"
        if file_path in indexed_files_set:
            continue

        new_entries.append({
            'file': file_path,
            'version': matched_version,
            'tags': [matched_version, '背景图像'],
            'tone': [],
        })

    return new_entries


def parse_version_dir(dirname):
    """
    将目录名转换为点号格式的版本号。
    '1.4' -> '1.4', '1_5' -> '1.5', 's01' -> 'SP01'
    如果不是版本目录，返回 None。
    """
    if dirname == 's01':
        return 'SP01'
    # 匹配 X.Y 或 X_Y 格式
    m = re.match(r'^(\d+)[._](\d+)$', dirname)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None


def scan_versioned_directories(indexed_files_set, version_maps):
    """
    扫描 1.4/ ~ 3_7/ 以及 s01/ 版本化目录。
    排除 zone 文件 + 已入库文件 -> 从映射表查类型和名称 -> 生成条目。
    返回: [(文件路径, 版本号, 标签列表), ...]
    """
    new_entries = []

    for dirname in sorted(os.listdir(STORY_BG_DIR)):
        dir_path = os.path.join(STORY_BG_DIR, dirname)
        if not os.path.isdir(dir_path):
            continue

        version = parse_version_dir(dirname)
        if version is None:
            continue  # 跳过 bg/ 等非版本目录

        # 获取版本元数据
        vinfo = version_maps.get(version, {})
        vtype = vinfo.get('type')
        vname = vinfo.get('name')

        for fname in sorted(os.listdir(dir_path)):
            if not fname.endswith('.png'):
                continue
            if is_zone_file(fname):
                continue

            file_path = f"resource/singlebg/storybg/story_bg/{dirname}/{fname}"
            if file_path in indexed_files_set:
                continue

            tags = [version]
            if vtype:
                tags.append(vtype)
            if vname:
                tags.append(vname)
            tags.append('背景图像')

            new_entries.append({
                'file': file_path,
                'version': version,
                'tags': tags,
                'tone': [],
            })

    return new_entries


# ─────────────────────────── 插入策略 ───────────────────────────

def find_version_last_indices(filter_data):
    """
    扫描 Filter.json，找出每个版本的最后出现位置（索引）。

    对于 1.0~1.3 跨区块的情况，last_index 就是该版本在整个文件中
    最后一次出现的位置，不会因为中间夹了其他版本而出错。

    返回: {版本号: 最后出现索引}
    """
    last_indices = {}
    for idx, item in enumerate(filter_data):
        tags = item.get('tags', [])
        for t in tags:
            if re.match(r'^\d+\.\d+$', t) or t == 'SP01':
                last_indices[t] = idx
                break
    return last_indices


def insert_entries(filter_data, new_entries, last_indices):
    """
    将新条目按版本聚类插入到 Filter.json 数据中。

    策略：
    1. 将新条目按版本分组
    2. 每个版本的新条目插入到该版本最后一个区块之后
    3. 按插入位置从大到小处理，避免索引偏移
    """
    # 按版本分组
    by_version = {}
    for entry in new_entries:
        v = entry['version']
        by_version.setdefault(v, []).append(entry)

    # 确定每个版本的插入位置
    insertions = []  # [(position, [entries])]
    for version, entries in by_version.items():
        if version in last_indices:
            pos = last_indices[version] + 1
        else:
            # 版本在 Filter.json 中不存在，放在文件末尾
            print(f"  [!] 版本 {version} 在 Filter.json 中无现有条目，将追加到文件末尾")
            pos = len(filter_data)
        insertions.append((pos, entries))

    # 按位置从大到小排序，从后往前插入以避免索引偏移
    insertions.sort(key=lambda x: x[0], reverse=True)

    for pos, entries in insertions:
        print(f"  -> 在位置 {pos} 插入 {len(entries)} 条 {entries[0]['version']} 背景图像")
        for entry in reversed(entries):
            filter_data.insert(pos, {
                'file': entry['file'],
                'tags': entry['tags'],
                'tone': entry['tone'],
            })

    return filter_data


# ─────────────────────────── 主流程 ───────────────────────────

def main():
    # 解析命令行参数
    apply_mode = '--apply' in sys.argv

    print("=" * 60)
    print("  背景图像索引脚本")
    print("=" * 60)
    print()

    # ── 0. 准备工作 ──
    print("[0/6] 准备工作...")

    # 创建 test/ 目录
    os.makedirs(TEST_DIR, exist_ok=True)

    # 确定操作目标
    if apply_mode:
        target_json = FILTER_JSON
        print(f"  [直接模式] 将修改原文件: {FILTER_JSON}")
    else:
        target_json = os.path.join(TEST_DIR, '../Filter.json')
        shutil.copy2(FILTER_JSON, target_json)
        print(f"  [测试模式] 在 test/ 目录中操作: {target_json}")
        print(f"     (使用 --apply 参数可直接修改原文件)")

    # ── 1. 加载数据 ──
    print("\n[1/6] 加载数据...")
    filter_data = load_json(target_json)
    tag_data = load_json(TAG_DATA_JSON)

    original_count = len(filter_data)
    print(f"  Filter.json: {original_count} 条")
    print(f"  tagData.json: {len(tag_data)} 个标签")

    # ── 2. 构建辅助数据结构 ──
    print("\n[2/6] 构建索引与映射表...")

    # 已索引文件路径集合
    indexed_files = set()
    for item in filter_data:
        indexed_files.add(item.get('file', ''))

    print(f"  已索引文件: {len(indexed_files)} 个")

    # 中文标签 -> 类别映射
    tag_cat_map = build_tag_category_map(tag_data)

    # 版本 -> {类型, 名称} 映射
    version_maps = build_version_maps(filter_data, tag_data)
    print(f"  版本映射表: {len(version_maps)} 个版本")
    for ver, info in sorted(version_maps.items(), key=lambda x: _version_sort_key(x[0])):
        print(f"    {ver}: type={info['type']}, name={info['name']}")

    # ── 3. 扫描各目录 ──
    print("\n[3/6] 扫描背景图像目录...")

    stats = {
        'scanned': 0,
        'excluded_zone': 0,
        'excluded_indexed': 0,
        'new_entries': 0,
    }

    all_new_entries = []

    # 3a. bg/ 混装目录
    print("\n  --- bg/ 混装目录 (1.4 之前) ---")
    bg_entries = scan_bg_directory(indexed_files)
    bg_scanned = len([f for f in os.listdir(os.path.join(STORY_BG_DIR, 'bg'))
                      if f.endswith('.png')])
    bg_zone = len([f for f in os.listdir(os.path.join(STORY_BG_DIR, 'bg'))
                   if f.endswith('.png') and is_zone_file(f)])
    print(f"  扫描: {bg_scanned} 文件, 排除 zone: {bg_zone}, "
          f"已入库: {bg_scanned - bg_zone - len(bg_entries)}, 新增: {len(bg_entries)}")
    stats['scanned'] += bg_scanned
    stats['excluded_zone'] += bg_zone
    stats['excluded_indexed'] += bg_scanned - bg_zone - len(bg_entries)
    stats['new_entries'] += len(bg_entries)
    all_new_entries.extend(bg_entries)

    # 3b. 根目录零散文件
    print("\n  --- 根目录零散文件 ---")
    scattered_entries = scan_scattered_files(indexed_files)
    print(f"  新增: {len(scattered_entries)}")
    for e in scattered_entries:
        print(f"    {e['file']} -> {e['tags']}")
    stats['new_entries'] += len(scattered_entries)
    all_new_entries.extend(scattered_entries)

    # 3c. 版本化目录 (1.4/ ~ 3_7/) + s01/
    print("\n  --- 版本化目录 (1.4 ~ 3.7 + SP01) ---")
    versioned_entries = scan_versioned_directories(indexed_files, version_maps)
    # 按版本统计
    ver_counts = Counter(e['version'] for e in versioned_entries)
    for ver in sorted(ver_counts.keys(), key=_version_sort_key):
        sample = next(e for e in versioned_entries if e['version'] == ver)
        print(f"    {ver}: {ver_counts[ver]} 条 -> tags: {sample['tags']}")
    stats['new_entries'] += len(versioned_entries)
    all_new_entries.extend(versioned_entries)

    # ── 4. 确定插入位置 ──
    print("\n[4/6] 确定插入位置...")
    last_indices = find_version_last_indices(filter_data)

    # ── 5. 执行插入 ──
    print("\n[5/6] 执行插入...")
    if all_new_entries:
        insert_entries(filter_data, all_new_entries, last_indices)
    else:
        print("  没有需要插入的新条目")

    # ── 6. 写回 ──
    print("\n[6/6] 写回 JSON...")
    save_filter_json(filter_data, target_json)
    new_count = len(filter_data)
    print(f"  已写入: {target_json}")
    print(f"  条目数: {original_count} -> {new_count} (+{new_count - original_count})")

    # ── 输出统计 ──
    print("\n" + "=" * 60)
    print("  处理统计")
    print("=" * 60)
    print(f"  扫描文件总数:      {stats['scanned']}")
    print(f"  排除 zone 文件:    {stats['excluded_zone']}")
    print(f"  跳过已入库:        {stats['excluded_indexed']}")
    print(f"  新增条目:          {stats['new_entries']}")
    print(f"  Filter.json 最终:  {new_count} 条")

    if not apply_mode:
        print(f"\n  [提示] 测试完成！检查 {target_json} 无误后，")
        print(f"     运行 python index_backgrounds.py --apply 应用修改")
        print(f"     或手动 cp {target_json} {FILTER_JSON}")


def _version_sort_key(version_str):
    """版本号排序键：1.0, 1.1, ..., 3.7, SP01"""
    if version_str == 'SP01':
        return (999, 0)
    try:
        parts = version_str.split('.')
        return (int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return (9999, 0)


if __name__ == '__main__':
    main()
