import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

/**
 * 单篇文章正文（构建期生成，供后台编辑器离线载入）
 *
 * 安全边界：
 * - 加密文章（frontmatter 带 password）一律不导出 —— 否则明文会随静态产物公开，
 *   等于把构建期的 AES 加密白做一遍。这类文章只能从 GitHub 仓库读取。
 * - 生产构建中草稿同样不导出，与 /api/admin-posts.json 的口径保持一致。
 */
export const getStaticPaths = (async () => {
	const posts = await getCollection("posts", ({ data }) => {
		if (data.password) return false;
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	return posts.map((post) => ({
		params: { id: post.id },
		props: {
			id: post.id,
			path: `src/content/posts/${post.id}.md`,
			content: post.body ?? "",
		},
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
	const { id, path, content } = props as {
		id: string;
		path: string;
		content: string;
	};

	return new Response(JSON.stringify({ ok: true, id, path, content }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
		},
	});
};
