import argparse
import json
import os
import sys
from pathlib import Path
import cv2
import numpy as np
from sklearn.cluster import KMeans
from concurrent.futures import ThreadPoolExecutor

# 修复 Windows 中文系统 GBK 控制台无法打印特殊字符的问题
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ================= 配置区 =================
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent  # 脚本位于 tools/ 下，项目根在上一级
FILTER_JSON = ROOT_DIR / "Filter.json"
BASE_IMAGE_PATH = str(ROOT_DIR)
MAX_WORKERS = 8

# 退出码约定：0=成功，1=报错中断（不写入文件），2=用户取消
EXIT_CANCELLED = 2
# ==========================================


def analyze_image_tone(img_path):
    """
    核心算法：根据给定的物理量与色彩层级规则提取色调标签。
    若图片无法解码，抛出 ValueError，绝不返回非法占位标签污染数据。
    """
    # 兼容 Windows 中文路径的读取方式
    img_array = np.fromfile(img_path, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError(f"图片解码失败（文件可能已损坏）: {img_path}")

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
        # 为了极速计算，如果有效像素太多，随机抽样 3000 个点代表整图（独立固定种子，线程安全）
        if len(valid_rgb) > 3000:
            rng = np.random.default_rng(42)
            indices = rng.choice(len(valid_rgb), 3000, replace=False)
            sample_pixels = valid_rgb[indices]
        else:
            sample_pixels = valid_rgb

        # 聚成两类，找出两个主色
        kmeans = KMeans(n_clusters=2, n_init="auto", random_state=42).fit(sample_pixels)
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
    处理单个条目。
    返回值：
      ("skipped", None)               -> 已有 tone，跳过
      ("ok", tone_tags)               -> 分析成功，返回新 tone
      ("error", (file_path, reason))  -> 文件丢失或解析失败，返回报错信息
    """
    if item.get("tone") and len(item["tone"]) > 0:
        return ("skipped", None)

    file_rel_path = item["file"]
    abs_path = os.path.normpath(os.path.join(BASE_IMAGE_PATH, file_rel_path))

    if not os.path.exists(abs_path):
        return ("error", (file_rel_path, "找不到对应的本地图片文件"))

    try:
        tone_tags = analyze_image_tone(abs_path)
        return ("ok", tone_tags)
    except Exception as e:
        return ("error", (file_rel_path, str(e)))


def write_filter_json(data: list) -> None:
    """按项目格式原子覆写 Filter.json，数组全部单行"""
    lines = []
    for item in data:
        file_str = f'    "file": "{item["file"]}"'
        tags_str = f'    "tags": {json.dumps(item["tags"], ensure_ascii=False)}'
        tone_str = f'    "tone": {json.dumps(item["tone"], ensure_ascii=False)}'
        item_str = "  {\n" + file_str + ",\n" + tags_str + ",\n" + tone_str + "\n  }"
        lines.append(item_str)

    tmp_path = FILTER_JSON.parent / f".{FILTER_JSON.name}.tmp.{os.getpid()}"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write("[\n" + ",\n".join(lines) + "\n]\n")
        os.replace(tmp_path, FILTER_JSON)
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="增量分析 Filter.json 中空 tone 条目的色调标签")
    parser.add_argument("--yes", action="store_true", help="跳过交互确认，直接开始分析")
    parser.add_argument("--dry-run", action="store_true", help="仅列出待分析文件，不执行计算与写回")
    args = parser.parse_args()

    print("=" * 60)
    print("  R9 Wallpaper - 色调更新脚本（仅处理空 tone）")
    print("=" * 60)

    # ── 1. 加载 Filter.json ──
    print("\n[1/3] 加载 Filter.json ...")
    if not FILTER_JSON.exists():
        print(f"  ✗ 找不到 {FILTER_JSON}", file=sys.stderr)
        return 1

    with open(FILTER_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    total = len(data)
    pending_items = [item for item in data if not item.get("tone") or len(item["tone"]) == 0]
    need_update = len(pending_items)
    already_done = total - need_update

    print(f"  总条目: {total}")
    print(f"  已有色调: {already_done}")
    print(f"  待分析:   {need_update}")

    if need_update == 0:
        print("\n  ✓ 所有条目均已有色调数据，无需处理。")
        return 0

    # ── 1.5 列出待更新文件 ──
    print("\n  待更新文件列表：")
    print("-" * 40)
    for item in pending_items[:50]:
        print(f"    {item['file']}")
    if need_update > 50:
        print(f"    ... 其余 {need_update - 50} 个文件已省略")
    print("-" * 40)

    if args.dry_run:
        print(f"\n  [DRY-RUN] 预计分析 {need_update} 个文件，未修改 Filter.json。")
        return 0

    if not args.yes:
        answer = input(f"\n  共 {need_update} 个文件需要更新，是否继续？(y/n): ").strip().lower()
        if answer not in ("y", "yes"):
            print("  🛑 用户取消，退出脚本。")
            return EXIT_CANCELLED

    # ── 2. 多线程分析 ──
    print(f"\n[2/3] 开启多线程色调分析 ({MAX_WORKERS}线程)...")

    updated = 0
    errors = []
    updates_to_apply: list[tuple[dict, list[str]]] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = executor.map(process_single_item, data)
        for count, (item, (status, payload)) in enumerate(zip(data, results), 1):
            if status == "ok":
                updates_to_apply.append((item, payload))
                updated += 1
            elif status == "error":
                errors.append(payload)
            if count % 200 == 0:
                print(f"  已扫描 {count}/{total} ... ({updated} 个分析完成)")

    # 若存在任何缺失或损坏图片，立即中断，绝不写入 Filter.json
    if errors:
        print(f"\n  ❌ 色调分析失败：共有 {len(errors)} 个文件出错，已中止且未修改 Filter.json！", file=sys.stderr)
        for file_rel, reason in errors[:30]:
            print(f"     - {file_rel} -> {reason}", file=sys.stderr)
        if len(errors) > 30:
            print(f"     ... 其余 {len(errors) - 30} 个错误已省略", file=sys.stderr)
        return 1

    print(f"  扫描完成，本次成功分析: {updated} 个条目")

    # ── 3. 全部成功后统一应用并原子写回 Filter.json ──
    for item, tone_tags in updates_to_apply:
        item["tone"] = tone_tags

    print("\n[3/3] 写回 Filter.json ...")
    write_filter_json(data)
    print(f"  ✓ 完成！共 {total} 条记录，本次更新 {updated} 条。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
