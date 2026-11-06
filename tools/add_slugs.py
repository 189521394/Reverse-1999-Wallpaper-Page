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


def main():
    with open(TAG_DATA_PATH, 'r', encoding='utf-8') as f:
        tag_data = json.load(f)

    # 统计每个分类已使用的 slug，用于唯一性校验
    used_slugs = {}   # category -> set(slug)
    added_count = 0
    skipped_count = 0

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
            slug = str(item.get('en', tag_id))
        else:
            # 其余标签基于英文名转写
            slug = generate_slug(item.get('en', tag_id))

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
        added_count += 1

    with open(TAG_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(tag_data, f, ensure_ascii=False, indent=2)

    print(f'[OK] slug 生成完成：新增 {added_count} 个，跳过(已有) {skipped_count} 个')

    # 输出验收样例
    print('\n=== 验收样例 ===')
    samples = [
        ('zhu_xian_ju_qing', '所有主线(汇总)'),
        ('1.0', '版本号'),
        ('dong', '俄文 Зима'),
        ('wei_la', '俄文 Вила'),
        ('xiao_ye_ni_sai', '俄文 Енисей'),
        ('a_fu_xi_wei', '俄文 Авксивий'),
        ('fa_lang_yan', '重音 Coppélia'),
        ('ye_mu_lan', '重音 Añil'),
        ('yuan_zheng_ji', '西里尔主线'),
        ('back_to_earth', '西里尔轶事'),
    ]
    for tag_id, desc in samples:
        if tag_id in tag_data:
            item = tag_data[tag_id]
            print(f'  {tag_id} ({desc}): {item.get("en", "")} -> "{item.get("slug", "(无)")}"')
        else:
            print(f'  {tag_id} ({desc}): ❌ 词条不存在！')


if __name__ == '__main__':
    main()
