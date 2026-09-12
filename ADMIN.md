# Firefly 后台管理（Admin）

给 Firefly 主题补上的轻量后台：一个 `/admin/` 管理首页 + 一个 `/admin/editor/` 文章撰写页，
样式沿用主题自身的卡片与配色变量，进入前需要输入管理密码。

## 快速开始

| 项目 | 说明 |
| --- | --- |
| 后台地址 | `https://你的域名/admin/` |
| 撰写页 | `https://你的域名/admin/editor/` |
| 默认密码 | `firefly`（**请务必第一时间修改**） |
| 修改密码 | `pnpm admin:passwd 你的新密码` |
| 关闭后台 | `src/config/siteConfig.ts` → `pages.admin = false`，或 `src/config/adminConfig.ts` → `enable = false` |

> 关闭后 `/admin/` 与 `/admin/editor/` 会直接跳转 404。

## 功能

**管理首页 `/admin/`**

- **概览**：文章总数、分类数、标签数、累计字数、近 8 个月发布柱状图、最近文章
- **文章**：搜索（标题/简介/标签）、按分类与状态筛选，可编辑、复制、下载 Markdown
- **草稿**：撰写页保存的本地草稿，可继续编辑或删除
- **设置**：可视化配置中心（见下节），含 GitHub 发布配置与登录会话管理

**撰写页 `/admin/editor/`**

- frontmatter 表单：标题、发布/更新日期、简介、分类、标签、封面、slug、文件名、
  系列与序号、作者、语言、原文链接、许可、文章密码与提示、置顶 / 草稿 / 评论开关
- Markdown 编辑器：工具栏（加粗、斜体、标题、引用、代码块、列表、链接、图片）、
  编辑 / 分屏 / 预览三种视图、实时字数
- 输出方式：保存到本地草稿、下载 `.md`、复制到剪贴板、直接提交到 GitHub
- 支持 `?id=文章id` 载入已有文章、`?draft=草稿id` 继续写草稿

## 可视化设置面板

后台「设置」是一个完整的配置中心，覆盖 `src/config/` 下 26 个配置文件、共 28 个设置单元。
左侧按「核心 / 外观 / 布局 / 功能 / 高级」分组导航，支持按名称搜索。

### 精心定制的表单

| 设置项 | 可调整内容 |
| --- | --- |
| 基础配置 | 站点标题、副标题、地址、描述、关键词、语言、时区、建站日期、主题色（色相滑杆）、页面宽度、卡片样式、站点图标 |
| 站点配置 | 12 个页面开关、导航栏 Logo（图标/本地图/网络图）与模式、分类与标签样式、文章列表与内容、图像优化、Bilibili / Bangumi / VNDB / MAL |
| 设置面板 | 前台「显示设置」浮层里出现哪些开关，含总开关与体积提示 |
| 个人资料 | 头像、昵称、签名，社交链接可增删与上下排序 |
| 背景壁纸 | 四种壁纸模式卡片、桌面/移动壁纸（单张 ⇄ 多张随机）、背景视频、横幅文字与打字机、轮播、水波纹、渐变、各模式专属参数 |
| 导航栏 | 两级菜单树，每项可改名称/链接/图标/新窗口，支持增删与排序 |
| 侧边栏 | 位置（仅左 / 仅右 / 双侧）、平板端显示、文章页规则 |
| 侧边栏小组件 | 左栏 / 右栏 / 移动端底部三处，11 种组件可添加、启用、排序与配置专属参数 |

其余配置（评论、字体、封面、特效、音乐、看板娘、打赏、友链、相册、书签导航、
公告、动态、页脚、版权、统计、代码高亮、Mermaid、PlantUML、后台管理）由通用表单
按值类型自动渲染：开关、输入框、下拉、标签 chips、对象折叠、对象数组增删排序。

### 改动如何生效（重要）

Firefly 的配置都是**构建期的 TypeScript 文件**，浏览器改完不会自动全站生效。
因此设置面板的落地方式是：

1. 在面板里改配置，改动会标记在左侧导航上（小圆点）；
2. 点右上角「生成配置代码」，打开导出抽屉；
3. 选择**复制 / 下载单个 / 下载全部**，把文件覆盖到项目对应的 `src/config/` 路径；
   或者在抽屉底部**直接提交到 GitHub**，由 Cloudflare Pages / GitHub Pages 自动重新构建。

生成的代码会保留原文件的 `import` 语句、其它导出、辅助函数与文件级注释，
只替换你修改的那个导出值。`siteConfig` 的 `lang` 与 `pages` 会还原成
`resolveSiteLang(...)` / `resolvePageToggles(...)` 调用，不丢失环境变量覆盖能力；
`displaySettingsConfig` 也会保留 `resolveDisplaySettingsConfig(...)` 包装。

> 生成结果中的对象内部字段注释不会保留（只保留文件级与其它导出的注释），
> 如果需要完整注释请对照原文件手工补回。

### 即时预览

壁纸模式与主题色相支持在当前页面即时预览，便于导出前确认效果。
预览只写在当前页面的行内样式上，刷新即恢复，不会改动任何配置文件。
注意：`src/` 目录下的图片经过构建会改名，后台无法直接预览，只影响预览不影响前台。

### 配置快照从哪来

`/api/admin-settings.json` 在**构建时**读取全部配置并序列化，同时把每个配置文件的
`export const x: T = <值>;` 拆成 head / tail 模板一并输出。所以：

- 站点重新构建后，后台读到的就是最新配置；
- 后台页面同样带 `noindex`、不进 sitemap、不参与搜索索引。

## 配置 GitHub 在线发布

1. GitHub → Settings → Developer settings → Personal access tokens 生成一个 token，
   勾选 **Contents: Read and write**（经典 token 勾选 `repo`）。
2. 打开后台 →「设置」，填写仓库所有者、仓库名、分支（默认 `main`）、文章目录
   （默认 `src/content/posts`）与 token，点「测试连接」确认无误后保存。
3. 撰写页点「发布」，文章会以 `新增/更新文章：标题` 的提交信息推送到仓库，
   Cloudflare Pages / GitHub Pages 等平台会自动触发重新构建。

Token 只保存在当前浏览器的 localStorage，不会写进仓库代码，也不会发往 GitHub 之外的任何地方。
不配置 GitHub 也能正常使用：写好之后「下载」Markdown 手动放进 `src/content/posts/` 再提交即可。

也可以在 `src/config/adminConfig.ts` 的 `github` 里预填 `owner / repo / branch / postsPath`，
这样换设备打开后台时不用再填一遍（token 仍需在浏览器里填一次）。

## 关于密码安全（请务必阅读）

Firefly 默认是纯静态站点，没有服务端，所以登录校验只能在浏览器里完成：
配置文件里存的是 `sha256(盐:密码)`，输入密码后在本地算哈希再比对，密码不会发往任何服务器。

这意味着它适合「隐藏入口、防止误触」，但**不能**替代真正的服务端鉴权 ——
如果有人拿到构建产物并愿意离线碰撞，简单密码是有可能被算出来的。因此请：

1. 使用 12 位以上的强密码（`pnpm admin:passwd` 会随机生成新盐值）；
2. 不要只依靠这个后台来保护敏感内容；
3. 需要强鉴权时，在站点前面再套一层 Cloudflare Access、基础认证或反向代理鉴权。

其他安全细节：

- 连续输错 5 次会锁定 10 分钟（可在 `adminConfig.auth` 调整）；
- 登录状态默认保持 12 小时，可在「设置」里手动退出；
- 后台页面带 `noindex`，不计入 sitemap，也不参与 Pagefind 搜索索引；
- 生产构建时 `/api/admin-posts.json` 只包含已发布文章，草稿信息不会写进静态文件；
- `/api/admin-post/<id>.json` 是文章正文的站内副本，**加密文章与草稿不会导出**，
  未配置 GitHub 时编辑器靠它读取正文。注意它与页面 HTML 一样是可公开访问的静态文件，
  不希望全文以这种形式出现的话，配置 GitHub 后编辑器会优先读仓库，副本不再被使用。

## 编辑已有文章

在「文章」列表点某篇的编辑按钮，会跳到 `/admin/editor/?id=<文章 id>`。正文按以下顺序获取：

1. **GitHub 仓库**（已配置 token 时优先）—— 拿到的是最新一稿，包含加密文章的密码字段；
2. **站内副本** —— 未配置 GitHub 或仓库读取失败时回落到 `/api/admin-post/<id>.json`；
3. 加密文章没有站内副本，只能走 GitHub，此时会提示需要配置。

## 想把后台放进导航栏？

后台入口默认不显示在导航栏（推荐，减少被扫的概率）。需要的话在
`src/config/navBarConfig.ts` 的 `getDynamicNavBarConfig()` 里加一条即可：

```ts
links.push({
	name: "后台",
	url: "/admin/",
	icon: "material-symbols:dashboard",
	external: false,
});
```

## 新增的文件

```
src/config/adminConfig.ts                 后台配置（密码哈希、默认值、GitHub 仓库）
src/types/adminConfig.ts                  后台相关类型
src/utils/admin-auth.ts                   密码校验与登录会话
src/utils/admin-markdown.ts               frontmatter 序列化 / 解析、下载、复制
src/utils/admin-github.ts                 GitHub Contents API 封装
src/utils/admin-drafts.ts                 本地草稿与 GitHub 设置的存储
src/styles/admin.css                      后台样式（沿用主题变量）
src/components/admin/AdminIcon.svelte     内联 SVG 图标
src/components/admin/AdminLogin.svelte    登录卡片
src/components/admin/AdminPanel.svelte    后台主面板（分区导航）
src/components/admin/AdminOverview.svelte 概览
src/components/admin/AdminPostList.svelte 文章管理
src/components/admin/AdminDrafts.svelte   本地草稿
src/components/admin/AdminSettingsHub.svelte     设置中心（导航 + 编辑器 + 导出）
src/components/admin/AdminFormFields.svelte      通用配置表单（按值类型渲染，可递归）
src/components/admin/AdminArrayEditor.svelte     数组型配置编辑器（友链、书签导航）
src/components/admin/AdminExportPanel.svelte     配置代码导出抽屉
src/components/admin/SettingsSiteBasic.svelte    基础配置
src/components/admin/SettingsSiteAdvanced.svelte 站点配置
src/components/admin/SettingsDisplay.svelte      设置面板开关
src/components/admin/SettingsProfile.svelte      个人资料
src/components/admin/SettingsWallpaper.svelte    背景壁纸
src/components/admin/SettingsNavbar.svelte       导航栏
src/components/admin/SettingsSidebar.svelte      侧边栏
src/components/admin/SettingsWidgets.svelte      侧边栏小组件
src/components/admin/PostEditor.svelte    文章撰写 / 编辑
src/pages/admin/index.astro               后台首页
src/pages/admin/editor/index.astro        撰写页
src/pages/api/admin-posts.json.ts         后台文章数据
src/pages/api/admin-post/[...id].json.ts 单篇文章正文（构建期生成）
src/pages/api/admin-settings.json.ts      后台配置快照与源码模板
src/utils/admin-settings-units.ts         设置单元清单与分组
src/utils/admin-settings-store.ts         改动合并、草稿与源码生成入口
src/utils/admin-config-codegen.ts         TS 源码生成与字段注释抽取
src/utils/admin-source-split.ts           构建期拆分配置文件（head / tail）
src/utils/admin-field-hints.ts            字段中文名与可选值映射
src/utils/admin-live-preview.ts           壁纸与主题色即时预览
src/types/adminSettings.ts                设置面板相关类型
scripts/set-admin-password.mjs            改密码脚本
```

改动到的现有文件：`src/config/index.ts`、`src/config/siteConfig.ts`、
`src/types/siteConfig.ts`、`src/types/config.ts`、`src/i18n/*`（新增 admin 相关文案）、
`astro.config.mjs`（sitemap 排除后台）、`package.json`（`admin:passwd` 命令）。
