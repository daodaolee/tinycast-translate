# 多语言翻译

给 [TinyCast](https://tinycast.dev) 用的翻译命令。输入一段文字，源语言自动识别，同时译成多种目标语言。

TinyCast 直接运行 Raycast 扩展，所以这个仓库使用同一份 `package.json` 和命令入口。

## 参考

功能与交互参考 [antfu/raycast-multi-translate](https://github.com/antfu/raycast-multi-translate)。该项目又源自 [Raycast 的 Google Translate 扩展](https://github.com/raycast/extensions/tree/main/extensions/google-translate)。

本仓库在此基础上做了这些调整：

- 界面文案改为中文。
- 默认目标语言是简体中文和英文。
- 翻译请求发到必应网页接口，通过系统自带的 `curl` 发送。当前网络访问不了参考项目使用的 Google 接口，TinyCast 内置的网络请求也会被必应回成空页面。
- 拼写差异用文字标出增删，不再生成 SVG。
- 夏威夷语和苏格兰盖尔语必应没有，选中后会提示不支持。

许可仍是 MIT。版权声明见 [LICENSE](LICENSE)。

## 能做什么

- 最多 7 个目标语言同时出结果。每种语言一行。
- 打开命令时读取其他应用里当前选中的文字，不覆盖搜索框。
- 识别不准时，在文本末尾加上 `>fr`、`>ja`、`>zh-CN` 强制指定源语言。搜索栏左侧也可以手选。
- macOS 拼写检查。有纠正建议时，列表第一项标出增删。
- 复制译文、在必应翻译中打开、打开词典。英语走 Cambridge，配置了中文时法语走法语助手。
- 详情里把译文再翻回源语言。和原文相同显示「一致」，不同则显示回译文本。

和源语言相同，或译文与原文相同的结果会隐藏。

## 安装

需要 Node.js 和 pnpm。macOS 自带 `swiftc` 和 `curl`。

```bash
pnpm install
pnpm build
```

在 TinyCast 中打开 **设置 → 扩展**，先打开「启用扩展」。然后 **安装 → 从文件夹添加**，选择本仓库的 `dist` 目录。

`pnpm build` 会先把 `assets/spellcheck.swift` 编译成 `assets/spellcheck`。这是调用系统拼写检查的小程序，会随 `assets/` 一起安装。

启动面板里搜 **多语言翻译**、**翻译** 或 **translate**。

## 增加目标语言

**设置 → 扩展 → 多语言翻译**，把「目标语言 3」到「目标语言 7」从「-」改成要显示的语言。改完后重新打开命令。已选语言会去重，所以同一种语言不会出现两行。

## 开发

```bash
pnpm typecheck
pnpm build
```

语言列表在 `src/data/languages.json`。改完后运行 `pnpm sync-preferences`，把下拉选项写回 `package.json`。

`pnpm dev` 走 Raycast 的开发模式。只使用 TinyCast 时，改完代码重新构建，再从 `dist` 安装一次。
