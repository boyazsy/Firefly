<script lang="ts">
/**
 * 后台文章管理 - 搜索 / 筛选 / 编辑 / 下载
 */
import type { AdminPostMeta } from "@/types/adminConfig";
import type { GitHubTarget } from "@/utils/admin-github";
import { buildPostPath, fetchRepoFile, isGitHubReady } from "@/utils/admin-github";
import { copyText, downloadTextFile } from "@/utils/admin-markdown";
import AdminIcon from "./AdminIcon.svelte";

interface Props {
	posts: AdminPostMeta[];
	editorUrl: string;
	github: GitHubTarget | null;
	loading?: boolean;
	onNotify?: (message: string, type: "success" | "error") => void;
}

const { posts, editorUrl, github, loading = false, onNotify }: Props = $props();

let keyword = $state("");
let categoryFilter = $state("all");
let statusFilter = $state<"all" | "published" | "draft">("all");
let busyId = $state("");

const categories = $derived(
	Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort(),
);

const filtered = $derived(
	posts.filter((post) => {
		const kw = keyword.trim().toLowerCase();
		const matchKeyword =
			!kw ||
			post.title.toLowerCase().includes(kw) ||
			post.description.toLowerCase().includes(kw) ||
			(post.tags ?? []).some((tag) => tag.toLowerCase().includes(kw));
		const matchCategory =
			categoryFilter === "all" || post.category === categoryFilter;
		const matchStatus =
			statusFilter === "all" ||
			(statusFilter === "draft" ? post.draft : !post.draft);
		return matchKeyword && matchCategory && matchStatus;
	}),
);

function formatDate(iso: string): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function handleDownload(post: AdminPostMeta) {
	if (!github || !isGitHubReady(github)) {
		onNotify?.("请先在「设置」中配置 GitHub 仓库与 Token", "error");
		return;
	}
	busyId = post.id;
	const path = buildPostPath(github.postsPath, `${post.id}.md`);
	const result = await fetchRepoFile(github, path);
	busyId = "";
	if (!result.ok || !result.data) {
		onNotify?.(result.message || "读取文章失败", "error");
		return;
	}
	const filename = path.split("/").pop() ?? `${post.id}.md`;
	downloadTextFile(filename, result.data.content);
	onNotify?.("已下载 Markdown 文件", "success");
}

async function handleCopy(post: AdminPostMeta) {
	if (!github || !isGitHubReady(github)) {
		onNotify?.("请先在「设置」中配置 GitHub 仓库与 Token", "error");
		return;
	}
	busyId = post.id;
	const path = buildPostPath(github.postsPath, `${post.id}.md`);
	const result = await fetchRepoFile(github, path);
	busyId = "";
	if (!result.ok || !result.data) {
		onNotify?.(result.message || "读取文章失败", "error");
		return;
	}
	const ok = await copyText(result.data.content);
	onNotify?.(ok ? "已复制 Markdown 到剪贴板" : "复制失败，请手动选择文本", ok ? "success" : "error");
}
</script>

<div class="admin-card admin-card--bordered overflow-hidden">
	<!-- 工具栏 -->
	<div
		class="flex flex-col gap-3 border-b border-(--line-divider) px-5 py-4 md:flex-row md:items-center"
	>
		<div class="relative flex-1">
			<span
				class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--btn-content) opacity-60"
			>
				<AdminIcon name="search" class="h-4 w-4" />
			</span>
			<input
				class="admin-input pl-9"
				placeholder="搜索标题、简介或标签…"
				bind:value={keyword}
			/>
		</div>
		<div class="flex flex-wrap gap-2">
			<select class="admin-select w-auto min-w-28" bind:value={categoryFilter}>
				<option value="all">全部分类</option>
				{#each categories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
			<select class="admin-select w-auto min-w-28" bind:value={statusFilter}>
				<option value="all">全部状态</option>
				<option value="published">已发布</option>
				<option value="draft">草稿</option>
			</select>
			<a class="admin-btn admin-btn--primary" href={editorUrl} data-no-swup>
				<AdminIcon name="plus" class="h-4 w-4" />
				新建
			</a>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-col gap-3 p-5">
			{#each Array.from({ length: 5 }), i}
				<div class="admin-skeleton h-14 w-full"></div>
			{/each}
		</div>
	{:else if filtered.length === 0}
		<div class="px-5 py-14 text-center">
			<div class="mb-2 flex justify-center text-(--btn-content) opacity-40">
				<AdminIcon name="post" class="h-10 w-10" />
			</div>
			<p class="text-sm text-(--btn-content) opacity-70">
				{posts.length ? "没有匹配的文章" : "还没有文章"}
			</p>
		</div>
	{:else}
		<ul class="divide-y divide-(--line-divider)">
			{#each filtered as post (post.id)}
				<li class="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<a
								class="truncate font-medium hover:text-(--primary)"
								href={post.url}
								target="_blank"
								rel="noreferrer"
							>
								{post.title}
							</a>
							{#if post.draft}
								<span class="admin-badge admin-badge--draft">草稿</span>
							{/if}
							{#if post.pinned}
								<span class="admin-badge admin-badge--pinned">置顶</span>
							{/if}
							{#if post.encrypted}
								<span class="admin-badge admin-badge--locked">加密</span>
							{/if}
						</div>
						<div
							class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--btn-content) opacity-70"
						>
							<span class="inline-flex items-center gap-1">
								<AdminIcon name="calendar" class="h-3.5 w-3.5" />
								{formatDate(post.published)}
							</span>
							{#if post.category}
								<span class="inline-flex items-center gap-1">
									<AdminIcon name="folder" class="h-3.5 w-3.5" />
									{post.category}
								</span>
							{/if}
							{#if post.tags?.length}
								<span class="inline-flex items-center gap-1">
									<AdminIcon name="tag" class="h-3.5 w-3.5" />
									{post.tags.join(" / ")}
								</span>
							{/if}
							<span>{post.words} 字</span>
							<span class="font-mono opacity-60">{post.path}</span>
						</div>
					</div>
					<div class="flex flex-none flex-wrap items-center gap-2">
						<a
							class="admin-btn admin-btn--ghost admin-btn--sm"
							href={`${editorUrl}?id=${encodeURIComponent(post.id)}`}
							data-no-swup
						>
							<AdminIcon name="edit" class="h-3.5 w-3.5" />
							编辑
						</a>
						<button
							class="admin-btn admin-btn--ghost admin-btn--sm"
							onclick={() => handleCopy(post)}
							disabled={busyId === post.id}
						>
							<AdminIcon name="copy" class="h-3.5 w-3.5" />
							复制
						</button>
						<button
							class="admin-btn admin-btn--ghost admin-btn--sm"
							onclick={() => handleDownload(post)}
							disabled={busyId === post.id}
						>
							<AdminIcon name="download" class="h-3.5 w-3.5" />
							下载
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
