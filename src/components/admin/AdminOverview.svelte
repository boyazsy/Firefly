<script lang="ts">
/**
 * 后台概览 - 站点数据统计 + 最近文章 + 快捷入口
 */
import type { AdminPostMeta } from "@/types/adminConfig";
import AdminIcon from "./AdminIcon.svelte";

interface Props {
	posts: AdminPostMeta[];
	editorUrl: string;
	githubReady: boolean;
}

const { posts, editorUrl, githubReady }: Props = $props();

function formatDate(iso: string): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const totalPosts = $derived(posts.length);
const draftCount = $derived(posts.filter((p) => p.draft).length);
const encryptedCount = $derived(posts.filter((p) => p.encrypted).length);
const categories = $derived(
	Array.from(new Set(posts.map((p) => p.category).filter(Boolean))),
);
const tags = $derived(
	Array.from(new Set(posts.flatMap((p) => p.tags ?? []))),
);
const totalWords = $derived(posts.reduce((sum, p) => sum + (p.words || 0), 0));

const recentPosts = $derived(
	[...posts]
		.sort((a, b) => {
			const at = new Date(a.published).getTime() || 0;
			const bt = new Date(b.published).getTime() || 0;
			return bt - at;
		})
		.slice(0, 6),
);

/** 最近 8 个月的发布数量，用于简易柱状图 */
const monthly = $derived.by(() => {
	const buckets: { label: string; count: number }[] = [];
	const now = new Date();
	for (let i = 7; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		buckets.push({
			label: `${d.getMonth() + 1}月`,
			count: posts.filter((p) => {
				const pd = new Date(p.published);
				return (
					pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
				);
			}).length,
		});
	}
	return buckets;
});

const maxMonthly = $derived(Math.max(1, ...monthly.map((m) => m.count)));

const statCards = $derived([
	{
		label: "文章总数",
		value: totalPosts,
		icon: "post" as const,
		color: "text-(--primary)",
	},
	{
		label: "分类",
		value: categories.length,
		icon: "folder" as const,
		color: "text-(--primary)",
	},
	{
		label: "标签",
		value: tags.length,
		icon: "tag" as const,
		color: "text-(--primary)",
	},
	{
		label: "累计字数",
		value: totalWords.toLocaleString(),
		icon: "edit" as const,
		color: "text-(--primary)",
	},
]);
</script>

<div class="flex flex-col gap-4">
	<!-- 统计卡片 -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each statCards as card}
			<div class="admin-card admin-card--bordered p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-(--btn-regular-bg) {card.color}"
					>
						<AdminIcon name={card.icon} class="h-5 w-5" />
					</div>
					<div class="min-w-0">
						<div class="truncate text-xs text-(--btn-content) opacity-80">
							{card.label}
						</div>
						<div class="text-xl font-bold">{card.value}</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<!-- 发布趋势 -->
		<div class="admin-card admin-card--bordered p-5 lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-bold">最近 8 个月发布</h3>
				<span class="text-xs text-(--btn-content) opacity-70">
					草稿 {draftCount} · 加密 {encryptedCount}
				</span>
			</div>
			<div class="flex h-40 items-end gap-2">
				{#each monthly as item}
					<div class="flex flex-1 flex-col items-center gap-1.5">
						<span class="text-[10px] text-(--btn-content) opacity-70">
							{item.count || ""}
						</span>
						<div
							class="w-full rounded-t-md bg-(--primary) transition-all duration-500"
							style="height: {Math.max(3, (item.count / maxMonthly) * 100)}%; opacity: {item.count
								? 1
								: 0.25}"
						></div>
						<span class="text-[10px] text-(--btn-content) opacity-60">
							{item.label}
						</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- 快捷操作 -->
		<div class="admin-card admin-card--bordered p-5">
			<h3 class="mb-4 text-sm font-bold">快捷操作</h3>
			<div class="flex flex-col gap-2">
				<a
					class="admin-btn admin-btn--primary"
					href={editorUrl}
					data-no-swup
				>
					<AdminIcon name="plus" class="h-4 w-4" />
					写一篇新文章
				</a>
				<a class="admin-btn admin-btn--regular" href="/" data-no-swup>
					<AdminIcon name="external" class="h-4 w-4" />
					回到站点首页
				</a>
				<div class="admin-alert admin-alert--info mt-2 text-xs">
					<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
					<span>
						{#if githubReady}
							已配置 GitHub 仓库，文章可直接提交发布。
						{:else}
							未配置 GitHub 仓库，撰写后可下载 Markdown 再手动提交。
							前往「设置」填写即可在线发布。
						{/if}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- 最近文章 -->
	<div class="admin-card admin-card--bordered overflow-hidden">
		<div
			class="flex items-center justify-between border-b border-(--line-divider) px-5 py-3.5"
		>
			<h3 class="text-sm font-bold">最近文章</h3>
			<span class="text-xs text-(--btn-content) opacity-70">
				共 {totalPosts} 篇
			</span>
		</div>
		{#if recentPosts.length === 0}
			<div class="px-5 py-10 text-center text-sm text-(--btn-content) opacity-70">
				还没有文章，去写一篇吧
			</div>
		{:else}
			<ul class="divide-y divide-(--line-divider)">
				{#each recentPosts as post}
					<li class="flex items-center gap-3 px-5 py-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
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
								class="mt-0.5 flex items-center gap-2 text-xs text-(--btn-content) opacity-70"
							>
								<span>{formatDate(post.published)}</span>
								{#if post.category}
									<span>·</span>
									<span>{post.category}</span>
								{/if}
							</div>
						</div>
						<a
							class="admin-btn admin-btn--ghost admin-btn--sm"
							href={`${editorUrl}?id=${encodeURIComponent(post.id)}`}
							data-no-swup
						>
							<AdminIcon name="edit" class="h-3.5 w-3.5" />
							编辑
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
