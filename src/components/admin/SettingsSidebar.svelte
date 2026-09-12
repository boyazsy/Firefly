<script lang="ts">
/**
 * 侧边栏布局设置
 */
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const POSITIONS = [
		{ id: "left", label: "仅左侧", desc: "1280px 以下自动收起" },
		{ id: "right", label: "仅右侧", desc: "1280px 以下自动收起" },
		{ id: "both", label: "双侧栏", desc: "1280px 以上同时显示" },
	] as const;

	function patch(key: string, next: unknown) {
		value = { ...value, [key]: next };
	}

	const position = $derived(String(value?.position ?? "both"));
</script>

<div class="admin-stack">
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="layout" class="h-4 w-4" />
			侧边栏位置
		</div>

		<label class="admin-field__inline">
			<span class="admin-field__label">启用侧边栏</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={value?.enable !== false}
				aria-label="启用侧边栏"
				onclick={() => patch("enable", value?.enable === false)}
			>
				<span class="admin-switch-track" class:is-on={value?.enable !== false}
				></span>
			</button>
		</label>

		<div class="admin-mode-grid">
			{#each POSITIONS as item (item.id)}
				<button
					type="button"
					class="admin-mode-card"
					class:is-active={position === item.id}
					onclick={() => patch("position", item.id)}
				>
					<AdminIcon name="layout" class="h-5 w-5" />
					<span class="admin-mode-card__label">{item.label}</span>
					<span class="admin-mode-card__desc">{item.desc}</span>
				</button>
			{/each}
		</div>

		{#if position === "both"}
			<label class="admin-field__stack">
				<span class="admin-field__label">平板端（769-1279px）显示哪一侧</span>
				<select
					class="admin-select"
					value={String(value?.tabletSidebar ?? "left")}
					onchange={(event) => patch("tabletSidebar", event.currentTarget.value)}
				>
					<option value="left">左侧</option>
					<option value="right">右侧</option>
				</select>
			</label>
		{/if}
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="sliders" class="h-4 w-4" />
			文章页规则
		</div>

		<label class="admin-field__inline">
			<span class="admin-field__label">文章详情页隐藏侧边栏</span>
			<span class="admin-field__hint">
				开启后侧边栏只在首页等非文章页显示
			</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={value?.hideSidebarOnPostPage === true}
				aria-label="文章详情页隐藏侧边栏"
				onclick={() =>
					patch("hideSidebarOnPostPage", value?.hideSidebarOnPostPage !== true)}
			>
				<span
					class="admin-switch-track"
					class:is-on={value?.hideSidebarOnPostPage === true}
				></span>
			</button>
		</label>

		<label class="admin-field__inline">
			<span class="admin-field__label">文章详情页保持双侧栏</span>
			<span class="admin-field__hint">
				单侧栏模式下，在文章页额外显示对侧栏（需先关闭上一项）
			</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={value?.showBothSidebarsOnPostPage === true}
				aria-label="文章详情页保持双侧栏"
				onclick={() =>
					patch(
						"showBothSidebarsOnPostPage",
						value?.showBothSidebarsOnPostPage !== true,
					)}
			>
				<span
					class="admin-switch-track"
					class:is-on={value?.showBothSidebarsOnPostPage === true}
				></span>
			</button>
		</label>
	</div>
</div>
