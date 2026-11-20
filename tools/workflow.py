#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
R9 Wallpaper 版本更新总控工作流脚本。

设计原则：
  - 顶部配置区即改即用（WebStorm 右键直接运行），也支持命令行参数临时覆盖
  - 按真实版本更新节奏拆分为：
      * prepare : 阶段一（拉上游 → 压缩略图 → 自动扫描索引新版本 → 色调分析）
      * check   : 只读体检（全量核对 Filter.json / 本地原图 / 缩略图 / tone / tagData / slug）
      * publish : 阶段二（补 slug → 同步 schema → 只读体检 → build.py 构建 → R2 上传 → 可选预览）
  - 任意步骤失败立即熔断，并通过 .workflow_state.json 记录断点，下次一键从断点续跑
  - Git 提交与推送始终留给人工核对 diff 后手动完成

命令行示例（可选，不带参数时默认使用下方顶部配置区）：
  python tools/workflow.py
  python tools/workflow.py check
  python tools/workflow.py prepare --dry-run
  python tools/workflow.py publish --from upload
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# 修复 Windows 中文系统 GBK 控制台无法打印 emoji/特殊字符的问题
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ================= 配置区 =================
# 运行模式：
#   "prepare" -> 阶段一：拉上游 -> 压缩缩略图 -> 自动扫描索引新版本 -> 计算色调
#   "check"   -> 只读体检：检查缺图/缺缩略图/空 tone/未注册标签/缺 slug（不改任何文件）
#   "publish" -> 阶段二：补 slug -> 同步 schema -> 体检 -> build.py 构建 -> R2 上传 -> 可选预览
MODE = "check"

# 断点续跑控制：
#   None -> 自动检测上次是否中断；若上次中途失败，会询问“从断点继续”或“从头重跑”
#   也可手动填写步骤 ID 直接从该步开跑：
#     prepare 可选: "sync", "compress", "index", "tone"
#     publish 可选: "slugs", "schema", "check", "build", "upload", "preview"
START_FROM = None

# 演练模式：True 时只展示将要执行的操作与差异，不修改任何业务文件、不上传 R2
DRY_RUN = False

# 上游拉取代理地址（设为 None 表示不使用代理）
PROXY_URL = "http://127.0.0.1:7897"

# 阶段二上传 R2 后，启动 runServer.py build 模式预览时的图片来源：
#   "r2"    -> 真走线上 R2 图片（推荐，顺便验收 R2 是否全部加载正常）
#   "local" -> 内存劫持为本地 /resource/（不污染 dist/）
PREVIEW_IMAGE_SOURCE = "r2"

# 体检报告统计“未索引 PNG”时忽略的非版本目录
CHECK_IGNORE_DIRS = {"bg"}
# ==========================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
RESOURCE_DIR = PROJECT_ROOT / "resource"
FILTER_JSON_PATH = PROJECT_ROOT / "Filter.json"
TAG_DATA_PATH = PROJECT_ROOT / "lang" / "tagData.json"
STATE_FILE = PROJECT_ROOT / ".workflow_state.json"

# SEO 落地页分类与汇总标签（与 tools/build.py、tools/add_slugs.py 保持一致）
SEO_CATEGORIES = ("character", "versionCode", "mainLine", "event", "anecdote")
AGGREGATE_TAGS = ("zhu_xian_ju_qing", "huo_dong_ju_qing", "yi_shi")

# 特殊退出码约定（与各子脚本一致）
EXIT_CANCELLED = 2


# ═══════════════════════════════════════════════════════════
# 断点状态持久化（.workflow_state.json）
# ═══════════════════════════════════════════════════════════

def load_state() -> dict | None:
    """读取上次运行保存的断点状态"""
    if not STATE_FILE.exists():
        return None
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_state(state: dict) -> None:
    """保存当前工作流断点状态"""
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def clear_state() -> None:
    """全部步骤成功后清理断点文件"""
    if STATE_FILE.exists():
        STATE_FILE.unlink(missing_ok=True)


# ═══════════════════════════════════════════════════════════
# 子脚本调用封装
# ═══════════════════════════════════════════════════════════

def run_py_script(script_path: Path, extra_args: list[str] | None = None) -> int:
    """使用当前同一个 Python 解释器（sys.executable）运行子脚本"""
    if not script_path.is_file():
        print(f"❌ 找不到脚本文件: {script_path}", file=sys.stderr)
        return 1
    cmd = [sys.executable, str(script_path), *(extra_args or [])]
    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    return result.returncode


def print_git_status_hint() -> None:
    """打印主仓库与 resource 仓库的简要 git status 提醒"""
    for label, repo_dir in [("主仓库", PROJECT_ROOT), ("resource 仓库", RESOURCE_DIR)]:
        if not (repo_dir / ".git").exists():
            continue
        res = subprocess.run(
            ["git", "status", "--short"],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        lines = [line for line in res.stdout.splitlines() if line.strip()]
        if lines:
            print(f"\n📌 [{label}] 当前有 {len(lines)} 项未提交变更：")
            for line in lines[:15]:
                print(f"   {line}")
            if len(lines) > 15:
                print(f"   ... 其余 {len(lines) - 15} 项已省略")
        else:
            print(f"\n📌 [{label}] 工作区干净。")


# ═══════════════════════════════════════════════════════════
# 只读健康体检（补足 build.py 看不见本地 resource/ 的盲区）
# ═══════════════════════════════════════════════════════════

def run_health_check() -> int:
    """
    纯只读体检（绝不修改任何文件）：
      硬性检查（不通过会返回 1 并阻断发布）：
        1. Filter.json 与 lang/tagData.json 可正常解析
        2. Filter.json 无重复 file 条目
        3. Filter.json 每条记录对应的本地原图（resource/singlebg/...）存在
        4. Filter.json 每条记录对应的本地缩略图（resource/thumbnails/...webp）存在
        5. 无空 tone（[]）条目
        6. 所有 tags / tone 均已在 lang/tagData.json 注册（同时可抓出“文件丢失”等非法值）
        7. 所有 SEO 分类标签均有合法 slug
      提示性检查（仅打印提醒，不阻断）：
        8. singlebg/storybg/ 下尚未被 Filter.json 索引的 PNG 数量（排除 zone 和忽略目录）
        9. thumbnails/ 中对应原图已不存在的孤儿缩略图数量
    """
    print("=" * 60)
    print("  R9 Wallpaper - 全量只读体检 (Check)")
    print("=" * 60)

    errors: list[str] = []

    if not FILTER_JSON_PATH.is_file():
        print(f"❌ 找不到 {FILTER_JSON_PATH}", file=sys.stderr)
        return 1
    if not TAG_DATA_PATH.is_file():
        print(f"❌ 找不到 {TAG_DATA_PATH}", file=sys.stderr)
        return 1
    if not RESOURCE_DIR.is_dir():
        print(f"❌ 找不到素材仓库目录 {RESOURCE_DIR}", file=sys.stderr)
        return 1

    try:
        filter_data = json.loads(FILTER_JSON_PATH.read_text(encoding="utf-8"))
        tag_data = json.loads(TAG_DATA_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"❌ JSON 解析失败: {e}", file=sys.stderr)
        return 1

    # 构建中文名 → tag_id 映射
    zh_to_id = {v["zh"]: k for k, v in tag_data.items() if "zh" in v}

    seen_files: set[str] = set()
    dup_files: list[str] = []
    missing_originals: list[str] = []
    missing_thumbs: list[str] = []
    empty_tones: list[str] = []
    unregistered_tags: list[tuple[str, str]] = []
    unregistered_tones: list[tuple[str, str]] = []

    for item in filter_data:
        file_rel = item.get("file", "")
        if file_rel in seen_files:
            dup_files.append(file_rel)
        seen_files.add(file_rel)

        # 检查本地原图
        orig_path = PROJECT_ROOT / file_rel
        if not orig_path.is_file():
            missing_originals.append(file_rel)

        # 检查本地 WebP 缩略图（与 build.py 的 thumb_path 规则保持一致）
        if file_rel.startswith("resource/") and file_rel.lower().endswith(".png"):
            thumb_rel = file_rel.replace("resource/", "resource/thumbnails/", 1)[:-4] + ".webp"
            if not (PROJECT_ROOT / thumb_rel).is_file():
                missing_thumbs.append(thumb_rel)

        # 检查 tags 是否全部注册
        for zh_tag in item.get("tags") or []:
            if zh_tag not in zh_to_id:
                unregistered_tags.append((zh_tag, file_rel))

        # 检查 tone 非空且全部注册
        tones = item.get("tone") or []
        if len(tones) == 0:
            empty_tones.append(file_rel)
        else:
            for zh_tone in tones:
                if zh_tone not in zh_to_id:
                    unregistered_tones.append((zh_tone, file_rel))

    # 检查 SEO 标签 slug 完整性
    missing_slugs: list[tuple[str, str]] = []
    for tag_id, entry in tag_data.items():
        cat = entry.get("category")
        if cat not in SEO_CATEGORIES:
            continue
        slug = entry.get("slug")
        if tag_id not in AGGREGATE_TAGS and not (isinstance(slug, str) and slug.strip()):
            missing_slugs.append((cat, tag_id))

    # 汇总硬性检查结果
    def report_check(title: str, bad_list: list, formatter=lambda x: str(x)):
        if not bad_list:
            print(f"  ✅ {title}: 通过")
            return
        errors.append(f"{title} ({len(bad_list)} 处)")
        print(f"  ❌ {title}: 发现 {len(bad_list)} 处问题")
        for x in bad_list[:15]:
            print(f"     - {formatter(x)}")
        if len(bad_list) > 15:
            print(f"     ... 其余 {len(bad_list) - 15} 处已省略")

    print(f"\n共检查 {len(filter_data)} 条 Filter.json 记录、{len(tag_data)} 条 tagData.json 词条：\n")
    report_check("Filter.json 重复文件检查", dup_files)
    report_check("本地原图存在性检查 (singlebg)", missing_originals)
    report_check("本地缩略图存在性检查 (thumbnails)", missing_thumbs)
    report_check("色调字段非空检查 (tone)", empty_tones)
    report_check("标签注册检查 (tags ∈ tagData)", unregistered_tags, lambda x: f"[{x[0]}] @ {x[1]}")
    report_check("色调注册检查 (tone ∈ tagData)", unregistered_tones, lambda x: f"[{x[0]}] @ {x[1]}")
    report_check("SEO 词条 slug 完整性检查", missing_slugs, lambda x: f"[{x[0]}] {x[1]}")

    # 提示性检查（不阻断）
    print("\n--- 提示性信息（不阻断发布） ---")
    unindexed_pngs = []
    story_base = RESOURCE_DIR / "singlebg" / "storybg"
    for parent in ("story_atcg", "story_bg"):
        parent_dir = story_base / parent
        if not parent_dir.is_dir():
            continue
        for child in sorted(parent_dir.iterdir()):
            if not child.is_dir() or child.name in CHECK_IGNORE_DIRS:
                continue
            for png in child.glob("*.png"):
                if "zone" in png.stem.lower():
                    continue
                rel = png.relative_to(PROJECT_ROOT).as_posix()
                if rel not in seen_files:
                    unindexed_pngs.append(rel)

    if unindexed_pngs:
        print(f"  ℹ️ 本地存在 {len(unindexed_pngs)} 张未索引 PNG（已排除 zone 与 {CHECK_IGNORE_DIRS}）：")
        for p in unindexed_pngs[:10]:
            print(f"     - {p}")
        if len(unindexed_pngs) > 10:
            print(f"     ... 其余 {len(unindexed_pngs) - 10} 张已省略")
    else:
        print("  ℹ️ 无未索引的版本 PNG。")

    orphan_thumbs = []
    thumbs_singlebg = RESOURCE_DIR / "thumbnails" / "singlebg"
    if thumbs_singlebg.is_dir():
        for webp in thumbs_singlebg.rglob("*.webp"):
            rel_under_singlebg = webp.relative_to(thumbs_singlebg).as_posix()
            orig_png = RESOURCE_DIR / "singlebg" / (rel_under_singlebg[:-5] + ".png")
            if not orig_png.is_file():
                orphan_thumbs.append(webp.relative_to(PROJECT_ROOT).as_posix())

    if orphan_thumbs:
        print(f"  ℹ️ 发现 {len(orphan_thumbs)} 个孤儿缩略图（对应原图已不在本地，不自动删除）：")
        for p in orphan_thumbs[:10]:
            print(f"     - {p}")
        if len(orphan_thumbs) > 10:
            print(f"     ... 其余 {len(orphan_thumbs) - 10} 个已省略")
    else:
        print("  ℹ️ 无孤儿缩略图。")

    if errors:
        print(f"\n❌ 体检未通过：共 {len(errors)} 项检查失败 -> {', '.join(errors)}", file=sys.stderr)
        return 1

    print("\n✅ 全量只读体检全部通过！")
    return 0


# ═══════════════════════════════════════════════════════════
# 工作流步骤定义
# ═══════════════════════════════════════════════════════════

def build_steps(mode: str, dry_run: bool, proxy_url: str | None, preview_image_source: str) -> list[tuple[str, str, callable]]:
    """返回指定模式对应的有序步骤列表: [(step_id, title, func), ...]"""

    def step_sync() -> int:
        args = []
        if dry_run:
            args.append("--dry-run")
        if proxy_url is None:
            args.append("--no-proxy")
        else:
            args.extend(["--proxy", proxy_url])
        return run_py_script(RESOURCE_DIR / "sync_upstream.py", args)

    def step_compress() -> int:
        args = ["--dry-run"] if dry_run else []
        return run_py_script(RESOURCE_DIR / "compress_bg.py", args)

    def step_index() -> int:
        args = ["--dry-run"] if dry_run else []
        return run_py_script(SCRIPT_DIR / "index_new_version.py", args)

    def step_tone() -> int:
        # 总控串联时自动确认（--yes），若遇到缺图或坏图依然会立即报错中断
        args = ["--dry-run"] if dry_run else ["--yes"]
        return run_py_script(SCRIPT_DIR / "update_tone.py", args)

    def step_slugs() -> int:
        args = ["--dry-run"] if dry_run else []
        return run_py_script(SCRIPT_DIR / "add_slugs.py", args)

    def step_schema() -> int:
        if dry_run:
            print("[DRY-RUN] 将调用 tools/gen_schema.py 增量同步 schemas.json（演练模式跳过写入）。")
            return 0
        return run_py_script(SCRIPT_DIR / "gen_schema.py")

    def step_check() -> int:
        return run_health_check()

    def step_build() -> int:
        if dry_run:
            print("[DRY-RUN] 将调用 tools/build.py 生成生产版 dist/（演练模式跳过构建）。")
            return 0
        return run_py_script(SCRIPT_DIR / "build.py")

    def step_upload() -> int:
        args = ["--dry-run"] if dry_run else []
        return run_py_script(RESOURCE_DIR / "upload.py", args)

    def step_preview() -> int:
        if dry_run:
            print(f"[DRY-RUN] 正式发布后将询问是否启动 runServer.py（build 模式，图片来源={preview_image_source}）。")
            return 0
        ans = input(
            f"\n🌐 是否启动本地预览服务器（build 模式，复用当前 dist/，图片来源={preview_image_source}）？(y/n，默认 y): "
        ).strip().lower()
        if ans in ("n", "no"):
            print("⏭️ 已跳过本地预览。")
            return 0
        return run_py_script(
            SCRIPT_DIR / "runServer.py",
            ["--mode", "build", "--no-build", "--image-source", preview_image_source],
        )

    if mode == "prepare":
        return [
            ("sync", "从上游仓库增量同步素材 (sync_upstream.py)", step_sync),
            ("compress", "增量生成 WebP 缩略图 (compress_bg.py)", step_compress),
            ("index", "自动扫描并索引新版本图片 (index_new_version.py)", step_index),
            ("tone", "多线程分析新图片色调 (update_tone.py)", step_tone),
        ]
    if mode == "check":
        return [
            ("check", "全量只读健康体检", step_check),
        ]
    if mode == "publish":
        return [
            ("slugs", "为新增词条生成永久 slug (add_slugs.py)", step_slugs),
            ("schema", "兜底同步 schemas.json (gen_schema.py)", step_schema),
            ("check", "全量只读健康体检（发布前门禁）", step_check),
            ("build", "执行生产构建校验 (build.py)", step_build),
            ("upload", "比对并上传新图到 Cloudflare R2 (upload.py)", step_upload),
            ("preview", "本地 build 模式验收预览 (runServer.py)", step_preview),
        ]
    raise ValueError(f"不支持的运行模式: {mode}")


def resolve_start_index(mode: str, steps: list[tuple[str, str, callable]], start_from: str | None, dry_run: bool, force_reset: bool) -> int:
    """决定本次从哪一步开始执行（支持手动指定 START_FROM 与自动断点续跑）"""
    step_ids = [s[0] for s in steps]

    # 1. 手动指定起点（最高优先级）
    if start_from:
        if start_from not in step_ids:
            print(f"❌ 无效的 START_FROM='{start_from}'，当前模式 [{mode}] 可选步骤: {', '.join(step_ids)}", file=sys.stderr)
            sys.exit(1)
        idx = step_ids.index(start_from)
        print(f"🎯 已按配置从步骤 [{idx + 1}/{len(steps)} {start_from}] 开始执行。")
        return idx

    if dry_run or mode == "check":
        return 0

    if force_reset:
        clear_state()
        return 0

    # 2. 自动检测上次是否存在未完成的断点
    prev = load_state()
    if not prev or prev.get("mode") != mode:
        return 0

    failed_step = prev.get("stopped_at")
    if not failed_step or failed_step not in step_ids:
        return 0

    idx = step_ids.index(failed_step)
    done_steps = [sid for sid, info in prev.get("steps", {}).items() if info.get("status") == "done"]

    print("\n" + "!" * 60)
    print(f"🔖 检测到上次 [{mode}] 流程在步骤 [{idx + 1}/{len(steps)} {failed_step}] 中断")
    print(f"   上次时间: {prev.get('updated_at', '未知')}")
    print(f"   已完成步骤: {', '.join(done_steps) if done_steps else '无'}")
    print("!" * 60)
    print(f"  1) 从断点 [{failed_step}] 继续跑（默认）")
    print("  2) 清除断点记录，从头重跑")
    print("  3) 退出")

    while True:
        choice = input("请选择 [1/2/3] (默认 1): ").strip()
        if choice in ("", "1"):
            return idx
        if choice == "2":
            clear_state()
            return 0
        if choice == "3":
            print("🛑 已退出。")
            sys.exit(EXIT_CANCELLED)
        print("请输入 1、2 或 3。")


def main() -> int:
    parser = argparse.ArgumentParser(description="R9 Wallpaper 版本更新总控工作流")
    parser.add_argument("mode", nargs="?", choices=["prepare", "check", "publish"], default=None, help="覆盖顶部 MODE")
    parser.add_argument("--from", dest="start_from", type=str, default=None, help="覆盖顶部 START_FROM，指定起始步骤 ID")
    parser.add_argument("--dry-run", action="store_true", help="开启演练模式（不修改文件、不上传）")
    parser.add_argument("--reset", action="store_true", help="忽略并清除上次保存的断点记录，从头执行")
    args = parser.parse_args()

    mode = args.mode or MODE
    start_from = args.start_from if args.start_from is not None else START_FROM
    dry_run = args.dry_run or DRY_RUN

    if not RESOURCE_DIR.is_dir():
        print(f"❌ 找不到素材仓库目录: {RESOURCE_DIR}", file=sys.stderr)
        return 1

    steps = build_steps(mode, dry_run=dry_run, proxy_url=PROXY_URL, preview_image_source=PREVIEW_IMAGE_SOURCE)

    print("=" * 60)
    print(f"  R9 Wallpaper 版本更新工作流 | 模式: [{mode}]" + (" [DRY-RUN]" if dry_run else ""))
    print(f"  Python 解释器: {sys.executable}")
    print("=" * 60)

    start_idx = resolve_start_index(mode, steps, start_from, dry_run=dry_run, force_reset=args.reset)

    # 初始化/复用状态结构（仅非演练且非纯 check 时写断点文件）
    track_state = (not dry_run) and (mode != "check")
    state = (load_state() if (track_state and start_idx > 0) else None) or {
        "mode": mode,
        "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "steps": {},
    }
    state["mode"] = mode

    total = len(steps)
    for i in range(start_idx, total):
        step_id, title, func = steps[i]
        print(f"\n{'─' * 60}")
        print(f"▶ 步骤 [{i + 1}/{total}] ({step_id}) : {title}")
        print(f"{'─' * 60}")

        t0 = time.perf_counter()
        if track_state:
            state["stopped_at"] = step_id
            state["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            state["steps"][step_id] = {"status": "running", "updated_at": state["updated_at"]}
            save_state(state)

        try:
            rc = func()
        except KeyboardInterrupt:
            print(f"\n🛑 在步骤 [{step_id}] 收到 Ctrl+C 中断。")
            rc = EXIT_CANCELLED
        except Exception as e:
            print(f"\n❌ 步骤 [{step_id}] 抛出未捕获异常: {e}", file=sys.stderr)
            rc = 1

        elapsed = round(time.perf_counter() - t0, 2)

        if rc == 0:
            print(f"\n✅ 步骤 [{i + 1}/{total}] ({step_id}) 完成（耗时 {elapsed}s）")
            if track_state:
                state["steps"][step_id] = {
                    "status": "done",
                    "elapsed_sec": elapsed,
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                save_state(state)
            continue

        # 非 0 退出：立即熔断，记录断点
        status_label = "cancelled" if rc == EXIT_CANCELLED else "failed"
        if track_state:
            state["stopped_at"] = step_id
            state["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            state["steps"][step_id] = {
                "status": status_label,
                "returncode": rc,
                "elapsed_sec": elapsed,
                "updated_at": state["updated_at"],
            }
            save_state(state)

        if rc == EXIT_CANCELLED:
            print(f"\n⏸️ 流程在步骤 [{step_id}] 已由用户中止（已记录断点，下次可直接从此步续跑）。")
        else:
            print(
                f"\n❌ 流程在步骤 [{step_id}] 失败（退出码 {rc}），已立即熔断！\n"
                f"   排查修复后，再次运行本脚本即可自动从 [{step_id}] 断点续跑。",
                file=sys.stderr,
            )
        return rc

    # 全部步骤成功
    if track_state:
        clear_state()

    print("\n" + "=" * 60)
    print(f"🎉 [{mode}] 流程全部完成！" + ("（演练模式，未做任何改动）" if dry_run else ""))
    print("=" * 60)

    if mode == "prepare" and not dry_run:
        print(
            "\n📋 接下来请进入人工编辑环节：\n"
            "   1. 在 lang/tagData.json 补充新版本/新章节/新角色的中英文词条（WebStorm 会自动同步 schemas.json）\n"
            "   2. 在 Filter.json 中为新图片补充角色等标签（如有修图请登记到 resource/.syncignore）\n"
            "   3. 在 lang/zh.json 与 lang/en.json 中更新版本进度说明\n"
            "   完成后将本脚本顶部 MODE 改为 \"publish\" 并运行，执行阶段二校验、构建与 R2 上传。"
        )
    elif mode == "publish" and not dry_run:
        print_git_status_hint()
        print("\n👉 请在 WebStorm 中仔细核对 git diff，确认无误后手动提交并推送（推送主仓库后 Cloudflare Pages 将自动构建部署）。")

    return 0


if __name__ == "__main__":
    sys.exit(main())
