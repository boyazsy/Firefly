<script lang="ts">
/**
 * 文章撰写 / 编辑页 - frontmatter 表单 + Markdown 编辑器 + 实时预览 + 发布
 */
import { onMount } from "svelte";
import type {
	AdminDefaultsConfig,
	AdminGitHubConfig,
	AdminPostMeta,
} from "@/types/adminConfig";
import { destroySession, isUnlocked } from "@/utils/admin-auth";
import {
	getDraft,
	getGitHubSettings,
	type GitHubSettings,
	saveDraft,
} from "@/utils/admin-drafts";
import {
	buildPostPath,
	commitRepoFile,
	fetchRepoFile,
	isGitHubReady,
} from "@/utils/admin-github";
import {
	copyText,
	countWords,
	downloadTextFile,
	formatDate,
	parsePostMarkdown,
	serializePost,
	slugify,
} from "@/utils/admin-markdown";
import AdminIcon from "./AdminIcon.svelte";

interface Props {
	postsUrl: string;
	/** 站内文章正文端点前缀，形如 /api/admin-post/，回落到本地静态副本时使用 */
	postContentUrl: string;
	adminUrl: string;
	defaults: AdminDefaultsConfig;
	githubDefault: AdminGitHubConfig;
	maxLocalDrafts: number;
	markedUrl: string;
}

const {
	postsUrl,
	postContentUrl,
	adminUrl,
	defaults,
	githubDefault,
	maxLocalDrafts,
	markedUrl,
}: Props = $props();

type ViewMode = "edit" | "split" | "preview";

// ---------- 表单状态 ----------
let title = $state("");
let slug = $state("");
let filename = $state("");
let published = $state(formatDate(new Date()));
let updated = $state("");
let description = $state("");
let image = $state("");
let tags = $state<string[]>([]);
let tagInput = $state("");
let category = $state(defaults.category ?? "");
let lang = $state(defaults.lang ?? "");
let author = $state(defaults.author ?? "");
let sourceLink = $state("");
let licenseName = $state(defaults.licenseName ?? "");
let licenseUrl = $state(defaults.licenseUrl ?? "");
let series = $state("");
let seriesOrder = $state("");
let password = $state("");
let passwordHint = $state("");
/** 是否加密；主题按 frontmatter 里 password 是否为空来判断 */
let encrypted = $state(false);
let pinned = $state(false);
let draft = $state(false);
let comment = $state(true);
let body = $state("");

// ---------- 界面状态 ----------
let mounted = $state(false);
let unlocked = $state(false);
let view = $state<ViewMode>("split");
let posts = $state<AdminPostMeta[]>([]);
let github = $state<GitHubSettings>({
	owner: "",
	repo: "",
	branch: "main",
	postsPath: "",
	token: "",
});
let busy = $state(false);
let notice = $state<{ message: string; type: "success" | "error" } | null>(null);
let dirty = $state(false);
let draftId = $state("");
let editingId = $state("");
let textarea: HTMLTextAreaElement | null = $state(null);
let previewHtml = $state("");

const githubReady = $derived(
	isGitHubReady({
		...github,
		postsPath: github.postsPath || defaults.postsPath,
	}),
);
const words = $derived(countWords(body));
const generatedFilename = $derived(
	`${slug.trim() || slugify(title) || editingId || `post-${Date.now()}`}.md`,
);
const effectiveFilename = $derived(filename.trim() || generatedFilename);

const frontmatter = $derived({
	title: title.trim(),
	published: published ? formatDate(published) : formatDate(new Date()),
	updated: updated ? formatDate(updated) : "",
	draft,
	description: description.trim(),
	image: image.trim(),
	tags,
	category: category.trim(),
	lang: lang.trim(),
	pinned,
	author: author.trim(),
	sourceLink: sourceLink.trim(),
	licenseName: licenseName.trim(),
	licenseUrl: licenseUrl.trim(),
	comment,
	// 关闭加密时不写入密码字段，避免残留空值让主题误判
	password: encrypted ? password.trim() : "",
	passwordHint: encrypted ? passwordHint.trim() : "",
	series: series.trim(),
	seriesOrder: seriesOrder === "" ? undefined : Number(seriesOrder),
	slug: slug.trim(),
});

const markdown = $derived(serializePost(frontmatter, body));

// ---------- 提示 ----------
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
function notify(message: string, type: "success" | "error" = "success") {
	notice = { message, type };
	if (noticeTimer) clearTimeout(noticeTimer);
	noticeTimer = setTimeout(() => (notice = null), 3600);
}

// ---------- 预览 ----------
function ensureMarked(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if ((window as unknown as { marked?: { parse: (s: string) => string } }).marked) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.src = markedUrl;
		script.onload = () => resolve();
		script.onerror = () => resolve();
		document.head.appendChild(script);
	});
}

function renderPreview() {
	const marked = (window as unknown as { marked?: { parse: (s: string) => string } })
		.marked;
	if (!marked) {
		previewHtml = "<p class='opacity-60'>预览组件加载失败</p>";
		return;
	}
	const raw = marked.parse(body || "");
	previewHtml = String(raw).replace(/<script[\s\S]*?<\/script>/gi, "");
}

$effect(() => {
	// 正文或视图变化时刷新预览
	body;
	if (view !== "edit") renderPreview();
});

// ---------- 工具栏 ----------
function insertSnippet(before: string, after = "", placeholder = "") {
	if (!textarea) return;
	const start = textarea.selectionStart ?? body.length;
	const end = textarea.selectionEnd ?? start;
	const selected = body.slice(start, end) || placeholder;
	const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
	body = next;
	dirty = true;
	requestAnimationFrame(() => {
		if (!textarea) return;
		textarea.focus();
		const cursor = start + before.length + selected.length;
		textarea.setSelectionRange(cursor, cursor);
	});
}

const toolbar = [
	{ icon: "bold" as const, title: "加粗", before: "**", after: "**", placeholder: "粗体" },
	{ icon: "italic" as const, title: "斜体", before: "*", after: "*", placeholder: "斜体" },
	{ icon: "heading" as const, title: "标题", before: "## ", after: "", placeholder: "标题" },
	{ icon: "quote" as const, title: "引用", before: "> ", after: "", placeholder: "引用" },
	{ icon: "code" as const, title: "代码块", before: "```ts\n", after: "\n```", placeholder: "代码" },
	{ icon: "list" as const, title: "列表", before: "- ", after: "", placeholder: "列表项" },
	{ icon: "link" as const, title: "链接", before: "[", after: "](https://)", placeholder: "链接文字" },
	{ icon: "image" as const, title: "图片", before: "![", after: "](https://)", placeholder: "图片描述" },
];

// ---------- 标签 ----------
function addTag() {
	const value = tagInput.trim();
	if (!value) return;
	if (!tags.includes(value)) tags = [...tags, value];
	tagInput = "";
	dirty = true;
}
function removeTag(tag: string) {
	tags = tags.filter((item) => item !== tag);
	dirty = true;
}

// ---------- 数据加载 ----------
async function loadPosts(): Promise<AdminPostMeta[]> {
	try {
		const response = await fetch(postsUrl);
		if (!response.ok) return [];
		const data = (await response.json()) as AdminPostMeta[];
		posts = Array.isArray(data) ? data : [];
	} catch {
		posts = [];
	}
	return posts;
}

function applyFrontmatter(fm: Record<string, unknown>) {
	title = String(fm.title ?? "");
	slug = String(fm.slug ?? "");
	published = fm.published ? formatDate(String(fm.published)) : published;
	updated = fm.updated ? formatDate(String(fm.updated)) : "";
	description = String(fm.description ?? "");
	image = String(fm.image ?? "");
	tags = Array.isArray(fm.tags) ? (fm.tags as string[]).map(String) : [];
	category = String(fm.category ?? "");
	lang = String(fm.lang ?? "");
	author = String(fm.author ?? author ?? "");
	sourceLink = String(fm.sourceLink ?? "");
	licenseName = String(fm.licenseName ?? "");
	licenseUrl = String(fm.licenseUrl ?? "");
	series = String(fm.series ?? "");
	seriesOrder = fm.seriesOrder === undefined ? "" : String(fm.seriesOrder);
	password = String(fm.password ?? "");
	passwordHint = String(fm.passwordHint ?? "");
	encrypted = password.trim() !== "";
	pinned = fm.pinned === true;
	draft = fm.draft === true;
	comment = fm.comment !== false;
}

/** 载入已有文章：先填元信息，再取正文（GitHub 仓库优先，回落到站内构建副本） */
async function loadExisting(id: string) {
	const list = posts.length ? posts : await loadPosts();
	const post = list.find((item) => item.id === id);
	if (!post) {
		notify(`没有找到文章 ${id}`, "error");
		return;
	}
	editingId = post.id;
	applyFrontmatter({
		title: post.title,
		published: post.published,
		updated: post.updated ?? "",
		description: post.description,
		image: post.image,
		tags: post.tags ?? [],
		category: post.category,
		lang: "",
		author: post.author,
		pinned: post.pinned,
		draft: post.draft,
		series: post.series,
		seriesOrder: post.seriesOrder ?? undefined,
	});
	filename = `${post.id}.md`;

	const target = {
		owner: github.owner,
		repo: github.repo,
		branch: github.branch || "main",
		postsPath: github.postsPath || defaults.postsPath || "src/content/posts",
		token: github.token,
	};

	// 仓库里的才是最新稿，能用就先用
	if (isGitHubReady(target)) {
		busy = true;
		const result = await fetchRepoFile(
			target,
			post.path || `${post.id}.md`,
		);
		busy = false;
		if (result.ok && result.data) {
			const parsed = parsePostMarkdown(result.data.content);
			applyFrontmatter(parsed.frontmatter);
			body = parsed.body.replace(/^\n+/, "");
			dirty = false;
			notify("文章已载入（来自 GitHub 仓库）", "success");
			return;
		}
		notify(`仓库读取失败，改用站内副本：${result.message}`, "error");
	}

	// 加密文章不进静态副本，只能走 GitHub
	if (post.encrypted) {
		notify("这是加密文章，需配置 GitHub 后才能读取正文", "error");
		return;
	}

	busy = true;
	try {
		const safeId = id
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
		const response = await fetch(`${postContentUrl}${safeId}.json`);
		if (!response.ok) {
			notify("站内没有这篇文章的副本，请配置 GitHub 后重试", "error");
			return;
		}
		const data = (await response.json()) as { content?: string };
		body = (data.content ?? "").replace(/^\n+/, "");
		dirty = false;
		notify("文章已载入（来自站内副本）", "success");
	} catch {
		notify("正文读取失败，请检查网络或配置 GitHub", "error");
	} finally {
		busy = false;
	}
}

function loadDraft(id: string) {
	const saved = getDraft(id);
	if (!saved) {
		notify("草稿不存在或已被删除", "error");
		return;
	}
	draftId = saved.id;
	applyFrontmatter(saved.frontmatter ?? {});
	body = saved.body ?? "";
	dirty = false;
	notify("草稿已载入", "success");
}

/** 加密开关：关闭时清空密码，避免 frontmatter 里留下残值 */
function handleEncryptedToggle(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	encrypted = input.checked;
	if (!encrypted) {
		password = "";
		passwordHint = "";
	}
	dirty = true;
}

// ---------- 操作 ----------
function handleSaveDraft() {
	if (!title.trim()) {
		notify("请先填写文章标题", "error");
		return;
	}
	const id = draftId || slug.trim() || slugify(title) || `draft-${Date.now()}`;
	draftId = id;
	saveDraft(
		{
			id,
			title: title.trim(),
			savedAt: Date.now(),
			frontmatter: { ...frontmatter, slug: slug.trim() || undefined },
			body,
		},
		maxLocalDrafts,
	);
	dirty = false;
	notify("草稿已保存到本地", "success");
}

async function handleDownload() {
	if (!title.trim()) {
		notify("请先填写文章标题", "error");
		return;
	}
	downloadTextFile(effectiveFilename, markdown);
	notify(`已下载 ${effectiveFilename}`, "success");
}

async function handleCopy() {
	const ok = await copyText(markdown);
	notify(ok ? "Markdown 已复制" : "复制失败，请手动选择", ok ? "success" : "error");
}

async function handlePublish() {
	if (!title.trim()) {
		notify("请先填写文章标题", "error");
		return;
	}
	const target = {
		owner: github.owner,
		repo: github.repo,
		branch: github.branch || "main",
		postsPath: github.postsPath || defaults.postsPath || "src/content/posts",
		token: github.token,
	};
	if (!isGitHubReady(target)) {
		notify("请先在后台「设置」中配置 GitHub 仓库与 Token", "error");
		return;
	}
	busy = true;
	notify("正在提交到 GitHub…", "success");
	const path = buildPostPath(target.postsPath, effectiveFilename);
	const existing = await fetchRepoFile(target, path);
	const result = await commitRepoFile(
		target,
		path,
		markdown,
		`${existing.ok ? "更新" : "新增"}文章：${title.trim()}`,
		existing.ok ? existing.data?.sha : undefined,
	);
	busy = false;
	if (!result.ok) {
		notify(result.message || "发布失败", "error");
		return;
	}
	dirty = false;
	notify(existing.ok ? "文章已更新，等待站点重新构建" : "文章已提交，等待站点重新构建", "success");
}

function handleLogout() {
	destroySession();
	unlocked = false;
}

onMount(() => {
	mounted = true;
	unlocked = isUnlocked();
	const stored = getGitHubSettings();
	github = {
		owner: stored.owner || githubDefault.owner || "",
		repo: stored.repo || githubDefault.repo || "",
		branch: stored.branch || githubDefault.branch || "main",
		postsPath: stored.postsPath || githubDefault.postsPath || "",
		token: stored.token || "",
	};

	if (!unlocked) return;

	const params = new URLSearchParams(window.location.search);
	const id = params.get("id");
	const draftParam = params.get("draft");
	loadPosts().then(() => {
		if (id) loadExisting(id);
		else if (draftParam) loadDraft(draftParam);
	});
	ensureMarked().then(renderPreview);

	const onBeforeUnload = (event: BeforeUnloadEvent) => {
		if (dirty) {
			event.preventDefault();
			event.returnValue = "";
		}
	};
	window.addEventListener("beforeunload", onBeforeUnload);
	return () => window.removeEventListener("beforeunload", onBeforeUnload);
});
</script>

<div class="admin-shell">
	{#if !mounted}
		<div class="flex flex-col gap-3">
			<div class="admin-skeleton h-12 w-full"></div>
			<div class="admin-skeleton h-96 w-full"></div>
		</div>
	{:else if !unlocked}
		<div class="admin-card admin-card--bordered p-10 text-center">
			<div class="mb-3 flex justify-center text-(--btn-content) opacity-40">
				<AdminIcon name="lock" class="h-12 w-12" />
			</div>
			<h2 class="mb-2 text-lg font-bold">需要登录后才能撰写</h2>
			<p class="mb-5 text-sm text-(--btn-content) opacity-80">
				请先回到后台首页输入管理密码
			</p>
			<a class="admin-btn admin-btn--primary" href={adminUrl} data-no-swup>
				<AdminIcon name="lock" class="h-4 w-4" />
				去登录
			</a>
		</div>
	{:else}
		<!-- 顶部操作栏 -->
		<div class="admin-card admin-card--bordered mb-4 overflow-hidden">
			<div
				class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
			>
				<div class="flex min-w-0 items-center gap-3">
					<a
						class="admin-btn admin-btn--ghost admin-btn--sm"
						href={adminUrl}
						data-no-swup
					>
						<AdminIcon name="close" class="h-3.5 w-3.5" />
						返回
					</a>
					<div class="min-w-0">
						<div class="truncate text-sm font-bold">
							{title.trim() || "未命名文章"}
						</div>
						<div
							class="flex items-center gap-2 text-xs text-(--btn-content) opacity-70"
						>
							<span>{words} 字</span>
							<span>·</span>
							<span class="font-mono">{effectiveFilename}</span>
							{#if dirty}
								<span class="admin-badge admin-badge--draft">未保存</span>
							{/if}
						</div>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<div class="flex overflow-hidden rounded-xl border border-(--line-divider)">
						{#each [{ key: "edit", label: "编辑" }, { key: "split", label: "分屏" }, { key: "preview", label: "预览" }] as mode}
							<button
								class="px-3 py-1.5 text-xs transition-colors {view === mode.key
									? 'bg-(--primary) text-white'
									: 'text-(--btn-content) hover:bg-(--btn-plain-bg-hover)'}"
								onclick={() => (view = mode.key as ViewMode)}
								type="button"
							>
								{mode.label}
							</button>
						{/each}
					</div>
					<button
						class="admin-btn admin-btn--ghost admin-btn--sm"
						onclick={handleSaveDraft}
					>
						<AdminIcon name="save" class="h-3.5 w-3.5" />
						存草稿
					</button>
					<button
						class="admin-btn admin-btn--ghost admin-btn--sm"
						onclick={handleDownload}
					>
						<AdminIcon name="download" class="h-3.5 w-3.5" />
						下载
					</button>
					<button
						class="admin-btn admin-btn--ghost admin-btn--sm"
						onclick={handleCopy}
					>
						<AdminIcon name="copy" class="h-3.5 w-3.5" />
						复制
					</button>
					<button
						class="admin-btn admin-btn--primary admin-btn--sm"
						onclick={handlePublish}
						disabled={busy || !githubReady}
						title={githubReady ? "提交到 GitHub" : "请先在设置中配置 GitHub"}
					>
						{#if busy}
							<AdminIcon name="spinner" class="h-3.5 w-3.5" />
							提交中
						{:else}
							<AdminIcon name="upload" class="h-3.5 w-3.5" />
							发布
						{/if}
					</button>
				</div>
			</div>
		</div>

		{#if !githubReady}
			<div class="admin-alert admin-alert--info mb-4">
				<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
				<span>
					未配置 GitHub 仓库，「发布」按钮暂不可用。可以先「下载」Markdown
					手动提交，或到后台「设置」填写仓库信息后在线发布。
				</span>
			</div>
		{/if}

		<div class="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
			<!-- 侧边：文章信息 -->
			<div class="admin-card admin-card--bordered h-fit p-5">
				<h3 class="mb-4 text-sm font-bold">文章信息</h3>
				<div class="flex flex-col gap-4">
					<div>
						<label class="admin-label" for="post-title">标题 *</label>
						<input
							id="post-title"
							class="admin-input"
							placeholder="给文章起个标题"
							bind:value={title}
							oninput={() => (dirty = true)}
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="admin-label" for="post-published">发布日期</label>
							<input
								id="post-published"
								class="admin-input"
								type="date"
								bind:value={published}
								oninput={() => (dirty = true)}
							/>
						</div>
						<div>
							<label class="admin-label" for="post-updated">更新日期</label>
							<input
								id="post-updated"
								class="admin-input"
								type="date"
								bind:value={updated}
								oninput={() => (dirty = true)}
							/>
						</div>
					</div>
					<div>
						<label class="admin-label" for="post-desc">简介</label>
						<textarea
							id="post-desc"
							class="admin-textarea min-h-20"
							placeholder="一句话介绍这篇文章"
							bind:value={description}
							oninput={() => (dirty = true)}
						></textarea>
					</div>
					<div>
						<label class="admin-label" for="post-category">分类</label>
						<input
							id="post-category"
							class="admin-input"
							placeholder="例如：技术笔记"
							bind:value={category}
							oninput={() => (dirty = true)}
						/>
					</div>
					<div>
						<label class="admin-label" for="post-tags">标签</label>
						<div class="flex flex-wrap gap-1.5">
							{#each tags as tag (tag)}
								<span class="admin-chip">
									{tag}
									<button
										onclick={() => removeTag(tag)}
										aria-label={`移除标签 ${tag}`}
										type="button"
									>
										<AdminIcon name="close" class="h-3 w-3" />
									</button>
								</span>
							{/each}
						</div>
						<input
							id="post-tags"
							class="admin-input mt-2"
							placeholder="输入后回车添加"
							bind:value={tagInput}
							onkeydown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									addTag();
								}
							}}
						/>
					</div>
					<div>
						<label class="admin-label" for="post-image">封面图</label>
						<input
							id="post-image"
							class="admin-input"
							placeholder="图片路径或链接"
							bind:value={image}
							oninput={() => (dirty = true)}
						/>
					</div>
					<div>
						<label class="admin-label" for="post-slug">Slug（文章地址）</label>
						<input
							id="post-slug"
							class="admin-input font-mono"
							placeholder="留空则自动用当前文件名"
							bind:value={slug}
							oninput={() => (dirty = true)}
						/>
					</div>
					<div>
						<label class="admin-label" for="post-filename">文件名</label>
						<input
							id="post-filename"
							class="admin-input font-mono"
							placeholder={generatedFilename}
							bind:value={filename}
							oninput={() => (dirty = true)}
						/>
						<p class="mt-1 text-xs text-(--btn-content) opacity-60">
							发布路径：{(github.postsPath ||
								defaults.postsPath ||
								"src/content/posts")}/{effectiveFilename}
						</p>
					</div>
				</div>

				<details class="mt-5 border-t border-(--line-divider) pt-4">
					<summary
						class="cursor-pointer text-sm font-bold text-(--btn-content)"
					>
						更多选项
					</summary>
					<div class="mt-4 flex flex-col gap-4">
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="admin-label" for="post-series">系列</label>
								<input
									id="post-series"
									class="admin-input"
									bind:value={series}
									oninput={() => (dirty = true)}
								/>
							</div>
							<div>
								<label class="admin-label" for="post-series-order">系列序号</label>
								<input
									id="post-series-order"
									class="admin-input"
									type="number"
									bind:value={seriesOrder}
									oninput={() => (dirty = true)}
								/>
							</div>
						</div>
						<div>
							<label class="admin-label" for="post-author">作者</label>
							<input
								id="post-author"
								class="admin-input"
								bind:value={author}
								oninput={() => (dirty = true)}
							/>
						</div>
						<div>
							<label class="admin-label" for="post-lang">语言</label>
							<input
								id="post-lang"
								class="admin-input"
								placeholder="留空跟随站点"
								bind:value={lang}
								oninput={() => (dirty = true)}
							/>
						</div>
						<div>
							<label class="admin-label" for="post-source">原文链接</label>
							<input
								id="post-source"
								class="admin-input"
								placeholder="转载时填写"
								bind:value={sourceLink}
								oninput={() => (dirty = true)}
							/>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="admin-label" for="post-license">许可名称</label>
								<input
									id="post-license"
									class="admin-input"
									bind:value={licenseName}
									oninput={() => (dirty = true)}
								/>
							</div>
							<div>
								<label class="admin-label" for="post-license-url">许可链接</label>
								<input
									id="post-license-url"
									class="admin-input"
									bind:value={licenseUrl}
									oninput={() => (dirty = true)}
								/>
							</div>
						</div>
					</div>
				</details>

				<div class="mt-5 flex flex-col gap-3 border-t border-(--line-divider) pt-4">
					<label class="admin-switch">
						<input type="checkbox" bind:checked={pinned} />
						<span class="admin-switch-track"></span>
						<span class="text-sm">置顶</span>
					</label>
					<label class="admin-switch">
						<input type="checkbox" bind:checked={draft} />
						<span class="admin-switch-track"></span>
						<span class="text-sm">存为草稿</span>
					</label>
					<label class="admin-switch">
						<input type="checkbox" bind:checked={comment} />
						<span class="admin-switch-track"></span>
						<span class="text-sm">开启评论</span>
					</label>
					<div class="flex flex-col gap-1">
						<label class="admin-switch">
							<input
								type="checkbox"
								checked={encrypted}
								onchange={handleEncryptedToggle}
							/>
							<span class="admin-switch-track"></span>
							<span class="text-sm">加密文章</span>
						</label>
						{#if encrypted}
							<div class="admin-field__nested mt-1 flex flex-col gap-3">
								<div>
									<label class="admin-label" for="post-password"
										>访问密码</label
									>
									<input
										id="post-password"
										class="admin-input"
										placeholder="读者需要输入此密码才能阅读"
										bind:value={password}
										oninput={() => (dirty = true)}
									/>
								</div>
								<div>
									<label class="admin-label" for="post-password-hint"
										>密码提示</label
									>
									<input
										id="post-password-hint"
										class="admin-input"
										placeholder="显示在密码输入框下方，便于读者回忆"
										bind:value={passwordHint}
										oninput={() => (dirty = true)}
									/>
								</div>
								<p class="text-xs text-(--btn-content) opacity-60">
									加密在构建时用 AES 完成，页面源码不含明文。加密文章不会导出站内副本，
									下次编辑需要配置 GitHub 才能读回正文。
								</p>
							</div>
						{/if}
					</div>
					<button
						class="admin-btn admin-btn--ghost admin-btn--sm mt-1"
						onclick={handleLogout}
					>
						<AdminIcon name="logout" class="h-3.5 w-3.5" />
						退出登录
					</button>
				</div>
			</div>

			<!-- 主区：编辑器 -->
			<div class="admin-card admin-card--bordered overflow-hidden">
				{#if view !== "preview"}
					<div
						class="admin-scroll flex gap-1 overflow-x-auto border-b border-(--line-divider) px-3 py-2"
					>
						{#each toolbar as item}
							<button
								class="rounded-lg p-2 text-(--btn-content) transition-colors hover:bg-(--btn-plain-bg-hover)"
								title={item.title}
								onclick={() =>
									insertSnippet(item.before, item.after, item.placeholder)}
								type="button"
							>
								<AdminIcon name={item.icon} class="h-4 w-4" />
							</button>
						{/each}
					</div>
				{/if}

				<div class={view === "split" ? "grid md:grid-cols-2" : ""}>
					{#if view !== "preview"}
						<textarea
							bind:this={textarea}
							class="admin-editor-textarea rounded-none border-0 {view === 'split'
								? 'border-r border-(--line-divider)'
								: ''}"
							placeholder="用 Markdown 写下正文…"
							bind:value={body}
							oninput={() => (dirty = true)}
						></textarea>
					{/if}
					{#if view !== "edit"}
						<div class="admin-preview admin-scroll rounded-none border-0">
							{#if body.trim()}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html previewHtml}
							{:else}
								<p class="text-(--btn-content) opacity-60">还没有内容</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- 轻提示 -->
{#if notice}
	<div class="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
		<div
			class="admin-card admin-card--bordered flex items-center gap-2 px-4 py-2.5 text-sm shadow-lg"
		>
			<AdminIcon
				name={notice.type === "success" ? "check" : "alert"}
				class="h-4 w-4 {notice.type === 'success'
					? 'text-green-600'
					: 'text-red-600'}"
			/>
			{notice.message}
		</div>
	</div>
{/if}
