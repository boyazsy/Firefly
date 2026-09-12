<script lang="ts">
/**
 * 导航栏设置 - 支持两级菜单、排序与增删
 */
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	interface NavLink {
		name: string;
		url: string;
		icon?: string;
		external?: boolean;
		children?: NavLink[];
	}

	const links = $derived<NavLink[]>(
		Array.isArray(value?.links) ? (value.links as NavLink[]) : [],
	);

	function commit(next: NavLink[]) {
		value = { ...value, links: next };
	}

	function patchTop(index: number, patch: Partial<NavLink>) {
		commit(links.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}

	function patchChild(
		topIndex: number,
		childIndex: number,
		patch: Partial<NavLink>,
	) {
		const parent = links[topIndex];
		const children = [...(parent.children ?? [])];
		children[childIndex] = { ...children[childIndex], ...patch };
		patchTop(topIndex, { children });
	}

	function addTop() {
		commit([
			...links,
			{ name: "新菜单", url: "/", icon: "material-symbols:link" },
		]);
	}

	function addChild(topIndex: number) {
		const parent = links[topIndex];
		patchTop(topIndex, {
			children: [
				...(parent.children ?? []),
				{ name: "新子项", url: "/", icon: "material-symbols:link" },
			],
		});
	}

	function removeTop(index: number) {
		commit(links.filter((_, i) => i !== index));
	}

	function removeChild(topIndex: number, childIndex: number) {
		const parent = links[topIndex];
		patchTop(topIndex, {
			children: (parent.children ?? []).filter((_, i) => i !== childIndex),
		});
	}

	function moveTop(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= links.length) return;
		const next = [...links];
		[next[index], next[target]] = [next[target], next[index]];
		commit(next);
	}

	function moveChild(topIndex: number, childIndex: number, delta: number) {
		const parent = links[topIndex];
		const children = [...(parent.children ?? [])];
		const target = childIndex + delta;
		if (target < 0 || target >= children.length) return;
		[children[childIndex], children[target]] = [
			children[target],
			children[childIndex],
		];
		patchTop(topIndex, { children });
	}

	let expanded = $state<Record<number, boolean>>({});
</script>

<div class="admin-stack">
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="menu" class="h-4 w-4" />
			导航菜单
			<span class="admin-field__count">{links.length} 项</span>
		</div>
		<span class="admin-field__hint">
			拖动上下箭头调整顺序。带子菜单的项其 url 一般填 "#"，由子项决定跳转目标。
			图标使用 Iconify 格式，如 material-symbols:home、fa7-brands:github。
		</span>

		<div class="admin-list">
			{#each links as item, index (index)}
				<div class="admin-card admin-card--bordered admin-list__item">
					<div class="admin-list__bar">
						<span class="admin-list__index">#{index + 1}</span>
						<span class="admin-list__name">{item.name || "未命名"}</span>
						{#if item.children?.length}
							<span class="admin-badge admin-badge--neutral">
								{item.children.length} 个子项
							</span>
						{/if}
						<div class="admin-list__actions">
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="上移"
								disabled={index === 0}
								onclick={() => moveTop(index, -1)}
							>
								<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="下移"
								disabled={index === links.length - 1}
								onclick={() => moveTop(index, 1)}
							>
								<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--danger admin-btn--sm"
								aria-label="删除"
								onclick={() => removeTop(index)}
							>
								<AdminIcon name="trash" class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>

					<div class="admin-grid-3">
						<label class="admin-field__stack">
							<span class="admin-field__label">名称</span>
							<input
								class="admin-input"
								type="text"
								value={item.name ?? ""}
								oninput={(event) =>
									patchTop(index, { name: event.currentTarget.value })}
							/>
						</label>
						<label class="admin-field__stack">
							<span class="admin-field__label">链接</span>
							<input
								class="admin-input"
								type="text"
								value={item.url ?? ""}
								oninput={(event) =>
									patchTop(index, { url: event.currentTarget.value })}
							/>
						</label>
						<label class="admin-field__stack">
							<span class="admin-field__label">图标</span>
							<input
								class="admin-input"
								type="text"
								value={item.icon ?? ""}
								oninput={(event) =>
									patchTop(index, { icon: event.currentTarget.value })}
							/>
						</label>
					</div>

					<label class="admin-field__inline">
						<span class="admin-field__label">新窗口打开</span>
						<button
							type="button"
							class="admin-switch"
							role="switch"
							aria-checked={item.external === true}
							aria-label="新窗口打开"
							onclick={() => patchTop(index, { external: !item.external })}
						>
							<span class="admin-switch-track" class:is-on={item.external === true}
							></span>
						</button>
					</label>

					<!-- 子菜单 -->
					<div class="admin-field__group">
						<button
							type="button"
							class="admin-field__toggle"
							onclick={() => (expanded[index] = !expanded[index])}
						>
							<AdminIcon
								name={expanded[index] ? "arrowDown" : "arrowUp"}
								class="h-4 w-4"
							/>
							<span class="admin-field__label">子菜单</span>
							<span class="admin-field__count">{item.children?.length ?? 0} 项</span>
						</button>

						{#if expanded[index]}
							<div class="admin-list admin-list--sub">
								{#each item.children ?? [] as child, childIndex (childIndex)}
									<div class="admin-card admin-card--bordered admin-list__item">
										<div class="admin-list__bar">
											<span class="admin-list__index">#{childIndex + 1}</span>
											<span class="admin-list__name">{child.name || "未命名"}</span>
											<div class="admin-list__actions">
												<button
													type="button"
													class="admin-btn admin-btn--ghost admin-btn--sm"
													aria-label="上移"
													disabled={childIndex === 0}
													onclick={() => moveChild(index, childIndex, -1)}
												>
													<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													class="admin-btn admin-btn--ghost admin-btn--sm"
													aria-label="下移"
													disabled={childIndex === (item.children?.length ?? 0) - 1}
													onclick={() => moveChild(index, childIndex, 1)}
												>
													<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													class="admin-btn admin-btn--danger admin-btn--sm"
													aria-label="删除"
													onclick={() => removeChild(index, childIndex)}
												>
													<AdminIcon name="trash" class="h-3.5 w-3.5" />
												</button>
											</div>
										</div>
										<div class="admin-grid-3">
											<label class="admin-field__stack">
												<span class="admin-field__label">名称</span>
												<input
													class="admin-input"
													type="text"
													value={child.name ?? ""}
													oninput={(event) =>
														patchChild(index, childIndex, {
															name: event.currentTarget.value,
														})}
												/>
											</label>
											<label class="admin-field__stack">
												<span class="admin-field__label">链接</span>
												<input
													class="admin-input"
													type="text"
													value={child.url ?? ""}
													oninput={(event) =>
														patchChild(index, childIndex, {
															url: event.currentTarget.value,
														})}
												/>
											</label>
											<label class="admin-field__stack">
												<span class="admin-field__label">图标</span>
												<input
													class="admin-input"
													type="text"
													value={child.icon ?? ""}
													oninput={(event) =>
														patchChild(index, childIndex, {
															icon: event.currentTarget.value,
														})}
												/>
											</label>
										</div>
										<label class="admin-field__inline">
											<span class="admin-field__label">新窗口打开</span>
											<button
												type="button"
												class="admin-switch"
												role="switch"
												aria-checked={child.external === true}
												aria-label="新窗口打开"
												onclick={() =>
													patchChild(index, childIndex, {
														external: !child.external,
													})}
											>
												<span
													class="admin-switch-track"
													class:is-on={child.external === true}
												></span>
											</button>
										</label>
									</div>
								{/each}
								<button
									type="button"
									class="admin-btn admin-btn--ghost admin-btn--sm"
									onclick={() => addChild(index)}
								>
									<AdminIcon name="plus" class="h-3.5 w-3.5" />
									添加子项
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			<button
				type="button"
				class="admin-btn admin-btn--ghost admin-btn--sm"
				onclick={addTop}
			>
				<AdminIcon name="plus" class="h-3.5 w-3.5" />
				添加菜单项
			</button>
		</div>
	</div>
</div>
