"""
为 lang/tagData.json 批量生成 slug 字段（一次性脚本）

处理范围：character / versionCode / mainLine / event / anecdote 五个分类
- 汇总标签（zhu_xian_ju_qing / huo_dong_ju_qing / yi_shi）→ slug 为空字符串（对应 /s/ /e/ /a/ 根路径）
- versionCode → 保持原样（如 "1.0"）
- 其余标签 → 基于 "en" 字段转写：西里尔转拉丁、NFKD 剥离重音、全小写、非字母数字替换为 -
- 同一 category 内 slug 唯一性校验，重复追加 -2
- 已存在 slug 字段的词条跳过，保证 URL 永久固定

用法：在项目根目录运行 python tools/add_slugs.py
"""

import argparse
import json
import os
import re
import sys
import unicodedata

# 修复 Windows 中文系统 GBK 控制台无法打印特殊字符的问题
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# 项目根目录：脚本位于 tools/ 下
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG_DATA_PATH = os.path.join(PROJECT_ROOT, 'lang', 'tagData.json')

# 需要生成 slug 的分类（其余分类不做落地页）
SLUG_CATEGORIES = ('character', 'versionCode', 'mainLine', 'event', 'anecdote')

# 汇总标签：slug 为空字符串，直接映射到分类根路径
AGGREGATE_TAGS = {
    'zhu_xian_ju_qing': 'mainLine',
    'huo_dong_ju_qing': 'event',
    'yi_shi': 'anecdote',
}

# 俄文专名词典优先匹配（小写键）：避免标准映射产生的偏差
# 标准映射下 Енисей 会变成 enisey，统一使用 yenisei
CYRILLIC_OVERRIDES = {
    'енисей': 'yenisei',
    'зима': 'zima',
    'вила': 'vila',
}

# 西里尔字母 → 拉丁字母映射表（小写）
CYRILLIC_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def generate_slug(en_text: str) -> str:
    """基于英文名生成 URL slug"""
    text = en_text.lower()

    # 1. 俄文专名词典优先匹配（小写形式替换）
    for cyr, latin in CYRILLIC_OVERRIDES.items():
        text = text.replace(cyr, latin)

    # 2. 剩余西里尔字母按映射表转写
    text = ''.join(CYRILLIC_MAP.get(ch, ch) for ch in text)

    # 3. NFKD 剥离重音符号（é→e、ñ→n 等）
    #    注意：只移除组合重音符号（U+0300–U+036F），其余非 ASCII 字符（如 ·）
    #    保留给下一步格式化成 '-'，避免被 ascii 编码静默吞掉
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not (0x0300 <= ord(ch) <= 0x036F))

    # 4. 格式化：非字母数字替换为 -，合并连续 -，去除首尾 -
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')

    return text


def write_tag_data_atomic(tag_data: dict) -> None:
    """原子覆写 lang/tagData.json（先写临时文件再替换）"""
    tmp_path = os.path.join(os.path.dirname(TAG_DATA_PATH), f".tagData.json.tmp.{os.getpid()}")
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(tag_data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, TAG_DATA_PATH)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description='为 lang/tagData.json 中缺失 slug 的 SEO 词条批量生成 slug')
    parser.add_argument('--dry-run', action='store_true', help='仅检查并预览将生成的 slug，不写入文件')
    args = parser.parse_args()

    with open(TAG_DATA_PATH, 'r', encoding='utf-8') as f:
        tag_data = json.load(f)

    # 统计每个分类已使用的 slug，用于唯一性校验
    used_slugs = {}   # category -> set(slug)
    added_items = []
    skipped_count = 0
    invalid_items = []

    for tag_id, item in tag_data.items():
        category = item.get('category')
        if category not in SLUG_CATEGORIES:
            continue

        # 已存在 slug 的词条跳过，保证 URL 永久固定
        if 'slug' in item:
            skipped_count += 1
            used_slugs.setdefault(category, set()).add(item['slug'])
            continue

        if tag_id in AGGREGATE_TAGS:
            # 汇总标签 → 空字符串，映射到分类根路径
            slug = ''
        elif category == 'versionCode':
            # 版本号保持原样
            raw_ver = str(item.get('en') or tag_id).strip()
            if not raw_ver:
                invalid_items.append((tag_id, category, 'versionCode 缺少有效英文/版本号'))
                continue
            slug = raw_ver
        else:
            # 其余标签基于英文名转写，缺英文或转写为空时拦截
            en_val = str(item.get('en', '')).strip()
            if not en_val:
                invalid_items.append((tag_id, category, '缺少 en 字段，无法生成 slug'))
                continue
            slug = generate_slug(en_val)
            if not slug:
                invalid_items.append((tag_id, category, f'en="{en_val}" 转写后 slug 为空（请检查英文翻译）'))
                continue

        # 同一分类内唯一性校验
        category_used = used_slugs.setdefault(category, set())
        if slug in category_used:
            base_slug = slug
            counter = 2
            while f'{base_slug}-{counter}' in category_used:
                counter += 1
            slug = f'{base_slug}-{counter}'
            print(f'  ⚠️ 重复 slug [{base_slug}] -> [{slug}] (分类: {category}, 词条: {tag_id})')
        category_used.add(slug)

        item['slug'] = slug
        added_items.append((tag_id, category, item.get('en', ''), slug))

    if invalid_items:
        print(f'❌ slug 生成失败：发现 {len(invalid_items)} 个词条无法生成合法 slug，未修改 tagData.json！', file=sys.stderr)
        for tag_id, category, reason in invalid_items:
            print(f'   - [{category}] {tag_id}: {reason}', file=sys.stderr)
        return 1

    if not added_items:
        print(f'[OK] lang/tagData.json 无需更新：所有 {skipped_count} 个 SEO 词条均已有 slug')
        return 0

    if args.dry_run:
        print(f'[DRY-RUN] 预计新增 {len(added_items)} 个 slug（跳过已有 {skipped_count} 个），未写入文件：')
        for tag_id, category, en_val, slug in added_items:
            print(f'  + [{category}] {tag_id} ({en_val}) -> "{slug}"')
        return 0

    write_tag_data_atomic(tag_data)
    print(f'[OK] slug 生成完成：新增 {len(added_items)} 个，跳过(已有) {skipped_count} 个')
    for tag_id, category, en_val, slug in added_items:
        print(f'  + [{category}] {tag_id} ({en_val}) -> "{slug}"')
    return 0


if __name__ == '__main__':
    sys.exit(main())
