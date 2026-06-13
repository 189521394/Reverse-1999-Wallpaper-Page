import json
import os
import sys
from pathlib import Path
import cv2
import numpy as np
from sklearn.cluster import KMeans
from concurrent.futures import ThreadPoolExecutor

# ================= 配置区 =================
SCRIPT_DIR = Path(__file__).parent
FILTER_JSON = SCRIPT_DIR / "Filter.json"
BASE_IMAGE_PATH = str(SCRIPT_DIR)


# ==========================================

def analyze_image_tone(img_path):
    """
    核心算法：根据给定的物理量与色彩层级规则提取色调标签
    """
    # 兼容 Windows 中文路径的读取方式
    img_array = np.fromfile(img_path, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if img is None:
        return ["解析失败"]

    tones = []

    # 转换色彩空间
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h_channel, s_channel, v_channel = cv2.split(hsv)

    # ---------------- 第一阶段：计算基础物理量 ----------------

    # 1. 饱和度 (Saturation) - 判断全局色彩丰富度
    mean_s = np.mean(s_channel)
    is_high_sat = mean_s > 60  # OpenCV 中 S 通道满值为 255
    tones.append("饱和度-高" if is_high_sat else "饱和度-低")

    # 2. 对比度 (Contrast) - 使用灰度图的标准差，标准差越大明暗反差越大
    contrast = np.std(gray)
    tones.append("对比度-强" if contrast > 50 else "对比度-弱")

    # 3. 明暗调 (Value/Brightness) - 避开“均值陷阱”
    # 使用中位数代表整体感觉，使用 90% 和 10% 分位数捕捉极端过曝或死黑
    median_v = np.median(v_channel)
    p90_v = np.percentile(v_channel, 90)
    p10_v = np.percentile(v_channel, 10)

    if median_v > 160 or p90_v > 245:  # 整体偏亮，或者有大量刺眼的白色
        tones.append("明暗调-高")
    elif median_v < 70 or p10_v < 15:  # 整体偏暗，或者有大量死黑
        tones.append("明暗调-低")
    else:
        tones.append("明暗调-中")

    # ---------------- 第二阶段：计算色彩属性 ----------------

    # 分支 A：如果判定为 饱和度-低
    if not is_high_sat:
        tones.append("色温-中性")
        # 强制中断，不进行色彩关系计算
        return tones

    # 分支 B：如果判定为 饱和度-高
    # 为了提取真实的色相，我们需要掩码（Mask）掉太暗、太亮、太灰的像素，它们会干扰色相判断
    valid_mask = (s_channel > 40) & (v_channel > 40) & (v_channel < 240)
    valid_hues = h_channel[valid_mask]

    if len(valid_hues) == 0:
        tones.append("色温-中性")
        return tones

    # 计算色温
    # OpenCV 的 H 范围是 0-180。暖色通常在红橙黄 (0-30) 和洋红 (150-180)。冷色在青蓝紫 (30-150)
    warm_pixels = np.sum((valid_hues <= 30) | (valid_hues >= 150))
    cold_pixels = np.sum((valid_hues > 30) & (valid_hues < 150))
    tones.append("色温-暖色" if warm_pixels > cold_pixels else "色温-冷色")

    # 计算色彩关系 (K-Means)
    valid_rgb = img[valid_mask]
    if len(valid_rgb) > 100:
        # 为了极速计算，如果有效像素太多，我们随机抽样 3000 个点即可代表整图
        if len(valid_rgb) > 3000:
            indices = np.random.choice(len(valid_rgb), 3000, replace=False)
            sample_pixels = valid_rgb[indices]
        else:
            sample_pixels = valid_rgb

        # 聚成两类，找出两个主色
        kmeans = KMeans(n_clusters=2, n_init='auto', random_state=42).fit(sample_pixels)
        centers = kmeans.cluster_centers_

        # 将主色中心点转回 HSV 获取准确色相
        centers_img = np.uint8([[centers[0], centers[1]]])
        centers_hsv = cv2.cvtColor(centers_img, cv2.COLOR_BGR2HSV)[0]
        h1, h2 = int(centers_hsv[0][0]), int(centers_hsv[1][0])

        # OpenCV 的 H 是 0-180，算差值时需要 * 2 还原到 360 度色相环
        diff = abs(h1 - h2) * 2
        if diff > 180:
            diff = 360 - diff

        # 计算两个聚类的像素占比，判断是否有一种颜色占据绝对主导
        labels = kmeans.labels_
        ratio = np.sum(labels == 0) / len(labels)

        if ratio > 0.85 or ratio < 0.15 or diff <= 20:
            tones.append("色彩-单调")
        elif diff < 60:
            tones.append("色彩-相似")
        elif diff > 120:
            tones.append("色彩-互补")
        else:
            tones.append("色彩-对比")  # 在 60~120 度之间补充一个标签

    return tones


def process_single_item(item):
    """
    处理单个条目。若已有 tone 数据则跳过返回 None，
    否则分析图片并原地更新 item 的 tone 字段。
    """
    # 已有色调数据的条目直接跳过
    if item.get("tone") and len(item["tone"]) > 0:
        return None

    file_rel_path = item["file"]

    # 拼接绝对路径
    abs_path = os.path.normpath(os.path.join(BASE_IMAGE_PATH, file_rel_path))

    # 图像引擎处理
    if os.path.exists(abs_path):
        tone_tags = analyze_image_tone(abs_path)
    else:
        tone_tags = ["文件丢失"]

    # 原地更新（因为后续写回用的是原列表）
    item["tone"] = tone_tags
    return True


def main():
    print("=" * 60)
    print("  R9 Wallpaper - 色调更新脚本（仅处理空 tone）")
    print("=" * 60)

    # ── 1. 加载 Filter.json ──
    print(f"\n[1/3] 加载 Filter.json ...")
    if not FILTER_JSON.exists():
        print(f"  ✗ 找不到 {FILTER_JSON}")
        sys.exit(1)

    with open(FILTER_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total = len(data)
    need_update = sum(1 for item in data if not item.get("tone") or len(item["tone"]) == 0)
    already_done = total - need_update

    print(f"  总条目: {total}")
    print(f"  已有色调: {already_done}")
    print(f"  待分析:   {need_update}")

    if need_update == 0:
        print("\n  ✓ 所有条目均已有色调数据，无需处理。")
        return

    # ── 2. 多线程分析 ──
    print(f"\n[2/3] 开启多线程色调分析 (8线程)...")

    updated = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(process_single_item, data)
        for count, result in enumerate(results, 1):
            if result is True:
                updated += 1
            if count % 100 == 0:
                print(f"  已扫描 {count}/{total} ... ({updated} 个已更新)")

    print(f"  扫描完成，本次更新: {updated} 个条目")

    # ── 3. 写回 Filter.json ──
    print(f"\n[3/3] 写回 Filter.json ...")
    write_filter_json(data)
    print(f"  ✓ 完成！共 {total} 条记录，本次更新 {updated} 条。")


def write_filter_json(data: list) -> None:
    """按项目格式覆写 Filter.json，数组全部单行"""
    lines = []
    for item in data:
        file_str = f'    "file": "{item["file"]}"'
        tags_str = f'    "tags": {json.dumps(item["tags"], ensure_ascii=False)}'
        tone_str = f'    "tone": {json.dumps(item["tone"], ensure_ascii=False)}'
        item_str = "  {\n" + file_str + ",\n" + tags_str + ",\n" + tone_str + "\n  }"
        lines.append(item_str)

    with open(FILTER_JSON, 'w', encoding='utf-8') as f:
        f.write("[\n" + ",\n".join(lines) + "\n]\n")


if __name__ == "__main__":
    main()