/**
 * 后台管理（Admin）相关类型定义
 *
 * 后台为纯前端实现，不依赖任何服务端运行时，
 * 因此静态托管（Cloudflare Pages / GitHub Pages / Vercel 等）都可以直接使用。
 */

/** 发布到 GitHub 时需要填写的仓库信息 */
export interface AdminGitHubConfig {
	/** 仓库所有者（用户名或组织名），例如 boyazy */
	owner: string;
	/** 仓库名，例如 web */
	repo: string;
	/** 分支名，例如 main */
	branch: string;
	/**
	 * 文章在仓库中的存放目录，相对于仓库根目录
	 * 例如 src/content/posts，留空则回退到 defaults.postsPath
	 */
	postsPath: string;
}

/** 登录与会话相关配置 */
export interface AdminAuthConfig {
	/**
	 * 登录密码的加盐哈希：sha256(`${salt}:${password}`)，小写 hex 字符串
	 * 请使用 `pnpm admin:passwd <你的密码>` 生成，不要手工填写
	 */
	passwordHash: string;
	/** 哈希使用的盐值，由密码脚本自动生成 */
	salt: string;
	/** 登录状态保持时长（小时），设为 0 则关闭标签页即失效 */
	sessionHours: number;
	/** 连续输错多少次后临时锁定登录 */
	maxAttempts: number;
	/** 锁定持续时长（分钟） */
	lockMinutes: number;
}

/** 撰写新文章时的默认值 */
export interface AdminDefaultsConfig {
	/** 默认作者 */
	author: string;
	/** 默认分类 */
	category: string;
	/** 默认标签 */
	tags: string[];
	/** 默认语言，留空则跟站点一致 */
	lang: string;
	/** 默认许可协议名称 */
	licenseName: string;
	/** 默认许可协议链接 */
	licenseUrl: string;
	/** 文章 Markdown 在仓库中的存放目录（发布到 GitHub 时使用） */
	postsPath: string;
}

export interface AdminConfig {
	/** 是否启用后台管理，false 时 /admin/ 与 /admin/editor/ 会跳转 404 */
	enable: boolean;
	/** 登录与会话配置 */
	auth: AdminAuthConfig;
	/** 新文章默认值 */
	defaults: AdminDefaultsConfig;
	/**
	 * GitHub 发布配置（可选）
	 * 填写后可以在后台直接把文章提交到仓库，触发站点自动重新构建
	 * 不填写时后台仅支持「下载 / 复制 Markdown」与「保存到本地草稿」
	 */
	github: AdminGitHubConfig;
	/** 本地草稿最多保留多少份，超出后丢弃最旧的 */
	maxLocalDrafts: number;
}

/** 后台文章列表用到的文章元信息（由 /api/admin-posts.json 提供） */
export interface AdminPostMeta {
	id: string;
	title: string;
	description: string;
	published: string;
	updated: string | null;
	category: string;
	tags: string[];
	author: string;
	image: string;
	draft: boolean;
	pinned: boolean;
	encrypted: boolean;
	comment: boolean;
	series: string;
	seriesOrder: number | null;
	words: number;
	/** 文章在仓库里的文件路径，用于 GitHub 发布 */
	path: string;
	/** 前台访问地址 */
	url: string;
}

/** 保存在浏览器本地的草稿结构 */
export interface AdminDraft {
	/** 草稿唯一标识 */
	id: string;
	title: string;
	/** 最近一次保存时间（毫秒时间戳） */
	savedAt: number;
	/** frontmatter 字段 JSON */
	frontmatter: Record<string, unknown>;
	/** Markdown 正文 */
	body: string;
}
