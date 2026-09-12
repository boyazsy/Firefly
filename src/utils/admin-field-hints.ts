/**
 * 设置表单的字段提示
 *
 * 通用表单没有 schema，靠「字段名 → 中文名 / 可选值」的映射来提升可读性。
 * 字段名匹配不区分大小写；未命中时直接显示原始字段名。
 */

/** 字段名 → 中文标签 */
export const FIELD_LABELS: Record<string, string> = {
	// 站点基础
	title: "标题",
	subtitle: "副标题",
	site_url: "站点地址",
	description: "描述",
	keywords: "关键词",
	lang: "站点语言",
	timezone: "时区",
	siteStartDate: "建站日期",
	pageWidth: "页面宽度 (rem)",
	hue: "主题色色相",
	defaultMode: "默认模式",
	border: "卡片边框",
	followTheme: "跟随主题色",
	favicon: "站点图标",
	src: "图标路径",
	theme: "主题",
	sizes: "尺寸",

	// 导航栏
	navbar: "导航栏",
	logo: "站点 Logo",
	value: "值",
	valueDark: "暗色模式值",
	alt: "替代文字",
	widthFull: "全宽导航栏",
	menuAlign: "菜单对齐",
	navbarMode: "导航栏模式",
	url: "链接地址",
	name: "名称",
	icon: "图标",
	external: "外部链接",
	children: "子菜单",
	method: "检索方式",

	// 页面开关
	pages: "页面开关",
	friends: "友链页",
	guestbook: "留言板",
	dynamic: "动态页",
	projects: "项目页",
	gallery: "相册页",
	booknav: "书签导航页",
	bilibili: "哔哩哔哩追番",
	bangumi: "番组计划",
	vndb: "VNDB",
	mal: "MyAnimeList",
	sponsor: "打赏页",
	admin: "后台管理",
	categoryBar: "分类导航栏",
	categoryStyle: "分类按钮样式",
	tagStyle: "标签样式",
	foldArticle: "归档折叠旧年份",

	// 文章列表
	postListLayout: "文章列表",
	coverPosition: "封面位置",
	descriptionLines: "简介行数",
	showStatsIcons: "显示统计图标",
	tagsPosition: "标签位置",
	tagsBottomStyle: "底部标签样式",
	meta: "元数据",
	stats: "统计信息",
	grid: "网格布局",
	masonry: "瀑布流",
	columnWidth: "卡片最小宽度 (px)",
	coverFullWidth: "封面贴边",
	showPublished: "发布日期",
	showCategory: "分类",
	showTags: "标签",
	tagCount: "标签数量",
	showWords: "字数",
	showReadingTime: "阅读时长",
	postsPerPage: "每页文章数",
	mobileDefaultMode: "移动端布局",

	// 文章内容
	post: "文章内容",
	rehypeCallouts: "提醒框",
	enablePythonMarkdownAdmonitions: "兼容 Python-Markdown 语法",
	showLastModified: "显示上次编辑",
	outdatedThreshold: "过期阈值 (天)",
	share: "分享按钮",
	postNavigation: "上下篇导航",
	relatedPosts: "相关文章",
	randomPosts: "随机文章",
	generateOgImages: "生成 OG 图片",
	immersiveReading: "沉浸阅读",
	defaultOn: "默认开启",
	tocEnabled: "显示目录",
	tocPosition: "目录位置",
	contentMode: "订阅内容",
	feed: "订阅",

	// 图像
	imageOptimization: "图像优化",
	formats: "输出格式",
	quality: "压缩质量",
	noReferrerDomains: "不带 Referrer 的域名",

	// 第三方
	uid: "用户 UID",
	userId: "用户 ID",
	username: "用户名",
	clientId: "Client ID",
	apiUrl: "API 地址",
	apiToken: "API 令牌",
	subjectBaseUrl: "详情页地址",
	vnBaseUrl: "条目地址",
	animeBaseUrl: "动画地址",
	mangaBaseUrl: "漫画地址",
	categoryOrder: "分类排序",
	downloadCovers: "下载封面",
	nsfw: "NSFW 处理",
	mode: "模式",

	// 个人资料 / 壁纸
	avatar: "头像",
	bio: "个人签名",
	links: "链接列表",
	showName: "显示名称",
	playerEnable: "背景视频",
	playerUrl: "视频地址",
	playerMode: "视频播放模式",
	desktop: "桌面端",
	mobile: "移动端",
	dimOpacity: "遮罩暗度",
	homeText: "主页横幅文字",
	titleSize: "主标题字号",
	subtitleSize: "副标题字号",
	typewriter: "打字机效果",
	speed: "打字速度 (ms)",
	deleteSpeed: "删除速度 (ms)",
	pauseTime: "停顿时间 (ms)",
	linksEnable: "显示链接图标",
	carousel: "壁纸轮播",
	interval: "切换间隔 (ms)",
	transitionEffect: "过渡效果",
	waves: "水波纹",
	gradient: "渐变过渡",
	height: "渐变高度",
	enable: "启用",
	position: "位置",
	zIndex: "层级",
	opacity: "不透明度",
	blur: "模糊度",
	cardOpacity: "卡片不透明度",
	layout: "布局模式",
	postInfo: "文章横幅信息",
	transparentMode: "透明模式",
	blurRamp: "下滑模糊渐变",

	// 侧边栏
	sidebarLayoutConfig: "侧边栏",
	tabletSidebar: "平板端显示",
	hideSidebarOnPostPage: "文章页隐藏侧边栏",
	showBothSidebarsOnPostPage: "文章页保持双侧栏",
	leftComponents: "左侧栏组件",
	rightComponents: "右侧栏组件",
	mobileBottomComponents: "移动端底部组件",
	type: "组件类型",
	showTitle: "显示标题",
	showOnPostPage: "文章页显示",
	hideOnNonPostPage: "仅文章页显示",
	specificConfig: "组件参数",
	collapseThreshold: "折叠阈值",
	limit: "显示数量",
	unknownBuildPlatform: "未知构建平台文案",
	showHeatmap: "年度热力图",
	closable: "允许关闭",
	displayCount: "显示次数限制",
	padding: "内边距",
	all: "统一内边距",
	ad: "广告内容",
	image: "图片",
	content: "内容",
	text: "文字",
	link: "链接",

	// 设置面板
	displaySettingsConfig: "设置面板",
	themeColorSwitchable: "主题色选择器",
	layoutSwitchable: "文章列表布局切换",
	cardBorderSwitchable: "卡片边框开关",
	cardFollowThemeSwitchable: "卡片跟随主题色",
	wallpaperModeSwitchable: "壁纸模式切换",
	fullscreenLayoutSwitchable: "全屏布局切换",
	wavesSwitchable: "水波纹开关",
	gradientSwitchable: "渐变过渡开关",
	bannerTitleSwitchable: "横幅标题开关",
	bannerCarouselSwitchable: "壁纸轮播开关",
	overlaySwitchable: "透明覆盖参数调节",
	sakuraSwitchable: "樱花特效开关",

	// 后台
	auth: "登录鉴权",
	passwordHash: "密码哈希",
	salt: "盐值",
	sessionHours: "会话时长 (小时)",
	maxAttempts: "最大失败次数",
	lockMinutes: "锁定时长 (分钟)",
	defaults: "新建文章默认值",
	author: "作者",
	category: "分类",
	tags: "标签",
	licenseName: "协议名称",
	licenseUrl: "协议地址",
	postsPath: "文章目录",
	github: "GitHub 发布",
	owner: "用户名 / 组织",
	repo: "仓库名",
	branch: "分支",
	token: "访问令牌",
	maxLocalDrafts: "本地草稿上限",

	// 通用
	order: "排序",
	comment: "评论",
	cover: "封面",
	autoCover: "自动生成封面",
	defaultCover: "默认封面",
};

/** 字段名 → 可选值（渲染成下拉框） */
export const FIELD_ENUMS: Record<string, string[]> = {
	mode: ["banner", "fullscreen", "overlay", "none"],
	defaultMode: ["list", "grid", "light", "dark", "system"],
	mobileDefaultMode: ["list", "grid"],
	layout: ["classic", "hero"],
	position: ["left", "right", "both", "top", "sticky", "center"],
	tabletSidebar: ["left", "right"],
	menuAlign: ["left", "center"],
	navbarMode: ["static", "fixed", "dynamic"],
	categoryStyle: ["pill", "rectangle"],
	tagStyle: ["pill", "pill-gray", "rectangle"],
	tagsPosition: ["meta", "bottom"],
	tagsBottomStyle: ["chip", "text"],
	coverPosition: ["right", "left"],
	transitionEffect: ["fade", "zoom", "slide", "kenburns"],
	playerMode: ["order", "random"],
	contentMode: ["full", "summary"],
	formats: ["avif", "webp", "both"],
	nsfw: ["off", "blur", "hide"],
	transparentMode: ["semi", "semifull", "none"],
	theme: ["github", "obsidian", "vitepress", "docusaurus"],
	lang: ["zh_CN", "zh_TW", "en", "ja", "ko", "ru"],
	method: ["pagefind", "none"],
	tocPosition: ["left", "right"],
};

/** 字段补充说明 */
export const FIELD_HINTS: Record<string, string> = {
	hue: "0-360，红色 0、青色 200、蓝绿色 250、粉色 345",
	site_url: "带协议的完整地址，用于 RSS 与 OG 图片",
	avatar:
		"支持 public 路径（以 / 开头）、src 路径（自动优化）或远程 URL",
	src: "支持 public 路径（以 / 开头）、src 路径（自动优化）或远程 URL",
	token: "只保存在你自己的浏览器里，不会写进配置文件",
	quality: "1-100，推荐 70-85",
	dimOpacity: "0-1，值越大越暗",
	cardOpacity: "0-1，值越小越透明",
	opacity: "0-1，值越小越透明",
	postsPerPage: "首页与归档页每页显示的文章数量",
	apiToken: "不要把真实令牌提交到公开仓库",
};

/** 取字段中文名，未命中则返回原字段名 */
export function fieldLabel(key: string): string {
	return FIELD_LABELS[key] ?? FIELD_LABELS[key.toLowerCase()] ?? key;
}

/** 取字段可选值 */
export function fieldOptions(key: string): string[] | undefined {
	return FIELD_ENUMS[key] ?? FIELD_ENUMS[key.toLowerCase()];
}

/** 取字段补充说明 */
export function fieldHint(key: string): string | undefined {
	return FIELD_HINTS[key] ?? FIELD_HINTS[key.toLowerCase()];
}
