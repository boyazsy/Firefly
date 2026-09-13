<script lang="ts">
/**
 * 配置导出面板
 *
 * 把设置面板里的改动还原成 TypeScript 源码，支持：
 * - 预览生成结果
 * - 复制 / 下载单个文件
 * - 下载全部改动文件
 * - 提交到 GitHub 触发自动构建
 */
	import type { AdminSettingsSnapshot } from "@/types/adminSettings";
	import type { GitHubSettings } from "@/utils/admin-drafts";
	import { commitRepoFile, fetchRepoFile } from "@/utils/admin-github";
	import { downloadText } from "@/utils/admin-config-codegen";
	import {
		buildFileSource,
		isDirty,
		listConfigFiles,
		type EditableUnit,
	} from "@/utils/admin-settings-store";
	import { onMount } from "svelte";

	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		snapshot: AdminSettingsSnapshot;
		units: EditableUnit[];
		settings: GitHubSettings;
		onClose: () => void;
		onNotify: (message: string, type?: "success" | "error") => void;
		onApplied: () => void;
	}

	let { snapshot, units, settings, onClose, onNotify, onApplied }: Props =
		$props();

	interface Generated {
		key: string;
		file: string;
		varName: string;
		fileName: string;
		code: string;
	}

	let generated = $state<Generated[]>([]);
	let activeKey = $state("");
	let copying = $state(false);
	let submitting = $state(false);
	let submitLog = $state<string[]>([]);

	const active = $derived(generated.find((item) => item.key === activeKey) ?? null);

	function changedFiles() {
		// 只处理包含改动单元的文件
		const dirtyUnitIds = new Set(
			units.filter((u) => isDirty(u.value, u.original)).map((u) => u.meta.id),
		);
		return listConfigFiles(snapshot.units)
			.map(({ file, varName }) => ({
				file,
				varName,
				units: units.filter(
					(u) => u.meta.file === file && u.meta.varName === varName,
				),
			}))
			.filter((group) => group.units.some((u) => dirtyUnitIds.has(u.meta.id)));
	}

	onMount(() => {
		generated = changedFiles().map(({ file, varName, units: group }) => {
			const { code, fileName } = buildFileSource(snapshot, varName, file, group);
			return { key: `${file}#${varName}`, file, varName, fileName, code };
		});
		activeKey = generated[0]?.key ?? "";
	});

	async function copyActive() {
		if (!active) return;
		copying = true;
		try {
			await navigator.clipboard.writeText(active.code);
			onNotify("已复制到剪贴板");
		} catch {
			onNotify("复制失败，请手动选择文本复制", "error");
		} finally {
			copying = false;
		}
	}

	function downloadActive() {
		if (!active) return;
		downloadText(active.fileName, active.code);
		onNotify(`已下载 ${active.fileName}`);
	}

	function downloadAll() {
		generated.forEach((item, index) => {
			setTimeout(() => downloadText(item.fileName, item.code), index * 300);
		});
		onNotify(`开始下载 ${generated.length} 个文件`);
	}

	async function submitToGitHub() {
		if (submitting) return;
		submitting = true;
		submitLog = [];

		const target = {
			owner: settings.owner,
			repo: settings.repo,
			branch: settings.branch || "main",
			postsPath: settings.postsPath || "src/content/posts",
			token: settings.token,
		};

		for (const item of generated) {
			try {
				// 已存在的文件需要先拿到 sha 才能更新
				const existing = await fetchRepoFile(target, item.file);
				const sha = existing.ok ? existing.data?.sha : undefined;
				const result = await commitRepoFile(
					target,
					item.file,
					item.code,
					`chore(config): 通过后台更新 ${item.varName}`,
					sha,
				);
				submitLog = [
					...submitLog,
					`${result.ok ? "✓" : "✗"} ${item.file}：${result.message}`,
				];
			} catch (error) {
				submitLog = [
					...submitLog,
					`✗ ${item.file}：${error instanceof Error ? error.message : "提交失败"}`,
				];
			}
		}

		const allOk = submitLog.every((line) => line.startsWith("✓"));
		if (allOk) {
			onNotify("已提交到 GitHub，等待平台自动构建");
			onApplied();
		} else {
			onNotify("部分文件提交失败，请查看日志", "error");
		}
		submitting = false;
	}
</script>

<!-- 抽屉遮罩 -->
<div
	class="admin-drawer__mask"
	role="button"
	tabindex="-1"
	aria-label="关闭导出面板"
	onclick={onClose}
	onkeydown={(event) => event.key === "Escape" && onClose()}
></div>

<aside class="admin-drawer" aria-label="配置导出">
	<header class="admin-drawer__head">
		<div>
			<div class="text-base font-bold">生成配置代码</div>
			<div class="text-xs text-(--btn-content) opacity-70">
				{generated.length} 个配置文件需要更新
			</div>
		</div>
		<button
			type="button"
			class="admin-btn admin-btn--ghost admin-btn--sm"
			aria-label="关闭"
			onclick={onClose}
		>
			<AdminIcon name="close" class="h-4 w-4" />
		</button>
	</header>

	<div class="admin-drawer__body">
		<div class="admin-alert admin-alert--info">
			<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
			<span>
				已配置 GitHub 的话，直接点下方「提交到 GitHub 触发构建」，改动会提交到仓库并自动重新构建，无需手动覆盖文件。
				生成的代码会保留原文件的 import、其它导出与文件级注释。
			</span>
		</div>

		{#if generated.length === 0}
			<span class="admin-field__hint">当前没有需要导出的改动。</span>
		{:else}
			<!-- 文件切换 -->
			<div class="admin-scroll flex gap-1 overflow-x-auto py-1">
				{#each generated as item (item.key)}
					<button
						type="button"
						class="admin-chip"
						class:is-active={item.key === activeKey}
						onclick={() => (activeKey = item.key)}
					>
						{item.fileName}
					</button>
				{/each}
			</div>

			{#if active}
				<div class="admin-field__hint">{active.file}</div>
				<pre class="admin-code">{active.code}</pre>

				<!-- 操作按钮：紧靠代码块下方 -->
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="admin-btn admin-btn--ghost admin-btn--sm"
						disabled={!active || copying}
						onclick={copyActive}
					>
						<AdminIcon name="copy" class="h-3.5 w-3.5" />
						复制
					</button>
					<button
						type="button"
						class="admin-btn admin-btn--regular admin-btn--sm"
						disabled={!active}
						onclick={downloadActive}
					>
						<AdminIcon name="download" class="h-3.5 w-3.5" />
						下载此文件
					</button>
					<button
						type="button"
						class="admin-btn admin-btn--regular admin-btn--sm"
						disabled={generated.length === 0}
						onclick={downloadAll}
					>
						<AdminIcon name="download" class="h-3.5 w-3.5" />
						下载全部
					</button>
					<button
						type="button"
						class="admin-btn admin-btn--primary admin-btn--sm"
						disabled={generated.length === 0 || submitting || !settings.token}
						onclick={submitToGitHub}
					>
						<AdminIcon name="github" class="h-3.5 w-3.5" />
						{submitting ? "提交中…" : "提交到 GitHub 触发构建"}
					</button>
				</div>
				{#if !settings.token}
					<span class="admin-field__hint">
						未填写 GitHub 访问令牌，请先在「GitHub 发布」里配置
					</span>
				{/if}
			{/if}

			{#if submitLog.length > 0}
				<div class="admin-alert admin-alert--info">
					<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
					<div class="flex flex-col gap-1">
						{#each submitLog as line (line)}
							<span>{line}</span>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</aside>
