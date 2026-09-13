<script lang="ts">
/**
 * 后台主面板 - 登录态管理 + 分区导航（概览 / 文章 / 草稿 / 设置）
 */
import { onMount } from "svelte";
import type {
	AdminDefaultsConfig,
	AdminDraft,
	AdminGitHubConfig,
	AdminPostMeta,
} from "@/types/adminConfig";
import {
	destroySession,
	formatDuration,
	getSessionRemainMs,
	isUnlocked,
} from "@/utils/admin-auth";
import {
	deleteDraft,
	getGitHubSettings,
	listDrafts,
	type GitHubSettings,
	saveGitHubSettings,
} from "@/utils/admin-drafts";
import AdminDrafts from "./AdminDrafts.svelte";
import AdminGallery from "./AdminGallery.svelte";
import AdminIcon from "./AdminIcon.svelte";
	import AdminLogin from "./AdminLogin.svelte";
	import AdminOverview from "./AdminOverview.svelte";
	import AdminPostList from "./AdminPostList.svelte";
	import AdminSettingsHub from "./AdminSettingsHub.svelte";

interface Props {
	postsUrl: string;
	/** 配置快照地址，设置中心依赖它读取当前配置 */
	settingsUrl: string;
	editorUrl: string;
	defaults: AdminDefaultsConfig;
	githubDefault: AdminGitHubConfig;
	maxLocalDrafts: number;
}

const {
	postsUrl,
	settingsUrl,
	editorUrl,
	defaults,
	githubDefault,
	maxLocalDrafts,
}: Props = $props();

type TabKey = "overview" | "posts" | "drafts" | "gallery" | "settings";

const tabs: {
	key: TabKey;
	label: string;
	icon: "dashboard" | "post" | "save" | "image" | "settings";
}[] = [
	{ key: "overview", label: "概览", icon: "dashboard" },
	{ key: "posts", label: "文章", icon: "post" },
	{ key: "drafts", label: "草稿", icon: "save" },
	{ key: "gallery", label: "相册", icon: "image" },
	{ key: "settings", label: "设置", icon: "settings" },
];

let mounted = $state(false);
let unlocked = $state(false);
let tab = $state<TabKey>("overview");
let posts = $state<AdminPostMeta[]>([]);
let loadingPosts = $state(true);
let loadError = $state("");
let drafts = $state<AdminDraft[]>([]);
let github = $state<GitHubSettings>({
	owner: "",
	repo: "",
	branch: "main",
	postsPath: "",
	token: "",
});
let toast = $state<{ message: string; type: "success" | "error" } | null>(null);
let sessionRemainText = $state("—");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const githubReady = $derived(
	Boolean(github.owner && github.repo && github.token),
);

const githubTarget = $derived(
	githubReady
		? {
				owner: github.owner,
				repo: github.repo,
				branch: github.branch || "main",
				postsPath: github.postsPath || defaults.postsPath || "src/content/posts",
				token: github.token,
			}
		: null,
);

function notify(message: string, type: "success" | "error" = "success") {
	toast = { message, type };
	if (toastTimer) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => (toast = null), 3200);
}

function refreshSessionText() {
	if (!isUnlocked()) {
		sessionRemainText = "已过期";
		unlocked = false;
		return;
	}
	sessionRemainText = formatDuration(getSessionRemainMs());
}

async function loadPosts() {
	loadingPosts = true;
	loadError = "";
	try {
		const response = await fetch(postsUrl);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = (await response.json()) as AdminPostMeta[];
		posts = Array.isArray(data) ? data : [];
	} catch {
		loadError = "文章数据加载失败，请稍后重试";
	} finally {
		loadingPosts = false;
	}
}

function refreshDrafts() {
	drafts = listDrafts();
}

function handleLogout() {
	destroySession();
	unlocked = false;
	tab = "overview";
	notify("已退出登录", "success");
}

function handleSaveGitHub(next: GitHubSettings) {
	github = next;
	saveGitHubSettings(next);
	notify("GitHub 配置已保存", "success");
}

onMount(() => {
	mounted = true;
	unlocked = isUnlocked();
	github = {
		...getGitHubSettings(),
		owner: getGitHubSettings().owner || githubDefault.owner || "",
		repo: getGitHubSettings().repo || githubDefault.repo || "",
		branch: getGitHubSettings().branch || githubDefault.branch || "main",
		postsPath:
			getGitHubSettings().postsPath ||
			githubDefault.postsPath ||
			defaults.postsPath ||
			"",
	};
	if (unlocked) {
		loadPosts();
		refreshDrafts();
		refreshSessionText();
	}
	const timer = setInterval(refreshSessionText, 60000);
	return () => clearInterval(timer);
});
</script>

<div class="admin-shell relative">
	{#if !mounted}
		<!-- SSR 阶段先渲染占位，避免 hydration 不匹配 -->
		<div class="flex flex-col gap-3">
			<div class="admin-skeleton h-12 w-full"></div>
			<div class="admin-skeleton h-64 w-full"></div>
		</div>
	{:else if !unlocked}
		<AdminLogin
			onSuccess={() => {
				unlocked = true;
				loadPosts();
				refreshDrafts();
				refreshSessionText();
				notify("欢迎回来", "success");
			}}
		/>
	{:else}
		<!-- 顶部栏 -->
		<div class="admin-card admin-card--bordered mb-4 overflow-hidden">
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-b border-(--line-divider) px-5 py-3"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-(--primary) text-white"
					>
						<AdminIcon name="dashboard" class="h-5 w-5" />
					</div>
					<div>
						<div class="text-sm font-bold leading-tight">管理后台</div>
						<div class="text-xs text-(--btn-content) opacity-70">
							登录有效期剩余 {sessionRemainText}
						</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<a class="admin-btn admin-btn--primary" href={editorUrl} data-no-swup>
						<AdminIcon name="plus" class="h-4 w-4" />
						写文章
					</a>
					<button class="admin-btn admin-btn--ghost" onclick={handleLogout}>
						<AdminIcon name="logout" class="h-4 w-4" />
						退出
					</button>
				</div>
			</div>

			<!-- 分区导航 -->
			<div class="admin-scroll flex gap-1 overflow-x-auto px-3 py-2">
				{#each tabs as item}
					<button
						class="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors {tab ===
						item.key
							? 'bg-(--primary) text-white'
							: 'text-(--btn-content) hover:bg-(--btn-plain-bg-hover)'}"
						onclick={() => (tab = item.key)}
						type="button"
					>
						<AdminIcon name={item.icon} class="h-4 w-4" />
						{item.label}
					</button>
				{/each}
			</div>
		</div>

		{#if loadError}
			<div class="admin-alert admin-alert--error mb-4">
				<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
				<span>{loadError}</span>
			</div>
		{/if}

		{#if tab === "overview"}
			<AdminOverview {posts} {editorUrl} {githubReady} />
		{:else if tab === "posts"}
			<AdminPostList
				{posts}
				{editorUrl}
				github={githubTarget}
				loading={loadingPosts}
				onNotify={notify}
			/>
		{:else if tab === "drafts"}
			<AdminDrafts
				{drafts}
				{editorUrl}
				onDelete={(id) => {
					drafts = deleteDraft(id);
					notify("草稿已删除", "success");
				}}
			/>
		{:else if tab === "gallery"}
			<AdminGallery {settingsUrl} github={githubTarget} onNotify={notify} />
		{:else}
			<AdminSettingsHub
				{settingsUrl}
				bind:settings={github}
				{sessionRemainText}
				onSave={handleSaveGitHub}
				onLogout={handleLogout}
				onNotify={notify}
			/>
		{/if}
	{/if}
</div>

<!-- 轻提示 -->
{#if toast}
	<div
		class="pointer-events-none fixed bottom-6 left-1/2 z-[70] -translate-x-1/2"
	>
		<div
			class="admin-card admin-card--bordered flex items-center gap-2 px-4 py-2.5 text-sm shadow-lg"
		>
			<AdminIcon
				name={toast.type === "success" ? "check" : "alert"}
				class="h-4 w-4 {toast.type === 'success'
					? 'text-green-600'
					: 'text-red-600'}"
			/>
			{toast.message}
		</div>
	</div>
{/if}
