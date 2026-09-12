import { getCollection } from "astro:content";
import type { AdminPostMeta } from "@/types/adminConfig";
import { getPostUrlBySlug } from "@/utils/url-utils";

/**
 * 后台文章清单
 * 生产构建时只包含已发布文章，避免草稿标题等未公开信息被写进静态文件
 */
export async function GET(): Promise<Response> {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const list: AdminPostMeta[] = posts
		.map((post) => {
			const body = post.body ?? "";
			const text = body
				.replace(/```[\s\S]*?```/g, "")
				.replace(/`[^`]*`/g, "")
				.replace(/\s+/g, " ")
				.trim();
			const words =
				(text.match(/[\u4e00-\u9fa5]/g)?.length ?? 0) +
				(text.match(/[a-zA-Z]+/g)?.length ?? 0);

			return {
				id: post.id,
				title: post.data.title,
				description: post.data.description ?? "",
				published: post.data.published
					? new Date(post.data.published).toISOString()
					: "",
				updated: post.data.updated
					? new Date(post.data.updated).toISOString()
					: null,
				category: post.data.category ?? "",
				tags: post.data.tags ?? [],
				author: post.data.author ?? "",
				image: post.data.image ?? "",
				draft: post.data.draft === true,
				pinned: post.data.pinned === true,
				encrypted: Boolean(post.data.password),
				comment: post.data.comment !== false,
				series: post.data.series ?? "",
				seriesOrder: post.data.seriesOrder ?? null,
				words,
				path: `src/content/posts/${post.id}.md`,
				url: getPostUrlBySlug(post.id),
			};
		})
		.sort((a, b) => {
			const at = new Date(a.published).getTime() || 0;
			const bt = new Date(b.published).getTime() || 0;
			return bt - at;
		});

	return new Response(JSON.stringify(list), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
		},
	});
}
