<script lang="ts">
/**
 * 侧边栏小组件 - 左栏 / 右栏 / 移动端底部三处组件的启用、排序与参数
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const WIDGET_TYPES = [
		{ id: "profile", label: "用户资料", icon: "user" },
		{ id: "announcement", label: "站点公告", icon: "alert" },
		{ id: "categories", label: "分类", icon: "folder" },
		{ id: "tags", label: "标签", icon: "tag" },
		{ id: "music", label: "音乐播放器", icon: "music" },
		{ id: "dynamic", label: "最新动态", icon: "post" },
		{ id: "stats", label: "站点统计", icon: "chart" },
		{ id: "siteInfo", label: "站点信息", icon: "dashboard" },
		{ id: "calendar", label: "日历", icon: "calendar" },
		{ id: "sidebarToc", label: "文章目录", icon: "list" },
		{ id: "advertisement", label: "广告栏", icon: "image" },
	] as const;

	const AREAS = [
		{
			key: "leftComponents",
			label: "左侧边栏",
			desc: "桌面端左侧，可设置 top / sticky",
			supportsPosition: true,
		},
		{
			key: "rightComponents",
			label: "右侧边栏",
			desc: "桌面端右侧，可设置 top / sticky",
			supportsPosition: true,
		},
		{
			key: "mobileBottomComponents",
			label: "移动端底部",
			desc: "仅窄屏（<768px）显示在页面底部",
			supportsPosition: false,
		},
	] as const;

	let expanded = $state<Record<string, boolean>>({});

	function listOf(key: string): Record<string, unknown>[] {
		const raw = value?.[key];
		return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
	}

	function commit(key: string, next: Record<string, unknown>[]) {
		value = { ...value, [key]: next };
	}

	function patchItem(
		key: string,
		index: number,
		patch: Record<string, unknown>,
	) {
		commit(
			key,
			listOf(key).map((item, i) => (i === index ? { ...item, ...patch } : item)),
		);
	}

	function addItem(key: string, type: string, supportsPosition: boolean) {
		const item: Record<string, unknown> = {
			type,
			enable: true,
			showOnPostPage: true,
		};
		if (supportsPosition) item.position = "sticky";
		commit(key, [...listOf(key), item]);
	}

	function removeItem(key: string, index: number) {
		commit(
			key,
			listOf(key).filter((_, i) => i !== index),
		);
	}

	function moveItem(key: string, index: number, delta: number) {
		const list = [...listOf(key)];
		const target = index + delta;
		if (target < 0 || target >= list.length) return;
		[list[index], list[target]] = [list[target], list[index]];
		commit(key, list);
	}

	function labelOf(type: unknown): string {
		return WIDGET_TYPES.find((item) => item.id === type)?.label ?? String(type ?? "");
	}
</script>

<div class="admin-stack">
	<span class="admin-field__hint">
		组件按列表顺序渲染（top 位置的组件会排在 sticky 位置之前）。
		同一个组件可以在不同位置出现多次，例如两个广告栏。
	</span>

	{#each AREAS as area (area.key)}
		{@const list = listOf(area.key)}
		<div class="admin-card admin-card--bordered p-4">
			<div class="admin-section__title">
				<AdminIcon name="grid" class="h-4 w-4" />
				{area.label}
				<span class="admin-field__count">{list.length} 个组件</span>
			</div>
			<span class="admin-field__hint">{area.desc}</span>

			<div class="admin-list">
				{#each list as item, index (index)}
					<div class="admin-card admin-card--bordered admin-list__item">
						<div class="admin-list__bar">
							<span class="admin-list__index">#{index + 1}</span>
							<span class="admin-list__name">{labelOf(item.type)}</span>
							{#if item.enable === false}
								<span class="admin-badge admin-badge--neutral">已停用</span>
							{/if}
							<div class="admin-list__actions">
								<button
									type="button"
									class="admin-btn admin-btn--ghost admin-btn--sm"
									aria-label="上移"
									disabled={index === 0}
									onclick={() => moveItem(area.key, index, -1)}
								>
									<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									class="admin-btn admin-btn--ghost admin-btn--sm"
									aria-label="下移"
									disabled={index === list.length - 1}
									onclick={() => moveItem(area.key, index, 1)}
								>
									<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									class="admin-btn admin-btn--danger admin-btn--sm"
									aria-label="删除"
									onclick={() => removeItem(area.key, index)}
								>
									<AdminIcon name="trash" class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>

						<div class="admin-field__row">
							<label class="admin-field__stack admin-field__stack--grow">
								<span class="admin-field__label">组件类型</span>
								<select
									class="admin-select"
									value={String(item.type ?? "")}
									onchange={(event) =>
										patchItem(area.key, index, { type: event.currentTarget.value })}
								>
									{#each WIDGET_TYPES as widget (widget.id)}
										<option value={widget.id}>{widget.label}</option>
									{/each}
								</select>
							</label>

							{#if area.supportsPosition}
								<label class="admin-field__stack admin-field__stack--grow">
									<span class="admin-field__label">位置</span>
									<select
										class="admin-select"
										value={String(item.position ?? "sticky")}
										onchange={(event) =>
											patchItem(area.key, index, {
												position: event.currentTarget.value,
											})}
									>
										<option value="top">top（固定顶部）</option>
										<option value="sticky">sticky（粘性跟随）</option>
									</select>
								</label>
							{/if}
						</div>

						<div class="admin-field__row admin-field__row--wrap">
							<label class="admin-field__inline">
								<span class="admin-field__label">启用</span>
								<button
									type="button"
									class="admin-switch"
									role="switch"
									aria-checked={item.enable !== false}
									aria-label="启用组件"
									onclick={() =>
										patchItem(area.key, index, { enable: item.enable === false })}
								>
									<span
										class="admin-switch-track"
										class:is-on={item.enable !== false}
									></span>
								</button>
							</label>

							<label class="admin-field__inline">
								<span class="admin-field__label">文章页显示</span>
								<button
									type="button"
									class="admin-switch"
									role="switch"
									aria-checked={item.showOnPostPage !== false}
									aria-label="文章页显示"
									onclick={() =>
										patchItem(area.key, index, {
											showOnPostPage: item.showOnPostPage === false,
										})}
								>
									<span
										class="admin-switch-track"
										class:is-on={item.showOnPostPage !== false}
									></span>
								</button>
							</label>

							<label class="admin-field__inline">
								<span class="admin-field__label">仅文章页</span>
								<button
									type="button"
									class="admin-switch"
									role="switch"
									aria-checked={item.hideOnNonPostPage === true}
									aria-label="仅文章页显示"
									onclick={() =>
										patchItem(area.key, index, {
											hideOnNonPostPage: item.hideOnNonPostPage !== true,
										})}
								>
									<span
										class="admin-switch-track"
										class:is-on={item.hideOnNonPostPage === true}
									></span>
								</button>
							</label>

							<label class="admin-field__inline">
								<span class="admin-field__label">显示标题</span>
								<button
									type="button"
									class="admin-switch"
									role="switch"
									aria-checked={item.showTitle !== false}
									aria-label="显示组件标题"
									onclick={() =>
										patchItem(area.key, index, {
											showTitle: item.showTitle === false,
										})}
								>
									<span
										class="admin-switch-track"
										class:is-on={item.showTitle !== false}
									></span>
								</button>
							</label>
						</div>

						<button
							type="button"
							class="admin-field__toggle"
							onclick={() =>
								(expanded[`${area.key}:${index}`] = !expanded[`${area.key}:${index}`])}
						>
							<AdminIcon
								name={expanded[`${area.key}:${index}`] ? "arrowDown" : "arrowUp"}
								class="h-4 w-4"
							/>
							<span class="admin-field__label">组件专属参数</span>
						</button>
						{#if expanded[`${area.key}:${index}`]}
							<div class="admin-field__nested">
								{#if item.specificConfig && typeof item.specificConfig === "object"}
									<AdminFormFields bind:value={item.specificConfig} depth={1} />
								{:else}
									<span class="admin-field__hint">
										该组件没有专属参数。如需添加，点击下方按钮后手动编辑。
									</span>
									<button
										type="button"
										class="admin-btn admin-btn--ghost admin-btn--sm"
										onclick={() => patchItem(area.key, index, { specificConfig: {} })}
									>
										<AdminIcon name="plus" class="h-3.5 w-3.5" />
										添加参数对象
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/each}

				<div class="admin-field__row admin-field__row--wrap">
					<span class="admin-field__label">添加组件：</span>
					{#each WIDGET_TYPES as widget (widget.id)}
						<button
							type="button"
							class="admin-btn admin-btn--ghost admin-btn--sm"
							onclick={() => addItem(area.key, widget.id, area.supportsPosition)}
						>
							<AdminIcon name={widget.icon} class="h-3.5 w-3.5" />
							{widget.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>
