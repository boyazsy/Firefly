<script lang="ts">
/**
 * 设置中心 - 左侧导航 + 右侧编辑器
 *
 * 主题配置都是构建期的 TS 文件，这里改完不会直接生效：
 * 需要「生成配置代码」后下载/复制，或提交到 GitHub 触发重新构建。
 */
	import type { AdminSettingsSnapshot, SettingsUnitMeta } from "@/types/adminSettings";
	import type { GitHubSettings } from "@/utils/admin-drafts";
	import {
		deepClone,
		fetchSnapshot,
		isDirty,
		type EditableUnit,
	} from "@/utils/admin-settings-store";
	import { SETTINGS_GROUPS } from "@/utils/admin-settings-units";
	import { onMount } from "svelte";

	import AdminArrayEditor from "./AdminArrayEditor.svelte";
	import AdminExportPanel from "./AdminExportPanel.svelte";
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";
	import SettingsDisplay from "./SettingsDisplay.svelte";
	import SettingsNavbar from "./SettingsNavbar.svelte";
	import SettingsProfile from "./SettingsProfile.svelte";
	import SettingsSidebar from "./SettingsSidebar.svelte";
	import SettingsSiteAdvanced from "./SettingsSiteAdvanced.svelte";
	import SettingsSiteBasic from "./SettingsSiteBasic.svelte";
	import SettingsWallpaper from "./SettingsWallpaper.svelte";
	import SettingsGallery from "./SettingsGallery.svelte";
	import SettingsWidgets from "./SettingsWidgets.svelte";

	interface Props {
		settingsUrl: string;
		settings: GitHubSettings;
		sessionRemainText: string;
		onSave: (next: GitHubSettings) => void;
		onLogout: () => void;
		onNotify: (message: string, type?: "success" | "error") => void;
	}

	let {
		settingsUrl,
		settings = $bindable(),
		sessionRemainText,
		onSave,
		onLogout,
		onNotify,
	}: Props = $props();

	let snapshot = $state<AdminSettingsSnapshot | null>(null);
	let units = $state<EditableUnit[]>([]);
	let loading = $state(true);
	let loadError = $state("");
	let activeId = $state("site-basic");
	let showExport = $state(false);
	let keyword = $state("");

	const activeIndex = $derived(units.findIndex((item) => item.meta.id === activeId));
	const activeUnit = $derived(activeIndex >= 0 ? units[activeIndex] : null);

	const dirtyUnits = $derived(
		units.filter((item) => isDirty(item.value, item.original)),
	);

	const filteredGroups = $derived(
		SETTINGS_GROUPS.map((group) => ({
			...group,
			units: units.filter(
				(item) =>
					item.meta.group === group.id &&
					(!keyword ||
						item.meta.label.includes(keyword) ||
						item.meta.description.includes(keyword)),
			),
		})).filter((group) => group.units.length > 0),
	);

	onMount(async () => {
		try {
			snapshot = await fetchSnapshot(settingsUrl);
			units = snapshot.units.map((unit) => ({
				meta: unit as SettingsUnitMeta,
				value: deepClone(unit.value),
				original: deepClone(unit.value),
			}));
		} catch (error) {
			loadError = error instanceof Error ? error.message : "配置加载失败";
		} finally {
			loading = false;
		}
	});

	function resetActive() {
		if (!activeUnit) return;
		activeUnit.value = deepClone(activeUnit.original);
		units = [...units];
		onNotify("已恢复为当前生效的配置");
	}

	function resetAll() {
		for (const unit of units) {
			unit.value = deepClone(unit.original);
		}
		units = [...units];
		onNotify("已放弃全部改动");
	}

	function saveGitHub() {
		onSave(settings);
	}
</script>

<div class="admin-settings">
	{#if loading}
		<div class="admin-card admin-card--bordered p-6">
			<div class="admin-skeleton h-8 w-48"></div>
			<div class="admin-skeleton mt-3 h-64 w-full"></div>
		</div>
	{:else if loadError}
		<div class="admin-alert admin-alert--error">
			<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
			<span>{loadError}</span>
		</div>
	{:else if snapshot}
		<!-- 顶部工具条 -->
		<div class="admin-card admin-card--bordered mb-4 p-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<input
						class="admin-input admin-input--search"
						type="search"
						placeholder="搜索设置项…"
						bind:value={keyword}
					/>
					{#if dirtyUnits.length > 0}
						<span class="admin-badge admin-badge--draft">
							{dirtyUnits.length} 项未导出
						</span>
					{/if}
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="admin-btn admin-btn--ghost admin-btn--sm"
						disabled={dirtyUnits.length === 0}
						onclick={resetAll}
					>
						<AdminIcon name="refresh" class="h-3.5 w-3.5" />
						放弃改动
					</button>
					<button
						type="button"
						class="admin-btn admin-btn--primary admin-btn--sm"
						disabled={dirtyUnits.length === 0}
						onclick={() => (showExport = true)}
					>
						<AdminIcon name="download" class="h-3.5 w-3.5" />
						生成配置代码
					</button>
				</div>
			</div>
		</div>

		<div class="admin-settings__body">
			<!-- 左侧导航 -->
			<nav class="admin-card admin-card--bordered admin-settings__nav" aria-label="设置分类">
				{#each filteredGroups as group (group.id)}
					<div class="admin-settings__group">
						<div class="admin-settings__group-title">{group.label}</div>
						{#each group.units as unit (unit.meta.id)}
							<button
								type="button"
								class="admin-settings__link"
								class:is-active={unit.meta.id === activeId}
								onclick={() => (activeId = unit.meta.id)}
							>
								<AdminIcon name={unit.meta.icon} class="h-4 w-4 flex-none" />
								<span class="truncate">{unit.meta.label}</span>
								{#if isDirty(unit.value, unit.original)}
									<span class="admin-settings__dot" title="有未导出的改动"></span>
								{/if}
							</button>
						{/each}
					</div>
				{/each}

				<div class="admin-settings__group">
					<div class="admin-settings__group-title">发布</div>
					<button
						type="button"
						class="admin-settings__link"
						class:is-active={activeId === "__github"}
						onclick={() => (activeId = "__github")}
					>
						<AdminIcon name="github" class="h-4 w-4 flex-none" />
						<span class="truncate">GitHub 发布</span>
					</button>
				</div>
			</nav>

			<!-- 右侧编辑区 -->
			<div class="admin-settings__content">
				{#if activeId === "__github"}
					<div class="admin-card admin-card--bordered p-4">
						<div class="admin-section__title">
							<AdminIcon name="github" class="h-4 w-4" />
							GitHub 发布
						</div>
						<span class="admin-field__hint">
							填写后可在「生成配置代码」里直接把配置文件提交到仓库，
							配合 Cloudflare Pages / GitHub Pages 的自动构建实现在线发布。
							令牌只保存在你自己的浏览器里，不会写进任何配置文件。
						</span>
						<div class="admin-grid-2">
							<label class="admin-field__stack">
								<span class="admin-field__label">用户名 / 组织</span>
								<input
									class="admin-input"
									type="text"
									bind:value={settings.owner}
								/>
							</label>
							<label class="admin-field__stack">
								<span class="admin-field__label">仓库名</span>
								<input class="admin-input" type="text" bind:value={settings.repo} />
							</label>
							<label class="admin-field__stack">
								<span class="admin-field__label">分支</span>
								<input class="admin-input" type="text" bind:value={settings.branch} />
							</label>
							<label class="admin-field__stack">
								<span class="admin-field__label">文章目录</span>
								<input
									class="admin-input"
									type="text"
									placeholder="src/content/posts"
									bind:value={settings.postsPath}
								/>
							</label>
						</div>
						<label class="admin-field__stack">
							<span class="admin-field__label">访问令牌</span>
							<input
								class="admin-input"
								type="password"
								placeholder="ghp_..."
								bind:value={settings.token}
							/>
							<span class="admin-field__hint">
								需要仓库的 Contents 写权限。在 GitHub → Settings → Developer
								settings → Personal access tokens 生成。
							</span>
						</label>
						<div class="admin-field__row">
							<button
								type="button"
								class="admin-btn admin-btn--primary admin-btn--sm"
								onclick={saveGitHub}
							>
								<AdminIcon name="save" class="h-3.5 w-3.5" />
								保存发布配置
							</button>
						</div>
					</div>

					<div class="admin-card admin-card--bordered p-4">
						<div class="admin-section__title">
							<AdminIcon name="logout" class="h-4 w-4" />
							会话
						</div>
						<span class="admin-field__hint">
							登录状态剩余 {sessionRemainText}
						</span>
						<button
							type="button"
							class="admin-btn admin-btn--ghost admin-btn--sm"
							onclick={onLogout}
						>
							<AdminIcon name="logout" class="h-3.5 w-3.5" />
							退出登录
						</button>
					</div>
				{:else if activeUnit}
					<div class="admin-card admin-card--bordered mb-3 p-4">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="text-base font-bold">{activeUnit.meta.label}</div>
								<div class="mt-0.5 text-xs text-(--btn-content) opacity-70">
									{activeUnit.meta.description}
								</div>
								<div class="mt-1 text-xs text-(--btn-content) opacity-50">
									对应 {activeUnit.meta.file} 的 {activeUnit.meta.varName}
								</div>
							</div>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								disabled={!isDirty(activeUnit.value, activeUnit.original)}
								onclick={resetActive}
							>
								<AdminIcon name="refresh" class="h-3.5 w-3.5" />
								还原
							</button>
						</div>
					</div>

					{#if activeUnit.meta.editor === "siteBasic"}
						<SettingsSiteBasic bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "siteAdvanced"}
						<SettingsSiteAdvanced bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "displaySettings"}
						<SettingsDisplay bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "profile"}
						<SettingsProfile bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "wallpaper"}
						<SettingsWallpaper bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "navbar"}
						<SettingsNavbar bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "sidebar"}
						<SettingsSidebar bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "widgets"}
						<SettingsWidgets bind:value={units[activeIndex].value} />
					{:else if activeUnit.meta.editor === "gallery"}
						<SettingsGallery
							bind:value={units[activeIndex].value}
							{settings}
						/>
					{:else if activeUnit.meta.kind === "list"}
						<AdminArrayEditor
							bind:value={units[activeIndex].value}
							itemLabel={activeUnit.meta.label}
						/>
					{:else}
						<div class="admin-card admin-card--bordered p-4">
							<AdminFormFields bind:value={units[activeIndex].value} />
						</div>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if showExport && snapshot}
	<AdminExportPanel
		{snapshot}
		{units}
		{settings}
		onClose={() => (showExport = false)}
		onNotify={(message: string, type?: "success" | "error") =>
			onNotify(message, type)}
		onApplied={() => {
			for (const unit of units) unit.original = deepClone(unit.value);
			units = [...units];
		}}
	/>
{/if}
