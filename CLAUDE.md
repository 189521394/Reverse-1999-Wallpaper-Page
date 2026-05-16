# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 核心规则

**以后在本项目中，所有对话和解答必须完全使用中文，且生成的代码注释也必须是中文。**

## 项目概述

这是一个《重返未来：1999》游戏官方 CG 的静态壁纸浏览与下载网站，线上地址为 https://r9wallpaper.org/

项目为零构建的纯静态站点——无框架、无 npm 依赖，所有 HTML/CSS/原生 JS 由浏览器直接加载。

- 本仓库为 **HTML 源码**仓库
- `resource/` 子目录是一个独立的资源中继仓库（使用 Git LFS 管理图片）
- 原始图片来源于 [myssal/Reverse-1999-CN-Asset](https://github.com/myssal/Reverse-1999-CN-Asset)
- 源码对应的 GitHub 仓库：[189521394/Reverse-1999-Wallpaper-Page](https://github.com/189521394/Reverse-1999-Wallpaper-Page)

## 本地开发

这是一个零构建的静态站点。使用任意 HTTP 服务器在根目录启动即可预览：

```bash
python -m http.server 8080
# 或
npx serve .
```

没有构建命令、没有代码检查工具、没有测试套件。

## 开发所使用的软件
jetBrains webStorm

## 整体架构：三张页面

| 页面 | 用途                                               |
|---|--------------------------------------------------|
| `index.html` | 主壁纸浏览器，包含标签筛选、文本搜索、设置面板和移动端响应式 Tab               |
| `propaganda.html` | 动画宣传/登陆页，包含主页大图、内容块、底栏等滑动分区，但暂时废弃了，只做了个重定向到index |
| `404.html` | 极简自定义 404 页面                                     |

## CSS 架构（`css/`）

按功能区域组织，而非按组件类型。每个 CSS 文件只负责一个具体的 UI 区域：

| 目录 | 用途 |
|---|---|
| `css/index/init/` | 核心初始化样式：theme.css、overlay.css、initialize.css、z-index.css、notice/ |
| `css/index/filterFrame/` | 标签筛选面板：Filter.css、tagList.css、tagPool.css、submitPool.css、control.css |
| `css/index/searchFrame/` | 文本搜索 UI：frame.css、input.css、searchButton.css、inputTips.css、previousAndNext.css、shortcutKey.css |
| `css/index/set/` | 设置覆盖层：setFrame.css、setBox.css、setItem.css、setButton.css、setBackground.css、setPadding.css、setContent/ |
| `css/index/mobile/` | 移动端底部 Tab 栏及响应式初始化 |
| `css/index/download/` | 下载按钮与进度条 |
| `css/index/guide/` | 语言选择覆盖层 |
| `css/propaganda/` | 宣传页专属：block.css、title.css、IMGcontainer.css、dock.css 等 |

**注意：CSS 加载顺序很重要**——初始化样式先加载，功能样式按需覆盖。

## JavaScript 架构（`js/`）

所有脚本在 `index.html` 中通过 `<script defer>` 加载。每个文件都是独立的功能模块（非 ES Module，全部使用全局作用域）。关键分层如下：

### 数据层（`js/index/dataOperationsLayer/`）

| 文件 | 职责 |
|---|---|
| `loadToMemory.js` | 请求 `Filter.json` 存入全局变量 `FilterData`，构建 `fileMap` 实现 O(1) 文件查找。通过 IIFE 立即启动加载，不等待 DOMContentLoaded |
| `getURL.js` | 根据已选标签筛选内存数据，返回匹配的 URL 列表 |
| `getTag.js` | 提取当前 tagPool 中标签的元数据 |
| `Download.js` | 批量下载图片的逻辑 |

### 展示层（`js/index/Display/`）

| 文件 | 职责 |
|---|---|
| `DisplayImg.js` | 将筛选结果渲染到 `#select` 容器中 |
| `showTag.js` / `hideTag.js` | 切换每张图片下方标签的显示/隐藏 |
| `loadMore.js` | 无限滚动：检测滚动接近底部时加载下一批（懒分页） |

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
| `executeFilter.js` | 解析分号分隔的文本输入，通过 I18n 引擎将中/英文标签名转换为 ID，触发提交 |
| `InputAssistant.js` | 用户输入时的自动补全建议 |

### 控制逻辑（`js/index/control/`）

| 文件 | 职责 |
|---|---|
| `submit.js` | 主筛选提交逻辑 |
| `clean.js` | 清除所有活跃的筛选条件 |
| `setting.js` | 打开/关闭设置面板 |

### 设置系统（`js/index/userSettings/`）

| 文件 | 职责 |
|---|---|
| `SETTINGS_CONFIG.js` | **声明式配置数组**，定义所有设置项（逻辑复选框 ID、动画滑块 ID、可选回调函数、互斥项 conflictWith、依赖项 dependsOn）。这是所有用户偏好的唯一注册中心 |
| `settingsSystem.js` | 读取 SETTINGS_CONFIG，同步复选框 ↔ localStorage，处理互斥（冲突自动关闭对方）和依赖级联（父开子才能开/父关子必须关），变更时执行回调。在 DOMContentLoaded 时初始化 |
| `loadSetContent.js` | 用户在设置面板切换 Tab 时动态加载对应内容 |

### 国际化（`js/index/i18n.js`）

- 标签使用**纯 ID 体系**：`lang/tagData.json` 映射 ID → `{zh, en, category?}`。`I18n` 引擎通过 `I18n.Translate(id)` 将 ID 翻译为显示文本。
- UI 字符串使用嵌套键路径（如 `"settings.preferences.general.title"`），存储在 `lang/zh.json` / `lang/en.json` 中，通过 DOM 元素上的 `data-i18n` 属性应用。
- `data-i18n-before` → CSS `::before` 伪元素内容
- `data-i18n-short` → 移动端短文本（因空间不足）
- `data-i18n-placeholder` → input 的 placeholder 属性
- 在本地开发环境中，`Filter.json` 中的标签是**原始中文文本**，需要通过 `I18n.convert()` 转换为 ID。线上环境则由 Python 脚本预处理为纯 ID。

### 移动端（`js/index/mobile/`）

| 文件 | 职责 |
|---|---|
| `mobile-init.js` | 移动端专有初始化 |
| `tabSwitch.js` | 在壁纸浏览/筛选/设置三个 Tab 之间切换 |
| `scrollHideTab.js` | 向下滚动时自动隐藏底部 Tab 栏，向上滚动时显示 |
| `once-tips.js` | 仅在首次移动端访问时显示的一次性提示 |

### 其他独立模块

| 文件 | 职责 |
|---|---|
| `switchTheme.js` | 深色/浅色主题切换，使用 CSS 自定义属性（定义在 `css/index/init/theme.css`） |
| `guide.js` | 首次访问时的语言选择覆盖层 |
| `conciseMode.js` | 隐藏描述性文本，提供更简洁的界面 |
| `copyMode.js` | 切换所有内容是否可选中（user-select） |
| `imgAnimation.js` | 图片查看/缩放动画 |
| `switchWide.js` | 轶事类图片使用更宽的布局 |
| `share.js` | 通过 Web Share API 或剪贴板分享 |
| `scrollListener.js` | 将竖向滚轮事件转换为横向滚动（用于图片下方的标签行） |
| `toggleScrollLock.js` | 覆盖层打开时锁定 body 滚动 |
| `tabObserver.js` | 监听移动端 Tab 状态变化以更新 UI |
| `copyContact.js` | 一键复制联系方式到剪贴板 |
| `returnTop.js` | 回到顶部按钮逻辑 |
| `dock.js` | Dock 栏淡入淡出（该功能已废弃） |
| `cursor.js` | 自定义鼠标样式 |

## 关键数据文件

| 文件 | 用途 |
|---|---|
| `Filter.json` | 主壁纸数据库：`[{file, tags[], tone[]}]`。线上环境 tags 是纯 ID，本地开发环境是原始中文文本 |
| `lang/tagData.json` | 标签字典：`{id: {zh, en, category?}}`。标签分类由此文件自动推导 |
| `lang/zh.json` / `lang/en.json` | UI 界面翻译字符串（嵌套键路径） |
| `schemas.json` | JSON 校验模式 |

## Python 资源处理脚本

- **`resource/compress_bg.py`** — 将 `singlebg/` 中的 PNG 批量转换为 WebP 缩略图（最大 600×600，质量 80）。使用 `ProcessPoolExecutor` 并行压缩。自动跳过目标文件比源文件新的情况（增量压缩）。
- **`resource/upload.py`** — 将本地 `thumbnails/` 和 `singlebg/` 同步到 Cloudflare R2（兼容 S3 API）。通过文件存在性 + 文件大小进行差异比对，上传前需人工确认。依赖 `boto3`。

## 页面加载与初始化顺序

1. 浏览器解析 HTML，开始预加载 `Filter.json`（`<link rel="preload">`）
2. 所有 JS 脚本带有 `defer` 属性 → 在 HTML 解析完成后按顺序执行
3. `mobile-init.js` 最先执行（检测移动端环境）
4. `i18n.js` 中的 `initData()` 作为顶级语句立即执行 → 加载 `tagData.json` + `Filter.json`，完成后自动点击 `mainLine` 筛选按钮展示默认结果
5. `loadToMemory.js` 也通过 IIFE 开始加载 `Filter.json`（浏览器会命中缓存，不会重复请求）
6. `settingsSystem.js` 在 `DOMContentLoaded` 时初始化 → 从 localStorage 恢复所有用户偏好
7. `switchTheme()` 在设置初始化期间被调用，应用已保存/自动的主题

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

然后在 `index.html` 中对应 setContent 区域添加配套的 checkbox + slider HTML 结构即可。`settingsSystem.js` 会自动处理所有绑定和持久化逻辑，无需额外接线。

## 添加新的标签分类

标签分类从 `lang/tagData.json` **自动推导**。任何带有 `category` 字段的标签都会被归入对应分类。添加新分类的步骤：

1. 在 `lang/tagData.json` 中为新分类添加标签条目（指定对应的 category 值）
2. 在 `index.html` 的 `#tagList` 分区中添加对应的筛选按钮（id 需与 category 值匹配，并添加 data-i18n 属性）
3. 在 `css/index/filterFrame/tagList.css` 中添加新按钮的外观样式

## 提交风格

项目使用中文提交信息，最近提交记录风格示例：
- `他者的悲哀`
- `SEO优化`
- `更新部分翻译`
- `只是一些SEO优化`
