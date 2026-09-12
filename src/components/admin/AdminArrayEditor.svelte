<script lang="ts">
/**
 * 数组型配置编辑器（友链、书签导航分组等）
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: any[];
		/** 新增项的模板字段名，缺省时从第一项推断 */
		itemLabel?: string;
	}

	let { value = $bindable(), itemLabel = "条目" }: Props = $props();

	const list = $derived<any[]>(Array.isArray(value) ? value : []);

	function commit(next: unknown[]) {
		value = next;
	}

	function addItem() {
		const first = list[0];
		const blank =
			first && typeof first === "object" && first !== null
				? Object.fromEntries(
						Object.entries(first).map(([k, v]) => [
							k,
							Array.isArray(v) ? [] : typeof v === "object" && v !== null ? {} : "",
						]),
					)
				: "";
		commit([...list, blank]);
	}

	function removeItem(index: number) {
		commit(list.filter((_, i) => i !== index));
	}

	function moveItem(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= list.length) return;
		const next = [...list];
		[next[index], next[target]] = [next[target], next[index]];
		commit(next);
	}

	/** 取一条可读的标题用于列表展示 */
	function titleOf(item: unknown, index: number): string {
		if (item && typeof item === "object") {
			const record = item as Record<string, unknown>;
			const name = record.name ?? record.title ?? record.label ?? record.id;
			if (typeof name === "string" && name) return name;
		}
		if (typeof item === "string") return item;
		return `${itemLabel} ${index + 1}`;
	}
</script>

<div class="admin-stack">
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="list" class="h-4 w-4" />
			{itemLabel}列表
			<span class="admin-field__count">{list.length} 条</span>
		</div>

		{#if list.length === 0}
			<span class="admin-field__hint">还没有任何条目，点击下方按钮添加。</span>
		{/if}

		<div class="admin-list">
			{#each list as item, index (index)}
				<div class="admin-card admin-card--bordered admin-list__item">
					<div class="admin-list__bar">
						<span class="admin-list__index">#{index + 1}</span>
						<span class="admin-list__name">{titleOf(item, index)}</span>
						<div class="admin-list__actions">
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="上移"
								disabled={index === 0}
								onclick={() => moveItem(index, -1)}
							>
								<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="下移"
								disabled={index === list.length - 1}
								onclick={() => moveItem(index, 1)}
							>
								<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--danger admin-btn--sm"
								aria-label="删除"
								onclick={() => removeItem(index)}
							>
								<AdminIcon name="trash" class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>

					{#if item && typeof item === "object"}
						<AdminFormFields bind:value={list[index]} depth={1} />
					{:else}
						<label class="admin-field__stack">
							<span class="admin-field__label">内容</span>
							<input
								class="admin-input"
								type="text"
								value={String(item ?? "")}
								oninput={(event) => {
									const next = [...list];
									next[index] = event.currentTarget.value;
									commit(next);
								}}
							/>
						</label>
					{/if}
				</div>
			{/each}
		</div>

		<button
			type="button"
			class="admin-btn admin-btn--ghost admin-btn--sm"
			onclick={addItem}
		>
			<AdminIcon name="plus" class="h-3.5 w-3.5" />
			添加{itemLabel}
		</button>
	</div>
</div>
