<script lang="ts">
/**
 * 通用配置表单 - 按运行时值自动渲染控件
 * 支持对象嵌套（递归自身）、字符串数组、对象数组
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";
	import { fieldHint, fieldLabel, fieldOptions } from "@/utils/admin-field-hints";

	interface Props {
		// 配置结构千变万化，这里用 any 换取递归绑定的可行性
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
		depth?: number;
		/** 只渲染这些字段（用于把大对象拆成多块手写 + 通用混合渲染） */
		only?: string[];
	}

	let { value = $bindable(), depth = 0, only }: Props = $props();

	type Kind =
		| "boolean"
		| "number"
		| "string"
		| "text"
		| "enum"
		| "stringList"
		| "object"
		| "objectList"
		| "json";

	function detectKind(item: unknown, key: string): Kind {
		if (typeof item === "boolean") return "boolean";
		if (typeof item === "number") return "number";
		if (typeof item === "string") {
			if (fieldOptions(key)) return "enum";
			return item.length > 60 || item.includes("\n") ? "text" : "string";
		}
		if (Array.isArray(item)) {
			if (item.length === 0) return "json";
			if (item.every((v) => typeof v === "string")) return "stringList";
			if (item.every((v) => typeof v === "object" && v !== null)) return "objectList";
			return "json";
		}
		if (item !== null && typeof item === "object") return "object";
		return "json";
	}

	const entries = $derived(
		Object.entries(value ?? {})
			.filter(([key]) => !only || only.includes(key))
			.map(([key, item]) => ({
			key,
			item,
			kind: detectKind(item, key),
			label: fieldLabel(key),
			options: fieldOptions(key),
			hint: fieldHint(key),
		})),
	);

	let expanded = $state<Record<string, boolean>>({});
	let jsonDraft = $state<Record<string, string>>({});
	let jsonError = $state<Record<string, string>>({});

	function toggle(path: string) {
		expanded[path] = !expanded[path];
	}

	function setKey(key: string, next: unknown) {
		value = { ...value, [key]: next };
	}

	function updateStringList(key: string, next: string[]) {
		setKey(key, next);
	}

	function addListItem(key: string) {
		const list = (value[key] as Record<string, unknown>[]) ?? [];
		const first = list[0];
		const blank: Record<string, unknown> = first
			? Object.fromEntries(
					Object.entries(first).map(([k, v]) => [
						k,
						Array.isArray(v) ? [] : typeof v === "object" && v !== null ? {} : "",
					]),
				)
			: {};
		setKey(key, [...list, blank]);
	}

	function removeListItem(key: string, index: number) {
		const list = [...((value[key] as unknown[]) ?? [])];
		list.splice(index, 1);
		setKey(key, list);
	}

	function moveListItem(key: string, index: number, delta: number) {
		const list = [...((value[key] as unknown[]) ?? [])];
		const target = index + delta;
		if (target < 0 || target >= list.length) return;
		[list[index], list[target]] = [list[target], list[index]];
		setKey(key, list);
	}

	function commitJson(key: string) {
		try {
			const parsed = JSON.parse(jsonDraft[key] ?? "");
			setKey(key, parsed);
			jsonError[key] = "";
		} catch (error) {
			jsonError[key] = error instanceof Error ? error.message : "JSON 解析失败";
		}
	}

	function startJsonEdit(key: string, item: unknown) {
		jsonDraft[key] = JSON.stringify(item, null, 2);
		jsonError[key] = "";
		toggle(`json:${key}`);
	}
</script>

<div class="admin-form" class:admin-form--nested={depth > 0}>
	{#each entries as field (field.key)}
		{@const path = `${depth}:${field.key}`}
		<div class="admin-field" data-kind={field.kind}>
			{#if field.kind === "boolean"}
				<label class="admin-field__inline">
					<span class="admin-field__label">{field.label}</span>
					{#if field.hint}
						<span class="admin-field__hint">{field.hint}</span>
					{/if}
					<button
						type="button"
						class="admin-switch"
						role="switch"
						aria-checked={field.item === true}
						aria-label={field.label}
						onclick={() => setKey(field.key, !field.item)}
					>
						<span class="admin-switch-track" class:is-on={field.item === true}></span>
					</button>
				</label>
			{:else if field.kind === "enum"}
				<label class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					<select
						class="admin-select"
						value={String(field.item ?? "")}
						onchange={(event) =>
							setKey(field.key, event.currentTarget.value)}
					>
						{#each field.options ?? [] as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
					{#if field.hint}<span class="admin-field__hint">{field.hint}</span>{/if}
				</label>
			{:else if field.kind === "number"}
				<label class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					<input
						class="admin-input"
						type="number"
						value={Number(field.item ?? 0)}
						oninput={(event) =>
							setKey(field.key, Number(event.currentTarget.value))}
					/>
					{#if field.hint}<span class="admin-field__hint">{field.hint}</span>{/if}
				</label>
			{:else if field.kind === "string"}
				<label class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					<input
						class="admin-input"
						type="text"
						value={String(field.item ?? "")}
						oninput={(event) => setKey(field.key, event.currentTarget.value)}
					/>
					{#if field.hint}<span class="admin-field__hint">{field.hint}</span>{/if}
				</label>
			{:else if field.kind === "text"}
				<label class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					<textarea
						class="admin-textarea"
						rows="3"
						value={String(field.item ?? "")}
						oninput={(event) => setKey(field.key, event.currentTarget.value)}
					></textarea>
					{#if field.hint}<span class="admin-field__hint">{field.hint}</span>{/if}
				</label>
			{:else if field.kind === "stringList"}
				{@const list = (field.item as string[]) ?? []}
				<div class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					<div class="admin-chips">
						{#each list as item, index (index)}
							<span class="admin-chip">
								{item}
								<button
									type="button"
									class="admin-chip__remove"
									aria-label="移除 {item}"
									onclick={() =>
										updateStringList(
											field.key,
											list.filter((_, i) => i !== index),
										)}
								>
									<AdminIcon name="close" class="h-3 w-3" />
								</button>
							</span>
						{/each}
					</div>
					<div class="admin-field__row">
						<input
							class="admin-input"
							type="text"
							placeholder="输入后回车添加"
							onkeydown={(event) => {
								if (event.key !== "Enter") return;
								event.preventDefault();
								const input = event.currentTarget;
								const text = input.value.trim();
								if (!text) return;
								updateStringList(field.key, [...list, text]);
								input.value = "";
							}}
						/>
					</div>
					{#if field.hint}<span class="admin-field__hint">{field.hint}</span>{/if}
				</div>
			{:else if field.kind === "object"}
				<div class="admin-field__group">
					<button
						type="button"
						class="admin-field__toggle"
						onclick={() => toggle(path)}
					>
						<AdminIcon
							name={expanded[path] ? "arrowDown" : "arrowUp"}
							class="h-4 w-4"
						/>
						<span class="admin-field__label">{field.label}</span>
						<span class="admin-field__count">
							{Object.keys((field.item as object) ?? {}).length} 项
						</span>
					</button>
					{#if expanded[path]}
						<div class="admin-field__nested">
							<AdminFormFields bind:value={value[field.key]} depth={depth + 1} />
						</div>
					{/if}
				</div>
			{:else if field.kind === "objectList"}
				{@const list = (field.item as Record<string, unknown>[]) ?? []}
				<div class="admin-field__group">
					<button
						type="button"
						class="admin-field__toggle"
						onclick={() => toggle(path)}
					>
						<AdminIcon
							name={expanded[path] ? "arrowDown" : "arrowUp"}
							class="h-4 w-4"
						/>
						<span class="admin-field__label">{field.label}</span>
						<span class="admin-field__count">{list.length} 条</span>
					</button>
					{#if expanded[path]}
						<div class="admin-list">
							{#each list as item, index (index)}
								<div class="admin-list__item">
									<div class="admin-list__bar">
										<span class="admin-list__index">#{index + 1}</span>
										<div class="admin-list__actions">
											<button
												type="button"
												class="admin-btn admin-btn--ghost admin-btn--sm"
												aria-label="上移"
												disabled={index === 0}
												onclick={() => moveListItem(field.key, index, -1)}
											>
												<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												class="admin-btn admin-btn--ghost admin-btn--sm"
												aria-label="下移"
												disabled={index === list.length - 1}
												onclick={() => moveListItem(field.key, index, 1)}
											>
												<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												class="admin-btn admin-btn--danger admin-btn--sm"
												aria-label="删除"
												onclick={() => removeListItem(field.key, index)}
											>
												<AdminIcon name="trash" class="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
									<AdminFormFields
										bind:value={list[index]}
										depth={depth + 1}
									/>
								</div>
							{/each}
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								onclick={() => addListItem(field.key)}
							>
								<AdminIcon name="plus" class="h-3.5 w-3.5" />
								添加一项
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="admin-field__stack">
					<span class="admin-field__label">{field.label}</span>
					{#if expanded[`json:${field.key}`]}
						<textarea
							class="admin-textarea admin-textarea--code"
							rows="5"
							bind:value={jsonDraft[field.key]}
						></textarea>
						{#if jsonError[field.key]}
							<span class="admin-field__error">{jsonError[field.key]}</span>
						{/if}
						<div class="admin-field__row">
							<button
								type="button"
								class="admin-btn admin-btn--primary admin-btn--sm"
								onclick={() => commitJson(field.key)}
							>
								保存 JSON
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								onclick={() => toggle(`json:${field.key}`)}
							>
								取消
							</button>
						</div>
					{:else}
						<div class="admin-field__row">
							<code class="admin-field__preview"
								>{JSON.stringify(field.item)}</code
							>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								onclick={() => startJsonEdit(field.key, field.item)}
							>
								<AdminIcon name="edit" class="h-3.5 w-3.5" />
								编辑
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
