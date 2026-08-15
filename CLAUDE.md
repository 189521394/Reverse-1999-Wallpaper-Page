# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 核心规则

**在本项目中，所有对话和解答必须完全使用中文，思考过程也需要使用中文，且生成的代码注释也必须是中文。**

## 项目概述

这是一个《重返未来：1999》游戏官方 CG 的静态壁纸浏览与下载网站，线上地址为 https://r9wallpaper.org/

项目为零构建的纯静态站点——无框架、无 npm 依赖，所有 HTML/CSS/原生 JS 由浏览器直接加载。

- 本仓库为 **HTML 源码**仓库
- `resource/` 子目录是一个独立的资源中继仓库（使用 Git LFS 管理图片）
- 原始图片来源于 [myssal/Reverse-1999-CN-Asset](https://github.com/myssal/Reverse-1999-CN-Asset)
- 源码对应的 GitHub 仓库：[189521394/Reverse-1999-Wallpaper-Page](https://github.com/189521394/Reverse-1999-Wallpaper-Page)

## 本地开发

本项目配有专用的本地开发服务器 `tools/runServer.py`，**不要**使用 WebStorm 内置服务器或其他通用 HTTP 服务器——它们缺少路径映射，会导致图片 404 和 `/en/` 虚拟目录不可用。

```bash
python tools/runServer.py
# 默认 normal 模式，监听 8000 端口，自动打开浏览器
```

### `tools/runServer.py` 两种模式

| 模式 | `DEBUG_MODE` | 工作目录 | 用途 |
|---|---|---|---|
| normal | `"normal"` | 项目根目录 | 日常开发，直接提供源码文件，不打包 |
| build | `"build"` | `dist/` | 生产模拟，先调用 `tools/build.py` 打包，再修改 isLocal/R2_DOMAIN 后从 dist 提供服务 |

### `tools/runServer.py` 路径映射（`translate_path`）

服务器重写了 `SimpleHTTPRequestHandler.translate_path`，实现两层路由：

1. **`/en/` 虚拟目录**：剥离前缀后映射到真实文件。`/en/` → `/index.html`，`/en/css/...` → `/css/...`。这是本地对线上 `_worker.js` Cloudflare Worker 行为的模拟。
2. **`/resource/` 资源映射**：`resource/` 是独立 Git 仓库（使用 Git LFS），不在当前工作目录下。normal 模式用 `os.getcwd()` 定位项目根目录；build 模式从 `dist/` 往上一级定位。

### 为什么不能用 WebStorm 内置服务器

WebStorm 把项目放在子路径下（如 `http://localhost:63342/ProjectName/`），而 `getURL.js` 本地模式使用相对路径 `../resource/...` 拼接图片 URL。`../` 会跳出 WebStorm 的项目子目录，导致图片 404。

## 生产构建系统

### `tools/build.py` — 打包脚本

将源码目录打包到 `dist/`，流程：

1. **编译 `Filter.json`**：将标签从中文文本清洗为纯 ID（查 `lang/tagData.json` 字典），用 `separators=(',', ':')` 紧凑输出。同时验证所有标签和色调均已注册，未注册则中断构建。
2. **合并 JS/CSS**：将 HTML 中所有 `<link href="/css/...">` 和 `<script src="/js/...">` 引用合并为单个 `bundle_*.css` + `bundle_*.js`，做基础压缩（去注释、去多余空行）。支持 `index.html`、`propaganda.html`、`404.html` 三个页面。
3. **拷贝静态资源**：`font/`、`lang/`、`favicon.png`、`_worker.js`、`sitemap.xml` 等原样复制

**注意**：打包后的 HTML 引用 bundle 文件时**不带**前导 `/`（`href="bundle_index.css"`），因为此时 HTML 和 bundle 都在 `dist/` 同级目录。`resource/` 不会被拷贝到 `dist/`——它由服务器的 `translate_path` 映射到上级目录。

### `prepare_build_env()` — 生产模拟魔改

build 模式下，打包完成后会修改 `dist/` 中的 bundle JS：
- `isLocal` → `false`（让 JS 走线上逻辑，直接读取编译后的 Filter.json，不再清洗中文）
- `R2_DOMAIN` → `""`（空字符串，图片路径从 `https://img.r9wallpaper.org/...` 变为 `/resource/...`，由本地服务器提供）

## 项目部署

Cloudflare Pages + Cloudflare R2 对象存储

## 开发所使用的软件

JetBrains WebStorm

## 整体架构：三张页面 + 本地服务器 + 边缘 Worker

| 文件 | 用途 |
|---|---|
| `index.html` | 主壁纸浏览器，包含标签筛选、文本搜索、设置面板、移动端响应式 Tab 和色调筛选 |
| `propaganda.html` | 动画宣传/登陆页，已废弃，只做重定向到 index（`noindex`） |
| `404.html` | 极简自定义 404 页面（`noindex`） |
| `tools/runServer.py` | 本地开发服务器（normal/build 双模式，自定义路径映射） |
| `tools/build.py` | 生产打包脚本（合并压缩 JS/CSS、编译 Filter.json、输出到 dist/） |
| `_worker.js` | Cloudflare Worker（边缘节点处理 `/en/` 虚拟目录、SEO 英文重写、旧链接 301） |

## CSS 架构（`css/`）

按功能区域组织，而非按组件类型。每个 CSS 文件只负责一个具体的 UI 区域：

| 目录 | 用途 |
|---|---|
| `css/index/init/` | 核心初始化样式：theme.css（CSS 自定义属性 深色/亮色主题）、overlay.css、initialize.css、z-index.css、notice/ |
| `css/index/filterFrame/` | 标签筛选面板：Filter.css、tagList.css、tagPool.css、submitPool.css、control.css |
| `css/index/searchFrame/` | 文本搜索 UI：frame.css、input.css、searchButton.css、inputTips.css、previousAndNext.css、shortcutKey.css |
| `css/index/set/` | 设置覆盖层：setFrame.css、setBox.css、setItem.css、setButton.css、setBackground.css、setPadding.css、setContent/（about.css、debug.css、mail.css、preference.css、tips.css） |
| `css/index/mobile/` | 移动端底部 Tab 栏及响应式初始化 |
| `css/index/download/` | 下载按钮与进度条 |
| `css/index/guide/` | 语言选择覆盖层 |
| `css/propaganda/` | 宣传页专属：block.css、title.css、IMGcontainer.css、dock.css 等 |

**注意：CSS 加载顺序很重要**——初始化样式先加载，功能样式按需覆盖。主题使用 CSS 自定义属性（`--pageBGC`、`--fontColor` 等），在 `theme.css` 中定义三套：默认暗色、`[data-theme='light']` 手动亮色、`prefers-color-scheme: light` 自动亮色。

## JavaScript 架构（`js/`）

所有脚本在 `index.html` 中通过 `<script defer>` 加载。每个文件都是独立的功能模块（非 ES Module，全部使用全局作用域）。关键分层如下：

### 数据层（`js/index/dataOperationsLayer/`）

| 文件 | 职责 |
|---|---|
| `loadToMemory.js` | 请求 `Filter.json` 存入全局变量 `FilterData`，构建 `fileMap` 实现 O(1) 文件查找。通过 IIFE 立即启动加载，不等待 DOMContentLoaded |
| `getURL.js` | 根据已选标签筛选内存数据，返回匹配的 URL 列表。支持精确/模糊筛选（`preciseScreening` 开关），同时支持按 `tone` 字段筛选和背景图像过滤 |
| `getTag.js` | 提取当前 tagPool 中标签的元数据 |
| `Download.js` | 单个图片下载逻辑：等待图片加载完成后通过创建 `<a>` 标签触发浏览器下载 |

### 展示层（`js/index/Display/`）

| 文件 | 职责 |
|---|---|
| `DisplayImg.js` | 将筛选结果渲染到 `#select` 容器中，懒加载缩略图（WebP），点击后加载原图 |
| `showTag.js` / `hideTag.js` | 切换每张图片下方标签的显示/隐藏 |
| `loadMore.js` | 无限滚动：检测滚动接近底部时加载下一批（每次 48 张，`BATCH_SIZE = 48`） |

### 图片查看与动画（`js/index/imgAnimation.js`）

点击缩略图时计算从缩略图到屏幕中心的位移动画，通过 `--tx`、`--ty`、`--scale` CSS 变量驱动。同时管理：
- 原图流式下载（`fetch` + `ReadableStream`）与进度条更新
- 遮罩层与下载按钮的显示/隐藏
- 图片标签的同步显示
- PC 端和移动端的缩放比例差异

### 标签交互（`js/index/itemListener/`）

| 文件 | 职责 |
|---|---|
| `tagList.js` | 填充左侧标签分类栏；点击某个分类后展开该分类下的具体标签 |
| `chooseTag.js` | 将标签从待选池（tagPool）添加到已选池（submitPool） |
| `addTagFromPic.js` | 点击图片下方的标签，将其添加到筛选池 |
| `removeTag.js` | 从已选池中移除标签 |

### 文本筛选（`js/index/filterWithText/`）

| 文件 | 职责 |
|---|---|
| `executeFilter.js` | 解析分号（中英文分号 `;` `；`）分隔的文本输入，通过 I18n 引擎将中/英文标签名转换为 ID，触发提交 |
| `InputAssistant.js` | 用户输入时的自动补全建议 |

### 控制逻辑（`js/index/control/`）

| 文件 | 职责 |
|---|---|
| `submit.js` | 主筛选提交逻辑，管理 `currentActiveSearchMode`（`'none'` / `'text'` / `'tag'`） |
| `clean.js` | 清除所有活跃的筛选条件 |
| `setting.js` | 打开/关闭设置面板 |

### 设置系统（`js/index/userSettings/`）

| 文件 | 职责 |
|---|---|
| `SETTINGS_CONFIG.js` | **声明式配置数组**，定义所有设置项（逻辑复选框 ID、动画滑块 ID、可选回调函数、互斥项 conflictWith、依赖项 dependsOn）。这是所有用户偏好的唯一注册中心 |
| `settingsSystem.js` | 读取 SETTINGS_CONFIG，同步复选框 ↔ localStorage，处理互斥（冲突自动关闭对方）和依赖级联（父开子才能开/父关子必须关），变更时执行回调。在 DOMContentLoaded 时初始化 |
| `loadSetContent.js` | 用户在设置面板切换 Tab 时动态加载对应内容 |

**当前设置分类**：通用（精确筛选、自动替换、自动提交、隐藏提示、自动聚焦）、显示（背景图像、图片标签、色调）、语言和文本（切换语言、允许选择文本）、移动端（自动隐藏Tab栏、提交后自动跳转）、主题控制（跟随系统、手动控制）、清空按钮控制（同时清空结果、同时清空文本框）、关于（分享API、附带标签分享）、开发者选项（快速复制文件名、重复发送请求、重置设置）。

### 对话框系统（`js/index/Dialog/`）

| 文件 | 职责 |
|---|---|
| `notice.js` | 通用对话框封装。`showDialog(showText, notice?, hash?)` 返回 `Promise<boolean>`。支持一次性对话框（通过 `hash` 参数写入 localStorage）和滚动锁定自动管理 |
| `reset.js` | 重置所有设置的确认对话框 |
| `shortcutKey.js` | 搜索框快捷键提示对话框 |

### 国际化（`js/index/i18n.js`）

- 标签使用**纯 ID 体系**：`lang/tagData.json` 映射 ID → `{zh, en, category?}`。`I18n` 引擎通过 `I18n.Translate(id)` 将 ID 翻译为显示文本。标签分类从 `category` 字段自动推导。
- UI 字符串使用嵌套键路径（如 `"settings.preferences.general.title"`），存储在 `lang/zh.json` / `lang/en.json` 中，通过 DOM 元素上的 `data-i18n` 属性应用。
- `data-i18n-before` → CSS `::before` 伪元素内容（写入 `data-before-text` 属性）
- `data-i18n-short` → 移动端短文本（写入 `data-short` 属性，因空间不足）
- `data-i18n-placeholder` → input 的 placeholder 属性
- `data-raw-tag` → 纯 ID 标签，通过 `I18n.Translate(rawID)` 直接翻译
- 在本地开发环境中，`Filter.json` 中的标签是**原始中文文本**，需要通过 `I18n.convert()` 转换为 ID。线上环境则由 Python 脚本预处理为纯 ID。

#### `/en/` 虚拟目录机制

语言切换使用**虚拟目录**而非查询参数（从 `?lang=en` 迁移而来）：

- `switchLanguage('en')` → `history.pushState(null, '', '/en/' + search)` 修改地址栏
- `getInitialLanguage()` → 检测 `pathname.startsWith('/en')` 判定当前语言
- **引导页逻辑**（`guide.js`）：新用户首次访问显示语言选择覆盖层；通过 `/en/` 路径进入的无条件信任路径；老用户回访静默更新地址栏
- **本地开发**：`tools/runServer.py` 的 `translate_path` 剥离 `/en/` 前缀映射到真实文件
- **生产环境**：`_worker.js`（Cloudflare Worker）在边缘节点拦截 `/en/` 请求：
  - 静态资源（`.js`、`.css`、`.png` 等）→ 剥离前缀，从根路径获取
  - HTML 页面 → 获取根 HTML，用 `HTMLRewriter` 流式重写 SEO 标签（title、meta、OG、canonical、h1）
  - 旧链接 `?lang=en` → 301 重定向到 `/en/`
  - `/en`（无尾斜杠）→ 301 重定向到 `/en/`

#### `isLocal` 环境判定

`i18n.js` 顶部通过 hostname 判定运行环境：

```js
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' ||
    hostname.startsWith('10.') || hostname.startsWith('172.') || hostname.startsWith('192.168.');
```

影响两处行为：
1. **数据清洗**：`isLocal=true` → `Filter.json` 的 tags 和 tone 从中文转换为 ID；`false` → 直接使用（已由 build.py 预处理）
2. **图片 URL 前缀**：`isLocal=true` → `../resource/...`（相对路径）；`false` → `R2_DOMAIN + "/resource/..."`（`getURL.js`）

### 分享系统（`js/index/share.js`）

生成带有筛选状态的分享链接：
- 使用 Base64 编码将标签或文本搜索内容编码为 URL 参数（`mode`、`q`、`precise`）
- 语言信息由虚拟目录 `/en/` 承载，不再需要 `?lang=` 参数
- `handleUrlRouting()` 在 DOMContentLoaded 时解析 URL 参数并还原筛选状态
- 支持 Web Share API 和剪贴板回退

### 移动端（`js/index/mobile/`）

| 文件 | 职责 |
|---|---|
| `mobile-init.js` | 移动端专有初始化，检测设备类型 |
| `tabSwitch.js` | 在壁纸浏览/筛选/设置三个 Tab 之间切换。初次点击筛选 Tab 时自动触发主线章节筛选 |
| `scrollHideTab.js` | 向下滚动时自动隐藏底部 Tab 栏，向上滚动时显示 |
| `once-tips.js` | 仅在首次移动端访问时显示的一次性提示 |

### 其他独立模块

| 文件 | 职责 |
|---|---|
| `switchTheme.js` | 深色/浅色主题切换。通过设置 `<html data-theme="light/dark">` 或移除属性让系统自动判断 |
| `guide.js` | 首次访问时的语言选择覆盖层，包含语言判定逻辑和引导页显示控制 |
| `conciseMode.js` | 隐藏描述性文本（设置回调 `callback: conciseMode`），提供更简洁的界面 |
| `copyMode.js` | 切换所有内容是否可选中 user-select（设置回调 `callback: copyMode`） |
| `switchWide.js` | 轶事类/英文环境下宽标签的容器宽度控制（`updateLayoutWidth()`） |
| `scrollListener.js` | 将竖向滚轮事件转换为横向滚动（用于图片下方的标签行和待选标签池） |
| `toggleScrollLock.js` | 覆盖层打开时锁定 body 滚动。使用 `lockCounter` 生成唯一锁 ID，`requestScrollLock(id)` / `releaseScrollLock(id)` 成对调用 |
| `tabObserver.js` | 监听移动端 Tab 状态变化以更新 UI |
| `copyContact.js` | 一键复制联系方式（邮箱）到剪贴板 |
| `returnTop.js` | 回到顶部按钮逻辑，随滚动位置自动显示/隐藏 |
| `dock.js` | Dock 栏淡入淡出（该功能已废弃） |
| `cursor.js` | 自定义鼠标样式 |

## 关键数据文件

| 文件 | 用途 |
|---|---|
| `Filter.json` | 主壁纸数据库：`[{file, tags[], tone[]}]`。线上环境 tags/tone 是纯 ID，本地开发环境是原始中文文本。约 500KB |
| `lang/tagData.json` | 标签字典：`{id: {zh, en, category?}}`。标签分类由此文件自动推导。约 43KB |
| `lang/zh.json` / `lang/en.json` | UI 界面翻译字符串（嵌套键路径） |
| `schemas.json` | JSON Schema 校验模式，列出所有已注册标签的中文名枚举，用于验证 Filter.json |

## 色调系统（Tone）

每张图片的 `Filter.json` 条目包含 `tone` 数组，存储由 `tools/update_tone.py` 自动分析的颜色属性标签。色调数据独立于普通标签，但使用同一套 ID 体系（在 `lang/tagData.json` 中注册）。

色调筛选维度：
- **饱和度**：饱和度-高 / 饱和度-低
- **对比度**：对比度-强 / 对比度-弱
- **明暗调**：明暗调-高 / 明暗调-中 / 明暗调-低
- **色温**（仅高饱和图片）：色温-暖色 / 色温-冷色 / 色温-中性
- **色彩关系**（仅高饱和图片，K-Means 聚类）：色彩-单调 / 色彩-相似 / 色彩-对比 / 色彩-互补

用户可通过 `showTone` 设置控制是否在图片下方显示色调标签，通过 `#Tone` 分类按钮按色调筛选。

### `tools/update_tone.py` — 色调分析脚本

使用 OpenCV + scikit-learn KMeans 对图片进行色彩分析：
- 读取图片 → 转换 HSV 色彩空间 → 计算饱和度、对比度、明暗调
- 高饱和图片进一步分析色温和色彩关系（K-Means 聚类提取两个主色）
- 仅处理 `tone` 为空的条目（增量更新），多线程并行（8线程）
- 输出格式与项目格式一致（数组单行缩进）

## Python 资源处理脚本

- **`resource/compress_bg.py`** — 将 `singlebg/` 中的 PNG 批量转换为 WebP 缩略图（最大 600×600，质量 80）。使用 `ProcessPoolExecutor` 并行压缩。自动跳过目标文件比源文件新的情况（增量压缩）。
- **`resource/upload.py`** — 将本地 `thumbnails/` 和 `singlebg/` 同步到 Cloudflare R2（兼容 S3 API）。通过文件存在性 + 文件大小进行差异比对，上传前需人工确认。依赖 `boto3`。
- **`tools/update_tone.py`** — 对 Filter.json 中缺失 `tone` 的条目进行颜色分析并补充色调标签。依赖 `opencv-python`、`numpy`、`scikit-learn`。
- **`tools/index_new_version.py`** — 交互式脚本，为指定版本目录（如 `3_8`）的新图片自动生成 Filter.json 条目。自动将 `*_*` 格式转换为 `*.*` 版本号。扫描 `story_atcg/` 和 `story_bg/` 下未索引的 PNG，过滤 `_zone` 变体文件。生成条目后追加写入 Filter.json。

## 页面加载与初始化顺序

1. 浏览器解析 HTML，开始预加载 `Filter.json`（`<link rel="preload">`）
2. 所有 JS 脚本带有 `defer` 属性 → 在 HTML 解析完成后按顺序执行
3. `mobile-init.js` 最先执行（检测移动端环境）
4. `i18n.js` 中的 `initData()` 作为顶级语句立即执行 → 加载 `tagData.json` + `Filter.json`，将结果存入 `window._coreReady` Promise，完成后自动点击 `mainLine` 筛选按钮展示默认结果
5. `loadToMemory.js` 也通过 IIFE 开始加载 `Filter.json`（浏览器会命中缓存，不会重复请求）
6. `guide.js` 在 DOMContentLoaded 时初始化语言（决定是否显示引导页）
7. `settingsSystem.js` 在 DOMContentLoaded 时初始化 → 从 localStorage 恢复所有用户偏好，调用 `refreshSet()` 执行所有回调
8. `share.js` 在 DOMContentLoaded 时等待 `_coreReady` 完成后解析 URL 分享参数

## `SETTINGS_CONFIG` 配置模式

要添加新的设置开关，在 `js/index/userSettings/SETTINGS_CONFIG.js` 中的 `SETTINGS_CONFIG` 数组添加一项：

```js
{
    logic: "元素ID",           // HTML 中对应 checkbox 的 id
    animation: "滑块ID",       // 滑块动画元素的 id
    callback: 某函数,          // 可选，状态变更时回调
    conflictWith: ["其他ID"],  // 可选，与此项互斥的开关（同时只能开一个）
    dependsOn: ["父级ID"]      // 可选，父级必须为 ON 此项才能生效
}
```

然后在 `index.html` 中对应 setContent 区域添加配套的 checkbox + slider HTML 结构即可。`settingsSystem.js` 会自动处理所有绑定、持久化、互斥、依赖级联和回调执行逻辑，无需额外接线。

## 添加新的标签分类

标签分类从 `lang/tagData.json` **自动推导**。任何带有 `category` 字段的标签都会被归入对应分类。添加新分类的步骤：

1. 在 `lang/tagData.json` 中为新分类添加标签条目（指定对应的 category 值）
2. 在 `index.html` 的 `#tagList` 分区中添加对应的筛选按钮（id 需与 category 值匹配，并添加 data-i18n 属性）
3. 在 `css/index/filterFrame/tagList.css` 中添加新按钮的外观样式

## 提交风格

项目使用中文提交信息，最近提交记录风格示例：
- `微调暗色主题`
- `新版本内容补全，独立控制色调，开发者功能优化，补全色调脚本优化`
- `他者的悲哀`
- `SEO优化`
