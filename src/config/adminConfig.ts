/**
 * 后台管理配置 - Firefly Admin
 *
 * ⚠️ 安全提示（务必阅读）
 * Firefly 默认是纯静态站点，没有服务端，因此后台的登录校验只能在浏览器里完成。
 * 这意味着只要密码足够简单，别人就有可能通过离线碰撞猜出来 —— 它适合「隐藏入口、防止误触」，
 * 但不能替代真正的服务端鉴权。请务必：
 *   1. 设置一个足够长的密码（建议 12 位以上，混合大小写、数字与符号）；
 *   2. 不要把重要的私密内容只靠这个后台来保护；
 *   3. 需要强鉴权时，请为站点套一层 Cloudflare Access / 基础认证 / 反向代理鉴权。
 *
 * 修改密码：pnpm admin:passwd 你的新密码
 */

import type { AdminConfig } from "../types/adminConfig";

export const adminConfig: AdminConfig = {
	// 是否启用后台管理（关闭后 /admin/ 与 /admin/editor/ 都会跳转 404）
	enable: true,

	auth: {
		// 默认密码是 firefly，请第一时间用 `pnpm admin:passwd 新密码` 修改！
		passwordHash:
			"0a878e54b56af1a4af24a3d2fcadf0a172d493881874560af6877c1dbc86e67d",
		salt: "firefly-admin-2026",
		// 登录状态保持 12 小时，设为 0 表示关闭标签页即需重新登录
		sessionHours: 12,
		// 连续输错 5 次后锁定 10 分钟
		maxAttempts: 5,
		lockMinutes: 10,
	},

	// 新建文章时的默认值
	defaults: {
		author: "",
		category: "",
		tags: [],
		lang: "",
		licenseName: "",
		licenseUrl: "",
		// 文章 Markdown 在仓库中的目录（发布到 GitHub 时使用）
		postsPath: "src/content/posts",
	},

	// GitHub 发布配置（可选）
	// 填写后可在后台直接把文章提交到仓库，配合 Cloudflare Pages / GitHub Pages 的自动构建实现在线发布
	// token 不写在这里，而是在后台「设置」里填写，只保存在你自己的浏览器 localStorage 中
	github: {
		owner: "",
		repo: "",
		branch: "main",
		postsPath: "",
	},

	// 浏览器本地最多保留多少份草稿
	maxLocalDrafts: 30,
};
